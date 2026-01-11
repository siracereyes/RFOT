
import React, { useState } from 'react';
import { Criterion, Participant } from '../types';
import { Save, User as UserIcon, Sparkles, Loader2, MessageSquareQuote } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface ScoreCardProps {
  participant: Participant;
  criteria: Criterion[];
  isLocked: boolean;
  initialScores?: Record<string, number>;
  initialCritique?: string;
  onSave: (scores: Record<string, number>, critique?: string) => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ participant, criteria, isLocked, initialScores = {}, initialCritique = '', onSave }) => {
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [critique, setCritique] = useState(initialCritique);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const total = criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);
  const maxPossible = criteria.reduce((sum, c) => sum + c.weight, 0);
  const percentage = (total / maxPossible) * 100;

  const handleScoreChange = (id: string, value: string, max: number) => {
    let num = parseFloat(value) || 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    
    setScores(prev => ({
      ...prev,
      [id]: num
    }));
  };

  const generateCritique = async () => {
    if (total === 0) {
      alert("Please enter some scores before generating a critique.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const prompt = `Act as a professional talent judge for the "Regional Festival of Talents". 
      The participant ${participant.name} from ${participant.district} received the following scores:
      ${criteria.map(c => `${c.name}: ${scores[c.id] || 0}/${c.weight}`).join(', ')}
      Total Score: ${total.toFixed(2)}/${maxPossible}.
      Generate a professional, encouraging, and constructive critique (max 3 sentences).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setCritique(response.text || '');
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("AI Service currently unavailable. Please write manual feedback.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all hover:border-blue-500/30 group">
      <div className="p-6 bg-gradient-to-r from-blue-600/10 to-transparent border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              <UserIcon size={28} className="text-blue-400" />
            </div>
            <div>
              <h4 className="text-xl font-bold font-header tracking-tight">{participant.name}</h4>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{participant.district}</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-3xl font-black text-blue-400 font-header">{total.toFixed(1)}</div>
             <div className="text-[10px] text-slate-500 uppercase font-black">Points Total</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {criteria.map((c) => (
            <div key={c.id} className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{c.name}</label>
                <span className="text-xs font-bold text-blue-400/80">Max {c.weight}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  disabled={isLocked}
                  value={scores[c.id] || ''}
                  onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                  placeholder={`0.0`}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-3xl font-black text-center focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-800 ${
                    isLocked ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-blue-500/30 rounded-full transition-all duration-500" 
                  style={{ width: `${((scores[c.id] || 0) / c.weight) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <MessageSquareQuote size={14} /> Judge's Critique
            </label>
            <button 
              onClick={generateCritique}
              disabled={isLocked || isGenerating}
              className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-400/10 px-2 py-1 rounded transition-colors disabled:opacity-30"
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {isGenerating ? 'Analyzing...' : 'AI Assistant'}
            </button>
          </div>
          <textarea
            value={critique}
            onChange={(e) => setCritique(e.target.value)}
            disabled={isLocked}
            placeholder="Enter comments or use AI assistant..."
            className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 focus:border-blue-500/50 outline-none resize-none transition-all"
          />
        </div>

        <button
          disabled={isLocked}
          onClick={() => onSave(scores, critique)}
          className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
            isLocked 
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 active:scale-[0.98]'
          }`}
        >
          <Save size={18} />
          Finalize Scoresheet
        </button>
      </div>
      
      {isLocked && (
        <div className="py-2 bg-red-500/10 text-red-400 text-center text-[10px] font-black border-t border-red-500/20 tracking-[0.2em] uppercase">
          Locked by Administrator
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
