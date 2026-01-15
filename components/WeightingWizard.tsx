
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black font-header text-slate-900">Scoring Criteria</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Weight distribution and metrics</p>
        </div>
        <div className={`px-5 py-2.5 rounded-full font-black text-xs flex items-center gap-2 border ${
          isValid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
          isExceeded ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {isValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {totalWeight}% Distribution
        </div>
      </div>

      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className={`h-full transition-all duration-700 ${isValid ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : isExceeded ? 'bg-red-500' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]'}`}
          style={{ width: `${Math.min(totalWeight, 100)}%` }}
        />
      </div>

      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-3 no-scrollbar">
        {criteria.map((c, index) => (
          <div key={c.id} className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-5 transition-all group hover:bg-white hover:shadow-sm">
            <div className="flex gap-6 items-start">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Criterion Identity</label>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => handleUpdateCriterion(c.id, 'name', e.target.value)}
                  placeholder="e.g., Performance Technique"
                  className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900"
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Weight (%)</label>
                <input
                  type="number"
                  value={c.weight}
                  onChange={(e) => handleUpdateCriterion(c.id, 'weight', parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 focus:border-blue-500 outline-none transition-all text-sm font-black text-center text-blue-600"
                />
              </div>
              <button 
                onClick={() => handleDeleteCriterion(c.id)}
                className="mt-8 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-1.5">
                <MessageSquare size={12} className="text-blue-400" /> Evaluation Guidelines
              </label>
              <textarea
                value={c.description || ''}
                onChange={(e) => handleUpdateCriterion(c.id, 'description', e.target.value)}
                placeholder="Clarify specific focus points for evaluators..."
                className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 focus:border-blue-500 outline-none transition-all text-xs font-medium text-slate-600 h-24 resize-none leading-relaxed"
              />
            </div>
          </div>
        ))}
        {criteria.length === 0 && (
           <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No criteria defined for this contest</p>
           </div>
        )}
      </div>

      <button
        onClick={handleAddCriterion}
        disabled={totalWeight >= 100}
        className={`w-full py-5 border-2 border-dashed rounded-[2rem] flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-xs ${
          totalWeight >= 100 
            ? 'border-slate-100 text-slate-200 cursor-not-allowed' 
            : 'border-slate-200 text-slate-400 hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        <Plus size={20} />
        Append New Criterion
      </button>

      {isExceeded && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-5 rounded-2xl border border-red-100 animate-pulse">
          <AlertCircle size={20} />
          <span className="text-xs font-black uppercase tracking-wide">Validation Error: Aggregated weight exceeds 100%!</span>
        </div>
      )}
    </div>
  );
};

export default WeightingWizard;
