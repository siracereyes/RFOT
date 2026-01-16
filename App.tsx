
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Event, Participant, Score, User } from './types';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import JudgeDashboard from './views/JudgeDashboard';
import PublicLeaderboard from './views/PublicLeaderboard';
import { Loader2, ShieldCheck, Mail, Key, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
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
  const isResolvingRef = useRef(false);

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
      const fetchEvents = supabase.from('events').select('*').then(res => res.data);
      const fetchParticipants = supabase.from('participants').select('*').then(res => res.data);
      const fetchScores = supabase.from('scores').select('*').then(res => res.data);
      const fetchProfiles = supabase.from('profiles').select('*').then(res => res.data);
      const fetchSettings = supabase.from('settings').select('*').eq('key', 'admin_registration_enabled').maybeSingle().then(res => res.data);

      const results = await Promise.allSettled([
        fetchEvents, fetchParticipants, fetchScores, fetchProfiles, fetchSettings
      ]);

      const [evData, partData, scoreData, profileData, settingsData] = results;

      if (evData.status === 'fulfilled' && evData.value) setEvents(evData.value.map(mapEvent));
      if (partData.status === 'fulfilled' && partData.value) setParticipants(partData.value.map(mapParticipant));
      if (scoreData.status === 'fulfilled' && scoreData.value) setScores(scoreData.value.map(mapScore));
      if (profileData.status === 'fulfilled' && profileData.value) setUsers(profileData.value.map(mapUser));
      if (settingsData.status === 'fulfilled' && settingsData.value) setRegistrationEnabled(settingsData.value.value === 'true');
      
    } catch (e) {
      console.error("Critical: Data fetch failed", e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const resolveProfile = async (authSession: any) => {
    if (!authSession?.user || isResolvingRef.current) return null;
    isResolvingRef.current = true;
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authSession.user.id)
        .maybeSingle();
      
      if (profileError) throw profileError;

      let resolvedUser: User;

      if (profile) {
        resolvedUser = mapUser(profile);
        if (!resolvedUser.email) resolvedUser.email = authSession.user.email || '';
      } else {
        const meta = authSession.user.user_metadata;
        const assignedRole = (meta?.role || (isRegistering ? UserRole.SUPER_ADMIN : UserRole.JUDGE)).toUpperCase();
        
        resolvedUser = {
          id: authSession.user.id,
          name: meta?.name || authSession.user.email?.split('@')[0] || 'User',
          role: assignedRole as UserRole,
          email: authSession.user.email || '',
          assignedEventId: meta?.assignedEventId
        };
        
        supabase.from('profiles').upsert([{
          id: authSession.user.id,
          name: resolvedUser.name,
          role: resolvedUser.role,
          assigned_event_id: resolvedUser.assignedEventId
        }]).then(({ error }) => {
          if (error) console.error("Auto-profile-sync failed", error);
        });
      }

      setCurrentUser(resolvedUser);
      return resolvedUser;
    } catch (err) {
      console.error("Profile resolution failed, fallback to metadata", err);
      const meta = authSession?.user?.user_metadata;
      const fallback: User = {
        id: authSession?.user?.id,
        name: meta?.name || authSession?.user?.email?.split('@')[0] || 'Authenticated User',
        role: (meta?.role || UserRole.JUDGE).toUpperCase() as UserRole,
        email: authSession?.user?.email || '',
        assignedEventId: meta?.assignedEventId
      };
      setCurrentUser(fallback);
      return fallback;
    } finally {
      isResolvingRef.current = false;
    }
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const globalTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 6000);

    const performInit = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await resolveProfile(session);
          fetchAllData();
        }
      } catch (err) {
        console.error("Initialization process crashed", err);
      } finally {
        setAuthLoading(false);
        clearTimeout(globalTimeout);
      }
    };

    performInit();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session) {
          await resolveProfile(session);
          fetchAllData();
        }
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUsers([]);
        setEvents([]);
        setScores([]);
        setAuthLoading(false);
      }
    });

    return () => { 
      subscription.unsubscribe();
      clearTimeout(globalTimeout);
    };
  }, [fetchAllData]);

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out process error", err);
      setCurrentUser(null);
      setAuthLoading(false);
    }
  };

  const [loginCreds, setLoginCreds] = useState({ email: '', password: '' });

  const addJudge = async (u: any) => {
    const { data, error } = await supabase.from('profiles').insert([{
      id: u.id, 
      name: u.name, 
      role: UserRole.JUDGE, 
      assigned_event_id: u.assigned_event_id
    }]).select();
    
    if (error) throw error;
    if (data) {
      const newUser = mapUser(data[0]);
      newUser.email = u.email;
      setUsers(prev => [...prev, newUser]);
      return newUser;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfdfe] gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/10 blur-[50px] rounded-full scale-150"></div>
          <div className="relative z-10 p-6 bg-white rounded-3xl border border-slate-100 shadow-xl">
             <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-[13px] animate-pulse">Establishing Session</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">National Capital Region • Portal</p>
        </div>
        <button 
          onClick={() => setAuthLoading(false)}
          className="mt-12 px-10 py-4 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm flex items-center gap-3"
        >
          Direct Access <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <Router>
      {!currentUser ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617] relative overflow-hidden">
          <div 
            className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat opacity-[0.15] scale-105"
            style={{ backgroundImage: "url('https://i.ibb.co/rf28pYjw/rspc2.png')" }}
          ></div>
          <div className="absolute inset-0 z-0 bg-gradient-to-tr from-slate-950 via-slate-950/40 to-slate-950"></div>

          <div className="bg-white/45 backdrop-blur-[55px] p-6 md:p-10 rounded-[2.5rem] w-full max-w-md border border-white/20 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-1000 max-h-[95vh] overflow-y-auto no-scrollbar">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-2">
                <div className="relative group">
                   <div className="absolute inset-0 bg-blue-600/30 rounded-full blur-[40px] group-hover:bg-blue-600/50 transition-all duration-1000"></div>
                   <img 
                    src="https://i.ibb.co/rf28pYjw/rspc2.png" 
                    alt="NCR Logo" 
                    className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 animate-float drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)] rounded-[2.5rem]"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black font-header tracking-tighter text-slate-900 leading-none">NCR <span className="text-amber-500">PORTAL</span></h1>
                <p className="text-slate-900 mt-2 font-black tracking-[0.2em] uppercase text-[10px] md:text-[11px] opacity-75">Regional Festival of Talents <span className="text-amber-500">2026</span></p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAuthLoading(true);
              try {
                const { error } = isRegistering 
                  ? await supabase.auth.signUp({ 
                      email: loginCreds.email, 
                      password: loginCreds.password, 
                      options: { data: { role: UserRole.SUPER_ADMIN, name: 'Regional Admin' } } 
                    })
                  : await supabase.auth.signInWithPassword({ 
                      email: loginCreds.email, 
                      password: loginCreds.password 
                    });
                if (error) throw error;
              } catch (err: any) { 
                alert("Authorization Denied: " + err.message); 
                setAuthLoading(false); 
              }
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 ml-4 opacity-70">Identity Key</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                  <input 
                    type="email" 
                    required 
                    placeholder="official@email.gov"
                    className="w-full bg-white/60 border border-white/80 rounded-[2rem] pl-14 pr-6 py-4 outline-none focus:border-blue-700 focus:bg-white/95 focus:ring-[12px] focus:ring-blue-600/5 transition-all font-bold text-slate-900 shadow-sm text-sm placeholder:text-slate-400" 
                    value={loginCreds.email} 
                    onChange={e => setLoginCreds({...loginCreds, email: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 ml-4 opacity-70">Security Token</label>
                <div className="relative">
                  <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••••••"
                    className="w-full bg-white/60 border border-white/80 rounded-[2rem] pl-14 pr-6 py-4 outline-none focus:border-blue-700 focus:bg-white/95 focus:ring-[12px] focus:ring-blue-600/5 transition-all font-bold text-slate-900 shadow-sm text-sm" 
                    value={loginCreds.password} 
                    onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} 
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-blue-800 hover:bg-blue-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-[0_20px_40px_-10px_rgba(30,58,138,0.5)] flex items-center justify-center gap-4 active:scale-95">
                {isRegistering ? <Sparkles size={20} /> : <ShieldCheck size={20} />}
                {isRegistering ? 'Setup Region' : 'Grant Entry'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-black/5"></div>
              {registrationEnabled && (
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-black uppercase tracking-widest text-slate-900 hover:text-blue-800 transition-colors opacity-50 hover:opacity-100">
                  {isRegistering ? 'Login' : 'Initialize'}
                </button>
              )}
              <div className="h-px flex-1 bg-black/5"></div>
            </div>

            <div className="text-center pt-1">
               <div className="flex items-center justify-center gap-2 text-slate-900/40 uppercase font-black text-[9px] tracking-[0.25em]">
                 <RefreshCw size={12} className="animate-spin-slow" /> Official Regional Gateway
               </div>
            </div>
          </div>
        </div>
      ) : (
        <Layout user={currentUser} onLogout={handleLogout}>
          {dataLoading && (
            <div className="fixed top-0 left-0 w-full h-[4px] bg-blue-50/30 z-[100] overflow-hidden">
              <div className="h-full bg-blue-700 animate-[loading_1.2s_ease-in-out_infinite] w-1/4 shadow-[0_0_20px_rgba(29,78,216,1)]"></div>
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
            }} onDeleteEvent={async (id) => {
              // Perform cascading deletion manually for consistency
              setDataLoading(true);
              try {
                // 1. Purge scores associated with this event
                await supabase.from('scores').delete().eq('event_id', id);
                // 2. Purge participants associated with this event
                await supabase.from('participants').delete().eq('event_id', id);
                // 3. Purge assigned judges (profiles) specifically associated with this event
                await supabase.from('profiles').delete().eq('assigned_event_id', id);
                // 4. Finally, purge the event itself
                const { error } = await supabase.from('events').delete().eq('id', id);
                
                if (!error) {
                  setEvents(prev => prev.filter(e => e.id !== id));
                  setParticipants(prev => prev.filter(p => p.eventId !== id));
                  setScores(prev => prev.filter(s => s.eventId !== id));
                  setUsers(prev => prev.filter(u => u.assignedEventId !== id));
                }
              } catch (err) {
                console.error("Purge failure", err);
                alert("Failed to complete full system purge. Please check connectivity.");
              } finally {
                setDataLoading(false);
              }
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
              if (event?.isLocked) throw new Error("This contest is currently locked for review.");
              const { data: existing } = await supabase.from('scores').select('id').eq('judge_id', s.judgeId).eq('participant_id', s.participantId).maybeSingle();
              const payload: any = { 
                judge_id: s.judgeId, 
                participant_id: s.participantId, 
                event_id: s.eventId, 
                criteria_scores: s.criteriaScores, 
                deductions: s.deductions, 
                total_score: s.totalScore, 
                critique: s.critique 
              };
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
      <style>{`
        @keyframes loading { 0% { transform: translateX(-200%); } 100% { transform: translateX(400%); } }
        .animate-spin-slow { animation: spin 5s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </Router>
  );
};

export default App;
