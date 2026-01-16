
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Plus, Lock, Unlock, Award, X, Edit3, Trash2, RefreshCw, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
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
  onDeleteEvent: (id: string) => void;
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
  onAddEvent, 
  onUpdateEvent, 
  onDeleteEvent,
  onAddParticipant, 
  onUpdateParticipant, 
  onDeleteParticipant, 
  onAddJudge, 
  onRemoveJudge,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'judges'>('events');
  const [showWizard, setShowWizard] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Confirmation States
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

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

  const eventToDelete = useMemo(() => 
    events.find(e => e.id === deleteConfirmId),
    [events, deleteConfirmId]
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
        newRounds = [
          { id: generateId(), name: 'Easy Level', points: 10 },
          { id: generateId(), name: 'Moderate Level', points: 30 },
          { id: generateId(), name: 'Difficult Level', points: 50 },
          { id: generateId(), name: 'Clincher Round', points: 10, isTieBreaker: true }
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

  const handleDeleteConfirmed = () => {
    if (!eventToDelete || deleteInput !== eventToDelete.name) return;
    onDeleteEvent(eventToDelete.id);
    setDeleteConfirmId(null);
    setDeleteInput('');
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
              { id: 'judges', label: 'Judges', icon: <Users size={16} /> }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`pb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
        
        {activeTab === 'events' && (
          <button 
            onClick={() => { resetForm(); setShowWizard(true); }}
            className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            Create Contest
          </button>
        )}

        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-4 text-slate-400 hover:text-blue-600 transition-all rounded-2xl hover:bg-slate-50"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{event.type}</span>
                  <h3 className="text-xl font-black font-header text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{event.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingEventId(event.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 size={18}/></button>
                  <button onClick={() => setDeleteConfirmId(event.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {participants.filter(p => p.eventId === event.id).length} Entries
                  </span>
                </div>
                <button 
                  onClick={() => setShowEnrollModal(event.id)}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                >
                  Manage Entries <ChevronRight size={12} />
                </button>
              </div>

              <button 
                onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all ${
                  event.isLocked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {event.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                {event.isLocked ? 'Contest Finalized' : 'Contest Active'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'judges' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-black font-header text-slate-900">Panel of Evaluators</h2>
             <button onClick={() => setShowJudgeModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Enroll Judge</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {judges.map(judge => (
              <div key={judge.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                    {judge.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{judge.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{judge.email}</p>
                  </div>
                </div>
                <button onClick={() => onRemoveJudge(judge.id)} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Deletion Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setDeleteConfirmId(null)} />
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
               <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                  <AlertTriangle size={40} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-2xl font-black font-header text-slate-900 uppercase">Critical Purge</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Permanent System Wipe • RFOT Records</p>
               </div>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">
                 Warning: Deleting <strong>{eventToDelete?.name}</strong> will permanently remove <strong>all assigned judges</strong>, participants, and scoring data from the regional database. This action is irreversible.
               </p>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-4">Type the contest name to confirm:</label>
               <input 
                 type="text"
                 placeholder={eventToDelete?.name}
                 value={deleteInput}
                 onChange={(e) => setDeleteInput(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:border-red-500 transition-all text-center"
               />
            </div>

            <div className="flex flex-col gap-3">
               <button 
                 disabled={deleteInput !== eventToDelete?.name}
                 onClick={handleDeleteConfirmed}
                 className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 ${
                   deleteInput === eventToDelete?.name 
                     ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-200' 
                     : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                 }`}
               >
                 <Trash2 size={16} /> Wipe Contest & Judges
               </button>
               <button 
                 onClick={() => { setDeleteConfirmId(null); setDeleteInput(''); }}
                 className="w-full py-5 text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-[10px]"
               >
                 Cancel
               </button>
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={resetForm} />
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black font-header text-slate-900">{editingEventId ? 'Edit Contest' : 'Configure Contest'}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">RFOT 2026 Technical Standards</p>
              </div>
              <button onClick={resetForm} className="p-3 text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Contest Title</label>
                  <input 
                    type="text" 
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g., Technical Drafting"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Evaluation Schema</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEventType(EventType.JUDGING)}
                      className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-all ${eventType === EventType.JUDGING ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      Subjective Scoring
                    </button>
                    <button 
                      onClick={() => setEventType(EventType.QUIZ_BEE)}
                      className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-all ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      Point-Based Quiz
                    </button>
                  </div>
                </div>
              </div>

              {!editingEventId && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Quick Templates</label>
                  <div className="flex gap-4">
                    {['ICT', 'DANCE', 'QUIZ'].map(cat => (
                      <button key={cat} onClick={() => applyTemplate(cat)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                        {cat} Template
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {eventType === EventType.JUDGING ? (
                <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-black font-header text-slate-900">Quiz Rounds</h3>
                  <div className="space-y-4">
                    {rounds.map((r, i) => (
                      <div key={r.id} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <input className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" value={r.name} onChange={(e) => {
                          const newR = [...rounds];
                          newR[i].name = e.target.value;
                          setRounds(newR);
                        }} />
                        <input type="number" className="w-20 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-blue-600 text-center" value={r.points} onChange={(e) => {
                          const newR = [...rounds];
                          newR[i].points = parseInt(e.target.value) || 0;
                          setRounds(newR);
                        }} />
                        <button onClick={() => setRounds(rounds.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setRounds([...rounds, { id: Math.random().toString(36).substr(2, 9), name: 'New Round', points: 10 }])}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50"
                    >
                      + Add Round
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={handleSaveEvent}
                className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-200"
              >
                Deploy Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowEnrollModal(null)} />
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[80vh] overflow-hidden relative shadow-2xl flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black font-header text-slate-900">Manage Contestants</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{events.find(e => e.id === showEnrollModal)?.name}</p>
              </div>
              <button onClick={() => setShowEnrollModal(null)} className="p-3 text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-6 no-scrollbar">
              <div className="flex gap-4">
                <input 
                  placeholder="Contestant Name" 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                />
                <select 
                  className="w-48 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  value={newPartDistrict}
                  onChange={(e) => setNewPartDistrict(e.target.value)}
                >
                  {SDO_LIST.map(sdo => <option key={sdo} value={sdo}>{sdo}</option>)}
                </select>
                <button 
                  onClick={() => {
                    if(!newPartName) return;
                    onAddParticipant({ id: '', name: newPartName, district: newPartDistrict, eventId: showEnrollModal });
                    setNewPartName('');
                  }}
                  className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {participants.filter(p => p.eventId === showEnrollModal).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <p className="text-sm font-black text-slate-900">{p.name}</p>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{p.district}</p>
                    </div>
                    <button onClick={() => onDeleteParticipant(p.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowJudgeModal(false)} />
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 relative shadow-2xl space-y-6">
            <h2 className="text-2xl font-black font-header text-slate-900">Add New Judge</h2>
            <div className="space-y-4">
              <input placeholder="Full Name" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200" value={judgeName} onChange={e => setJudgeName(e.target.value)} />
              <input placeholder="Email Address" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200" value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} />
              <input type="password" placeholder="Access Password" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} />
              <select className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200" value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)}>
                <option value="">Select Category</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <button 
              disabled={isSubmitting}
              onClick={handleCreateJudge}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest"
            >
              {isSubmitting ? 'Creating...' : 'Grant Access'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
