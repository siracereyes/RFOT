
import React, { useState, useEffect } from 'react';
import { Criterion, Participant, EventType, Round } from '../types';
// Added BarChart3 to the imports
import { Save, User as UserIcon, Sparkles, Loader2, MessageSquareQuote, Info, Hash, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface ScoreCardProps {
  participant: Participant;
  criteria?: Criterion[];
  rounds?: Round[];
  type: EventType;
  isLocked: boolean;
  initialScores?: Record<string, number>;
  initialDeductions?: number;
  initialCritique?: string;
  onSave: (scores: Record<string, number>, deductions: number, critique?: string) => Promise<void>;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ 
  participant, 
  criteria = [], 
  rounds = [], 
  type, 
  isLocked, 
  initialScores = {}, 
  initialDeductions = 0,
  initialCritique = '', 
  onSave 
}) => {
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [deductions, setDeductions] = useState<number>(initialDeductions);
  const [critique, setCritique] = useState(initialCritique);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const isQuizBee = type === EventType.QUIZ_BEE;

  // Track changes to show unsaved indicator
  useEffect(() => {
    const isScoresChanged = JSON.stringify(scores) !== JSON.stringify(initialScores);
    const isDeductionsChanged = deductions !== initialDeductions;
    const isCritiqueChanged = critique !== initialCritique;
    setHasUnsavedChanges(isScoresChanged || isDeductionsChanged || isCritiqueChanged);
  }, [scores, deductions, critique, initialScores, initialDeductions, initialCritique]);

  const rawTotal = isQuizBee 
    ? rounds.reduce((sum, r) => sum + (scores[r.id] || 0), 0)
    : criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);

  const total = Math.max(0, rawTotal - deductions);

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
      await onSave(scores, deductions, critique);
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
      // Corrected Initialization: Always use a named parameter for the API key.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as a professional talent judge for the "Regional Festival of Talents". 
      The participant ${participant.name} from ${participant.district} received the following scores:
      ${isQuizBee 
        ? rounds.map(r => `${r.name}: ${scores[r.id] || 0}/${r.points}`).join(', ')
        : criteria.map(c => `${c.name}: ${scores[c.id] || 0}/${c.weight}`).join(', ')
      }
      Deductions: ${deductions}.
      Final Total Score: ${total.toFixed(2)}/${maxPossible}.
      Generate a professional, encouraging, and constructive critique (max 2 sentences).`;

      // Corrected Method: use ai.models.generateContent to query GenAI with both the model name and prompt.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      // Corrected Extraction: Access the .text property directly (not a method).
      setCritique(response.text || '');
    } catch (error) {
      error.message && console.error("AI Generation failed:", error.message);
      alert("AI Service currently unavailable.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-3xl transition-all relative">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] -z-10 pointer-events-none"></div>

      <div className="p-10 bg-gradient-to-b from-white/[0.03] to-transparent border-b border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center border border-white/10 shadow-xl group-hover:scale-110 transition-transform">
              <UserIcon size={40} className="text-blue-400" />
            </div>
            <div>
              <h4 className="text-3xl font-black font-header tracking-tight text-white">{participant.name}</h4>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-[11px] text-slate-400 uppercase tracking-[0.3em] font-black">{participant.district}</p>
                {hasUnsavedChanges && (
                  <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 animate-pulse">Unsaved Ballot</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-8">
             <div className="h-16 w-px bg-white/5 hidden md:block"></div>
             <div>
                <div className="text-6xl font-black text-blue-400 font-header tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]">{total}</div>
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1 text-right">Running Total</div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={18} className="text-blue-400" />
              <h5 className="text-[11px] font-black uppercase tracking-widest text-white">Evaluation Criteria</h5>
            </div>
            
            <div className="space-y-5">
              {isQuizBee ? (
                rounds.map((r) => (
                  <div key={r.id} className="group flex items-center gap-4 bg-white/2 p-4 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {r.isTieBreaker && <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/30">Clincher</span>}
                        <label className="text-xs font-bold text-slate-300">{r.name}</label>
                      </div>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Points: {r.points}</p>
                    </div>
                    <input
                      type="number"
                      disabled={isLocked || isSaving}
                      value={scores[r.id] || ''}
                      onChange={(e) => handleScoreChange(r.id, e.target.value, 1000)}
                      className="w-20 bg-slate-950 border border-white/10 rounded-xl py-2 px-1 text-lg font-black text-center text-blue-400 focus:border-blue-500 outline-none transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                ))
              ) : (
                criteria.map((c) => (
                  <div key={c.id} className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        {c.name}
                        {c.description && <Info size={12} className="text-blue-500/40 hover:text-blue-400 cursor-help" title={c.description} />}
                      </label>
                      <span className="text-[9px] font-bold text-slate-700">Max {c.weight}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        disabled={isLocked || isSaving}
                        value={scores[c.id] || ''}
                        onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                        placeholder="0.0"
                        className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-2xl font-black text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-800 ${
                          isLocked || isSaving ? 'opacity-40 grayscale' : ''
                        }`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-10">
            {/* Penalty Section */}
            <div className="p-8 bg-red-500/[0.03] border border-red-500/10 rounded-[2.5rem] space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                  <AlertTriangle size={16} /> Penalty Deductions
                </label>
                <span className="text-[9px] font-black text-red-500/40 uppercase tracking-widest">Subtract Points</span>
              </div>
              <input 
                type="number"
                disabled={isLocked || isSaving}
                value={deductions || ''}
                onChange={(e) => setDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-6 py-4 text-3xl font-black text-red-400 focus:border-red-500/30 outline-none transition-all shadow-inner"
              />
              <p className="text-[9px] text-slate-600 font-medium italic leading-relaxed">Deduct points for overtime (e.g., -1 pt per 30s) or violation of competition guidelines.</p>
            </div>

            {/* Critique Section */}
            {!isQuizBee && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <MessageSquareQuote size={16} className="text-blue-400" /> Judge's Comments
                  </label>
                  <button 
                    onClick={generateCritique}
                    disabled={isLocked || isGenerating || isSaving}
                    className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-400 hover:text-white flex items-center gap-2 bg-blue-400/10 hover:bg-blue-600 px-4 py-2 rounded-xl transition-all disabled:opacity-30 border border-blue-400/20"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {isGenerating ? 'Drafting...' : 'AI Assist'}
                  </button>
                </div>
                <textarea
                  value={critique}
                  onChange={(e) => setCritique(e.target.value)}
                  disabled={isLocked || isSaving}
                  placeholder="Strengths and areas for development..."
                  className="w-full h-32 bg-white/2 border border-white/10 rounded-[2rem] p-6 text-sm text-slate-300 focus:border-blue-500/30 outline-none resize-none transition-all placeholder:text-slate-800 leading-relaxed shadow-inner"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center gap-6">
          <button
            disabled={isLocked || isSaving || !hasUnsavedChanges}
            onClick={handleSaveInternal}
            className={`flex-1 w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden ${
              isLocked || isSaving || !hasUnsavedChanges
                ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 hover:-translate-y-1 active:scale-[0.98]'
            }`}
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : hasUnsavedChanges ? <Save size={24} /> : <CheckCircle size={24} />}
            {isSaving ? 'Synchronizing...' : hasUnsavedChanges ? 'Submit Evaluation Ballot' : 'Ballot Already Recorded'}
          </button>
          
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] leading-tight">Board Finality Rule</p>
            <p className="text-[9px] text-slate-600 italic">Scores are irrevocable once the category is closed by the admin.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
