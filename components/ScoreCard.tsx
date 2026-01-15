
import React, { useState, useEffect, useMemo } from 'react';
import { Criterion, Participant, EventType, Round } from '../types';
import { Save, User as UserIcon, MessageSquareQuote, Info, Hash, AlertTriangle, CheckCircle, BarChart3, Loader2, Lock, Check, X, ShieldCheck, Zap } from 'lucide-react';

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
  const [scores, setScores] = useState<Record<string, number>>(initialScores || {});
  const [deductions, setDeductions] = useState<number>(initialDeductions);
  const [critique, setCritique] = useState(initialCritique);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const isQuizBee = type === EventType.QUIZ_BEE;

  useEffect(() => {
    setScores(initialScores || {});
    setDeductions(initialDeductions);
    setCritique(initialCritique);
  }, [initialScores, initialDeductions, initialCritique, participant.id]);

  useEffect(() => {
    const isScoresChanged = JSON.stringify(scores) !== JSON.stringify(initialScores || {});
    const isDeductionsChanged = deductions !== initialDeductions;
    const isCritiqueChanged = critique !== initialCritique;
    setHasUnsavedChanges(isScoresChanged || isDeductionsChanged || isCritiqueChanged);
  }, [scores, deductions, critique, initialScores, initialDeductions, initialCritique]);

  // Grouping logic for Quiz Bee Rounds
  const roundGroups = useMemo(() => {
    if (!isQuizBee) return [];
    const groups: { name: string; rounds: Round[]; color: string }[] = [
      { name: 'Easy Tier', rounds: [], color: 'text-emerald-400' },
      { name: 'Moderate Tier', rounds: [], color: 'text-blue-400' },
      { name: 'Difficult Tier', rounds: [], color: 'text-purple-400' },
      { name: 'Clinchers / Tie-Breakers', rounds: [], color: 'text-amber-400' },
      { name: 'Other Rounds', rounds: [], color: 'text-slate-400' }
    ];

    (rounds || []).forEach(r => {
      const name = r.name.toLowerCase();
      if (r.isTieBreaker || name.includes('clincher') || name.includes('tie')) groups[3].rounds.push(r);
      else if (name.includes('easy')) groups[0].rounds.push(r);
      else if (name.includes('moderate') || name.includes('medium') || name.includes('average')) groups[1].rounds.push(r);
      else if (name.includes('diff') || name.includes('hard')) groups[2].rounds.push(r);
      else groups[4].rounds.push(r);
    });

    return groups.filter(g => g.rounds.length > 0);
  }, [rounds, isQuizBee]);

  const rawTotal = isQuizBee 
    ? (rounds || []).reduce((sum, r) => sum + (Number(scores[r.id]) || 0), 0)
    : (criteria || []).reduce((sum, c) => sum + (Number(scores[c.id]) || 0), 0);

  const total = Math.max(0, rawTotal - deductions);

  const handleScoreChange = (id: string, value: string | number, max: number) => {
    if (isLocked) return;
    let num = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (isNaN(num)) num = 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    
    setScores(prev => ({
      ...prev,
      [id]: num
    }));
  };

  const handleToggleCorrect = (r: Round) => {
    const current = Number(scores[r.id]) || 0;
    handleScoreChange(r.id, current === r.points ? 0 : r.points, 1000);
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
    <div className={`glass-card rounded-[2.5rem] overflow-hidden border shadow-3xl transition-all relative ${isLocked ? 'border-red-500/20' : 'border-white/10'}`}>
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 blur-[80px] -z-10 pointer-events-none"></div>

      {/* Header Panel */}
      <div className="p-6 md:p-10 bg-white/[0.02] border-b border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl transition-all ${isLocked ? 'bg-slate-900 text-slate-700' : 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 text-blue-400'}`}>
              <UserIcon size={isQuizBee ? 36 : 42} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">{participant.district}</p>
              <h4 className="text-2xl md:text-4xl font-black font-header tracking-tight text-white leading-none">{participant.name}</h4>
              <div className="flex items-center gap-2 mt-3">
                {isLocked ? (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
                    <Lock size={12} /> Ballot Locked
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                    <Zap size={12} className="animate-pulse" /> Pending Sync
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                    <ShieldCheck size={12} /> Live Sync Active
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8 bg-slate-950/40 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-inner">
             <div className="text-right">
                <div className={`text-5xl md:text-7xl font-black font-header tabular-nums tracking-tighter ${isLocked ? 'text-slate-600' : 'text-blue-400'}`}>
                  {isQuizBee ? Math.round(total) : total.toFixed(2)}
                </div>
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1">Aggregated Score</div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-10 space-y-12">
        {isQuizBee ? (
          <div className="space-y-12">
            {roundGroups.map((group, gIdx) => (
              <div key={group.name} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${gIdx * 100}ms` }}>
                <div className="flex items-center justify-between border-l-4 border-white/10 pl-4">
                  <div>
                    <h5 className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] ${group.color}`}>{group.name}</h5>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      Progress: {group.rounds.filter(r => (scores[r.id] || 0) > 0).length} / {group.rounds.length} Rounds Won
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl md:text-2xl font-black text-white font-header">
                      {group.rounds.reduce((sum, r) => sum + (Number(scores[r.id]) || 0), 0)}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase ml-2">Tier Pts</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.rounds.map((r) => {
                    const isCorrect = (Number(scores[r.id]) || 0) === r.points;
                    const isPartial = (Number(scores[r.id]) || 0) > 0 && (Number(scores[r.id]) || 0) < r.points;
                    
                    return (
                      <div 
                        key={r.id} 
                        onClick={() => !isLocked && handleToggleCorrect(r)}
                        className={`p-4 rounded-[1.5rem] border transition-all cursor-pointer flex items-center justify-between gap-4 group/item ${
                          isCorrect 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : isPartial 
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate uppercase tracking-tight ${isCorrect ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-slate-400'}`}>
                            {r.name}
                          </p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">Value: {r.points}pt</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110' : 'bg-slate-900 text-slate-700 group-hover/item:text-slate-400'
                          }`}>
                            {isCorrect ? <Check size={20} /> : <X size={20} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={18} className="text-blue-400" />
                <h5 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white">Criterion Scoring Metrics</h5>
              </div>
              <div className="space-y-5">
                {criteria.map((c) => (
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
                        value={scores[c.id] ?? ''}
                        onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                        placeholder="0.0"
                        className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-black focus:border-blue-500 outline-none transition-all placeholder:text-slate-800 ${
                          isLocked ? 'text-slate-500 cursor-not-allowed bg-transparent border-white/5 shadow-none' : 'text-white shadow-inner'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <div className={`p-6 md:p-8 border rounded-[2rem] space-y-5 ${isLocked ? 'bg-transparent border-white/5' : 'bg-red-500/[0.03] border-red-500/10 shadow-inner'}`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${isLocked ? 'text-slate-600' : 'text-red-400'}`}>
                    <AlertTriangle size={16} /> Technical Deductions
                  </label>
                </div>
                <input 
                  type="number"
                  disabled={isLocked || isSaving}
                  value={deductions ?? 0}
                  onChange={(e) => setDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className={`w-full bg-slate-950/40 border border-white/5 rounded-2xl px-6 py-4 text-3xl font-black outline-none transition-all shadow-inner ${isLocked ? 'text-slate-600' : 'text-red-400 focus:border-red-500/30'}`}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <MessageSquareQuote size={16} className="text-blue-400" /> Qualitative Feedback
                </label>
                <textarea
                  value={critique || ''}
                  onChange={(e) => setCritique(e.target.value)}
                  disabled={isLocked || isSaving}
                  placeholder="Provide brief commentary on performance..."
                  className={`w-full h-32 bg-white/2 border border-white/10 rounded-[2rem] p-6 text-sm focus:border-blue-500/30 outline-none resize-none transition-all placeholder:text-slate-800 leading-relaxed shadow-inner ${isLocked ? 'text-slate-600 border-white/5' : 'text-slate-300'}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center gap-6">
          <button
            disabled={isLocked || isSaving || !hasUnsavedChanges}
            onClick={handleSaveInternal}
            className={`flex-1 w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-[0.98] ${
              isLocked || isSaving || !hasUnsavedChanges
                ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
            }`}
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : isLocked ? <Lock size={20} /> : <Save size={20} />}
            {isSaving ? 'Synchronizing Data...' : isLocked ? 'Ballot Finalized' : hasUnsavedChanges ? 'Commit Scores to Board' : 'No Changes to Sync'}
          </button>
          
          <div className="text-center sm:text-left px-4">
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] leading-tight">Data Integrity</p>
            <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest mt-0.5">Automated tabulation engine active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
