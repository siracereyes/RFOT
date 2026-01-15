
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Event, Participant, Score, User } from './types';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import JudgeDashboard from './views/JudgeDashboard';
import PublicLeaderboard from './views/PublicLeaderboard';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const initAttempted = useRef(false);

  const mapEvent = (db: any): Event => ({
    id: db.id,
    name: db.name,
    type: db.type,
    criteria: db.criteria || [],
    rounds: db.rounds || [],
    isLocked: db.is_locked,
    eventAdminId: db.event_admin_id
  });

  const mapParticipant = (db: any): Participant => ({
    id: db.id,
    name: db.name,
    district: db.district,
    eventId: db.event_id
  });

  const mapScore = (db: any): Score => ({
    id: db.id,
    judgeId: db.judge_id,
    participantId: db.participant_id,
    eventId: db.event_id,
    criteriaScores: db.criteria_scores,
    totalScore: db.total_score,
    critique: db.critique
  });

  const mapUser = (db: any): User => ({
    id: db.id,
    name: db.name,
    role: db.role,
    email: db.email || '',
    assignedEventId: db.assigned_event_id
  });

  const fetchAllData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        supabase.from('events').select('*'),
        supabase.from('participants').select('*'),
        supabase.from('scores').select('*'),
        supabase.from('profiles').select('*')
      ]);

      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value.data) {
          const data = res.value.data;
          if (idx === 0) setEvents(data.map(mapEvent));
          if (idx === 1) setParticipants(data.map(mapParticipant));
          if (idx === 2) setScores(data.map(mapScore));
          if (idx === 3) setUsers(data.map(mapUser));
        }
      });
    } catch (e) {
      console.error("Data fetch error:", e);
    }
  }, []);

  const resolveProfile = async (authSession: any) => {
    if (!authSession?.user) {
      setCurrentUser(null);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authSession.user.id)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors on missing profiles
      
      if (profile) {
        setCurrentUser(mapUser(profile));
      } else {
        const meta = authSession.user.user_metadata;
        // If it's a new sign up and we don't have a profile yet:
        // Default to JUDGE unless this is an explicit Admin registration
        const assignedRole = meta?.role || (isRegistering ? UserRole.SUPER_ADMIN : UserRole.JUDGE);
        
        const fallbackUser: User = {
          id: authSession.user.id,
          name: meta?.name || authSession.user.email?.split('@')[0] || 'New User',
          role: assignedRole as UserRole,
          email: authSession.user.email || '',
          assignedEventId: meta?.assignedEventId
        };
        
        setCurrentUser(fallbackUser);
        
        // Ensure profile exists in DB
        await supabase.from('profiles').upsert([{
          id: authSession.user.id,
          name: fallbackUser.name,
          role: fallbackUser.role,
          email: fallbackUser.email,
          assigned_event_id: fallbackUser.assignedEventId
        }]);
      }
    } catch (err) {
      console.error("Profile resolution error:", err);
    }
  };

  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    const initApp = async () => {
      // Safety timeout: don't let the loading screen hang forever
      const timeout = setTimeout(() => {
        if (loading) setLoading(false);
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await resolveProfile(session);
          await fetchAllData();
        }
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await resolveProfile(session);
        await fetchAllData();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUsers([]);
        setEvents([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAllData]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // Hard reset to clear all caches and states
      localStorage.clear();
      window.location.href = '/'; 
    } catch (error) {
      console.error("Logout error:", error);
      window.location.reload();
    }
  };

  const [loginCreds, setLoginCreds] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email: loginCreds.email,
          password: loginCreds.password,
          options: { data: { role: UserRole.SUPER_ADMIN, name: 'Main Admin' } }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginCreds.email,
          password: loginCreds.password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message);
      setLoading(false);
    }
  };

  const addEvent = async (e: Event) => {
    const { data, error } = await supabase.from('events').insert([{
      name: e.name,
      type: e.type,
      criteria: e.criteria,
      rounds: e.rounds,
      is_locked: e.isLocked,
      event_admin_id: currentUser?.id
    }]).select();
    if (!error && data) setEvents(prev => [...prev, mapEvent(data[0])]);
  };

  const updateEvent = async (e: Event) => {
    const { error } = await supabase.from('events').update({
      name: e.name,
      is_locked: e.isLocked,
      criteria: e.criteria
    }).eq('id', e.id);
    if (!error) setEvents(prev => prev.map(ev => ev.id === e.id ? e : ev));
  };

  const addParticipant = async (p: Participant) => {
    const { data, error } = await supabase.from('participants').insert([{
      name: p.name,
      district: p.district,
      event_id: p.eventId
    }]).select();
    if (!error && data) setParticipants(prev => [...prev, mapParticipant(data[0])]);
  };

  const updateParticipant = async (p: Participant) => {
    const { error } = await supabase.from('participants').update({
      name: p.name,
      district: p.district
    }).eq('id', p.id);
    if (!error) setParticipants(prev => prev.map(part => part.id === p.id ? p : part));
  };

  const deleteParticipant = async (id: string) => {
    const { error } = await supabase.from('participants').delete().eq('id', id);
    if (!error) setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const submitScore = async (s: Score) => {
    await supabase.from('scores').upsert({
      id: s.id,
      judge_id: s.judgeId,
      participant_id: s.participantId,
      event_id: s.eventId,
      criteria_scores: s.criteriaScores,
      total_score: s.totalScore,
      critique: s.critique
    });
  };

  const addJudge = async (u: any) => {
    const { data, error } = await supabase.from('profiles').insert([{
      id: u.id,
      name: u.name,
      role: UserRole.JUDGE,
      assigned_event_id: u.assigned_event_id,
      email: u.email
    }]).select();
    if (!error && data) {
      setUsers(prev => [...prev, mapUser(data[0])]);
    }
  };

  const removeJudge = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) setUsers(prev => prev.filter(u => u.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Establishing Secure Session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <h1 className="text-4xl font-black font-header tracking-tight text-white">RFOT <span className="text-blue-400">2024</span></h1>
            <p className="text-slate-400 mt-2 font-medium tracking-widest uppercase text-xs">Regional Scoring System</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <input type="email" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold text-white" value={loginCreds.email} onChange={e => setLoginCreds({...loginCreds, email: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
              <input type="password" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold text-white" value={loginCreds.password} onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} />
            </div>
            {authError && <p className="text-xs text-red-400 font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 border border-blue-400/20 group overflow-hidden relative">
              <span className="relative z-10">{isRegistering ? 'Initialize Admin Account' : 'Sign In'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors">
              {isRegistering ? 'Already have an account? Log In' : 'First time? Create initial admin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={currentUser.role === UserRole.JUDGE ? <Navigate to="/scoring" /> : <AdminDashboard events={events} participants={participants} users={users} scores={scores} onAddEvent={addEvent} onUpdateEvent={updateEvent} onAddParticipant={addParticipant} onUpdateParticipant={updateParticipant} onDeleteParticipant={deleteParticipant} onAddJudge={addJudge} onRemoveJudge={removeJudge} />} />
          <Route path="/events" element={<AdminDashboard events={events} participants={participants} users={users} scores={scores} onAddEvent={addEvent} onUpdateEvent={updateEvent} onAddParticipant={addParticipant} onUpdateParticipant={updateParticipant} onDeleteParticipant={deleteParticipant} onAddJudge={addJudge} onRemoveJudge={removeJudge} />} />
          <Route path="/scoring" element={<JudgeDashboard events={events} participants={participants} judge={currentUser} scores={scores} onSubmitScore={submitScore} />} />
          <Route path="/public" element={<PublicLeaderboard events={events} participants={participants} scores={scores} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
