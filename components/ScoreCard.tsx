
import React, { useState } from 'react';
import { Criterion, Participant, EventType, Round } from '../types';
import { Save, User as UserIcon, Sparkles, Loader2, MessageSquareQuote, Info, Hash } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface ScoreCardProps {
  participant: Participant;
  criteria?: Criterion[];
  rounds?: Round[];
  type: EventType;
  isLocked: boolean;
  initialScores?: Record<string, number>;
  initialCritique?: string;
  onSave: (scores: Record<string, number>, critique?: string) => Promise<void>;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ 
  participant, 
  criteria = [], 
  rounds = [], 
  type, 
  isLocked, 
  initialScores = {}, 
  initialCritique = '', 
  onSave 
}) => {
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [critique, setCritique] = useState(initialCritique);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isQuizBee = type === EventType.QUIZ_BEE;

  const total = isQuizBee 
    ? rounds.reduce((sum, r) => sum + (scores[r.id] || 0), 0)
    : criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);

  const maxPossible = isQuizBee
    ? rounds.reduce((sum, r) => sum + r.points, 0)
    : criteria.reduce((sum, c) => sum + c.weight, 0);

  const handleScoreChange = (id: string, value: string, max: number) => {
    let num = parseFloat(value) || 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    
    setScores(prev => ({
      ...prev,
      [id]: num
    }));
  };

  const handleSaveInternal = async () => {
    setIsSaving(true);
    try {
      await onSave(scores, critique);
    } finally {
      setIsSaving(false);
    }
  };

  const generateCritique = async () => {
    if (total === 0) {
      alert("Please enter some scores before generating a critique.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as a professional talent judge for the "Regional Festival of Talents". 
      The participant ${participant.name} from ${participant.district} received the following scores in ${isQuizBee ? 'a Quiz Bee' : 'a Judging Event'}:
      ${isQuizBee 
        ? rounds.map(r => `${r.name}: ${scores[r.id] || 0}/${r.points}`).join(', ')
        : criteria.map(c => `${c.name}: ${scores[c.id] || 0}/${c.weight}`).join(', ')
      }
      Total Score: ${total.toFixed(2)}/${maxPossible}.
      Generate a professional, encouraging, and constructive critique (max 2 sentences).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setCritique(response.text || '');
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("AI Service currently unavailable.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl transition-all hover:border-blue-500/30 group">
      <div className="p-8 bg-gradient-to-r from-blue-600/10 to-transparent border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              <UserIcon size={32} className="text-blue-400" />
            </div>
            <div>
              <h4 className="text-2xl font-black font-header tracking-tight">{participant.name}</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-1">{participant.district}</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-4xl font-black text-blue-400 font-header drop-shadow-sm">{total}</div>
             <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">Total Points</div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {isQuizBee ? (
            rounds.map((r) => (
              <div key={r.id} className="flex items-center gap-6 bg-white/5 p-4 rounded-3xl border border-white/5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {r.isTieBreaker ? (
                      <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/30">Tie Breaker</span>
                    ) : (
                      <Hash size={12} className="text-blue-400" />
                    )}
                    <label className="text-xs font-black uppercase tracking-widest text-slate-300">{r.name}</label>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Max Score: {r.points}pts</p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    disabled={isLocked || isSaving}
                    value={scores[r.id] || ''}
                    onChange={(e) => handleScoreChange(r.id, e.target.value, r.points)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-2 text-xl font-black text-center text-white focus:border-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            ))
          ) : (
            criteria.map((c) => (
              <div key={c.id} className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      {c.name}
                      {c.description && <Info size={12} className="text-blue-400 opacity-60" title={c.description} />}
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-blue-500/60 bg-blue-500/5 px-2 py-1 rounded">Max {c.weight}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    disabled={isLocked || isSaving}
                    value={scores[c.id] || ''}
                    onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                    placeholder={`0.0`}
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-4xl font-black text-center focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-800 ${
                      isLocked || isSaving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {!isQuizBee && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <MessageSquareQuote size={14} /> Evaluation Comments
              </label>
              <button 
                onClick={generateCritique}
                disabled={isLocked || isGenerating || isSaving}
                className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-2 bg-blue-400/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 shadow-sm"
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isGenerating ? 'Drafting...' : 'AI Drafting'}
              </button>
            </div>
            <textarea
              value={critique}
              onChange={(e) => setCritique(e.target.value)}
              disabled={isLocked || isSaving}
              placeholder="Describe strengths and areas for improvement..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-slate-300 focus:border-blue-500/50 outline-none resize-none transition-all placeholder:text-slate-700 leading-relaxed"
            />
          </div>
        )}

        <button
          disabled={isLocked || isSaving}
          onClick={handleSaveInternal}
          className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all ${
            isLocked || isSaving
              ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-white/5' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/30 active:scale-[0.98]'
          }`}
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {isSaving ? 'Submitting Ballot...' : 'Submit Evaluation Ballot'}
        </button>
      </div>
    </div>
  );
};

export default ScoreCard;
