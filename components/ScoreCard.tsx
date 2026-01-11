
import React, { useState, useEffect } from 'react';
import { Criterion, Participant } from '../types';
import { Save, User as UserIcon } from 'lucide-react';

interface ScoreCardProps {
  participant: Participant;
  criteria: Criterion[];
  isLocked: boolean;
  onSave: (scores: Record<string, number>) => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ participant, criteria, isLocked, onSave }) => {
  const [scores, setScores] = useState<Record<string, number>>({});
  
  const total = criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);

  const handleScoreChange = (id: string, value: string, max: number) => {
    let num = parseFloat(value) || 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    
    setScores(prev => ({
      ...prev,
      [id]: num
    }));
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="p-6 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <UserIcon size={24} className="text-blue-400" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-header">{participant.name}</h4>
            <p className="text-sm text-slate-400">{participant.district}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {criteria.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">{c.name}</label>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400">
                  Max: {c.weight}
                </span>
              </div>
              <input
                type="number"
                disabled={isLocked}
                value={scores[c.id] || ''}
                onChange={(e) => handleScoreChange(c.id, e.target.value, c.weight)}
                placeholder={`0.00`}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold text-center focus:border-blue-500 outline-none transition-all ${
                  isLocked ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Total Score</p>
            <p className="text-4xl font-black text-blue-400">{total.toFixed(2)}</p>
          </div>
          <button
            disabled={isLocked}
            onClick={() => onSave(scores)}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              isLocked 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            <Save size={20} />
            Submit Score
          </button>
        </div>
      </div>
      
      {isLocked && (
        <div className="p-3 bg-red-500/10 text-red-400 text-center text-xs font-bold border-t border-red-500/20">
          EVENT IS LOCKED. SCORING DISABLED.
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
