
import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Star, Volume2, ArrowUpRight, Users, ChevronRight, BarChart3 } from 'lucide-react';
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
              deductions: Number(payload.new.deductions) || 0,
              totalScore: Number(payload.new.total_score) || 0,
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
    <div className="min-h-screen py-4 md:py-12 space-y-8 md:space-y-16 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-blue-600">Official Standings RFOT 2026</p>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-header tracking-tighter text-slate-900 break-words max-w-4xl">
            {currentEvent?.name.toUpperCase() || 'SELECT CATEGORY'}
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl w-full sm:w-auto">
          <select 
            value={selectedEventId} 
            onChange={e => setSelectedEventId(e.target.value)} 
            className="bg-transparent px-6 py-3 rounded-xl border-none text-blue-600 font-black text-sm md:text-base outline-none focus:ring-0 w-full sm:w-auto appearance-none cursor-pointer"
          >
            {events.map(e => <option key={e.id} value={e.id} className="bg-white">{e.name}</option>)}
          </select>
          <div className="hidden sm:block w-px h-8 bg-slate-100"></div>
          <div className="flex items-center gap-3 px-4">
             <Volume2 size={18} className="text-slate-400" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">Real-time update stream</span>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-[3.5rem] overflow-hidden border border-slate-200 shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-12 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Rank</th>
              <th className="px-12 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Contestant Identity</th>
              <th className="px-12 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400">SDO District</th>
              <th className="px-12 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aggregated Avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rankings.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-12 py-8">
                   <div className="flex items-center gap-6">
                      <span className={`text-3xl font-black tabular-nums ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-slate-200'}`}>
                        {i + 1}
                      </span>
                      {i < 3 && <Medal size={28} className={i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : ''} />}
                   </div>
                </td>
                <td className="px-12 py-8">
                   <div>
                      <p className="font-black text-2xl text-slate-900 tracking-tight truncate max-w-sm">{r.name}</p>
                      {r.hasTieBreakUsed && <p className="text-[9px] font-black uppercase text-amber-600 mt-1 flex items-center gap-1"><ArrowUpRight size={12}/> Tie-break resolved</p>}
                   </div>
                </td>
                <td className="px-12 py-8 text-slate-400 font-black uppercase tracking-tight text-xs">{r.district}</td>
                <td className="px-12 py-8 text-right">
                   <span className="font-black text-5xl text-blue-600 font-header tabular-nums">{r.displayScore}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards View */}
      <div className="lg:hidden space-y-4">
        {rankings.map((r, i) => (
          <div key={r.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg flex flex-col gap-4">
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 
                    i === 1 ? 'bg-slate-100 text-slate-700' : 
                    i === 2 ? 'bg-orange-100 text-orange-700' : 
                    'bg-slate-50 text-slate-300'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 leading-tight">{r.name}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{r.district}</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[32px] font-black text-blue-600 font-header leading-none tabular-nums">{r.displayScore}</p>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Avg Score</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 md:p-12 bg-white rounded-[2.5rem] border border-slate-100 text-center space-y-6 shadow-sm">
         <div className="flex items-center justify-center gap-4 text-slate-400">
            <BarChart3 size={20} />
            <h4 className="text-lg md:text-xl font-black text-slate-900 font-header tracking-tight uppercase">Technical Information</h4>
         </div>
         <p className="text-[10px] md:text-xs text-slate-400 max-w-2xl mx-auto leading-loose uppercase tracking-widest px-4">
            All data points are verified by the regional tabulation committee. Tie-resolution follows the 2026 RFOT Handbook.
         </p>
         <div className="pt-4 border-t border-slate-50 inline-block mx-auto px-6">
           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Official RFOT Tabulation Office 2026</span>
         </div>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
