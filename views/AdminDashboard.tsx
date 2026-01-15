
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Trash2, Loader2, Save, Hash, RefreshCw, BookOpen, Music, Microscope, Layout, Sparkles, AlertCircle, Mail, Key, UserCheck, ChevronRight } from 'lucide-react';
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
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: judgeEmail,
        password: judgePassword,
        options: { data: { name: judgeName, role: UserRole.JUDGE, assignedEventId } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create auth user.");

      await onAddJudge({
        id: authData.user.id,
        name: judgeName,
        email: judgeEmail,
        assigned_event_id: assignedEventId
      });

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
        for(let i=1; i<=5; i++) newRounds.push({ id: generateId(), name: `Easy Round ${i}`, points: 1 });
        for(let i=1; i<=5; i++) newRounds.push({ id: generateId(), name: `Moderate Round ${i}`, points: 3 });
        for(let i=1; i<=5; i++) newRounds.push({ id: generateId(), name: `Difficult Round ${i}`, points: 5 });
        newRounds.push({ id: generateId(), name: 'Clincher Round', points: 1, isTieBreaker: true });
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
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="w-full">
          <h1 className="text-3xl md:text-4xl font-black font-header tracking-tight text-slate-900">Management Console</h1>
          <p className="text-slate-500 text-sm mt-1">Operational control for RFOT 2026 events and evaluators.</p>
          
          <div className="flex gap-8 mt-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'events', label: 'Contests', icon: <Trophy size={16} /> },
              { id: 'judges', label: 'Judges', icon: <Users size={16} /> },
              { id: 'results', label: 'Analytics', icon: <Sparkles size={16} /> }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`pb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${activeTab === t.id ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handleRefresh} className={`p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}>
            <RefreshCw size={18} />
          </button>
          {activeTab === 'events' && (
            <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200">
              <Plus size={18} /> New Contest
            </button>
          )}
          {activeTab === 'judges' && (
            <button onClick={() => setShowJudgeModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-200">
              <UserPlus size={18} /> New Judge
            </button>
          )}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-white group hover:shadow-md transition-all p-6 md:p-8 rounded-[2rem] border border-slate-200 flex flex-col xs:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 w-full xs:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
                  {event.type === EventType.JUDGING ? <Award size={28} /> : <Hash size={28} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-xl md:text-2xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors truncate">{event.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{event.type}</span>
                    <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                      {participants.filter(p => p.eventId === event.id).length} Entries
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
                <button onClick={() => setEditingEventId(event.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"><Edit3 size={18} /></button>
                <button onClick={() => setShowEnrollModal(event.id)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"><UserPlus size={18} /></button>
                <button onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })} className={`p-3 rounded-xl transition-all border ${event.isLocked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {event.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="sm:col-span-2 p-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
               <Trophy size={48} className="mx-auto mb-4 text-slate-200" />
               <p className="text-xs font-black uppercase tracking-widest text-slate-400">No contests configured yet</p>
            </div>
          )}
        </div>
      )}

      {/* Contest Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm}></div>
          <div className="relative w-full max-w-3xl bg-white rounded-[3rem] border border-slate-200 shadow-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black font-header text-slate-900">{editingEventId ? 'Edit' : 'Create'} Contest</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Configure scoring logic and parameters</p>
              </div>
              <button onClick={resetForm} className="p-3 text-slate-400 hover:text-slate-900 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10 custom-scrollbar">
              <div className="space-y-8">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Contest Category Name</label>
                  <input 
                    type="text" 
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    placeholder="e.g., Regional Robotics Challenge"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                    onClick={() => setEventType(EventType.JUDGING)}
                    className={`p-6 rounded-3xl border flex items-center gap-5 transition-all text-left ${eventType === EventType.JUDGING ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                   >
                     <div className={`p-4 rounded-2xl ${eventType === EventType.JUDGING ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Layout size={24} /></div>
                     <div>
                        <p className={`font-black text-sm uppercase tracking-tight ${eventType === EventType.JUDGING ? 'text-blue-700' : 'text-slate-900'}`}>Judging Panel</p>
                        <p className="text-[10px] font-bold text-slate-400">Criteria-based ballots</p>
                     </div>
                   </button>
                   <button 
                    onClick={() => setEventType(EventType.QUIZ_BEE)}
                    className={`p-6 rounded-3xl border flex items-center gap-5 transition-all text-left ${eventType === EventType.QUIZ_BEE ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                   >
                     <div className={`p-4 rounded-2xl ${eventType === EventType.QUIZ_BEE ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Hash size={24} /></div>
                     <div>
                        <p className={`font-black text-sm uppercase tracking-tight ${eventType === EventType.QUIZ_BEE ? 'text-indigo-700' : 'text-slate-900'}`}>Quiz Bee</p>
                        <p className="text-[10px] font-bold text-slate-400">Round-based points</p>
                     </div>
                   </button>
                </div>
              </div>

              {!editingEventId && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Quick Start Templates</label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'ICT', label: 'ICT & TVL', icon: <Microscope size={14} /> },
                      { id: 'DANCE', label: 'Arts & Dance', icon: <Music size={14} /> },
                      { id: 'QUIZ', label: 'Academic Quiz', icon: <BookOpen size={14} /> }
                    ].map(t => (
                      <button key={t.id} onClick={() => applyTemplate(t.id)} className="px-5 py-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-all flex items-center gap-2">
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-10 border-t border-slate-100">
                {eventType === EventType.JUDGING ? (
                  <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black font-header text-slate-900">Round Definitions</h3>
                      <button 
                        onClick={() => setRounds([...rounds, { id: Math.random().toString(36).substr(2, 9), name: '', points: 1, isTieBreaker: false }])}
                        className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {rounds.map((r, i) => (
                        <div key={r.id} className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-slate-50 border border-slate-200 rounded-3xl group">
                          <div className="flex-1 w-full">
                            <input 
                              type="text" 
                              placeholder="Round Name (e.g., Easy Round)"
                              value={r.name}
                              onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? { ...rd, name: e.target.value } : rd))}
                              className="bg-transparent border-none text-slate-900 font-bold placeholder:text-slate-300 outline-none w-full text-lg"
                            />
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-auto shrink-0">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                               <span className="text-[10px] font-black text-slate-400 uppercase">Pts:</span>
                               <input 
                                type="number" 
                                value={r.points}
                                onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? { ...rd, points: parseInt(e.target.value) || 0 } : rd))}
                                className="w-10 bg-transparent text-center text-blue-600 font-black outline-none"
                              />
                            </div>
                            <button 
                              onClick={() => setRounds(rounds.map(rd => rd.id === r.id ? { ...rd, isTieBreaker: !rd.isTieBreaker } : rd))}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${r.isTieBreaker ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-400'}`}
                            >
                              Tie-Break
                            </button>
                            <button onClick={() => setRounds(rounds.filter(rd => rd.id !== r.id))} className="p-3 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 sm:p-10 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <AlertCircle size={16} /> Data is staged for finalization
              </div>
              <div className="flex gap-4">
                <button onClick={resetForm} className="px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Discard</button>
                <button onClick={handleSaveEvent} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 flex items-center gap-2">
                  <Save size={18} /> Finalize Contest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEnrollModal(null)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] border border-slate-200 shadow-3xl p-10 animate-in slide-in-from-bottom-10 duration-500">
             <div className="flex items-center justify-between mb-10">
               <div>
                 <h3 className="text-2xl font-black font-header text-slate-900">Enroll Participant</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Add contestant to this category</p>
               </div>
               <button onClick={() => setShowEnrollModal(null)} className="p-3 text-slate-300 hover:text-slate-900 transition-all"><X size={24}/></button>
             </div>
             <div className="space-y-8">
                <div>
                   <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Full Name / Group Name</label>
                   <input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Enter contestant identifier" />
                </div>
                <div>
                   <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block">SDO District</label>
                   <div className="relative">
                      <select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all" >
                        {SDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={20} />
                   </div>
                </div>
                <button onClick={() => { if (!newPartName) return; onAddParticipant({ id: '', name: newPartName, district: newPartDistrict, eventId: showEnrollModal }); setNewPartName(''); setShowEnrollModal(null); }} className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 transition-all" >
                  Register Official Contestant
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Judge Creation Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowJudgeModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] border border-slate-200 shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black font-header text-slate-900">Register Evaluator</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Authorized Judging Credentials</p>
                </div>
                <button onClick={() => setShowJudgeModal(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-all"><X size={24}/></button>
             </div>
             
             <div className="p-10 space-y-8">
                <div className="space-y-5">
                  <div className="relative">
                    <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Full Professional Name" value={judgeName} onChange={e => setJudgeName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="email" placeholder="Email Address" value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="password" placeholder="Secure Access Password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                  </div>
                  <div className="relative">
                    <Trophy className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-12 py-5 text-slate-900 font-bold outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all">
                      <option value="">Assign to Contest...</option>
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-300 pointer-events-none" size={20} />
                  </div>
                </div>

                <button 
                  onClick={handleCreateJudge}
                  disabled={isSubmitting}
                  className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <UserCheck size={24} />}
                  Confirm Account Creation
                </button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'judges' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-slate-400">Evaluator Profile</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-slate-400">Assigned Category</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Data Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {judges.map(judge => (
                <tr key={judge.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">
                          {judge.name.charAt(0)}
                       </div>
                       <div>
                          <p className="text-slate-900 font-black text-base">{judge.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{judge.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      {events.find(e => e.id === judge.assignedEventId)?.name || 'UNASSIGNED'}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => onRemoveJudge(judge.id)} className="p-4 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-slate-100 hover:border-red-100">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {judges.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-24 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">No evaluators registered in system</p>
                  </td>
                </tr>
              )}
            </tbody>
           </table>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="p-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
          <Sparkles size={64} className="mx-auto mb-6 text-slate-100" />
          <h3 className="text-2xl font-black font-header text-slate-900 uppercase tracking-tighter">Live Performance Engine</h3>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-3 max-w-sm mx-auto leading-relaxed">Cross-tabulation metrics and real-time validation will populate as judges commit ballots.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
