
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

  const handleCreateJudge = async () => {
    if (!judgeEmail || !judgePassword || !assignedEventId || !judgeName) return alert("Fill all details.");
    setIsSubmitting(true);
    try {
      const { data, error: authError } = await authClient.auth.signUp({
        email: judgeEmail,
        password: judgePassword,
        options: { data: { name: judgeName, role: UserRole.JUDGE, assignedEventId } }
      });

      if (authError) throw new Error(`Auth Error: ${authError.message}`);
      if (!data.user) throw new Error("Auth service failed to return user ID.");

      await onAddJudge({ 
        id: data.user.id, 
        name: judgeName, 
        role: UserRole.JUDGE, 
        email: judgeEmail, 
        assigned_event_id: assignedEventId 
      });

      alert(`Judge account for ${judgeName} created successfully.`);
      setJudgeName(''); setJudgeEmail(''); setJudgePassword(''); setAssignedEventId('');
      setShowJudgeModal(false);
      onRefreshData();
    } catch (error: any) {
      alert(error.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-header tracking-tight text-white">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {['events', 'judges', 'results', 'system'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className={`p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}>
            <RefreshCw size={20} />
          </button>
          {activeTab === 'events' && (
            <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
              <Plus size={20} /> New Contest
            </button>
          )}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="glass group hover:bg-white/[0.04] transition-all p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/5">
                  {event.type === EventType.JUDGING ? <Award size={32} /> : <Hash size={32} />}
                </div>
                <div>
                  <h4 className="font-black text-2xl tracking-tight text-white group-hover:text-blue-400 transition-colors">{event.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{event.type === EventType.QUIZ_BEE ? 'Quiz Bee' : 'Judging'}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{participants.filter(p => p.eventId === event.id).length} Enrolled</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingEventId(event.id)} className="p-3.5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-blue-400"><Edit3 size={20} /></button>
                <button onClick={() => setShowEnrollModal(event.id)} className="p-3.5 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600/20"><UserPlus size={20} /></button>
                <button onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })} className={`p-3.5 rounded-2xl ${event.isLocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {event.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Judges tab same as before but cleaner mapping... */}
      {activeTab === 'judges' && (
        <div className="glass-card rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
           <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Judge</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Contest</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-white font-bold">{judge.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{judge.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => onRemoveJudge(judge.id)} className="p-2.5 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      )}

      {/* Wizard with Presets */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="glass-card w-full max-w-4xl p-8 lg:p-12 rounded-[3rem] border border-white/10 shadow-2xl my-auto animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-10">
              <h3 className="text-3xl font-black font-header tracking-tight text-white">Initialize RFOT Event</h3>
              <button onClick={resetForm} className="p-3 bg-white/5 text-slate-500 hover:text-white rounded-2xl"><X /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-1 space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Official Presets</label>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                       {[
                         { id: 'ICT_INVITATION', name: 'ICT Invitation Card', icon: <Zap size={14}/> },
                         { id: 'EIM', name: 'Electrical (EIM)', icon: <Microscope size={14}/> },
                         { id: 'STREET_DANCE', name: 'Street Dance (Bayle)', icon: <Music size={14}/> },
                         { id: 'STEMAZING', name: 'STEMazing Proposal', icon: <Microscope size={14}/> },
                         { id: 'STORY_RETELLING', name: 'Story Retelling', icon: <BookOpen size={14}/> },
                         { id: 'POP_QUIZ', name: 'Pop Quiz (1,2,3 pts)', icon: <Hash size={14}/> }
                       ].map(preset => (
                         <button 
                           key={preset.id} 
                           onClick={() => applyTemplate(preset.id)}
                           className="w-full p-4 bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-2xl text-left flex items-center gap-3 group transition-all"
                         >
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-all">
                              {preset.icon}
                            </div>
                            <span className="text-xs font-bold text-slate-300 group-hover:text-white">{preset.name}</span>
                         </button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Event Name</label>
                      <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Competition Style</label>
                      <div className="flex gap-3">
                        <button onClick={() => setEventType(EventType.JUDGING)} className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${eventType === EventType.JUDGING ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Judging</button>
                        <button onClick={() => setEventType(EventType.QUIZ_BEE)} className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Quiz Bee</button>
                      </div>
                    </div>
                  </div>

                  {eventType === EventType.JUDGING ? (
                    <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
                  ) : (
                    <div className="space-y-6">
                       {/* Same round management as before but with point values... */}
                       <div className="flex items-center justify-between">
                         <h4 className="font-bold text-white">Quiz Rounds</h4>
                         <button onClick={() => setRounds([...rounds, { id: Math.random().toString(36).substr(2, 9), name: `Round ${rounds.length+1}`, points: 1 }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus size={14}/> Add Round</button>
                       </div>
                       <div className="space-y-3">
                         {rounds.map(r => (
                           <div key={r.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                              <input className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none" value={r.name} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, name: e.target.value} : rd))} />
                              <div className="w-20">
                                <label className="text-[8px] text-slate-500 block uppercase font-black">Pts/Item</label>
                                <input type="number" className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs text-white" value={r.points} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, points: parseInt(e.target.value) || 1} : rd))} />
                              </div>
                              <button onClick={() => setRounds(rounds.filter(rd => rd.id !== r.id))} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  <button onClick={handleSaveEvent} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Finalize Configuration</button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Enroll Modal... */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header text-white">Enroll Contestant</h3><button onClick={() => setShowEnrollModal(null)} className="text-slate-600 hover:text-white"><X /></button></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Name</label><input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">District</label><select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none">{SDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <button onClick={() => { onAddParticipant({ id: '', name: newPartName, district: newPartDistrict, eventId: showEnrollModal! }); setShowEnrollModal(null); }} className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl font-black uppercase tracking-widest text-white">Enroll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
