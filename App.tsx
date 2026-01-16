
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Event, Participant, Score, User } from './types';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import JudgeDashboard from './views/JudgeDashboard';
import PublicLeaderboard from './views/PublicLeaderboard';
import { Loader2, ShieldCheck, Mail, Key, Sparkles } from 'lucide-react';
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
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading RFOT 2026 Core...</p>
      </div>
    );
  }

  return (
    <Router>
      {!currentUser ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
          {/* Main Background Image with 70% Transparency (30% Opacity) */}
          <div 
            className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat opacity-[0.3]"
            style={{ backgroundImage: "url('https://i.ibb.co/rf28pYjw/rspc2.png')" }}
          ></div>
          
          {/* Overlay gradient to ensure text readability */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/60 via-slate-900/20 to-slate-950/80"></div>

          {/* Login Card with 70% Transparency (30% Opacity) to be "almost see through" */}
          <div className="bg-white/30 backdrop-blur-[40px] p-8 md:p-12 rounded-[3.5rem] w-full max-w-md border border-white/40 shadow-3xl space-y-10 relative z-10 animate-in fade-in zoom-in duration-700">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                   <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-all duration-700"></div>
                   <img 
                    src="https://i.ibb.co/rf28pYjw/rspc2.png" 
                    alt="RFOT Logo" 
                    className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10 animate-float drop-shadow-2xl rounded-3xl"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black font-header tracking-tight text-slate-900 leading-none">RFOT <span className="text-blue-700">2026</span></h1>
                <p className="text-slate-900 mt-2 font-black tracking-[0.3em] uppercase text-[10px] md:text-xs">Regional Scoring Portal</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAuthLoading(true);
              try {
                const { error } = isRegistering 
                  ? await supabase.auth.signUp({ email: loginCreds.email, password: loginCreds.password, options: { data: { role: UserRole.SUPER_ADMIN, name: 'Main Admin' } } })
                  : await supabase.auth.signInWithPassword({ email: loginCreds.email, password: loginCreds.password });
                if (error) throw error;
              } catch (err: any) { 
                alert(err.message); 
                setAuthLoading(false); 
              }
            }} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-4 drop-shadow-sm">Credential Access</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
                  <input 
                    type="email" 
                    required 
                    placeholder="Email Address"
                    className="w-full bg-white/40 border border-white/50 rounded-[2rem] pl-14 pr-6 py-5 outline-none focus:border-blue-600 focus:bg-white/80 focus:ring-4 focus:ring-blue-600/10 transition-all font-bold text-slate-900 shadow-sm placeholder:text-slate-600" 
                    value={loginCreds.email} 
                    onChange={e => setLoginCreds({...loginCreds, email: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-4 drop-shadow-sm">Secure Key</label>
                <div className="relative">
                  <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Enter Password"
                    className="w-full bg-white/40 border border-white/50 rounded-[2rem] pl-14 pr-6 py-5 outline-none focus:border-blue-600 focus:bg-white/80 focus:ring-4 focus:ring-blue-600/10 transition-all font-bold text-slate-900 shadow-sm placeholder:text-slate-600" 
                    value={loginCreds.password} 
                    onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} 
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-blue-700 hover:bg-blue-800 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 active:scale-[0.98]">
                {isRegistering ? <Sparkles size={18} /> : <ShieldCheck size={18} />}
                {isRegistering ? 'Initialize Platform' : 'Secure Authorization'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-black/10"></div>
              {registrationEnabled && (
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-[9px] font-black uppercase tracking-widest text-slate-900 hover:text-blue-800 transition-colors">
                  {isRegistering ? 'Back to Login' : 'System Setup'}
                </button>
              )}
              <div className="h-px flex-1 bg-black/10"></div>
            </div>

            <div className="text-center">
               <p className="text-[8px] font-bold text-slate-900/80 uppercase tracking-widest italic">Protected by Regional Data Integrity Service</p>
            </div>
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
