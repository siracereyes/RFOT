
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, Trash2, Key, UserCheck, Loader2, Save, Mail, ShieldCheck, AlertTriangle, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import WeightingWizard from '../components/WeightingWizard';
import { Event, EventType, Criterion, Participant, User, UserRole, Score } from '../types';
import { SDO_LIST } from '../constants';
import { supabase, authClient } from '../supabase';

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
  onAddJudge: (u: any) => void;
  onRemoveJudge: (id: string) => void;
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
  onRemoveJudge 
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'results' | 'system'>('events');
  const [showWizard, setShowWizard] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.JUDGING);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [judgeEmail, setJudgeEmail] = useState('');
  const [judgePassword, setJudgePassword] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState(SDO_LIST[0]);
  const [newJudgePass, setNewJudgePass] = useState('');

  // Robustly filter judges - check both enum and string match for safety
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
        setCriteria(ev.criteria);
        setShowWizard(true);
      }
    }
  }, [editingEventId, events]);

  const handleSaveEvent = () => {
    if (!eventName || criteria.length === 0) return alert("Missing details.");
    if (editingEventId) {
      onUpdateEvent({ id: editingEventId, name: eventName, type: eventType, criteria, isLocked: events.find(e => e.id === editingEventId)?.isLocked || false, eventAdminId: '' });
    } else {
      onAddEvent({ id: Math.random().toString(36).substr(2, 9), name: eventName, type: eventType, criteria, isLocked: false, eventAdminId: '' });
    }
    resetForm();
  };

  const resetForm = () => { 
    setShowWizard(false); setEditingEventId(null); setEventName(''); setCriteria([]); setEventType(EventType.JUDGING); 
  };

  const handleCreateJudge = async () => {
    if (!judgeEmail || !judgePassword || !assignedEventId || !judgeName) return alert("Fill all details.");
    setIsSubmitting(true);
    const { data, error } = await authClient.auth.signUp({
      email: judgeEmail,
      password: judgePassword,
      options: { data: { name: judgeName, role: UserRole.JUDGE, assignedEventId } }
    });
    if (error) {
      alert("Auth Error: " + error.message);
      setIsSubmitting(false);
    } else if (data.user) {
      await onAddJudge({ id: data.user.id, name: judgeName, role: UserRole.JUDGE, email: judgeEmail, assigned_event_id: assignedEventId });
      alert(`Judge account for ${judgeName} created successfully.`);
      setJudgeName(''); setJudgeEmail(''); setJudgePassword(''); setAssignedEventId('');
      setShowJudgeModal(false); setIsSubmitting(false);
    }
  };

  const handleChangeJudgePassword = async () => {
    if (!newJudgePass || !showPasswordModal) return;
    setIsSubmitting(true);
    alert("Update request sent.");
    setShowPasswordModal(null); setNewJudgePass(''); setIsSubmitting(false);
  };

  const handleEnrollParticipant = () => {
    if (!newPartName || !newPartDistrict) return;
    onAddParticipant({ id: Math.random().toString(36).substr(2, 9), name: newPartName, district: newPartDistrict, eventId: showEnrollModal! });
    setShowEnrollModal(null); setNewPartName('');
  };

  const getTabLabel = (tab: string) => {
    let count = 0;
    if (tab === 'events') count = events.length;
    if (tab === 'judges') count = judges.length;
    if (tab === 'results') count = scores.length;
    
    return (
      <span className="flex items-center gap-2">
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
        {count > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[8px] border border-blue-500/20 text-blue-400">
            {count}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-header tracking-tight text-white">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {['events', 'judges', 'results', 'system'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {getTabLabel(t)}
              </button>
            ))}
          </div>
        </div>
        {activeTab === 'events' && (
          <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
            <Plus size={20} /> Create New Event
          </button>
        )}
      </div>

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="glass-card p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black font-header text-white">Security Controls</h3>
                  <p className="text-slate-400 text-sm">Manage global access and system behavior</p>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                <div className="space-y-1">
                  <p className="font-bold text-white text-lg">Admin Self-Registration</p>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    When enabled, the "First time? Create initial admin" link will appear on the login page.
                  </p>
                </div>
                <button 
                  onClick={() => onToggleRegistration(!registrationEnabled)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl ${
                    registrationEnabled 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-red-600/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {registrationEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  {registrationEnabled ? 'Publicly Visible' : 'Hidden / Locked'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-xl text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Privileged Accounts</p>
              <div className="text-6xl font-black font-header text-white">{admins.length}</div>
              <p className="text-sm font-bold text-slate-400">Registered Administrators</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full glass p-20 rounded-[3rem] text-center border border-white/10">
              <Award size={48} className="mx-auto text-slate-800 mb-4" />
              <p className="text-slate-500 font-medium">No events created yet.</p>
            </div>
          ) : events.map(event => (
            <div key={event.id} className="glass group hover:bg-white/[0.04] transition-all p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/5 group-hover:scale-105 transition-transform">
                  {event.type === EventType.JUDGING ? <Award size={32} /> : <Layers size={32} />}
                </div>
                <div>
                  <h4 className="font-black text-2xl tracking-tight text-white group-hover:text-blue-400 transition-colors">{event.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{event.type}</span>
                    <span className="text-xs text-slate-500 font-bold">{participants.filter(p => p.eventId === event.id).length} Enrolled</span>
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
              {judges.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center space-y-4 opacity-40">
                      <Users size={48} className="text-slate-500" />
                      <div>
                        <p className="text-lg font-bold text-white">No Judges Registered</p>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2">Create judge accounts below to start assigning ballots for competitions.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : judges.map(judge => (
                <tr key={judge.id || Math.random().toString()} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                        {judge.name?.charAt(0) || 'J'}
                       </div>
                       <div>
                         <p className="font-bold text-white leading-none">{judge.name}</p>
                         <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">{judge.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      {events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setShowPasswordModal(judge)} className="p-2.5 bg-white/5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all" title="Change Password"><Key size={18} /></button>
                      <button onClick={() => onRemoveJudge(judge.id)} className="p-2.5 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all" title="Remove Judge"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 border-t border-white/5 flex justify-end bg-white/2">
             <button onClick={() => setShowJudgeModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm shadow-xl shadow-indigo-600/20">
                <UserPlus size={18} /> Register New Judge
             </button>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black font-header text-white flex items-center gap-3"><Key className="text-amber-400" /> Manage Credentials</h3>
              <button onClick={() => setShowPasswordModal(null)} className="text-slate-600 hover:text-white"><X /></button>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl mb-6 border border-white/10">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-black mb-1">Target Account</p>
              <p className="text-lg font-bold text-white">{showPasswordModal.name}</p>
              <p className="text-xs text-blue-400 font-medium">{showPasswordModal.email}</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Set New Password</label>
                <input type="password" value={newJudgePass} onChange={e => setNewJudgePass(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <button disabled={isSubmitting} onClick={handleChangeJudgePassword} className="w-full bg-amber-600 hover:bg-amber-700 p-4 rounded-xl font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} Update Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="glass-card w-full max-w-3xl p-8 lg:p-12 rounded-[3rem] border border-white/10 shadow-2xl my-auto animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-10">
              <div><h3 className="text-3xl font-black font-header tracking-tight text-white">{editingEventId ? 'Modify Contest' : 'Configure New Event'}</h3></div>
              <button onClick={resetForm} className="p-3 bg-white/5 text-slate-500 hover:text-white rounded-2xl"><X /></button>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Event Name</label>
                  <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Type</label>
                  <div className="flex gap-3">
                    <button onClick={() => setEventType(EventType.JUDGING)} className={`flex-1 py-4 rounded-2xl font-bold border ${eventType === EventType.JUDGING ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}>Judging</button>
                    <button onClick={() => setEventType(EventType.QUIZ_BEE)} className={`flex-1 py-4 rounded-2xl font-bold border ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}>Quiz Bee</button>
                  </div>
                </div>
              </div>
              <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
              <button onClick={handleSaveEvent} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3"><Save /> {editingEventId ? 'Apply' : 'Initialize'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Participant Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header text-white">Enroll Contestant</h3><button onClick={() => setShowEnrollModal(null)} className="text-slate-600 hover:text-white"><X /></button></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Name</label><input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">District</label><select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none">{SDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <button onClick={handleEnrollParticipant} className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl font-black uppercase tracking-widest text-white flex items-center justify-center gap-2"><UserPlus size={20} /> Enroll</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Judge Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black font-header text-white">Register Judge</h3><button onClick={() => setShowJudgeModal(false)} className="text-slate-600 hover:text-white"><X /></button></div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl mb-6 flex items-start gap-3">
              <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-[10px] text-blue-200/70 font-bold uppercase tracking-widest leading-relaxed">
                Auth remains active as Admin during this creation.
              </p>
            </div>

            <div className="space-y-6">
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Full Name</label><input type="text" value={judgeName} onChange={e => setJudgeName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Email</label><input type="email" value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Password</label><input type="password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Assign Event</label><select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl font-bold text-white outline-none"><option value="">Select Event</option>{events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
              <button disabled={isSubmitting} onClick={handleCreateJudge} className="w-full bg-indigo-600 p-4 rounded-xl font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />} Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
