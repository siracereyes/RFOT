
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, Trash2, Key, UserCheck, Loader2, Save, Mail, ShieldCheck, AlertTriangle, Settings, ToggleLeft, ToggleRight, Hash, RefreshCw, Zap } from 'lucide-react';
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
  
  const admins = useMemo(() => 
    users.filter(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.EVENT_ADMIN),
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

  const loadQuizBeeTemplate = () => {
    const template: Round[] = [
      { id: 'r-easy', name: 'Easy Round (10 Items)', points: 10, isTieBreaker: false },
      { id: 'r-avg', name: 'Average Round (5 Items)', points: 15, isTieBreaker: false },
      { id: 'r-diff', name: 'Difficult Round (5 Items)', points: 25, isTieBreaker: false },
      { id: 'r-clincher', name: 'Clincher / Tie-Breaker', points: 5, isTieBreaker: true }
    ];
    setRounds(template);
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

  const addQuizRound = () => {
    setRounds([...rounds, { id: Math.random().toString(36).substr(2, 9), name: `Round ${rounds.length + 1}`, points: 1, isTieBreaker: false }]);
  };

  const handleCreateJudge = async () => {
    if (!judgeEmail || !judgePassword || !assignedEventId || !judgeName) return alert("Fill all details.");
    setIsSubmitting(true);
    try {
      // 1. Create the Auth account
      const { data, error: authError } = await authClient.auth.signUp({
        email: judgeEmail,
        password: judgePassword,
        options: { data: { name: judgeName, role: UserRole.JUDGE, assignedEventId } }
      });

      if (authError) throw new Error(`Auth Error: ${authError.message}`);
      if (!data.user) throw new Error("Auth service failed to return user ID.");

      // 2. Insert into the public.profiles table
      await onAddJudge({ 
        id: data.user.id, 
        name: judgeName, 
        role: UserRole.JUDGE, 
        email: judgeEmail, 
        assigned_event_id: assignedEventId 
      });

      alert(`Judge account for ${judgeName} created and verified successfully.`);
      setJudgeName(''); setJudgeEmail(''); setJudgePassword(''); setAssignedEventId('');
      setShowJudgeModal(false);
      onRefreshData(); // Sync the list
    } catch (error: any) {
      console.error("Judge Creation Failure:", error);
      alert(error.message || "An unexpected error occurred during judge registration.");
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
          <button onClick={handleRefresh} className={`p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} title="Refresh data">
            <RefreshCw size={20} />
          </button>
          {activeTab === 'events' && (
            <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
              <Plus size={20} /> New Event
            </button>
          )}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="glass group hover:bg-white/[0.04] transition-all p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/5 group-hover:scale-105 transition-transform">
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
                <button onClick={() => setEditingEventId(event.id)} className="p-3.5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-blue-400 transition-all"><Edit3 size={20} /></button>
                <button onClick={() => setShowEnrollModal(event.id)} className="p-3.5 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600/20 transition-all"><UserPlus size={20} /></button>
                <button onClick={() => onUpdateEvent({ ...event, isLocked: !event.isLocked })} className={`p-3.5 rounded-2xl transition-all ${event.isLocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {event.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="col-span-full py-20 text-center glass rounded-[3rem] text-slate-600 italic">No events initialized.</div>}
        </div>
      )}

      {activeTab === 'judges' && (
        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
           <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Judge Identity</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Event Assignment</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.length > 0 ? judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold border border-blue-400/20">
                        {judge.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold">{judge.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{judge.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">{events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}</span></td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => { if(confirm('Delete account?')) onRemoveJudge(judge.id); }} className="p-2.5 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-600 italic">No judge accounts recorded.</td></tr>
              )}
            </tbody>
           </table>
           <div className="p-6 border-t border-white/5 flex justify-end">
             <button onClick={() => setShowJudgeModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm shadow-xl shadow-indigo-600/20">
                <UserPlus size={18} /> Register New Judge
             </button>
          </div>
        </div>
      )}

      {/* System Tab & Modals... */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="glass-card w-full max-w-3xl p-8 lg:p-12 rounded-[3rem] border border-white/10 shadow-2xl my-auto animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-10">
              <h3 className="text-3xl font-black font-header tracking-tight text-white">{editingEventId ? 'Modify Category' : 'New Contest Category'}</h3>
              <button onClick={resetForm} className="p-3 bg-white/5 text-slate-500 hover:text-white rounded-2xl"><X /></button>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Contest Name</label>
                  <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Competition Style</label>
                  <div className="flex gap-3">
                    <button onClick={() => setEventType(EventType.JUDGING)} className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${eventType === EventType.JUDGING ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5 text-slate-500'}`}>Judging</button>
                    <button onClick={() => setEventType(EventType.QUIZ_BEE)} className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5 text-slate-500'}`}>Quiz Bee</button>
                  </div>
                </div>
              </div>

              {eventType === EventType.JUDGING ? (
                <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">Quiz Bee Configuration</h4>
                      <p className="text-xs text-slate-500">Define round point values and tie-breaker settings.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={loadQuizBeeTemplate} className="flex items-center gap-2 text-indigo-400 bg-indigo-400/10 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-400/20 transition-all border border-indigo-400/20">
                        <Zap size={14} /> Load Standard Template
                      </button>
                      <button onClick={addQuizRound} className="flex items-center gap-2 text-blue-400 bg-blue-400/10 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-400/20 transition-all border border-blue-400/20">
                        <Plus size={16} /> Add Round
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {rounds.map((r, i) => (
                      <div key={r.id} className="glass p-5 rounded-2xl border border-white/5 flex flex-wrap md:flex-nowrap gap-4 items-center group">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Round Label</label>
                          <input type="text" value={r.name} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, name: e.target.value} : rd))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Max Points</label>
                          <input type="number" value={r.points} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, points: parseInt(e.target.value) || 0} : rd))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white text-center focus:border-blue-500 outline-none" />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={r.isTieBreaker} onChange={e => setRounds(rounds.map(rd => rd.id === r.id ? {...rd, isTieBreaker: e.target.checked} : rd))} className="rounded border-white/10 bg-white/5" />
                            Clincher?
                          </label>
                          <button onClick={() => setRounds(rounds.filter(rd => rd.id !== r.id))} className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={handleSaveEvent} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"><Save /> Finalize Category</button>
            </div>
          </div>
        </div>
      )}

      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black font-header text-white">Create Judge Account</h3><button onClick={() => setShowJudgeModal(false)} className="text-slate-600 hover:text-white"><X /></button></div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl mb-6 flex items-start gap-3">
              <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-[10px] text-blue-200/70 font-bold uppercase tracking-widest leading-relaxed">System Admin Bypass: Auth remains active while creating these credentials.</p>
            </div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Full Name</label><input type="text" value={judgeName} onChange={e => setJudgeName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" placeholder="Hon. Judge Name" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Official Email</label><input type="email" value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" placeholder="judge@rfot.gov.ph" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Password</label><input type="password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" placeholder="••••••••" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Assign Contest Category</label><select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl font-bold text-white outline-none"><option value="">Select Category</option>{events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
              <button disabled={isSubmitting} onClick={handleCreateJudge} className="w-full bg-indigo-600 p-4 rounded-xl font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />} Finalize Account</button>
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header text-white">Enroll Contestant</h3><button onClick={() => setShowEnrollModal(null)} className="text-slate-600 hover:text-white"><X /></button></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Name</label><input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" placeholder="Contestant Name" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">SDO District</label><select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none">{SDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <button onClick={() => { onAddParticipant({ id: '', name: newPartName, district: newPartDistrict, eventId: showEnrollModal }); setShowEnrollModal(null); setNewPartName(''); }} className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl font-black uppercase tracking-widest text-white flex items-center justify-center gap-2"><UserPlus size={20} /> Enroll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
