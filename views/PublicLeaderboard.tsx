
import React, { useState, useMemo } from 'react';
// Added Users to the imports from lucide-react
import { Trophy, Medal, Star, LayoutTemplate, Users } from 'lucide-react';
import { Event, Participant } from '../types';

interface PublicLeaderboardProps {
  events: Event[];
  participants: Participant[];
}

const PublicLeaderboard: React.FC<PublicLeaderboardProps> = ({ events, participants }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  
  const currentEvent = events.find(e => e.id === selectedEventId);
  
  // Mocking leader scores based on participants for selected event
  const rankings = useMemo(() => {
    if (!selectedEventId) return [];
    
    return participants
      .filter(p => p.eventId === selectedEventId)
      .map((p, i) => ({
        ...p,
        score: 98.5 - (i * (15 / (participants.length || 1))), // Randomized descending scores for demo
      }))
      .sort((a, b) => b.score - a.score);
  }, [selectedEventId, participants]);

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500">
        <LayoutTemplate size={64} className="mb-6 opacity-20" />
        <h2 className="text-2xl font-bold">No Event Data Available</h2>
        <p>Leaderboard will populate once events and participants are added.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col items-center space-y-6">
        <div className="text-center space-y-4">
          <h4 className="text-blue-400 font-black tracking-[0.3em] uppercase">Official Standings</h4>
          <h1 className="text-6xl lg:text-7xl font-black font-header tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent leading-none">
            {currentEvent?.name.toUpperCase() || 'SELECT EVENT'}
          </h1>
        </div>
        
        <div className="flex items-center gap-3 glass px-6 py-2 rounded-2xl border border-white/10">
          <span className="text-xs font-black text-slate-500 uppercase">Switch View:</span>
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-transparent border-none text-blue-400 font-bold outline-none cursor-pointer"
          >
            {events.map(e => <option key={e.id} value={e.id} className="bg-slate-900">{e.name}</option>)}
          </select>
        </div>
      </div>

      {rankings.length === 0 ? (
        <div className="glass p-20 rounded-[3rem] text-center border border-white/10">
          <Users size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-2xl font-bold text-slate-500">Awaiting Participants</h3>
          <p className="text-slate-600 mt-2">Standing will be calculated as soon as participants are enrolled.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end mb-16 pt-20">
            {/* Silver */}
            <div className="order-2 lg:order-1 glass p-8 rounded-t-[3rem] border-b-0 border-white/10 relative h-[350px] flex flex-col justify-end items-center text-center">
              {rankings[1] && (
                <>
                  <div className="absolute -top-12 w-24 h-24 rounded-full bg-slate-300 border-8 border-[#0f172a] flex items-center justify-center text-slate-900">
                    <Medal size={40} />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{rankings[1]?.name}</h3>
                  <p className="text-slate-400 font-medium mb-6">{rankings[1]?.district}</p>
                  <div className="text-5xl font-black text-slate-300">{rankings[1]?.score.toFixed(2)}</div>
                  <p className="text-xs font-black tracking-widest text-slate-500 mt-2">RUNNER UP</p>
                </>
              )}
            </div>

            {/* Gold */}
            <div className="order-1 lg:order-2 glass bg-gradient-to-b from-blue-600/20 to-transparent p-10 rounded-t-[4rem] border-b-0 border-blue-500/20 relative h-[450px] flex flex-col justify-end items-center text-center shadow-[0_-20px_50px_rgba(37,99,235,0.15)]">
              {rankings[0] && (
                <>
                  <div className="absolute -top-16 w-32 h-32 rounded-full bg-yellow-400 border-8 border-[#0f172a] flex items-center justify-center text-slate-900 shadow-2xl shadow-yellow-400/20">
                    <Trophy size={56} />
                  </div>
                  <div className="absolute top-12 flex gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#fbbf24" color="#fbbf24" />)}
                  </div>
                  <h3 className="text-3xl font-black mb-1">{rankings[0]?.name}</h3>
                  <p className="text-slate-400 font-medium mb-8">{rankings[0]?.district}</p>
                  <div className="text-7xl font-black text-yellow-400 drop-shadow-lg">{rankings[0]?.score.toFixed(2)}</div>
                  <p className="text-sm font-black tracking-[0.2em] text-yellow-400/60 mt-2">CHAMPION</p>
                </>
              )}
            </div>

            {/* Bronze */}
            <div className="order-3 glass p-8 rounded-t-[3rem] border-b-0 border-white/10 relative h-[300px] flex flex-col justify-end items-center text-center">
              {rankings[2] && (
                <>
                  <div className="absolute -top-10 w-20 h-20 rounded-full bg-amber-700 border-8 border-[#0f172a] flex items-center justify-center text-white">
                    <Medal size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{rankings[2]?.name}</h3>
                  <p className="text-slate-400 font-medium mb-4">{rankings[2]?.district}</p>
                  <div className="text-4xl font-black text-amber-600">{rankings[2]?.score.toFixed(2)}</div>
                  <p className="text-xs font-black tracking-widest text-slate-500 mt-2">2ND RUNNER UP</p>
                </>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] overflow-hidden border border-white/10">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Rank</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Contestant</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">District</th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rankings.map((rank, i) => (
                  <tr key={rank.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yellow-400 text-black' : 
                        i === 1 ? 'bg-slate-300 text-black' :
                        i === 2 ? 'bg-amber-600 text-white' : 'text-slate-500 border border-white/10'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-bold text-lg">{rank.name}</td>
                    <td className="px-8 py-6 text-slate-400 font-medium">{rank.district}</td>
                    <td className="px-8 py-6 text-right font-black text-2xl text-blue-400">{rank.score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PublicLeaderboard;
