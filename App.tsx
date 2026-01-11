
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Event, Participant, Score } from './types';
import { MOCK_USER } from './constants';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import JudgeDashboard from './views/JudgeDashboard';
import PublicLeaderboard from './views/PublicLeaderboard';

const App: React.FC = () => {
  const [user, setUser] = useState<{id: string, name: string, role: UserRole} | null>(() => {
    const saved = localStorage.getItem('rfot_user');
    return saved ? JSON.parse(saved) : null;
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
    localStorage.setItem('rfot_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('rfot_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('rfot_scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('rfot_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rfot_user');
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  const handleLogin = (role: UserRole) => {
    setUser({ 
      id: role === UserRole.SUPER_ADMIN ? 'admin_1' : 'judge_1',
      name: role === UserRole.SUPER_ADMIN ? 'System Administrator' : 'Festival Judge', 
      role 
    });
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <h1 className="text-4xl font-black font-header tracking-tight">RFOT <span className="text-blue-400">2024</span></h1>
            <p className="text-slate-400 mt-2 font-medium tracking-widest uppercase text-xs">Regional Scoring System</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => handleLogin(UserRole.SUPER_ADMIN)}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 border border-blue-400/20 group overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Sign in as Admin
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
            <button 
              onClick={() => handleLogin(UserRole.JUDGE)}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 hover:border-white/20"
            >
              Sign in as Judge
            </button>
          </div>
          
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Official Management Portal</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={user.role === UserRole.JUDGE ? <Navigate to="/scoring" /> : <AdminDashboard events={events} participants={participants} onAddEvent={addEvent} onUpdateEvent={updateEvent} onAddParticipant={addParticipant} />} />
          <Route path="/events" element={<AdminDashboard events={events} participants={participants} onAddEvent={addEvent} onUpdateEvent={updateEvent} onAddParticipant={addParticipant} />} />
          <Route path="/scoring" element={<JudgeDashboard events={events} participants={participants} judgeId={user.id} scores={scores} onSubmitScore={submitScore} />} />
          <Route path="/public" element={<PublicLeaderboard events={events} participants={participants} scores={scores} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
