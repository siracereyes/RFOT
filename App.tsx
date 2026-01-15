
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
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const initRef = useRef(false);

  const mapEvent = (db: any): Event => ({
    id: db.id,
    name: db.name || 'Unnamed Event',
    type: db.type,
    criteria: db.criteria || [],
    rounds: db.rounds || [],
    isLocked: !!db.is_locked,
    eventAdminId: db.event_admin_id
  });

  const mapParticipant = (db: any): Participant => ({
    id: db.id,
    name: db.name || 'Unnamed Participant',
    district: db.district || 'Unknown District',
    eventId: db.event_id
  });

  const mapScore = (db: any): Score => ({
    id: db.id,
    judgeId: db.judge_id,
    participantId: db.participant_id,
    eventId: db.event_id,
    criteriaScores: db.criteria_scores || {},
    deductions: Number(db.deductions) || 0,
    totalScore: Number(db.total_score) || 0,
    critique: db.critique
  });

  const mapUser = (db: any): User => ({
    id: db.id,
    name: db.name || 'Unknown User',
    role: (db.role || '').toUpperCase() as UserRole,
    email: db.email || '', 
    assignedEventId: db.assigned_event_id
  });

  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [eventsRes, participantsRes, scoresRes, profilesRes, settingsRes] = await Promise.all([
        supabase.from('events').select('*'),
        supabase.from('participants').select('*'),
        supabase.from('scores').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('settings').select('*').eq('key', 'admin_registration_enabled').maybeSingle()
      ]);

      if (eventsRes.data) setEvents(eventsRes.data.map(mapEvent));
      if (participantsRes.data) setParticipants(participantsRes.data.map(mapParticipant));
      if (scoresRes.data) setScores(scoresRes.data.map(mapScore));
      if (profilesRes.data) setUsers(profilesRes.data.map(mapUser));
      if (settingsRes.data) setRegistrationEnabled(settingsRes.data.value === 'true');
      
    } catch (e) {
      console.error("Data fetch error:", e);
    } finally {
      setDataLoading(false);
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
        .maybeSingle();
      
      if (profile) {
        const mapped = mapUser(profile);
        if (!mapped.email) mapped.email = authSession.user.email || '';
        setCurrentUser(mapped);
      } else {
        const meta = authSession.user.user_metadata;
        const assignedRole = (meta?.role || (isRegistering ? UserRole.SUPER_ADMIN : UserRole.JUDGE)).toUpperCase();
        
        const fallbackUser: User = {
          id: authSession.user.id,
          name: meta?.name || authSession.user.email?.split('@')[0] || 'User',
          role: assignedRole as UserRole,
          email: authSession.user.email || '',
          assignedEventId: meta?.assignedEventId
        };
        
        setCurrentUser(fallbackUser);
        
        const { error } = await supabase.from('profiles').upsert([{
          id: authSession.user.id,
          name: fallbackUser.name,
          role: fallbackUser.role,
          assigned_event_id: fallbackUser.assignedEventId
        }]);
        if (error) console.error("Initial profile creation failed:", error);
      }
    } catch (err) {
      console.error("Profile resolution error:", err);
    }
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await resolveProfile(session);
      await fetchAllData();
      setAuthLoading(false);
    };
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        await resolveProfile(session);
        await fetchAllData();
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUsers([]);
        setEvents([]);
        setAuthLoading(false);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [fetchAllData]);

  const handleLogout = async () => {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthLoading(false);
  };

  const [loginCreds, setLoginCreds] = useState({ email: '', password: '' });

  const addJudge = async (u: any) => {
    const { data, error } = await supabase.from('profiles').insert([{
      id: u.id, 
      name: u.name, 
      role: UserRole.JUDGE, 
      assigned_event_id: u.assigned_event_id
    }]).select();
    
    if (error) {
      console.error("Database Error (Judge Profile):", error);
      throw error;
    }

    if (data) {
      const newUser = mapUser(data[0]);
      newUser.email = u.email;
      setUsers(prev => [...prev, newUser]);
      return newUser;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading 2026 Core...</p>
      </div>
    );
  }

  return (
    <Router>
      {!currentUser ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-md border border-slate-200 shadow-2xl space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-black font-header tracking-tight text-slate-900">RFOT <span className="text-blue-600">2026</span></h1>
              <p className="text-slate-400 mt-2 font-medium tracking-widest uppercase text-xs">Regional Scoring Engine</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setAuthLoading(true);
              try {
                const { error } = isRegistering 
                  ? await supabase.auth.signUp({ email: loginCreds.email, password: loginCreds.password, options: { data: { role: UserRole.SUPER_ADMIN, name: 'Main Admin' } } })
                  : await supabase.auth.signInWithPassword({ email: loginCreds.email, password: loginCreds.password });
                if (error) throw error;
              } catch (err: any) { alert(err.message); setAuthLoading(false); }
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold text-slate-900" value={loginCreds.email} onChange={e => setLoginCreds({...loginCreds, email: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold text-slate-900" value={loginCreds.password} onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-100">
                {isRegistering ? 'Initialize Platform' : 'Secure Sign In'}
              </button>
            </form>
            {registrationEnabled && (
              <div className="text-center pt-2">
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
                  {isRegistering ? 'Return to Portal' : 'Administrator Setup'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Layout user={currentUser} onLogout={handleLogout}>
          {dataLoading && (
            <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-[100]">
              <div className="h-full bg-blue-600 animate-[loading_2s_ease-in-out_infinite] w-1/3"></div>
            </div>
          )}
          <Routes>
            <Route path="/" element={currentUser.role === UserRole.JUDGE ? <Navigate to="/scoring" /> : <AdminDashboard events={events} participants={participants} users={users} scores={scores} registrationEnabled={registrationEnabled} onToggleRegistration={async (enabled) => {
              setRegistrationEnabled(enabled);
              await supabase.from('settings').upsert({ key: 'admin_registration_enabled', value: enabled.toString() }, { onConflict: 'key' });
            }} onAddEvent={async (e) => {
              const { data, error } = await supabase.from('events').insert([{ name: e.name, type: e.type, criteria: e.criteria, rounds: e.rounds, is_locked: e.isLocked, event_admin_id: currentUser.id }]).select();
              if (!error && data) setEvents(prev => [...prev, mapEvent(data[0])]);
            }} onUpdateEvent={async (e) => {
              const { error } = await supabase.from('events').update({ name: e.name, is_locked: e.isLocked, criteria: e.criteria, rounds: e.rounds }).eq('id', e.id);
              if (!error) setEvents(prev => prev.map(ev => ev.id === e.id ? e : ev));
            }} onAddParticipant={async (p) => {
              const { data, error } = await supabase.from('participants').insert([{ name: p.name, district: p.district, event_id: p.eventId }]).select();
              if (!error && data) setParticipants(prev => [...prev, mapParticipant(data[0])]);
            }} onUpdateParticipant={async (p) => {
              const { error } = await supabase.from('participants').update({ name: p.name, district: p.district }).eq('id', p.id);
              if (!error) setParticipants(prev => prev.map(part => part.id === p.id ? p : part));
            }} onDeleteParticipant={async (id) => {
              const { error } = await supabase.from('participants').delete().eq('id', id);
              if (!error) setParticipants(prev => prev.filter(p => p.id !== id));
            }} onAddJudge={addJudge} onRemoveJudge={async (id) => {
              const { error } = await supabase.from('profiles').delete().eq('id', id);
              if (!error) setUsers(prev => prev.filter(u => u.id !== id));
            }} onRefreshData={fetchAllData} />} />
            <Route path="/events" element={<Navigate to="/" />} />
            <Route path="/scoring" element={<JudgeDashboard events={events} participants={participants} judge={currentUser} scores={scores} onSubmitScore={async (s) => {
              const event = events.find(e => e.id === s.eventId);
              if (event?.isLocked) throw new Error("This category is already finalized.");
              const { data: existing } = await supabase.from('scores').select('id').eq('judge_id', s.judgeId).eq('participant_id', s.participantId).maybeSingle();
              const payload: any = { judge_id: s.judgeId, participant_id: s.participantId, event_id: s.eventId, criteria_scores: s.criteriaScores, deductions: s.deductions, total_score: s.totalScore, critique: s.critique };
              if (existing?.id) payload.id = existing.id;
              const { data, error } = await supabase.from('scores').upsert(payload).select();
              if (error) throw error;
              const savedScore = mapScore(data[0]);
              setScores(prev => [...prev.filter(score => score.id !== savedScore.id), savedScore]);
            }} />} />
            <Route path="/public" element={<PublicLeaderboard events={events} participants={participants} scores={scores} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      )}
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </Router>
  );
};

export default App;
