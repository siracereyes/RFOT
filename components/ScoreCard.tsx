
import React, { useState, useEffect } from 'react';
import { Criterion, Participant, EventType, Round } from '../types';
import { Save, User as UserIcon, MessageSquareQuote, Info, Hash, AlertTriangle, CheckCircle, BarChart3, Loader2, Lock } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const isQuizBee = type === EventType.QUIZ_BEE;

  // Sync state if initial props change (e.g., when selecting different participants)
  useEffect(() => {
    setScores(initialScores);
    setDeductions(initialDeductions);
    setCritique(initialCritique);
  }, [initialScores, initialDeductions, initialCritique]);

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

  const handleScoreChange = (id: string, value: string, max: number) => {
    if (isLocked) return;
    let num = parseFloat(value) || 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    
    setScores(prev => ({
      ...prev,
      [id]: num
    }));
  };

  const handleSaveInternal = async () => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      await onSave(scores, deductions, critique);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`glass-card rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border shadow-3xl transition-all relative ${isLocked ? 'border-red-500/20 grayscale-[0.3]' : 'border-white/10'}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] -z-10 pointer-events-none"></div>

      <div className="p-6 md:p-10 bg-gradient-to-b from-white/[0.03] to-transparent border-b border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center border border-white/10 shadow-xl transition-transform ${isLocked ? 'bg-slate-800' : 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20'}`}>
              <UserIcon size={32} className={isLocked ? 'text-slate-500' : 'text-blue-400'} />
            </div>
            <div className="min-w-0">
              <h4 className="text-2xl md:text-3xl font-black font-header tracking-tight text-white">{participant.name}</h4>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5">
                <p className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-[0.2em] font-black">{participant.district}</p>
                {isLocked ? (
                  <span className="flex items-center gap-1 text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">
                    <Lock size={10} /> Finalized
                  </span>
                ) : hasUnsavedChanges && (
                  <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">Changes Detected</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-center sm:text-right flex items-center gap-6 md:gap-8">
             <div className="h-12 md:h-16 w-px bg-white/5 hidden sm:block"></div>
             <div>
                <div className={`text-5xl md:text-6xl font-black font-header tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,0.2)] ${isLocked ? 'text-slate-500' : 'text-blue-400'}`}>{total}</div>
                <div className="text-[9px] md:text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Calculated Score</div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10 md:space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={18} className={isLocked ? 'text-slate-600' : 'text-blue-400'} />
              <h5 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white">Scoring Metrics</h5>
            </div>
            
            <div className="space-y-4 md:space-y-5">
              {isQuizBee ? (
                rounds.map((r) => (
                  <div key={r.id} className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${isLocked ? 'bg-white/[0.01] border-white/5' : 'bg-white/5 border-white/10 hover:border-blue-500/20'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {r.isTieBreaker && <span className="shrink-0 bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/30">Clincher</span>}
                        <label className="text-xs font-bold text-slate-300 truncate">{r.name}</label>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Points: {r.points}</p>
                    </div>
                    <input
                      type="number"
                      disabled={isLocked || isSaving}
                      value={scores[r.id] || ''}
                      onChange={(e) => handleScoreChange(r.id, e.target.value, 1000)}
                      className={`w-16 md:w-20 bg-slate-950 border border-white/10 rounded-xl py-2 px-1 text-lg font-black text-center outline-none transition-all shadow-inner ${isLocked ? 'text-slate-600' : 'text-blue-400 focus:border-blue-500'}`}
                      placeholder="0"
                    />
                  </div>
                ))
              ) : (
                criteria.map((c) => (
                  <div key={c.id} className="space-y-2 group">
                    <div className="flex justify-between items-end gap-2">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 truncate">
                        {c.name}
                        {c.description && <Info size={12} className="text-blue-500/40 shrink-0" title={c.description} />}
                      </label>
                      <span className="text-[8px] md:text-[9px] font-bold text-slate-700 whitespace-nowrap">Max {c.weight}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        disabled={isLocked || isSaving}
                        value={scores[c.id] || ''}
                        onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                        placeholder="0.0"
                        className={`w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 text-xl md:text-2xl font-black focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-800 ${
                          isLocked ? 'text-slate-500 cursor-not-allowed bg-transparent border-white/5' : 'text-white'
                        }`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-10">
            <div className={`p-6 md:p-8 border rounded-[1.5rem] md:rounded-[2.5rem] space-y-5 ${isLocked ? 'bg-transparent border-white/5' : 'bg-red-500/[0.03] border-red-500/10'}`}>
              <div className="flex items-center justify-between">
                <label className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${isLocked ? 'text-slate-600' : 'text-red-400'}`}>
                  <AlertTriangle size={16} /> Penalties
                </label>
                <span className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest">Deductions</span>
              </div>
              <input 
                type="number"
                disabled={isLocked || isSaving}
                value={deductions || ''}
                onChange={(e) => setDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className={`w-full bg-slate-950/40 border border-white/5 rounded-xl md:rounded-2xl px-6 py-3 md:py-4 text-2xl md:text-3xl font-black outline-none transition-all shadow-inner ${isLocked ? 'text-slate-600' : 'text-red-400 focus:border-red-500/30'}`}
              />
              <p className="text-[8px] md:text-[9px] text-slate-600 font-medium italic leading-relaxed">Adjustments for time violations or prop rule breaches.</p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <MessageSquareQuote size={16} className={isLocked ? 'text-slate-700' : 'text-blue-400'} /> Judge Remarks
              </label>
              <textarea
                value={critique}
                onChange={(e) => setCritique(e.target.value)}
                disabled={isLocked || isSaving}
                placeholder="Qualitative feedback..."
                className={`w-full h-28 md:h-32 bg-white/2 border border-white/10 rounded-xl md:rounded-[2rem] p-5 md:p-6 text-sm focus:border-blue-500/30 outline-none resize-none transition-all placeholder:text-slate-800 leading-relaxed shadow-inner ${isLocked ? 'text-slate-600 border-white/5' : 'text-slate-300'}`}
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center gap-6">
          <button
            disabled={isLocked || isSaving || !hasUnsavedChanges}
            onClick={handleSaveInternal}
            className={`flex-1 w-full py-5 md:py-6 rounded-xl md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs md:text-sm flex items-center justify-center gap-4 transition-all shadow-2xl ${
              isLocked || isSaving || !hasUnsavedChanges
                ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 active:scale-[0.98]'
            }`}
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : isLocked ? <Lock size={24} /> : hasUnsavedChanges ? <Save size={24} /> : <CheckCircle size={24} />}
            {isSaving ? 'Updating...' : isLocked ? 'Scoring Locked' : hasUnsavedChanges ? 'Update Score' : 'Score Up to Date'}
          </button>
          
          <div className="text-center sm:text-left">
            <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.2em] leading-tight">Sync Status</p>
            <p className="text-[8px] text-slate-700 italic">Scores are live-syncing to public leaderboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
