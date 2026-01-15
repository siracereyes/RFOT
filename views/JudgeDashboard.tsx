
import React, { useState } from 'react';
import ScoreCard from '../components/ScoreCard';
import { Search, Filter, CheckCircle, Award, LayoutGrid, List, Loader2 } from 'lucide-react';
import { Event, Participant, Score, User, UserRole } from '../types';

interface JudgeDashboardProps {
  events: Event[];
  participants: Participant[];
  judge: User;
  scores: Score[];
  onSubmitScore: (score: Score) => Promise<any>;
}

const JudgeDashboard: React.FC<JudgeDashboardProps> = ({ events, participants, judge, scores, onSubmitScore }) => {
  const assignedEvents = events.filter(e => e.id === judge.assignedEventId);
  
  const [selectedEventId, setSelectedEventId] = useState<string>(assignedEvents.length > 0 ? assignedEvents[0].id : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentEvent = assignedEvents.find(e => e.id === selectedEventId);
  
  const filteredParticipants = participants.filter(p => 
    p.eventId === selectedEventId && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.district.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSaveScore = async (participantId: string, criteriaScores: Record<string, number>, critique?: string) => {
    setIsSubmitting(true);
    const totalScore = Object.values(criteriaScores).reduce((sum, s) => sum + s, 0);
    
    const newScore: Score = {
      id: '', 
      judgeId: judge.id,
      participantId,
      eventId: selectedEventId,
      criteriaScores,
      totalScore,
      critique
    };

    try {
      await onSubmitScore(newScore);
      alert('Ballot submitted and recorded successfully.');
    } catch (error: any) {
      alert('Failed to submit ballot: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParticipantScore = (participantId: string) => {
    return scores.find(s => s.participantId === participantId && s.judgeId === judge.id);
  };

  if (assignedEvents.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 animate-float">
          <Award size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black font-header tracking-tight">No Events Assigned</h2>
          <p className="text-slate-500 max-w-sm mx-auto">Your account is active, but an administrator has not assigned you a competition category yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-400 font-black text-xs tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            Session Active: {judge.name}
          </div>
          <h1 className="text-4xl font-black font-header tracking-tighter">Evaluation Panel</h1>
          <p className="text-slate-400 font-medium">Regional Festival of Talents Scoring Gateway</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Assigned Contest</label>
            <div className="bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 min-w-[280px] font-bold text-slate-200 shadow-xl flex items-center gap-2">
              <Award size={18} className="text-blue-400" />
              {currentEvent?.name || 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Search contestants by name or school district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-3xl py-6 pl-16 pr-6 outline-none focus:border-blue-500/30 transition-all text-xl font-medium shadow-2xl placeholder:text-slate-700"
          />
        </div>
      </div>

      {filteredParticipants.length === 0 ? (
        <div className="glass p-20 rounded-[3rem] border border-white/10 text-center">
          <p className="text-slate-600 italic text-lg font-medium">No results match your current filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredParticipants.map(participant => {
            const existingScore = getParticipantScore(participant.id);
            return (
              <div key={participant.id} className="relative group">
                {currentEvent && (
                  <ScoreCard 
                    participant={participant} 
                    criteria={currentEvent.criteria} 
                    rounds={currentEvent.rounds}
                    type={currentEvent.type}
                    isLocked={currentEvent.isLocked || isSubmitting} 
                    initialScores={existingScore?.criteriaScores}
                    initialCritique={existingScore?.critique}
                    onSave={(scores, critique) => handleSaveScore(participant.id, scores, critique)}
                  />
                )}
                {existingScore && (
                  <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-1.5 backdrop-blur-md">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Submitted</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JudgeDashboard;
