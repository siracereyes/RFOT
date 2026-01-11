
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Event, Participant } from './types';
import { MOCK_USER } from './constants';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import JudgeDashboard from './views/JudgeDashboard';
import PublicLeaderboard from './views/PublicLeaderboard';

const App: React.FC = () => {
  const [user, setUser] = useState<{name: string, role: UserRole} | null>(MOCK_USER);
  
  // Persistence logic
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('rfot_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('rfot_participants');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('rfot_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('rfot_participants', JSON.stringify(participants));
  }, [participants]);

  const handleLogout = () => {
    setUser(null);
  };

  const handleLogin = (role: UserRole) => {
    setUser({ name: role === UserRole.SUPER_ADMIN ? 'Admin User' : 'Judge User', role });
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center">
            <h1 className="text-4xl font-black font-header tracking-tight">RFOT <span className="text-blue-500">2024</span></h1>
            <p className="text-slate-400 mt-2 font-medium">Contest Scoring System</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => handleLogin(UserRole.SUPER_ADMIN)}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 border border-blue-400/20"
            >
              Sign in as Admin
            </button>
            <button 
              onClick={() => handleLogin(UserRole.JUDGE)}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10"
            >
              Sign in as Judge
            </button>
          </div>
          
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Region X Festival of Talents</p>
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
          <Route path="/scoring" element={<JudgeDashboard events={events} participants={participants} />} />
          <Route path="/public" element={<PublicLeaderboard events={events} participants={participants} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
