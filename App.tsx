
import React, { useState, useEffect } from 'react';
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

  // Mappers to bridge CamelCase (Frontend) and SnakeCase (Supabase)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: eventsData },
          { data: partsData },
          { data: scoresData },
          { data: profilesData }
        ] = await Promise.all([
          supabase.from('events').select('*'),
          supabase.from('participants').select('*'),
          supabase.from('scores').select('*'),
          supabase.from('profiles').select('*')
        ]);

        if (eventsData) setEvents(eventsData.map(mapEvent));
        if (partsData) setParticipants(partsData.map(mapParticipant));
        if (scoresData) setScores(scoresData.map(mapScore));
        if (profilesData) setUsers(profilesData.map(mapUser));
      } catch (e) {
        console.error("Data fetch error", e);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser(mapUser(profile));
        } else {
          // Fallback: If no profile exists, this is the first Admin
          const fallbackUser: User = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'Super Admin',
            role: UserRole.SUPER_ADMIN,
            email: session.user.email || ''
          };
          setCurrentUser(fallbackUser);
          
          // Optionally, auto-create the profile record if it doesn't exist
          await supabase.from('profiles').upsert([{
            id: session.user.id,
            name: fallbackUser.name,
            role: UserRole.SUPER_ADMIN,
            email: fallbackUser.email
          }]);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    fetchData();

    const scoresSubscription = supabase
      .channel('realtime_scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setScores(prev => [...prev, mapScore(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setScores(prev => prev.map(s => s.id === payload.new.id ? mapScore(payload.new) : s));
        } else if (payload.eventType === 'DELETE') {
          setScores(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(scoresSubscription);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const [loginCreds, setLoginCreds] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email: loginCreds.email,
        password: loginCreds.password,
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginCreds.email,
        password: loginCreds.password,
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
      }
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
    if (error) console.error(error);
    else if (data) setEvents(prev => [...prev, mapEvent(data[0])]);
  };

  const updateEvent = async (e: Event) => {
    const { error } = await supabase.from('events').update({
      name: e.name,
      is_locked: e.isLocked,
      criteria: e.criteria
    }).eq('id', e.id);
    if (error) console.error(error);
    else setEvents(prev => prev.map(ev => ev.id === e.id ? e : ev));
  };

  const addParticipant = async (p: Participant) => {
    const { data, error } = await supabase.from('participants').insert([{
      name: p.name,
      district: p.district,
      event_id: p.eventId
    }]).select();
    if (error) console.error(error);
    else if (data) setParticipants(prev => [...prev, mapParticipant(data[0])]);
  };

  const updateParticipant = async (p: Participant) => {
    const { error } = await supabase.from('participants').update({
      name: p.name,
      district: p.district
    }).eq('id', p.id);
    if (error) console.error(error);
    else setParticipants(prev => prev.map(part => part.id === p.id ? p : part));
  };

  const deleteParticipant = async (id: string) => {
    const { error } = await supabase.from('participants').delete().eq('id', id);
    if (error) console.error(error);
    else setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const submitScore = async (s: Score) => {
    const { error } = await supabase.from('scores').upsert({
      id: s.id,
      judge_id: s.judgeId,
      participant_id: s.participantId,
      event_id: s.eventId,
      criteria_scores: s.criteriaScores,
      total_score: s.totalScore,
      critique: s.critique
    });
    if (error) console.error(error);
  };

  const addJudge = async (u: any) => {
    const { data, error } = await supabase.from('profiles').insert([{
      id: u.id,
      name: u.name,
      role: u.role,
      assigned_event_id: u.assigned_event_id,
      email: u.email
    }]).select();
    if (error) console.error(error);
    else if (data) setUsers(prev => [...prev, mapUser(data[0])]);
  };

  const removeJudge = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error(error);
    else setUsers(prev => prev.filter(u => u.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Establishing Secure Session...</p>
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
              <input 
                type="email" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold text-white"
                value={loginCreds.email}
                onChange={e => setLoginCreds({...loginCreds, email: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold text-white"
                value={loginCreds.password}
                onChange={e => setLoginCreds({...loginCreds, password: e.target.value})}
              />
            </div>
            
            {authError && <p className="text-xs text-red-400 font-bold text-center">{authError}</p>}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 border border-blue-400/20 group overflow-hidden relative"
            >
              <span className="relative z-10">{isRegistering ? 'Initialize Admin Account' : 'Sign In'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors"
            >
              {isRegistering ? 'Already have an account? Log In' : 'First time? Create initial admin'}
            </button>
          </div>
          
          <div className="pt-6 border-t border-white/10 text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest">
            Regional Management Portal
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
