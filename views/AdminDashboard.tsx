
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, Trash2, Key, UserCheck, Loader2, Save, Mail, ShieldCheck, AlertTriangle, Settings, ToggleLeft, ToggleRight, Hash, RefreshCw, Zap, BookOpen, Music, Microscope } from 'lucide-react';
import WeightingWizard from '../components/WeightingWizard';
import { Event, EventType, Criterion, Participant, User, UserRole, Score, Round } from '../types';
import { SDO_LIST } from '../constants';
import { authClient } from '../supabase';

interface AdminDashboardProps {
  events: Event[];
  participants: Participant[];
  users: User[];
  scores: Score[];
  registrationEnabled: boolean;
  onToggleRegistration: (enabled: boolean) => void;
  onAddEvent: (e: Event) => void;
  onUpdateEvent: (e: Event) => void;
  onAddParticipant: (p: Participant) => void;
  onUpdateParticipant: (p: Participant) => void;
  onDeleteParticipant: (id: string) => void;
  onAddJudge: (u: any) => Promise<any>;
  onRemoveJudge: (id: string) => void;
  onRefreshData: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  events, 
  participants, 
  users, 
  scores, 
  registrationEnabled,
  onToggleRegistration,
  onAddEvent, 
  onUpdateEvent, 
  onAddParticipant, 
  onUpdateParticipant, 
  onDeleteParticipant, 
  onAddJudge, 
  onRemoveJudge,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'results' | 'system'>('events');
  const [showWizard, setShowWizard] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.JUDGING);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  
  const [judgeEmail, setJudgeEmail] = useState('');
  const [judgePassword, setJudgePassword] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState(SDO_LIST[0]);

  const judges = useMemo(() => 
    users.filter(u => u.role === UserRole.JUDGE || u.role?.toString().toUpperCase() === 'JUDGE'),
    [users]
  );
  
  useEffect(() => {
    if (editingEventId) {
      const ev = events.find(e => e.id === editingEventId);
      if (ev) {
        setEventName(ev.name);
        setEventType(ev.type);
        setCriteria(ev.criteria || []);
        setRounds(ev.rounds || []);
        setShowWizard(true);
      }
    }
  }, [editingEventId, events]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const applyTemplate = (category: string) => {
    let newCriteria: Criterion[] = [];
    let newRounds: Round[] = [];
    let type = EventType.JUDGING;

    const generateId = () => Math.random().toString(36).substr(2, 9);

    switch(category) {
      case 'ICT_INVITATION':
        newCriteria = [
          { id: generateId(), name: 'Creativity of Design', weight: 30 },
          { id: generateId(), name: 'Technical Use of Tools', weight: 20 },
          { id: generateId(), name: 'Relevance to Theme', weight: 15 },
          { id: generateId(), name: 'Layout & Measurement', weight: 15 },
          { id: generateId(), name: 'Presentation / Process', weight: 15 },
          { id: generateId(), name: 'Speed', weight: 5 }
        ];
        break;
      case 'EIM':
        newCriteria = [
          { id: generateId(), name: 'Accuracy / Functionality', weight: 30 },
          { id: generateId(), name: 'Technical Skills / Workmanship', weight: 30 },
          { id: generateId(), name: 'Use of Tools', weight: 15 },
          { id: generateId(), name: 'Safety', weight: 10 },
          { id: generateId(), name: 'Ability to Explain', weight: 10 },
          { id: generateId(), name: 'Speed', weight: 5 }
        ];
        break;
      case 'STREET_DANCE':
        newCriteria = [
          { id: generateId(), name: 'Performance (Skills, Precision, Timing)', weight: 50 },
          { id: generateId(), name: 'Choreography (Creativity, Originality)', weight: 30 },
          { id: generateId(), name: 'Production Design (Costume/Props)', weight: 20 }
        ];
        break;
      case 'STEMAZING':
        newCriteria = [
          { id: generateId(), name: 'Written Proposal: Content', weight: 35 },
          { id: generateId(), name: 'Feasibility of Solution', weight: 15 },
          { id: generateId(), name: 'Oral Presentation: Discussion', weight: 20 },
          { id: generateId(), name: 'Ability to Answer Questions', weight: 15 },
          { id: generateId(), name: 'Relevance of Data', weight: 15 }
        ];
        break;
      case 'POP_QUIZ':
        type = EventType.QUIZ_BEE;
        newRounds = [
          { id: generateId(), name: 'Easy Round (1pt each)', points: 1, isTieBreaker: false },
          { id: generateId(), name: 'Average Round (2pts each)', points: 2, isTieBreaker: false },
          { id: generateId(), name: 'Difficult Round (3pts each)', points: 3, isTieBreaker: false },
          { id: generateId(), name: 'Tie-Breaker Clincher', points: 1, isTieBreaker: true }
        ];
        break;
      case 'STORY_RETELLING':
        newCriteria = [
          { id: generateId(), name: 'Mastery of the Story', weight: 50 },
          { id: generateId(), name: 'Voice Projection / Language', weight: 30 },
          { id: generateId(), name: 'Stage Presence', weight: 20 }
        ];
        break;
    }

    setEventType(type);
    setCriteria(newCriteria);
    setRounds(newRounds);
    if (!eventName) setEventName(category.replace('_', ' '));
  };

  const handleSaveEvent = () => {
    if (!eventName) return alert("Missing event name.");
    if (eventType === EventType.JUDGING && criteria.length === 0) return alert("Define at least one criterion.");
    if (eventType === EventType.QUIZ_BEE && rounds.length === 0) return alert("Define at least one round.");
    
    const eventPayload: Event = { 
      id: editingEventId || Math.random().toString(36).substr(2, 9), 
      name: eventName, 
      type: eventType, 
      criteria: eventType === EventType.JUDGING ? criteria : [], 
      rounds: eventType === EventType.QUIZ_BEE ? rounds : [],
      isLocked: events.find(e => e.id === editingEventId)?.isLocked || false, 
      eventAdminId: '' 
    };

    if (editingEventId) {
      onUpdateEvent(eventPayload);
    } else {
      onAddEvent(eventPayload);
    }
    resetForm();
  };

  const resetForm = () => { 
    setShowWizard(false); setEditingEventId(null); setEventName(''); setCriteria([]); setRounds([]); setEventType(EventType.JUDGING); 
  };

  return (
    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto pb-20 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="w-full">
          <h1 className="text-2xl md:text-4xl font-black font-header tracking-tight text-white">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5 no-scrollbar">
            {['events', 'judges', 'results', 'system'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`pb-3 px-1 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handleRefresh} className={`p-4 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}>
            <RefreshCw size={18} />
          </button>
          {activeTab === 'events' && (
            <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 md:px-6 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all shadow-lg shadow-blue-600/20">
              <Plus size={18} /> New Contest
            </button>
          )}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
          {events.map(event => (
            <div key={event.id} className="glass group hover:bg-white/[0.03] transition-all p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 flex flex-col xs:flex-row items-center justify-between gap-4 md:gap-6 shadow-xl">
              <div className="flex items-center gap-4 md:gap-6 w-full xs:w-auto">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/10 shrink-0">
                  {event.type === EventType.JUDGING ? <Award size={24} /> : <Hash size={24} />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-lg md:text-2xl tracking-tight text-white group-hover:text-blue-400 transition-colors truncate">{event.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{event.type}</span>
                    <span className="text-[8px] text-blue-500/60 font-black uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded">{participants.filter(p => p.eventId === event.id).length} ENROLLED</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
                <button onClick={() => setEditingEventId(event.id)} className="flex-1 xs:flex-none p-3 bg-white/5 text-slate-500 rounded-xl hover:bg-white/10 hover:text-blue-400 transition-all"><Edit3 size={16} /></button>
                <button onClick={() => setShowEnrollModal(event.id)} className="flex-1 xs:flex-none p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all"><UserPlus size={16} /></button>
                <button onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })} className={`flex-1 xs:flex-none p-3 rounded-xl transition-all ${event.isLocked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {event.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="sm:col-span-2 p-12 md:p-20 text-center glass rounded-[2rem] md:rounded-[3rem] border border-dashed border-white/10 opacity-30">
               <Trophy size={40} className="mx-auto mb-4 text-slate-700" />
               <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600">No contests configured</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'judges' && (
        <div className="glass-card rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
           <table className="w-full text-left min-w-[500px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 md:px-8 py-5 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Judge</th>
                <th className="px-6 md:px-8 py-5 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Contest</th>
                <th className="px-6 md:px-8 py-5 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 md:px-8 py-5 md:py-6">
                    <p className="text-white font-bold text-xs md:text-sm">{judge.name}</p>
                    <p className="text-[8px] md:text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{judge.email}</p>
                  </td>
                  <td className="px-6 md:px-8 py-5 md:py-6">
                    <span className="px-3 md:px-4 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-blue-500/10">
                      {events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 md:px-8 py-5 md:py-6 text-right">
                    <button onClick={() => onRemoveJudge(judge.id)} className="p-2.5 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
