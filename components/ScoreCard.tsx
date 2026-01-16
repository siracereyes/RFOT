
import React, { useState, useEffect, useMemo } from 'react';
import { Criterion, Participant, EventType, Round } from '../types';
import { Save, User as UserIcon, MessageSquareQuote, Info, Hash, AlertTriangle, CheckCircle, BarChart3, Loader2, Lock, Check, X, ShieldCheck, Zap, Edit3 } from 'lucide-react';

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

  const roundGroups = useMemo(() => {
    if (!isQuizBee) return [];
    const groups: { name: string; rounds: Round[]; color: string; bgColor: string }[] = [
      { name: 'Primary Tiers', rounds: [], color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { name: 'Tie-Breakers', rounds: [], color: 'text-amber-600', bgColor: 'bg-amber-50' }
    ];

    (rounds || []).forEach(r => {
      const name = r.name.toLowerCase();
      if (r.isTieBreaker || name.includes('clincher') || name.includes('tie')) groups[1].rounds.push(r);
      else groups[0].rounds.push(r);
    });

    return groups.filter(g => g.rounds.length > 0);
  }, [rounds, isQuizBee]);

  const rawTotal = isQuizBee 
    ? (rounds || []).reduce((sum, r) => sum + (Number(scores[r.id]) || 0), 0)
    : (criteria || []).reduce((sum, c) => sum + (Number(scores[c.id]) || 0), 0);

  const total = Math.max(0, rawTotal - deductions);

  const handleScoreChange = (id: string, value: string | number, max: number, ignoreMax: boolean = false) => {
    if (isLocked) return;
    let num = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (isNaN(num)) num = 0;
    
    // For Quiz Bee, the user requested removing the max number constraint
    if (!ignoreMax && num > max) num = max;
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
    <div className={`bg-white rounded-[2.5rem] overflow-hidden transition-all relative border ${isLocked ? 'border-red-200 bg-red-50/10' : 'border-slate-200 shadow-xl'}`}>
      {/* Header Panel */}
      <div className="p-6 md:p-10 bg-slate-50/50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-3xl flex items-center justify-center border shadow-sm transition-all ${isLocked ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-white text-blue-600 border-slate-100'}`}>
              <UserIcon size={isQuizBee ? 36 : 42} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{participant.district}</p>
              <h4 className="text-2xl md:text-4xl font-black font-header tracking-tight text-slate-900 leading-none">{participant.name}</h4>
              <div className="flex items-center gap-2 mt-3">
                {isLocked ? (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-600 bg-red-100 px-3 py-1 rounded-full">
                    <Lock size={12} /> Ballot Locked
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                    <Zap size={12} className="animate-pulse" /> Pending Sync
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                    <ShieldCheck size={12} /> Live Sync Active
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
             <div className="text-right">
                <div className={`text-5xl md:text-7xl font-black font-header tabular-nums tracking-tighter ${isLocked ? 'text-slate-400' : 'text-blue-600'}`}>
                  {isQuizBee ? Math.round(total) : total.toFixed(2)}
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Aggregated Score</div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-10 space-y-12 bg-white">
        {isQuizBee ? (
          <div className="space-y-12">
            {roundGroups.map((group) => (
              <div key={group.name} className="space-y-6">
                <div className="flex items-center justify-between border-l-4 border-slate-200 pl-4">
                  <div>
                    <h5 className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] ${group.color}`}>{group.name}</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Enter total accumulated points per level
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.rounds.map((r) => (
                    <div 
                      key={r.id} 
                      className={`p-6 rounded-[2rem] border transition-all flex flex-col gap-4 ${
                        (scores[r.id] || 0) > 0 
                          ? 'bg-blue-50/50 border-blue-100 shadow-sm' 
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-900">{r.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Accumulated Score</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-blue-600">
                          <Edit3 size={14} />
                        </div>
                      </div>
                      
                      <div className="relative">
                        <input 
                          type="number"
                          disabled={isLocked || isSaving}
                          value={scores[r.id] ?? ''}
                          onChange={(e) => handleScoreChange(r.id, e.target.value, 1000, true)}
                          placeholder="0"
                          className={`w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-4xl font-black outline-none transition-all placeholder:text-slate-200 ${
                            isLocked ? 'text-slate-400 bg-slate-50/50' : 'text-blue-600 focus:border-blue-500 shadow-inner'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={18} className="text-blue-600" />
                <h5 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-900">Criterion Metrics</h5>
              </div>
              <div className="space-y-5">
                {criteria.map((c) => (
                  <div key={c.id} className="space-y-2 group">
                    <div className="flex justify-between items-end gap-2">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 truncate">
                        {c.name}
                        {c.description && <Info size={12} className="text-blue-400 shrink-0" title={c.description} />}
                      </label>
                      <span className="text-[8px] md:text-[9px] font-bold text-slate-400 whitespace-nowrap">Max {c.weight}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        disabled={isLocked || isSaving}
                        value={scores[c.id] ?? ''}
                        onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                        placeholder="0.0"
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-black focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 ${
                          isLocked ? 'text-slate-400 cursor-not-allowed border-slate-100' : 'text-slate-900 shadow-inner'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <div className={`p-6 md:p-8 border rounded-[2rem] space-y-5 ${isLocked ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${isLocked ? 'text-slate-400' : 'text-red-600'}`}>
                    <AlertTriangle size={16} /> Technical Deductions
                  </label>
                </div>
                <input 
                  type="number"
                  disabled={isLocked || isSaving}
                  value={deductions ?? 0}
                  onChange={(e) => setDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className={`w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-3xl font-black outline-none transition-all ${isLocked ? 'text-slate-300 border-slate-100' : 'text-red-600 focus:border-red-400 shadow-inner'}`}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <MessageSquareQuote size={16} className="text-blue-600" /> Qualitative Feedback
                </label>
                <textarea
                  value={critique || ''}
                  onChange={(e) => setCritique(e.target.value)}
                  disabled={isLocked || isSaving}
                  placeholder="Brief commentary..."
                  className={`w-full h-32 bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-sm focus:border-blue-300 outline-none resize-none transition-all placeholder:text-slate-300 leading-relaxed shadow-inner ${isLocked ? 'text-slate-300' : 'text-slate-700'}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-6">
          <button
            disabled={isLocked || isSaving || !hasUnsavedChanges}
            onClick={handleSaveInternal}
            className={`flex-1 w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 transition-all active:scale-[0.98] ${
              isLocked || isSaving || !hasUnsavedChanges
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
            }`}
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : isLocked ? <Lock size={20} /> : <Save size={20} />}
            {isSaving ? 'Syncing...' : isLocked ? 'Finalized' : hasUnsavedChanges ? 'Update Ballot' : 'No Changes'}
          </button>
          
          <div className="text-center sm:text-left px-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-tight">Data Integrity</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Live tabulation active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
