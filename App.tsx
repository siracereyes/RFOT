
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Event, Participant, Score, User } from './types';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import JudgeDashboard from './views/JudgeDashboard';
import PublicLeaderboard from './views/PublicLeaderboard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rfot_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('rfot_users');
    // Default admin account
    const defaultAdmin: User = { 
      id: 'admin_1', 
      name: 'admin', 
      email: 'admin@rfot.gov.ph', 
      role: UserRole.SUPER_ADMIN, 
      password: 'password123' 
    };
    return saved ? JSON.parse(saved) : [defaultAdmin];
  });

  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('rfot_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('rfot_participants');
    return saved ? JSON.parse(saved) : [];
  });

  const [scores, setScores] = useState<Score[]>(() => {
    const saved = localStorage.getItem('rfot_scores');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('rfot_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('rfot_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('rfot_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('rfot_scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rfot_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('rfot_current_user');
    }
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.name === loginCreds.username && u.password === loginCreds.password);
    if (user) {
      setCurrentUser(user);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  const addEvent = (newEvent: Event) => {
    setEvents(prev => [...prev, newEvent]);
  };

  const updateEvent = (updatedEvent: Event) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const addParticipant = (newParticipant: Participant) => {
    setParticipants(prev => [...prev, newParticipant]);
  };

  const submitScore = (score: Score) => {
    setScores(prev => {
      const existingIndex = prev.findIndex(s => s.participantId === score.participantId && s.judgeId === score.judgeId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = score;
        return updated;
      }
      return [...prev, score];
    });
  };

  const addJudge = (judge: User) => {
    setUsers(prev => [...prev, judge]);
  };

  const removeJudge = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    // Also remove their scores if needed, but usually kept for history
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <h1 className="text-4xl font-black font-header tracking-tight">RFOT <span className="text-blue-400">2024</span></h1>
            <p className="text-slate-400 mt-2 font-medium tracking-widest uppercase text-xs">Regional Scoring System</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold"
                value={loginCreds.username}
                onChange={e => setLoginCreds({...loginCreds, username: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mt-1 outline-none focus:border-blue-500 transition-all font-bold"
                value={loginCreds.password}
                onChange={e => setLoginCreds({...loginCreds, password: e.target.value})}
              />
            </div>
            
            {loginError && <p className="text-xs text-red-400 font-bold text-center">{loginError}</p>}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 border border-blue-400/20 group overflow-hidden relative"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </form>
          
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Official Management Portal</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={currentUser.role === UserRole.JUDGE ? <Navigate to="/scoring" /> : <AdminDashboard events={events} participants={participants} users={users} onAddEvent={addEvent} onUpdateEvent={updateEvent} onAddParticipant={addParticipant} onAddJudge={addJudge} onRemoveJudge={removeJudge} />} />
          <Route path="/events" element={<AdminDashboard events={events} participants={participants} users={users} onAddEvent={addEvent} onUpdateEvent={updateEvent} onAddParticipant={addParticipant} onAddJudge={addJudge} onRemoveJudge={removeJudge} />} />
          <Route path="/scoring" element={<JudgeDashboard events={events} participants={participants} judge={currentUser} scores={scores} onSubmitScore={submitScore} />} />
          <Route path="/public" element={<PublicLeaderboard events={events} participants={participants} scores={scores} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
