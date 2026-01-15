
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
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black font-header tracking-tight text-white">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5">
            {['events', 'judges', 'results', 'system'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`pb-3 px-1 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className={`p-4 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}>
            <RefreshCw size={20} />
          </button>
          {activeTab === 'events' && (
            <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20">
              <Plus size={20} /> New Contest
            </button>
          )}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="glass group hover:bg-white/[0.03] transition-all p-6 md:p-8 rounded-[2rem] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-5 md:gap-6 w-full sm:w-auto">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/10 shrink-0">
                  {event.type === EventType.JUDGING ? <Award size={28} /> : <Hash size={28} />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-xl md:text-2xl tracking-tight text-white group-hover:text-blue-400 transition-colors truncate">{event.name}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{event.type === EventType.QUIZ_BEE ? 'Quiz Bee' : 'Judging'}</span>
                    <span className="text-[9px] text-blue-500/60 font-black uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded">{participants.filter(p => p.eventId === event.id).length} ENROLLED</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onClick={() => setEditingEventId(event.id)} className="flex-1 sm:flex-none p-3.5 bg-white/5 text-slate-500 rounded-xl hover:bg-white/10 hover:text-blue-400 transition-all"><Edit3 size={18} /></button>
                <button onClick={() => setShowEnrollModal(event.id)} className="flex-1 sm:flex-none p-3.5 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all"><UserPlus size={18} /></button>
                <button onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })} className={`flex-1 sm:flex-none p-3.5 rounded-xl transition-all ${event.isLocked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {event.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="md:col-span-2 p-20 text-center glass rounded-[3rem] border border-dashed border-white/10 opacity-30">
               <Trophy size={48} className="mx-auto mb-4 text-slate-700" />
               <p className="text-sm font-black uppercase tracking-widest text-slate-600">No active contests found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'judges' && (
        <div className="glass-card rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-x-auto custom-scrollbar">
           <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Official Judge</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Contest</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-white font-bold text-sm">{judge.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{judge.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/10">
                      {events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => onRemoveJudge(judge.id)} className="p-3 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      )}

      {/* Wizard Dialog */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="glass-card w-full max-w-5xl p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl my-auto animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8 md:mb-10">
              <div>
                <h3 className="text-2xl md:text-3xl font-black font-header tracking-tight text-white">Event Configuration</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Official RFOT Scoring setup</p>
              </div>
              <button onClick={resetForm} className="p-3 bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
               <div className="lg:col-span-1 space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 mb-3 block tracking-widest">RFOT Contest Presets</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[300px] lg:max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                       {[
                         { id: 'ICT_INVITATION', name: 'ICT Invitation', icon: <Zap size={14}/> },
                         { id: 'EIM', name: 'Electrical (EIM)', icon: <Microscope size={14}/> },
                         { id: 'STREET_DANCE', name: 'Bayle (Street Dance)', icon: <Music size={14}/> },
                         { id: 'STEMAZING', name: 'STEMazing Prop', icon: <Microscope size={14}/> },
                         { id: 'STORY_RETELLING', name: 'Story Retelling', icon: <BookOpen size={14}/> },
                         { id: 'POP_QUIZ', name: 'Quiz (1,2,3 pts)', icon: <Hash size={14}/> }
                       ].map(preset => (
                         <button 
                           key={preset.id} 
                           onClick={() => applyTemplate(preset.id)}
                           className="w-full p-4 bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-2xl text-left flex items-center gap-3 group transition-all"
                         >
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {preset.icon}
                            </div>
                            <span className="text-[11px] font-black text-slate-400 group-hover:text-white uppercase tracking-tight">{preset.name}</span>
                         </button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-600 mb-2 block tracking-widest">Display Name</label>
                      <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl font-black text-white outline-none focus:border-blue-500 transition-all" placeholder="e.g. Bayle sa Kalye" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-600 mb-2 block tracking-widest">Evaluation Style</label>
                      <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                        <button onClick={() => setEventType(EventType.JUDGING)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${eventType === EventType.JUDGING ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}>Judging</button>
                        <button onClick={() => setEventType(EventType.QUIZ_BEE)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}>Quiz</button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                    {eventType === EventType.JUDGING ? (
                      <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
                    ) : (
                      <div className="space-y-6">
                         <div className="flex items-center justify-between">
                           <h4 className="font-black text-white uppercase text-xs tracking-widest">Contest Rounds</h4>
                           <button onClick={() => setRounds([...rounds, { id: Math.random().toString(36).substr(2, 9), name: `Round ${rounds.length+1}`, points: 1 }])} className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors"><Plus size={14}/> Add New</button>
                         </div>
                         <div className="space-y-3">
                           {rounds.map(r => (
                             <div key={r.id} className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <input className="w-full sm:flex-1 bg-transparent border-none text-sm font-bold text-white outline-none" value={r.name} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, name: e.target.value} : rd))} />
                                <div className="w-full sm:w-24">
                                  <label className="text-[8px] text-slate-500 block uppercase font-black mb-1">Pts/Item</label>
                                  <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-black" value={r.points} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, points: parseInt(e.target.value) || 1} : rd))} />
                                </div>
                                <button onClick={() => setRounds(rounds.filter(rd => rd.id !== r.id))} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}
                  </div>

                  <button onClick={handleSaveEvent} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-600/30">Save Configuration</button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Enroll Dialog */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black font-header text-white">Contestant Entry</h3>
              <button onClick={() => setShowEnrollModal(null)} className="text-slate-600 hover:text-white transition-all"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Full Participant Name</label><input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl font-black text-white outline-none focus:border-blue-500 transition-all" placeholder="Juan Dela Cruz" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Assigned SDO District</label><select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-4 md:p-5 rounded-2xl font-black text-white outline-none focus:border-blue-500 transition-all">{SDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <button onClick={() => { onAddParticipant({ id: '', name: newPartName, district: newPartDistrict, eventId: showEnrollModal! }); setShowEnrollModal(null); }} className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white transition-all shadow-xl shadow-blue-600/20">Finalize Enrollment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
