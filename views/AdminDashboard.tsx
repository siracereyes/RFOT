
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, GitBranch, Trash2, Key, UserCheck, BarChart4, ClipboardList, Info, Star, Medal, ScrollText, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import WeightingWizard from '../components/WeightingWizard';
import { Event, EventType, Criterion, Participant, User, UserRole, Score } from '../types';
import { SDO_LIST } from '../constants';
import { supabase } from '../supabase';

interface AdminDashboardProps {
  events: Event[];
  participants: Participant[];
  users: User[];
  scores: Score[];
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
  onAddEvent, 
  onUpdateEvent, 
  onAddParticipant, 
  onUpdateParticipant, 
  onDeleteParticipant, 
  onAddJudge, 
  onRemoveJudge 
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'results' | 'overall'>('events');
  const [showWizard, setShowWizard] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [selectedResultEventId, setSelectedResultEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Event
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.JUDGING);
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  // Form states for Judge
  const [judgeEmail, setJudgeEmail] = useState('');
  const [judgePassword, setJudgePassword] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');

  // Form states for Participant
  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState(SDO_LIST[0]);

  // Load event data for editing
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
    if (!eventName || criteria.length === 0) {
      alert("Please provide an event name and at least one criterion.");
      return;
    }

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) {
      alert("Total criteria weight must equal 100%.");
      return;
    }

    if (editingEventId) {
      onUpdateEvent({
        id: editingEventId,
        name: eventName,
        type: eventType,
        criteria: criteria,
        isLocked: events.find(e => e.id === editingEventId)?.isLocked || false,
        eventAdminId: '' // Handled by App.tsx
      });
    } else {
      onAddEvent({
        id: Math.random().toString(36).substr(2, 9),
        name: eventName,
        type: eventType,
        criteria: criteria,
        isLocked: false,
        eventAdminId: '' // Handled by App.tsx
      });
    }

    resetForm();
  };

  const resetForm = () => { 
    setShowWizard(false); 
    setEditingEventId(null); 
    setEventName(''); 
    setCriteria([]); 
    setEventType(EventType.JUDGING); 
  };

  const handleCreateJudge = async () => {
    if (!judgeEmail || !judgePassword || !assignedEventId || !judgeName) return alert("Fill all details.");
    setIsSubmitting(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: judgeEmail,
      password: judgePassword,
      options: {
        data: { name: judgeName, role: UserRole.JUDGE, assignedEventId }
      }
    });

    if (error) {
      alert(error.message);
    } else if (data.user) {
      await onAddJudge({
        id: data.user.id,
        name: judgeName,
        role: UserRole.JUDGE,
        email: judgeEmail,
        assigned_event_id: assignedEventId
      });
      setJudgeEmail(''); setJudgePassword(''); setJudgeName(''); setAssignedEventId(''); setShowJudgeModal(false);
    }
    setIsSubmitting(false);
  };

  const handleEnrollParticipant = () => {
    if (!newPartName || !newPartDistrict) return;
    if (editingParticipant) {
      onUpdateParticipant({ ...editingParticipant, name: newPartName, district: newPartDistrict });
      setEditingParticipant(null);
    } else if (showEnrollModal) {
      onAddParticipant({ id: Math.random().toString(36).substr(2, 9), name: newPartName, district: newPartDistrict, eventId: showEnrollModal });
      setShowEnrollModal(null);
    }
    setNewPartName('');
  };

  const judges = users.filter(u => u.role === UserRole.JUDGE);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-header tracking-tight text-white">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {['events', 'judges', 'results'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
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
                    <span className="w-1 h-1 rounded-full bg-slate-800"></span>
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
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Judge Name</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Event Assignment</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-600 italic">No judges registered.</td></tr>
              ) : judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 font-bold text-white">{judge.name}</td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">{events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}</span></td>
                  <td className="px-8 py-6 text-right"><button onClick={() => onRemoveJudge(judge.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 border-t border-white/5 flex justify-end">
             <button onClick={() => setShowJudgeModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm">
                <UserPlus size={18} /> Register New Judge
             </button>
          </div>
        </div>
      )}

      {/* Event Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="glass-card w-full max-w-3xl p-8 lg:p-12 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black font-header tracking-tight text-white">
                  {editingEventId ? 'Modify Contest' : 'Configure New Event'}
                </h3>
                <p className="text-slate-400 mt-2">Define the rules, criteria, and scoring system.</p>
              </div>
              <button onClick={resetForm} className="p-3 bg-white/5 text-slate-500 hover:text-white rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Event Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Modern Dance Competition"
                    value={eventName} 
                    onChange={e => setEventName(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Competition Type</label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEventType(EventType.JUDGING)}
                      className={`flex-1 py-4 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2 ${eventType === EventType.JUDGING ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                    >
                      <Award size={18} /> Panel Judging
                    </button>
                    <button 
                      onClick={() => setEventType(EventType.QUIZ_BEE)}
                      className={`flex-1 py-4 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2 ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                    >
                      <Layers size={18} /> Point Based
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={resetForm}
                  className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-white bg-white/5 transition-all"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={handleSaveEvent}
                  className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20"
                >
                  <Save size={20} />
                  {editingEventId ? 'Apply Modifications' : 'Initialize Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Participant Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black font-header tracking-tight text-white">Enroll Contestant</h3>
              <button onClick={() => setShowEnrollModal(null)} className="p-2 text-slate-600 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Full Name / Group Name</label>
                <input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Division / School District</label>
                <select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none">
                  {SDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={handleEnrollParticipant} className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white">
                <UserPlus size={20} />
                Confirm Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Judge Management Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header tracking-tight text-white">Register Judge</h3><button onClick={() => setShowJudgeModal(false)} className="p-2 text-slate-600 hover:text-white transition-colors"><X size={24} /></button></div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Full Name</label>
                <input type="text" value={judgeName} onChange={e => setJudgeName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Email Address</label>
                <input type="email" value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Temporary Password</label>
                <input type="password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Assign To Event</label>
                <select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold text-white outline-none">
                  <option value="">Select Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <button disabled={isSubmitting} onClick={handleCreateJudge} className="w-full bg-indigo-600 hover:bg-indigo-700 p-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                Confirm Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
