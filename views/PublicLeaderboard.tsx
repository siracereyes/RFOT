
import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Star, Volume2, ArrowUpRight, Users, ChevronRight } from 'lucide-react';
import { Event, Participant, Score } from '../types';
import { supabase } from '../supabase';

interface PublicLeaderboardProps {
  events: Event[];
  participants: Participant[];
  scores: Score[];
}

const PublicLeaderboard: React.FC<PublicLeaderboardProps> = ({ events, participants, scores: initialScores }) => {
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[0].id : '');

  useEffect(() => { setScores(initialScores); }, [initialScores]);

  useEffect(() => {
    const channel = supabase
      .channel('public_leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setScores(prev => {
            const mapped = {
              id: payload.new.id,
              judgeId: payload.new.judge_id,
              participantId: payload.new.participant_id,
              eventId: payload.new.event_id,
              criteriaScores: payload.new.criteria_scores,
              deductions: payload.new.deductions,
              totalScore: payload.new.total_score,
              critique: payload.new.critique
            };
            return [...prev.filter(s => s.id !== mapped.id), mapped];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const currentEvent = events.find(e => e.id === selectedEventId);
  
  const rankings = useMemo(() => {
    if (!selectedEventId || !currentEvent) return [];
    
    const eventParticipants = participants.filter(p => p.eventId === selectedEventId);
    const eventScores = scores.filter(s => s.eventId === selectedEventId);
    const highestCriterion = [...(currentEvent.criteria || [])].sort((a, b) => b.weight - a.weight)[0];

    return eventParticipants
      .map(p => {
        const pScores = eventScores.filter(s => s.participantId === p.id);
        const avgTotal = pScores.length > 0 ? pScores.reduce((sum, s) => sum + s.totalScore, 0) / pScores.length : 0;
        
        let tieBreakerVal = 0;
        if (highestCriterion) {
          tieBreakerVal = pScores.reduce((sum, s) => sum + (s.criteriaScores[highestCriterion.id] || 0), 0) / (pScores.length || 1);
        }

        return { 
          ...p, 
          score: avgTotal, 
          tieBreakerVal, 
          displayScore: avgTotal.toFixed(2),
          hasTieBreakUsed: false
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.tieBreakerVal - a.tieBreakerVal;
      })
      .map((r, i, arr) => {
        if (i > 0 && r.score === arr[i-1].score && r.tieBreakerVal !== arr[i-1].tieBreakerVal) {
          r.hasTieBreakUsed = true;
        }
        return r;
      });
  }, [selectedEventId, participants, scores, currentEvent]);

  return (
    <div className="min-h-[80vh] py-6 md:py-12 space-y-12 md:space-y-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-3">
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-blue-500">Official RFOT Live Standings</p>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-header tracking-tighter text-white break-words max-w-4xl px-4">
            {currentEvent?.name.toUpperCase() || 'SELECT EVENT'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 bg-white/5 p-2 rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl">
          <select 
            value={selectedEventId} 
            onChange={e => setSelectedEventId(e.target.value)} 
            className="bg-transparent px-4 sm:px-6 py-3 rounded-xl border-none text-blue-400 font-black text-xs md:text-sm outline-none focus:ring-0"
          >
            {events.map(e => <option key={e.id} value={e.id} className="bg-slate-900">{e.name}</option>)}
          </select>
          <div className="w-px h-8 bg-white/10"></div>
          <button className="p-3 text-blue-400 hover:text-white transition-all"><Volume2 size={20}/></button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-3 px-4">
           <span className="px-3 md:px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full">Deductions Synced</span>
           <span className="px-3 md:px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full">Tie-Breaker: Weighted Category</span>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/10 shadow-3xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 md:px-12 py-6 md:py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Official Rank</th>
                <th className="px-8 md:px-12 py-6 md:py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Contestant Entry</th>
                <th className="px-8 md:px-12 py-6 md:py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">SDO District</th>
                <th className="px-8 md:px-12 py-6 md:py-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Weighted Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rankings.map((r, i) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-all group">
                  <td className="px-8 md:px-12 py-6 md:py-8">
                     <div className="flex items-center gap-4 md:gap-6">
                        <span className={`text-2xl md:text-3xl font-black tabular-nums ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-700'}`}>
                          {i + 1}
                        </span>
                        {i < 3 && <Medal size={28} className={i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : 'text-orange-400'} />}
                     </div>
                  </td>
                  <td className="px-8 md:px-12 py-6 md:py-8">
                     <div className="min-w-0">
                        <p className="font-black text-lg md:text-2xl text-white tracking-tight truncate max-w-xs">{r.name}</p>
                        {r.hasTieBreakUsed && (
                          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-amber-500/80 mt-1">
                            <ArrowUpRight size={10} /> Resolved via Weighted Tie-Breaker
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-8 md:px-12 py-6 md:py-8 text-slate-500 font-black uppercase tracking-tight text-[10px] md:text-xs">{r.district}</td>
                  <td className="px-8 md:px-12 py-6 md:py-8 text-right">
                     <span className="font-black text-3xl md:text-5xl text-blue-400 font-header tabular-nums drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{r.displayScore}</span>
                  </td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-600 font-black uppercase tracking-[0.2em] text-xs">
                    Waiting for judge evaluation results...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-8 md:p-12 glass rounded-[2.5rem] md:rounded-[4rem] border border-white/5 text-center space-y-6 md:space-y-8 bg-gradient-to-b from-transparent to-blue-600/5">
         <div className="flex items-center justify-center gap-4 text-slate-400">
            <Users size={20} />
            <h4 className="text-lg md:text-2xl font-black text-white font-header tracking-tight">Board of Judges Finality Clause</h4>
         </div>
         <p className="text-xs md:text-sm text-slate-500 max-w-3xl mx-auto leading-relaxed md:leading-loose uppercase tracking-wide px-4">
            "The Decision of the Board of Judges is Final and Irrevocable." Final scores represent the mathematical mean of all valid ballots, adjusted for technical penalties. Weighted category priority is used for automated tie-resolution in compliance with Regional RFOT standards.
         </p>
         <div className="pt-4">
           <span className="px-5 py-2 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 rounded-full">Regional RFOT Technical Committee 2024</span>
         </div>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
