
import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Star, LayoutTemplate, Users, Sparkles, Volume2, Loader2, Info } from 'lucide-react';
import { Event, Participant, Score, EventType } from '../types';
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
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const mapScore = (db: any): Score => ({
    id: db.id,
    judgeId: db.judge_id,
    participantId: db.participant_id,
    eventId: db.event_id,
    criteriaScores: db.criteria_scores,
    totalScore: db.total_score,
    critique: db.critique
  });

  useEffect(() => {
    setScores(initialScores);
  }, [initialScores]);

  useEffect(() => {
    const channel = supabase
      .channel('public_leaderboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setScores(prev => [...prev, mapScore(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setScores(prev => prev.map(s => s.id === payload.new.id ? mapScore(payload.new) : s));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (events.length > 0 && (!selectedEventId || !events.find(e => e.id === selectedEventId))) {
      setSelectedEventId(events[0].id);
    }
  }, [events]);

  const currentEvent = events.find(e => e.id === selectedEventId);
  
  const rankings = useMemo(() => {
    if (!selectedEventId || !currentEvent) return [];
    
    const eventParticipants = participants.filter(p => p.eventId === selectedEventId);
    const eventScores = scores.filter(s => s.eventId === selectedEventId);

    if (currentEvent.type === EventType.QUIZ_BEE) {
      return eventParticipants
        .map(p => {
          const pScores = eventScores.filter(s => s.participantId === p.id);
          const total = pScores.reduce((sum, s) => sum + s.totalScore, 0);
          return { ...p, score: total, displayScore: total.toString() };
        })
        .sort((a, b) => b.score - a.score);
    } else {
      const judgeIds = [...new Set(eventScores.map(s => s.judgeId))] as string[];
      if (judgeIds.length === 0) return eventParticipants.map(p => ({ ...p, score: 0, rankSum: 0, displayScore: '0' }));

      const judgeRanks: Record<string, Record<string, number>> = {};
      judgeIds.forEach(jId => {
        const jScores = eventScores.filter(s => s.judgeId === jId);
        const sorted = [...jScores].sort((a, b) => b.totalScore - a.totalScore);
        judgeRanks[jId] = {};
        sorted.forEach((s, idx) => judgeRanks[jId][s.participantId] = idx + 1);
        eventParticipants.forEach(p => { if (!judgeRanks[jId][p.id]) judgeRanks[jId][p.id] = eventParticipants.length; });
      });

      return eventParticipants.map(p => {
        let rankSum = 0;
        judgeIds.forEach(jId => rankSum += judgeRanks[jId][p.id]);
        const pScores = eventScores.filter(s => s.participantId === p.id);
        const avgRaw = pScores.length > 0 ? pScores.reduce((sum, s) => sum + s.totalScore, 0) / pScores.length : 0;
        return { ...p, rankSum, score: avgRaw, displayScore: rankSum.toString() };
      }).sort((a, b) => a.rankSum - b.rankSum || b.score - a.score);
    }
  }, [selectedEventId, participants, scores, currentEvent]);

  useEffect(() => {
    const fetchInsight = async () => {
      if (rankings.length < 2 || isGeneratingInsight) return;
      setIsGeneratingInsight(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const top3 = rankings.slice(0, 3);
        const prompt = `RFOT Commentator: In "${currentEvent?.name}", ${top3[0]?.name} is leading. Summarize in 10 words.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        setAiInsight(response.text || null);
      } catch (e) { console.error(e); } finally { setIsGeneratingInsight(false); }
    };
    fetchInsight();
  }, [selectedEventId, rankings.length]);

  const announceWinners = async () => {
    if (rankings.length === 0) return;
    setIsAnnouncing(true);
    try {
      const topWinner = rankings[0];
      const text = `The champion for ${currentEvent?.name} is ${topWinner.name} from ${topWinner.district}.`;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = audioContext.createBufferSource();
        source.buffer = buffer; source.connect(audioContext.destination); source.start();
        source.onended = () => setIsAnnouncing(false);
      } else setIsAnnouncing(false);
    } catch (e) { console.error(e); setIsAnnouncing(false); }
  };

  return (
    <div className="min-h-screen p-6 lg:p-12 space-y-16 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col items-center space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-7xl font-black font-header tracking-tighter text-white">{currentEvent?.name.toUpperCase() || 'STANDINGS'}</h1>
          {aiInsight && <p className="text-lg font-medium text-blue-400 italic">"{aiInsight}"</p>}
          <p className="text-[10px] font-black uppercase text-emerald-400">Sum of Ranks System Active (Lowest wins)</p>
        </div>
        <div className="flex gap-4">
          <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="glass px-6 py-3 rounded-2xl border-white/10 text-blue-400 font-bold bg-slate-950">
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={announceWinners} className="p-4 glass rounded-2xl border-white/10 text-blue-400">{isAnnouncing ? <Loader2 className="animate-spin" /> : <Volume2 />}</button>
        </div>
      </div>

      <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Rank</th>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Contestant</th>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">SDO</th>
              <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Rank Sum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rankings.map((r, i) => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-10 py-8 font-black text-xl text-white">{i + 1}</td>
                <td className="px-10 py-8 font-black text-lg text-white">{r.name}</td>
                <td className="px-10 py-8 text-slate-400 font-bold">{r.district}</td>
                <td className="px-10 py-8 text-right font-black text-3xl text-blue-400">{r.displayScore}</td>
              </tr>
            ))}
            {rankings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-10 py-20 text-center text-slate-500 italic">No scores submitted yet for this event.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
