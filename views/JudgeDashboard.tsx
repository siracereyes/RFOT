
import React, { useState, useMemo } from 'react';
import ScoreCard from '../components/ScoreCard';
import { Search, CheckCircle, Award, User, ChevronRight, BarChart3, Filter, Clock, AlertCircle } from 'lucide-react';
import { Event, Participant, Score, User as UserType } from '../types';

interface JudgeDashboardProps {
  events: Event[];
  participants: Participant[];
  judge: UserType;
  scores: Score[];
  onSubmitScore: (score: Score) => Promise<any>;
}

const JudgeDashboard: React.FC<JudgeDashboardProps> = ({ events, participants, judge, scores, onSubmitScore }) => {
  const assignedEvents = events.filter(e => e.id === judge.assignedEventId);
  const [selectedEventId] = useState<string>(assignedEvents.length > 0 ? assignedEvents[0].id : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentEvent = assignedEvents.find(e => e.id === selectedEventId);
  
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => 
      p.eventId === selectedEventId && (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.district.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [participants, selectedEventId, searchTerm]);

  // Set initial selection if none
  if (!selectedParticipantId && filteredParticipants.length > 0) {
    setSelectedParticipantId(filteredParticipants[0].id);
  }

  const selectedParticipant = useMemo(() => 
    filteredParticipants.find(p => p.id === selectedParticipantId),
    [filteredParticipants, selectedParticipantId]
  );

  const getParticipantScore = (participantId: string) => {
    return scores.find(s => s.participantId === participantId && s.judgeId === judge.id);
  };

  const scoredCount = useMemo(() => {
    const eventParts = participants.filter(p => p.eventId === selectedEventId);
    return eventParts.filter(p => !!getParticipantScore(p.id)).length;
  }, [participants, selectedEventId, scores, judge.id]);

  const totalCount = participants.filter(p => p.eventId === selectedEventId).length;
  const progressPercent = totalCount > 0 ? (scoredCount / totalCount) * 100 : 0;

  const handleSaveScore = async (participantId: string, criteriaScores: Record<string, number>, deductions: number, critique?: string) => {
    setIsSubmitting(true);
    const rawTotal = Object.values(criteriaScores).reduce((sum, s) => sum + s, 0);
    const totalScore = Math.max(0, rawTotal - deductions);
    
    const newScore: Score = {
      id: '', 
      judgeId: judge.id,
      participantId,
      eventId: selectedEventId,
      criteriaScores,
      deductions,
      totalScore,
      critique
    };

    try {
      await onSubmitScore(newScore);
      // Optional: Auto-select next participant
      const currentIndex = filteredParticipants.findIndex(p => p.id === participantId);
      if (currentIndex < filteredParticipants.length - 1) {
        // We don't auto-move to allow reviewing the saved state, 
        // but the judge can manually switch.
      }
    } catch (error: any) {
      alert('Submission Failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assignedEvents.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 animate-float shadow-2xl">
          <Award size={48} />
        </div>
        <h2 className="text-3xl font-black font-header tracking-tight">No Events Assigned</h2>
        <p className="text-slate-500 max-w-sm mx-auto">Please contact the technical committee to assign your competition category.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Header Stat Bar */}
      <div className="glass-card rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Award size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black font-header tracking-tight text-white">{currentEvent?.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{currentEvent?.type === 'QUIZ_BEE' ? 'Quiz Bee' : 'Subjective Judging'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{scoredCount} of {totalCount} Evaluated</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Event Status</p>
            <div className="flex items-center gap-2">
               {currentEvent?.isLocked ? (
                 <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                   <AlertCircle size={12} /> Results Locked
                 </span>
               ) : (
                 <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                   <Clock size={12} /> Scoring Active
                 </span>
               )}
            </div>
          </div>
          <div className="h-12 w-px bg-white/10 hidden md:block"></div>
          <div className="hidden lg:block text-right">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Session Identity</p>
            <p className="text-sm font-bold text-white">{judge.name}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: Master List */}
        <div className="w-full lg:w-96 shrink-0 space-y-4 lg:sticky lg:top-24 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 custom-scrollbar">
          <div className="relative group mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Filter contestants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-all font-medium text-sm text-white"
            />
          </div>

          <div className="space-y-3">
            {filteredParticipants.length > 0 ? filteredParticipants.map(participant => {
              const existingScore = getParticipantScore(participant.id);
              const isActive = selectedParticipantId === participant.id;
              
              return (
                <button
                  key={participant.id}
                  onClick={() => setSelectedParticipantId(participant.id)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all relative group overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20' 
                      : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 shadow-[2px_0_10px_rgba(59,130,246,0.5)]"></div>}
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {participant.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <p className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {participant.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">
                          {participant.district}
                        </p>
                      </div>
                    </div>
                    {existingScore ? (
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500/80">{existingScore.totalScore}</span>
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse"></div>
                    )}
                  </div>
                </button>
              );
            }) : (
              <div className="p-8 text-center glass rounded-2xl border border-dashed border-white/10">
                <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No Matches Found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Scoring Detail */}
        <div className="flex-1 w-full min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {selectedParticipant && currentEvent ? (
            <div className="space-y-6">
              <ScoreCard 
                key={selectedParticipant.id} // Important for re-mounting when participant changes
                participant={selectedParticipant} 
                criteria={currentEvent.criteria} 
                rounds={currentEvent.rounds}
                type={currentEvent.type}
                isLocked={currentEvent.isLocked || isSubmitting} 
                initialScores={getParticipantScore(selectedParticipant.id)?.criteriaScores}
                initialDeductions={getParticipantScore(selectedParticipant.id)?.deductions}
                initialCritique={getParticipantScore(selectedParticipant.id)?.critique}
                onSave={(scores, deds, critique) => handleSaveScore(selectedParticipant.id, scores, deds, critique)}
              />
              
              {/* Context Footer for the Judge */}
              <div className="flex items-center justify-between px-8 text-slate-600">
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Saved</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Active</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700"></div> Pending</div>
                </div>
                <p className="text-[10px] font-bold italic">Drafts are saved locally until submitted.</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center glass rounded-[3rem] border border-white/5 border-dashed p-20 text-center opacity-40">
               <User size={48} className="text-slate-700 mb-4" />
               <p className="text-sm font-bold uppercase tracking-widest text-slate-600">Select a contestant to begin evaluation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeDashboard;
