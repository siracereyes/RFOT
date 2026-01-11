
import React, { useState } from 'react';
import ScoreCard from '../components/ScoreCard';
import { Search, Filter, CheckCircle, Award } from 'lucide-react';
import { Event, Participant } from '../types';

interface JudgeDashboardProps {
  events: Event[];
  participants: Participant[];
}

const JudgeDashboard: React.FC<JudgeDashboardProps> = ({ events, participants }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const currentEvent = events.find(e => e.id === selectedEventId);
  
  const filteredParticipants = participants.filter(p => 
    p.eventId === selectedEventId && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.district.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSaveScore = (participantId: string, scores: Record<string, number>) => {
    // In a real app, this would hit the API and save to MongoDB
    console.log('Saving scores for', participantId, scores);
    setSubmittedIds(new Set([...submittedIds, participantId]));
    alert('Scores submitted successfully!');
  };

  if (events.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
          <Award size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">No Events Available</h2>
          <p className="text-slate-400 max-w-md">There are no events currently set up in the system. Please wait for an administrator to create an event and enroll participants.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black font-header tracking-tight">Judging Panel</h1>
          <p className="text-slate-400 mt-1">Submit scores for participants in real-time.</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Active Event</label>
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-blue-500 min-w-[240px]"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search participant or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all text-lg"
          />
        </div>
        <button className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors">
          <Filter size={24} />
        </button>
      </div>

      {filteredParticipants.length === 0 ? (
        <div className="glass p-12 rounded-3xl border border-white/10 text-center text-slate-500 italic">
          No participants enrolled for this event yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredParticipants.map(participant => (
            <div key={participant.id} className="relative">
              {submittedIds.has(participant.id) && (
                <div className="absolute inset-0 z-10 glass rounded-2xl flex flex-col items-center justify-center backdrop-blur-md border border-emerald-500/30">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-4 animate-bounce">
                    <CheckCircle size={32} />
                  </div>
                  <p className="text-xl font-bold">Scored Successfully</p>
                  <button 
                    onClick={() => setSubmittedIds(prev => {
                      const next = new Set(prev);
                      next.delete(participant.id);
                      return next;
                    })}
                    className="mt-4 text-emerald-400 font-semibold hover:underline"
                  >
                    Edit Scores
                  </button>
                </div>
              )}
              {currentEvent && (
                <ScoreCard 
                  participant={participant} 
                  criteria={currentEvent.criteria} 
                  isLocked={currentEvent.isLocked} 
                  onSave={(scores) => handleSaveScore(participant.id, scores)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JudgeDashboard;
