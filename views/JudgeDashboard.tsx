
import React, { useState, useMemo } from 'react';
import ScoreCard from '../components/ScoreCard';
import { Search, CheckCircle, Award, User, Clock, AlertCircle, Users, ArrowLeft, Filter } from 'lucide-react';
import { Event, Participant, Score, User as UserType, EventType } from '../types';

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
  const [showMobileList, setShowMobileList] = useState(true);

  const currentEvent = assignedEvents.find(e => e.id === selectedEventId);
  
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => 
      p.eventId === selectedEventId && (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.district.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [participants, selectedEventId, searchTerm]);

  // Set initial selection if none on desktop
  useMemo(() => {
    if (!selectedParticipantId && filteredParticipants.length > 0 && window.innerWidth >= 1024) {
      setSelectedParticipantId(filteredParticipants[0].id);
    }
  }, [filteredParticipants, selectedParticipantId]);

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

  const handleSelectParticipant = (id: string) => {
    setSelectedParticipantId(id);
    if (window.innerWidth < 1024) {
      setShowMobileList(false);
    }
  };

  const handleSaveScore = async (participantId: string, criteriaScores: Record<string, number>, deductions: number, critique?: string) => {
    if (!currentEvent) return;
    setIsSubmitting(true);
    
    // CRITICAL FIX: Calculate rawTotal by iterating through the current event's rounds/criteria.
    // This ensures we ONLY sum valid, currently-existing fields and ignores orphaned data.
    let rawTotal = 0;
    if (currentEvent.type === EventType.QUIZ_BEE) {
      const rounds = currentEvent.rounds || [];
      rawTotal = rounds.reduce((sum, r) => sum + (Number(criteriaScores[r.id]) || 0), 0);
    } else {
      const criteria = currentEvent.criteria || [];
      rawTotal = criteria.reduce((sum, c) => sum + (Number(criteriaScores[c.id]) || 0), 0);
    }

    const totalScore = Math.max(0, rawTotal - (Number(deductions) || 0));
    
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
    } catch (error: any) {
      alert('Submission Failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assignedEvents.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 animate-float shadow-2xl">
          <Award size={40} />
        </div>
        <h2 className="text-2xl font-black font-header tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 max-w-sm mx-auto text-sm">You currently have no assigned events. Contact your regional coordinator to be added to an evaluation panel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="glass-card rounded-3xl p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 text-center md:text-left w-full md:w-auto">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Award size={24} className="md:size-[32px]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-2xl font-black font-header tracking-tight text-white truncate">{currentEvent?.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{currentEvent?.type}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{scoredCount} / {totalCount} Ballots</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 w-full md:w-auto justify-center md:justify-end">
          <div className="text-center md:text-right">
            <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1">Status</p>
            {currentEvent?.isLocked ? (
              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={10}/> Finalized</span>
            ) : (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><Clock size={10}/> In Progress</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className={`
          w-full lg:w-80 xl:w-96 shrink-0 space-y-4 lg:sticky lg:top-24 
          ${!showMobileList ? 'hidden lg:block' : 'block'}
        `}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search entry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-all font-bold text-sm text-white shadow-xl"
            />
          </div>

          <div className="space-y-2 max-h-[60vh] lg:max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 no-scrollbar">
            {filteredParticipants.length > 0 ? filteredParticipants.map(participant => {
              const existingScore = getParticipantScore(participant.id);
              const isActive = selectedParticipantId === participant.id;
              
              return (
                <button
                  key={participant.id}
                  onClick={() => handleSelectParticipant(participant.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative group ${
                    isActive 
                      ? 'bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20 shadow-lg' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-xs transition-all ${
                        isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {participant.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {participant.name}
                        </p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate">
                          {participant.district}
                        </p>
                      </div>
                    </div>
                    {existingScore ? (
                      <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0"></div>
                    )}
                  </div>
                </button>
              );
            }) : (
              <div className="p-10 text-center glass rounded-3xl border border-dashed border-white/10 opacity-30">
                <Users size={24} className="mx-auto mb-2 text-slate-700" />
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">No entries match</p>
              </div>
            )}
          </div>
        </div>

        <div className={`
          flex-1 w-full animate-in fade-in zoom-in-95 duration-500
          ${showMobileList ? 'hidden lg:block' : 'block'}
        `}>
          {selectedParticipant && currentEvent ? (
            <div className="space-y-6">
              <button 
                onClick={() => setShowMobileList(true)}
                className="lg:hidden flex items-center gap-2 mb-4 px-4 py-3 bg-white/5 rounded-2xl text-blue-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 active:scale-95"
              >
                <ArrowLeft size={16} /> Return to list
              </button>

              <ScoreCard 
                key={`${selectedParticipant.id}-${selectedEventId}`}
                participant={selectedParticipant} 
                criteria={currentEvent.criteria} 
                rounds={currentEvent.rounds}
                type={currentEvent.type}
                isLocked={currentEvent.isLocked || isSubmitting} 
                initialScores={getParticipantScore(selectedParticipant.id)?.criteriaScores || {}}
                initialDeductions={getParticipantScore(selectedParticipant.id)?.deductions || 0}
                initialCritique={getParticipantScore(selectedParticipant.id)?.critique || ''}
                onSave={(scores, deds, critique) => handleSaveScore(selectedParticipant.id, scores, deds, critique)}
              />
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center glass rounded-[3rem] border border-white/5 border-dashed p-12 text-center opacity-30">
               <Users size={48} className="text-slate-700 mb-4" />
               <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Select a contestant to begin scoring</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeDashboard;
