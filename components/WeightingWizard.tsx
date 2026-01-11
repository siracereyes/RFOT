
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { Criterion } from '../types';

interface WeightingWizardProps {
  initialCriteria?: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}

const WeightingWizard: React.FC<WeightingWizardProps> = ({ initialCriteria = [], onChange }) => {
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);

  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  }, [criteria]);

  const isValid = totalWeight === 100;
  const isExceeded = totalWeight > 100;

  const handleAddCriterion = () => {
    if (totalWeight >= 100) return;
    const newCriterion = { id: Math.random().toString(36).substr(2, 9), name: '', weight: 0, description: '' };
    const updated = [...criteria, newCriterion];
    setCriteria(updated);
    onChange(updated);
  };

  const handleUpdateCriterion = (id: string, field: keyof Criterion, value: string | number) => {
    const updated = criteria.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setCriteria(updated);
    onChange(updated);
  };

  const handleDeleteCriterion = (id: string) => {
    const updated = criteria.filter(c => c.id !== id);
    setCriteria(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold font-header">Scoring Criteria</h3>
          <p className="text-sm text-slate-400">Define weighted metrics and descriptions</p>
        </div>
        <div className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 ${
          isValid ? 'bg-emerald-500/20 text-emerald-400' : 
          isExceeded ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {totalWeight}%
        </div>
      </div>

      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden mb-8">
        <div 
          className={`h-full transition-all duration-500 ${isValid ? 'bg-emerald-500' : isExceeded ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(totalWeight, 100)}%` }}
        />
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {criteria.map((c, index) => (
          <div key={c.id} className="flex flex-col gap-3 p-4 glass rounded-xl group relative">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Criterion Name</label>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => handleUpdateCriterion(c.id, 'name', e.target.value)}
                  placeholder="e.g., Creativity"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Weight %</label>
                <input
                  type="number"
                  value={c.weight}
                  onChange={(e) => handleUpdateCriterion(c.id, 'weight', parseInt(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <button 
                onClick={() => handleDeleteCriterion(c.id)}
                className="mt-6 p-2 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block flex items-center gap-1">
                <MessageSquare size={10} /> Description / Guidelines for Judges
              </label>
              <textarea
                value={c.description || ''}
                onChange={(e) => handleUpdateCriterion(c.id, 'description', e.target.value)}
                placeholder="Explain what the judges should look for in this criterion..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-blue-500 outline-none transition-all text-xs h-16 resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddCriterion}
        disabled={totalWeight >= 100}
        className={`w-full py-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${
          totalWeight >= 100 
            ? 'border-slate-800 text-slate-700 cursor-not-allowed' 
            : 'border-white/10 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5'
        }`}
      >
        <Plus size={20} />
        Add Criterion
      </button>

      {isExceeded && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">Warning: Total weight exceeds 100%!</span>
        </div>
      )}
    </div>
  );
};

export default WeightingWizard;
