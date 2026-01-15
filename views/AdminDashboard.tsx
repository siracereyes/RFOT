
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Trash2, Loader2, Save, Hash, RefreshCw, BookOpen, Music, Microscope, Layout, Sparkles, AlertCircle, Mail, Key, UserCheck } from 'lucide-react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event Form states
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.JUDGING);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  
  // Participant Form states
  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState(SDO_LIST[0]);

  // Judge Form states
  const [judgeEmail, setJudgeEmail] = useState('');
  const [judgePassword, setJudgePassword] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');

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

  const handleCreateJudge = async () => {
    if (!judgeEmail || !judgePassword || !judgeName || !assignedEventId) {
      return alert("Please fill in all judge details and assign a contest.");
    }

    setIsSubmitting(true);
    try {
      // 1. Create Auth User using the dedicated authClient (prevents current admin logout)
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: judgeEmail,
        password: judgePassword,
        options: { data: { name: judgeName, role: UserRole.JUDGE, assignedEventId } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create auth user.");

      // 2. Call parent to create the profile record
      await onAddJudge({
        id: authData.user.id,
        name: judgeName,
        email: judgeEmail,
        assigned_event_id: assignedEventId
      });

      // 3. Reset and close
      setShowJudgeModal(false);
      setJudgeName('');
      setJudgeEmail('');
      setJudgePassword('');
      setAssignedEventId('');
      alert("Judge account created successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error creating judge: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (category: string) => {
    let newCriteria: Criterion[] = [];
    let newRounds: Round[] = [];
    let type = EventType.JUDGING;
    const generateId = () => Math.random().toString(36).substr(2, 9);

    switch(category) {
      case 'ICT':
        newCriteria = [
          { id: generateId(), name: 'Creativity of Design', weight: 30 },
          { id: generateId(), name: 'Technical Execution', weight: 30 },
          { id: generateId(), name: 'Relevance to Theme', weight: 20 },
          { id: generateId(), name: 'Presentation', weight: 20 }
        ];
        break;
      case 'DANCE':
        newCriteria = [
          { id: generateId(), name: 'Performance & Skills', weight: 50 },
          { id: generateId(), name: 'Choreography', weight: 30 },
          { id: generateId(), name: 'Production Design', weight: 20 }
        ];
        break;
      case 'QUIZ':
        type = EventType.QUIZ_BEE;
        newRounds = [
          { id: generateId(), name: 'Easy Round', points: 1, isTieBreaker: false },
          { id: generateId(), name: 'Average Round', points: 2, isTieBreaker: false },
          { id: generateId(), name: 'Difficult Round', points: 3, isTieBreaker: false },
          { id: generateId(), name: 'Clincher', points: 1, isTieBreaker: true }
        ];
        break;
    }

    setEventType(type);
    setCriteria(newCriteria);
    setRounds(newRounds);
    setEventName(category + " Competition");
  };

  const handleSaveEvent = () => {
    if (!eventName) return alert("Please enter an event name.");
    
    if (eventType === EventType.JUDGING) {
      const total = criteria.reduce((sum, c) => sum + c.weight, 0);
      if (total !== 100) return alert("Total criteria weight must be exactly 100%. Current: " + total + "%");
    }

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
    setShowWizard(false); 
    setEditingEventId(null); 
    setEventName(''); 
    setCriteria([]); 
    setRounds([]); 
    setEventType(EventType.JUDGING); 
  };

  return (
    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto pb-20 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="w-full">
          <h1 className="text-2xl md:text-4xl font-black font-header tracking-tight text-white">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
            {[
              { id: 'events', label: 'Contests', icon: <Trophy size={14} /> },
              { id: 'judges', label: 'Judges', icon: <Users size={14} /> },
              { id: 'results', label: 'Analytics', icon: <Sparkles size={14} /> }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`pb-3 px-1 flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {t.icon} {t.label}
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
          {activeTab === 'judges' && (
            <button onClick={() => setShowJudgeModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 md:px-6 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all shadow-lg shadow-indigo-600/20">
              <UserPlus size={18} /> New Judge
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
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-lg md:text-2xl tracking-tight text-white group-hover:text-blue-400 transition-colors truncate">{event.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded">{event.type}</span>
                    <span className="text-[8px] text-blue-500/60 font-black uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded">
                      {participants.filter(p => p.eventId === event.id).length} Entries
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
                <button onClick={() => setEditingEventId(event.id)} className="p-3 bg-white/5 text-slate-500 rounded-xl hover:bg-white/10 hover:text-blue-400 transition-all"><Edit3 size={16} /></button>
                <button onClick={() => setShowEnrollModal(event.id)} className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all"><UserPlus size={16} /></button>
                <button onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })} className={`p-3 rounded-xl transition-all ${event.isLocked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {event.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="sm:col-span-2 p-12 md:p-20 text-center glass rounded-[2rem] border border-dashed border-white/10 opacity-30">
               <Trophy size={40} className="mx-auto mb-4 text-slate-700" />
               <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600">No contests configured yet</p>
            </div>
          )}
        </div>
      )}

      {/* Contest Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={resetForm}></div>
          <div className="relative w-full max-w-3xl glass-card rounded-[2.5rem] border border-white/10 shadow-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-10 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black font-header text-white">{editingEventId ? 'Edit' : 'Create'} Contest</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Configure scoring logic and parameters</p>
              </div>
              <button onClick={resetForm} className="p-3 text-slate-500 hover:text-white transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Contest Category Name</label>
                  <input 
                    type="text" 
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    placeholder="e.g., Regional Robotics Challenge"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                    onClick={() => setEventType(EventType.JUDGING)}
                    className={`p-6 rounded-2xl border flex items-center gap-4 transition-all ${eventType === EventType.JUDGING ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                   >
                     <div className={`p-3 rounded-xl ${eventType === EventType.JUDGING ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-600'}`}><Layout size={20} /></div>
                     <div className="text-left">
                        <p className="font-black text-sm uppercase tracking-tight">Judging Panel</p>
                        <p className="text-[9px] font-bold opacity-60">Ballots based on weighted criteria</p>
                     </div>
                   </button>
                   <button 
                    onClick={() => setEventType(EventType.QUIZ_BEE)}
                    className={`p-6 rounded-2xl border flex items-center gap-4 transition-all ${eventType === EventType.QUIZ_BEE ? 'bg-indigo-600/10 border-indigo-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                   >
                     <div className={`p-3 rounded-xl ${eventType === EventType.QUIZ_BEE ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600'}`}><Hash size={20} /></div>
                     <div className="text-left">
                        <p className="font-black text-sm uppercase tracking-tight">Quiz Bee</p>
                        <p className="text-[9px] font-bold opacity-60">Round-based points accumulator</p>
                     </div>
                   </button>
                </div>
              </div>

              {!editingEventId && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Templates</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'ICT', label: 'ICT & TVL', icon: <Microscope size={12} /> },
                      { id: 'DANCE', label: 'Arts & Dance', icon: <Music size={12} /> },
                      { id: 'QUIZ', label: 'Academic Quiz', icon: <BookOpen size={12} /> }
                    ].map(t => (
                      <button key={t.id} onClick={() => applyTemplate(t.id)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-all flex items-center gap-2">
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-white/5">
                {eventType === EventType.JUDGING ? (
                  <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black font-header text-white">Round Definitions</h3>
                      <button 
                        onClick={() => setRounds([...rounds, { id: Math.random().toString(36).substr(2, 9), name: '', points: 1, isTieBreaker: false }])}
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {rounds.map((r, i) => (
                        <div key={r.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl group">
                          <div className="flex-1 w-full">
                            <input 
                              type="text" 
                              placeholder="Round Name (e.g., Easy Round)"
                              value={r.name}
                              onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? { ...rd, name: e.target.value } : rd))}
                              className="bg-transparent border-none text-white font-bold placeholder:text-slate-700 outline-none w-full"
                            />
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-auto shrink-0">
                            <input 
                              type="number" 
                              placeholder="Pts"
                              value={r.points}
                              onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? { ...rd, points: parseInt(e.target.value) || 0 } : rd))}
                              className="w-16 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-center text-blue-400 font-black outline-none"
                            />
                            <button 
                              onClick={() => setRounds(rounds.map(rd => rd.id === r.id ? { ...rd, isTieBreaker: !rd.isTieBreaker } : rd))}
                              className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${r.isTieBreaker ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-600'}`}
                            >
                              Tie-Break
                            </button>
                            <button onClick={() => setRounds(rounds.filter(rd => rd.id !== r.id))} className="p-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-10 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                <AlertCircle size={14} /> Auto-saving disabled in wizard
              </div>
              <div className="flex gap-4">
                <button onClick={resetForm} className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Discard</button>
                <button onClick={handleSaveEvent} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 flex items-center gap-2">
                  <Save size={16} /> Finalize Contest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowEnrollModal(null)}></div>
          <div className="relative w-full max-w-lg glass-card rounded-[2.5rem] border border-white/10 shadow-3xl p-8 sm:p-10 animate-in slide-in-from-bottom-10 duration-500">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-black font-header text-white">Enroll Participant</h3>
               <button onClick={() => setShowEnrollModal(null)} className="p-2 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
             </div>
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Full Name / Group Name</label>
                   <input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500" placeholder="Contestant Identifier" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">SDO District</label>
                   <select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none appearance-none" >
                     {SDO_LIST.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                   </select>
                </div>
                <button onClick={() => { if (!newPartName) return; onAddParticipant({ id: '', name: newPartName, district: newPartDistrict, eventId: showEnrollModal }); setNewPartName(''); setShowEnrollModal(null); }} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all" >
                  Enroll Official
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Judge Creation Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowJudgeModal(false)}></div>
          <div className="relative w-full max-w-lg glass-card rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black font-header text-white">Register Evaluator</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Authorized Judging Account</p>
                </div>
                <button onClick={() => setShowJudgeModal(false)} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24}/></button>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" placeholder="Full Professional Name" value={judgeName} onChange={e => setJudgeName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="email" placeholder="Email Address" value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" placeholder="Access Password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div className="relative">
                    <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-white font-bold outline-none appearance-none focus:border-indigo-500">
                      <option value="" className="bg-slate-900">Assign to Contest...</option>
                      {events.map(ev => <option key={ev.id} value={ev.id} className="bg-slate-900">{ev.name}</option>)}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleCreateJudge}
                  disabled={isSubmitting}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20} />}
                  Confirm Registration
                </button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'judges' && (
        <div className="glass-card rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
           <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Judge Identity</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Category Assignment</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ballot Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-white font-bold text-sm">{judge.name}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{judge.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/10">
                      {events.find(e => e.id === judge.assignedEventId)?.name || 'UNASSIGNED'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => onRemoveJudge(judge.id)} className="p-3 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {judges.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No evaluators registered</p>
                  </td>
                </tr>
              )}
            </tbody>
           </table>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="p-20 text-center glass rounded-[3rem] border border-dashed border-white/10 opacity-30">
          <Sparkles size={48} className="mx-auto mb-4 text-slate-700" />
          <h3 className="text-xl font-black font-header text-white uppercase tracking-tighter">Live Analytics Engine</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Aggregate metrics will appear here as judges submit scores.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
