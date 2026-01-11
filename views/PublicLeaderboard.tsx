
import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Star, LayoutTemplate, Users, Sparkles, Volume2, Loader2 } from 'lucide-react';
import { Event, Participant, Score } from '../types';
import { GoogleGenAI } from '@google/genai';

interface PublicLeaderboardProps {
  events: Event[];
  participants: Participant[];
  scores: Score[];
}

const PublicLeaderboard: React.FC<PublicLeaderboardProps> = ({ events, participants, scores }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const currentEvent = events.find(e => e.id === selectedEventId);
  
  const rankings = useMemo(() => {
    if (!selectedEventId) return [];
    
    return participants
      .filter(p => p.eventId === selectedEventId)
      .map(p => {
        const participantScores = scores.filter(s => s.participantId === p.id && s.eventId === selectedEventId);
        const averageScore = participantScores.length > 0 
          ? participantScores.reduce((sum, s) => sum + s.totalScore, 0) / participantScores.length 
          : 0;
        return { ...p, score: averageScore };
      })
      .sort((a, b) => b.score - a.score);
  }, [selectedEventId, participants, scores]);

  useEffect(() => {
    const fetchInsight = async () => {
      if (rankings.length < 2 || isGeneratingInsight) return;
      setIsGeneratingInsight(true);
      try {
        const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
        const top3 = rankings.slice(0, 3);
        const prompt = `You are a festival commentator for the RFOT 2024. 
        In the event "${currentEvent?.name}", the current leaders are: 
        1. ${top3[0]?.name} (${top3[0]?.district}) - Score ${top3[0]?.score.toFixed(2)}
        2. ${top3[1]?.name} (${top3[1]?.district}) - Score ${top3[1]?.score.toFixed(2)}
        Briefly describe the intense competition in one punchy sentence for a large scoreboard display.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });
        setAiInsight(response.text || null);
      } catch (e) {
        console.error(e);
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    fetchInsight();
  }, [selectedEventId, rankings.length > 0]);

  const announceWinners = async () => {
    if (rankings.length === 0) return;
    setIsAnnouncing(true);
    try {
      const topWinner = rankings[0];
      const text = `The current champion for ${currentEvent?.name} is ${topWinner.name} from ${topWinner.district}, with an outstanding average score of ${topWinner.score.toFixed(2)} points. Congratulations to our top performer!`;
      
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const base64Audio = (response as any).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => setIsAnnouncing(false);
      } else {
        setIsAnnouncing(false);
      }
    } catch (error) {
      console.error(error);
      setIsAnnouncing(false);
    }
  };

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-700">
        <LayoutTemplate size={80} className="mb-6 opacity-10 animate-pulse" />
        <h2 className="text-3xl font-black font-header">Awaiting Festival Start</h2>
        <p className="font-medium">Live standings will appear here once the first ballot is cast.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12 space-y-16 max-w-7xl mx-auto">
      <div className="flex flex-col items-center space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-blue-400 font-black tracking-[0.4em] uppercase text-[10px]">
            <Sparkles size={12} /> Live Scoreboard <Sparkles size={12} />
          </div>
          <h1 className="text-5xl lg:text-8xl font-black font-header tracking-tighter bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent leading-none py-2">
            {currentEvent?.name.toUpperCase() || 'SELECT CATEGORY'}
          </h1>
          {aiInsight && (
            <p className="text-lg font-medium text-blue-400/80 italic max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4 duration-1000">
              "{aiInsight}"
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 glass px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</span>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent border-none text-blue-400 font-bold outline-none cursor-pointer text-sm"
            >
              {events.map(e => <option key={e.id} value={e.id} className="bg-slate-950">{e.name}</option>)}
            </select>
          </div>
          <button 
            onClick={announceWinners}
            disabled={isAnnouncing || rankings.length === 0}
            className="p-4 glass rounded-2xl border border-white/10 text-blue-400 hover:text-white hover:bg-blue-600/20 transition-all disabled:opacity-30"
            title="Announce Current Leader"
          >
            {isAnnouncing ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={24} />}
          </button>
        </div>
      </div>

      {rankings.length === 0 ? (
        <div className="glass p-24 rounded-[4rem] text-center border border-white/10">
          <Users size={64} className="mx-auto text-slate-900 mb-6" />
          <h3 className="text-2xl font-black text-slate-600">No Ballots Recorded</h3>
          <p className="text-slate-700 mt-2 font-medium">Scores will refresh automatically as judges submit their evaluations.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end mb-16 pt-24">
            {/* Silver */}
            <div className="order-2 lg:order-1 glass-card p-8 rounded-t-[3.5rem] border-b-0 border-white/10 relative h-[380px] flex flex-col justify-end items-center text-center group hover:bg-white/[0.05] transition-all">
              {rankings[1] && (
                <>
                  <div className="absolute -top-12 w-28 h-28 rounded-full bg-slate-300 border-[10px] border-[#020617] flex items-center justify-center text-slate-900 shadow-xl group-hover:scale-110 transition-transform">
                    <Medal size={48} />
                  </div>
                  <h3 className="text-2xl font-black mb-1">{rankings[1]?.name}</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">{rankings[1]?.district}</p>
                  <div className="text-6xl font-black text-slate-300 tracking-tighter">{rankings[1]?.score.toFixed(2)}</div>
                  <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 mt-3 uppercase">Silver Medalist</p>
                </>
              )}
            </div>

            {/* Gold */}
            <div className="order-1 lg:order-2 glass-card bg-gradient-to-b from-blue-600/10 to-transparent p-12 rounded-t-[4.5rem] border-b-0 border-blue-500/20 relative h-[500px] flex flex-col justify-end items-center text-center shadow-[0_-30px_60px_rgba(37,99,235,0.2)]">
              {rankings[0] && (
                <>
                  <div className="absolute -top-16 w-36 h-36 rounded-full bg-yellow-400 border-[12px] border-[#020617] flex items-center justify-center text-slate-950 shadow-[0_0_40px_rgba(250,204,21,0.4)] animate-float">
                    <Trophy size={64} />
                  </div>
                  <div className="absolute top-16 flex gap-1.5">
                    {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="#fbbf24" color="#fbbf24" className="animate-pulse" />)}
                  </div>
                  <h3 className="text-4xl font-black mb-1 tracking-tight">{rankings[0]?.name}</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-10">{rankings[0]?.district}</p>
                  <div className="text-9xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] tracking-tighter">{rankings[0]?.score.toFixed(2)}</div>
                  <p className="text-sm font-black tracking-[0.5em] text-yellow-500/80 mt-4 uppercase">Grand Champion</p>
                </>
              )}
            </div>

            {/* Bronze */}
            <div className="order-3 glass-card p-8 rounded-t-[3.5rem] border-b-0 border-white/10 relative h-[320px] flex flex-col justify-end items-center text-center group hover:bg-white/[0.05] transition-all">
              {rankings[2] && (
                <>
                  <div className="absolute -top-10 w-24 h-24 rounded-full bg-amber-700 border-[8px] border-[#020617] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                    <Medal size={40} />
                  </div>
                  <h3 className="text-xl font-black mb-1">{rankings[2]?.name}</h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6">{rankings[2]?.district}</p>
                  <div className="text-5xl font-black text-amber-600 tracking-tighter">{rankings[2]?.score.toFixed(2)}</div>
                  <p className="text-[10px] font-black tracking-[0.3em] text-amber-800 mt-2 uppercase">Bronze Medalist</p>
                </>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Rank</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Contestant</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-[0.3em] text-slate-500">District / Division</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-[0.3em] text-slate-500 text-right">Final Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rankings.map((rank, i) => (
                  <tr key={rank.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-10 py-8">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                        i === 0 ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 
                        i === 1 ? 'bg-slate-300 text-black shadow-lg shadow-slate-300/20' :
                        i === 2 ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-600 border border-white/10 group-hover:border-white/30 transition-colors'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="font-black text-xl group-hover:text-blue-400 transition-colors">{rank.name}</div>
                    </td>
                    <td className="px-10 py-8 text-slate-400 font-bold text-sm uppercase tracking-widest">{rank.district}</td>
                    <td className="px-10 py-8 text-right font-black text-3xl text-blue-400 tracking-tighter">
                      {rank.score > 0 ? rank.score.toFixed(2) : '--'}
                    </td>
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
