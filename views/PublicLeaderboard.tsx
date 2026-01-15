
import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Star, LayoutTemplate, Users, Sparkles, Volume2, Loader2, Info, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Event, Participant, Score, EventType, Criterion } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import { supabase } from '../supabase';

interface PublicLeaderboardProps {
  events: Event[];
  participants: Participant[];
  scores: Score[];
}

const PublicLeaderboard: React.FC<PublicLeaderboardProps> = ({ events, participants, scores: initialScores }) => {
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  useEffect(() => { setScores(initialScores); }, [initialScores]);

  useEffect(() => {
    const channel = supabase
      .channel('public_leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Re-fetch or update local state
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

    // Identify highest weighted criterion for tie-breaks
    const highestCriterion = [...(currentEvent.criteria || [])].sort((a, b) => b.weight - a.weight)[0];

    return eventParticipants
      .map(p => {
        const pScores = eventScores.filter(s => s.participantId === p.id);
        const avgTotal = pScores.length > 0 ? pScores.reduce((sum, s) => sum + s.totalScore, 0) / pScores.length : 0;
        
        // Tie-breaker value (Score in the highest weighted category)
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
        // Mark if tie-breaker was actually used for this position
        if (i > 0 && r.score === arr[i-1].score && r.tieBreakerVal !== arr[i-1].tieBreakerVal) {
          r.hasTieBreakUsed = true;
        }
        return r;
      });
  }, [selectedEventId, participants, scores, currentEvent]);

  return (
    <div className="min-h-screen p-6 lg:p-12 space-y-16 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Official RFOT Standings</p>
          <h1 className="text-4xl lg:text-7xl font-black font-header tracking-tighter text-white">
            {currentEvent?.name.toUpperCase() || 'STANDINGS'}
          </h1>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-3xl border border-white/10">
          <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="bg-transparent px-6 py-3 rounded-2xl border-none text-blue-400 font-bold outline-none">
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="w-px h-8 bg-white/10"></div>
          <button className="p-3 text-blue-400 hover:text-white transition-all"><Volume2 size={20}/></button>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
           <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">Deductions Applied</span>
           <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full">Tie-Breaker: Weighted Category</span>
        </div>
      </div>

      <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Rank</th>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Participant</th>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">SDO District</th>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Final Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rankings.map((r, i) => (
              <tr key={r.id} className="hover:bg-white/5 transition-all group relative">
                <td className="px-10 py-8">
                   <div className="flex items-center gap-4">
                      <span className={`text-2xl font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600'}`}>{i + 1}</span>
                      {i < 3 && <Medal size={24} className={i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : 'text-orange-400'} />}
                   </div>
                </td>
                <td className="px-10 py-8">
                   <div>
                      <p className="font-black text-xl text-white tracking-tight">{r.name}</p>
                      {r.hasTieBreakUsed && (
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-amber-500 mt-1">
                          <ArrowUpRight size={10} /> Resolved by Weighted Priority
                        </div>
                      )}
                   </div>
                </td>
                <td className="px-10 py-8 text-slate-400 font-bold uppercase tracking-tight text-xs">{r.district}</td>
                <td className="px-10 py-8 text-right">
                   <span className="font-black text-4xl text-blue-400 font-header">{r.displayScore}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-10 glass rounded-[3rem] border border-white/5 text-center space-y-4">
         <h4 className="text-xl font-bold text-white font-header">Board of Judges Final Clause</h4>
         <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            "The Decision of the Board of Judges is Final and Irrevocable." Rankings are calculated based on weighted averages across all scoring criteria, less any penalties or deductions recorded for technical or time violations.
         </p>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
