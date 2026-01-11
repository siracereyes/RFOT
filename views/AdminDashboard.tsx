
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, GitBranch, Trash2, Key, UserCheck, BarChart4, ClipboardList, Info } from 'lucide-react';
import WeightingWizard from '../components/WeightingWizard';
import { Event, EventType, Criterion, Participant, User, UserRole, Score } from '../types';

interface AdminDashboardProps {
  events: Event[];
  participants: Participant[];
  users: User[];
  scores: Score[];
  onAddEvent: (e: Event) => void;
  onUpdateEvent: (e: Event) => void;
  onAddParticipant: (p: Participant) => void;
  onAddJudge: (u: User) => void;
  onRemoveJudge: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ events, participants, users, scores, onAddEvent, onUpdateEvent, onAddParticipant, onAddJudge, onRemoveJudge }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'results'>('events');
  const [showWizard, setShowWizard] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [selectedResultEventId, setSelectedResultEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  
  // Setup State for Events
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.JUDGING);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [numRounds, setNumRounds] = useState<number>(3);
  const [hasTieBreak, setHasTieBreak] = useState<boolean>(true);

  // Setup State for Judges
  const [judgeUsername, setJudgeUsername] = useState('');
  const [judgePassword, setJudgePassword] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');

  // New Participant State
  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState('');

  // Results Tab logic
  const resultEvent = events.find(e => e.id === selectedResultEventId);
  const resultsData = useMemo(() => {
    if (!resultEvent) return null;
    
    const eventParticipants = participants.filter(p => p.eventId === resultEvent.id);
    const eventScores = scores.filter(s => s.eventId === resultEvent.id);
    const eventJudges = users.filter(u => u.role === UserRole.JUDGE && u.assignedEventId === resultEvent.id);

    // Calculate ranks per judge for Judging events
    const judgeRanks: Record<string, Record<string, number>> = {};
    // Fix: Explicitly cast judgesInvolved to string array to prevent index type errors
    const judgesInvolved = [...new Set(eventScores.map(s => s.judgeId))] as string[];
    
    judgesInvolved.forEach(jId => {
      const jScores = eventScores.filter(s => s.judgeId === jId);
      const sorted = [...jScores].sort((a, b) => b.totalScore - a.totalScore);
      judgeRanks[jId] = {};
      sorted.forEach((s, i) => {
        judgeRanks[jId][s.participantId] = i + 1;
      });
      // Fill missing
      eventParticipants.forEach(p => {
        if (!judgeRanks[jId][p.id]) judgeRanks[jId][p.id] = eventParticipants.length;
      });
    });

    const processed = eventParticipants.map(p => {
      let rankSum = 0;
      judgesInvolved.forEach(jId => {
        rankSum += judgeRanks[jId][p.id];
      });
      const pScores = eventScores.filter(s => s.participantId === p.id);
      const avg = pScores.length > 0 ? pScores.reduce((sum, s) => sum + s.totalScore, 0) / pScores.length : 0;
      
      return { 
        ...p, 
        rankSum, 
        averageRaw: avg,
        individualRanks: judgesInvolved.map(jId => ({ 
          judgeName: users.find(u => u.id === jId)?.name || 'Unknown', 
          rank: judgeRanks[jId][p.id] 
        }))
      };
    });

    return {
      judges: judgesInvolved.map(jId => users.find(u => u.id === jId)?.name || 'Judge'),
      participants: processed.sort((a, b) => {
        if (resultEvent.type === EventType.JUDGING) {
          if (a.rankSum !== b.rankSum) return a.rankSum - b.rankSum;
          return b.averageRaw - a.averageRaw;
        }
        return b.averageRaw - a.averageRaw;
      })
    };
  }, [resultEvent, participants, scores, users]);

  useEffect(() => {
    if (editingEventId) {
      const e = events.find(ev => ev.id === editingEventId);
      if (e) {
        setEventName(e.name);
        setEventType(e.type);
        setCriteria(e.criteria);
        setNumRounds(e.numRounds || 3);
        setHasTieBreak(e.hasTieBreak || false);
        setShowWizard(true);
      }
    }
  }, [editingEventId, events]);

  const handleSaveEvent = () => {
    if (!eventName || (eventType === EventType.JUDGING && criteria.reduce((sum, c) => sum + c.weight, 0) !== 100)) {
      alert("Please ensure event name is set and criteria weights total 100%");
      return;
    }

    if (editingEventId) {
      const existing = events.find(e => e.id === editingEventId);
      if (existing) {
        onUpdateEvent({
          ...existing,
          name: eventName,
          type: eventType,
          criteria: criteria,
          numRounds: eventType === EventType.QUIZ_BEE ? numRounds : undefined,
          hasTieBreak: eventType === EventType.QUIZ_BEE ? hasTieBreak : undefined,
        });
      }
    } else {
      const event: Event = {
        id: Math.random().toString(36).substr(2, 9),
        name: eventName,
        type: eventType,
        criteria: criteria,
        numRounds: eventType === EventType.QUIZ_BEE ? numRounds : undefined,
        hasTieBreak: eventType === EventType.QUIZ_BEE ? hasTieBreak : undefined,
        isLocked: false,
        eventAdminId: 'u1'
      };
      onAddEvent(event);
    }
    resetForm();
  };

  const handleCreateJudge = () => {
    if (!judgeUsername || !judgePassword || !assignedEventId) {
      alert("Please fill in all judge details and assign an event.");
      return;
    }
    if (users.find(u => u.name === judgeUsername)) {
      alert("Username already exists.");
      return;
    }
    const newJudge: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: judgeUsername,
      password: judgePassword,
      email: `${judgeUsername}@rfot.gov.ph`,
      role: UserRole.JUDGE,
      assignedEventId: assignedEventId
    };
    onAddJudge(newJudge);
    setJudgeUsername('');
    setJudgePassword('');
    setAssignedEventId('');
    setShowJudgeModal(false);
  };

  const resetForm = () => {
    setShowWizard(false);
    setEditingEventId(null);
    setEventName('');
    setCriteria([]);
    setEventType(EventType.JUDGING);
    setNumRounds(3);
    setHasTieBreak(true);
  };

  const handleEnrollParticipant = () => {
    if (!newPartName || !newPartDistrict || !showEnrollModal) return;
    const p: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPartName,
      district: newPartDistrict,
      eventId: showEnrollModal
    };
    onAddParticipant(p);
    setNewPartName('');
    setNewPartDistrict('');
    setShowEnrollModal(null);
  };

  const toggleLock = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) onUpdateEvent({ ...event, isLocked: !event.isLocked });
  };

  const judges = users.filter(u => u.role === UserRole.JUDGE);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-header tracking-tight">Management Console</h1>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setActiveTab('events')}
              className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'events' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Event Hub
            </button>
            <button 
              onClick={() => setActiveTab('judges')}
              className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'judges' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Judge Roster
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'results' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Results & Rankings
            </button>
          </div>
        </div>
        {!showWizard && activeTab === 'events' && (
          <button 
            onClick={() => { resetForm(); setShowWizard(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Create New Event
          </button>
        )}
        {activeTab === 'judges' && (
          <button 
            onClick={() => setShowJudgeModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <UserPlus size={20} />
            Assign New Judge
          </button>
        )}
      </div>

      {activeTab === 'events' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-3xl border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <Trophy size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Events</p>
              <h3 className="text-3xl font-black mt-1">{events.length}</h3>
            </div>
            <div className="glass p-6 rounded-3xl border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Users size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Participants</p>
              <h3 className="text-3xl font-black mt-1">{participants.length}</h3>
            </div>
            <div className="glass p-6 rounded-3xl border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Shield size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Judges Online</p>
              <h3 className="text-3xl font-black mt-1 text-emerald-400">{judges.length}</h3>
            </div>
          </div>

          {showWizard ? (
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 animate-in slide-in-from-bottom-10 duration-500">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-bold font-header">{editingEventId ? 'Edit Competition' : 'New Event Setup'}</h2>
                  <p className="text-sm text-slate-400 mt-1">Define scoring rules and category behavior.</p>
                </div>
                <button onClick={resetForm} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">Competition Name</label>
                      <input 
                        type="text" 
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="e.g., Regional Dance Off" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold text-lg" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">Category Type</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setEventType(EventType.JUDGING)}
                          className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${eventType === EventType.JUDGING ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                        >
                          <Award size={32} />
                          <span className="font-bold uppercase tracking-widest text-xs">Judging</span>
                        </button>
                        <button 
                          onClick={() => setEventType(EventType.QUIZ_BEE)}
                          className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${eventType === EventType.QUIZ_BEE ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                        >
                          <Layers size={32} />
                          <span className="font-bold uppercase tracking-widest text-xs">Quiz Bee</span>
                        </button>
                      </div>
                    </div>
                    {eventType === EventType.QUIZ_BEE && (
                      <div className="glass bg-blue-500/5 p-6 rounded-3xl border border-blue-500/10 space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                          <Layers size={16} /> Quiz Bee Configuration
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Number of Rounds</label>
                            <input 
                              type="number" 
                              value={numRounds}
                              onChange={(e) => setNumRounds(parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-center font-bold"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Tie-Break Round</label>
                            <button 
                              onClick={() => setHasTieBreak(!hasTieBreak)}
                              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border transition-all font-bold text-xs ${hasTieBreak ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-600'}`}
                            >
                              {hasTieBreak ? <Check size={16} /> : <GitBranch size={16} />}
                              {hasTieBreak ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={handleSaveEvent}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                    >
                      {editingEventId ? 'Update Competition' : 'Finalize & Create'}
                    </button>
                  </div>
                  <div className="glass bg-white/[0.02] p-8 rounded-3xl border border-white/10">
                    {eventType === EventType.JUDGING ? (
                      <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />
                    ) : (
                      <div className="p-10 text-center space-y-6">
                        <Layers size={48} className="mx-auto text-slate-800" />
                        <div>
                          <h4 className="font-bold text-lg">Quiz Bee Mode</h4>
                          <p className="text-slate-500 mt-2 text-sm leading-relaxed">In Quiz Bee mode, contestants are evaluated per round. Scores are aggregated cumulatively.</p>
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {events.map(event => (
                <div key={event.id} className="glass group hover:bg-white/[0.04] transition-all p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/5 group-hover:scale-105 transition-transform">
                      {event.type === EventType.JUDGING ? <Award size={32} /> : <Layers size={32} />}
                    </div>
                    <div>
                      <h4 className="font-black text-2xl tracking-tight group-hover:text-blue-400 transition-colors">{event.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{event.type.replace('_', ' ')}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                        <span className="text-xs text-slate-500 font-bold">{participants.filter(p => p.eventId === event.id).length} Enrolled</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditingEventId(event.id)} className="p-3.5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-blue-400 transition-all" title="Edit Event"><Edit3 size={20} /></button>
                    <button onClick={() => setShowEnrollModal(event.id)} className="p-3.5 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600/20 transition-all" title="Enroll Participant"><UserPlus size={20} /></button>
                    <button onClick={() => toggleLock(event.id)} className={`p-3.5 rounded-2xl transition-all ${event.isLocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`} title={event.isLocked ? "Unlock Scoring" : "Lock Scoring"}>
                      {event.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'judges' && (
        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Judge Username</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Assigned Event</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500">System ID</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 italic font-medium">No judge accounts created yet.</td></tr>
              ) : (
                judges.map(judge => (
                  <tr key={judge.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400"><UserCheck size={16} /></div><span className="font-bold text-lg">{judge.name}</span></div></td>
                    <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">{events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}</span></td>
                    <td className="px-8 py-6 text-slate-500 font-mono text-xs">{judge.id}</td>
                    <td className="px-8 py-6 text-right"><button onClick={() => onRemoveJudge(judge.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors" title="Remove Judge Account"><Trash2 size={18} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
            <BarChart4 size={24} className="text-blue-400 ml-2" />
            <select 
              value={selectedResultEventId}
              onChange={(e) => setSelectedResultEventId(e.target.value)}
              className="bg-transparent border-none text-xl font-black text-white outline-none cursor-pointer flex-1"
            >
              <option value="" disabled className="bg-slate-950">Select Event to Analyze</option>
              {events.map(e => <option key={e.id} value={e.id} className="bg-slate-950">{e.name}</option>)}
            </select>
          </div>

          {!resultEvent ? (
            <div className="glass p-20 rounded-[3rem] text-center"><ClipboardList size={48} className="mx-auto text-slate-800 mb-4" /><p className="text-slate-500">Select an event category from the dropdown above to view detailed rankings and judge breakdown.</p></div>
          ) : resultsData && resultsData.participants.length > 0 ? (
            <div className="glass-card rounded-[2.5rem] overflow-x-auto border border-white/10 shadow-3xl">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Final Rank</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Contestant</th>
                    {resultsData.judges.map((jName, idx) => (
                      <th key={idx} className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-blue-400 text-center">{jName}<br/><span className="text-slate-600">Rank</span></th>
                    ))}
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-emerald-400 text-right">Rank Sum</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Avg Raw Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {resultsData.participants.map((p, i) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6"><span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-yellow-400 text-black' : 'bg-white/5 text-slate-500'}`}>{i + 1}</span></td>
                      <td className="px-8 py-6"><div><div className="font-bold text-lg">{p.name}</div><div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{p.district}</div></div></td>
                      {p.individualRanks.map((r, idx) => (
                        <td key={idx} className="px-8 py-6 text-center font-bold text-slate-300">{r.rank}</td>
                      ))}
                      <td className="px-8 py-6 text-right font-black text-2xl text-emerald-400">{p.rankSum}</td>
                      <td className="px-8 py-6 text-right font-mono text-sm text-slate-500">{p.averageRaw.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-emerald-500/5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 text-center flex items-center justify-center gap-2">
                <Info size={12} /> Winner determined by the lowest Sum of Ranks across all judges. Raw average serves as tie-breaker.
              </div>
            </div>
          ) : (
             <div className="glass p-20 rounded-[3rem] text-center text-slate-600 italic">No scores have been recorded for this event yet.</div>
          )}
        </div>
      )}

      {/* Modals */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header tracking-tight">Setup Judge Access</h3><button onClick={() => setShowJudgeModal(false)} className="p-2 text-slate-600 hover:text-white transition-colors"><X size={28} /></button></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Username</label><input type="text" value={judgeUsername} onChange={(e) => setJudgeUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 font-bold transition-all" placeholder="e.g. Judge_Smith" /></div>
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Password</label><div className="relative"><input type="text" value={judgePassword} onChange={(e) => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 font-bold transition-all pr-12" placeholder="Set secure password" /><Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={20} /></div></div>
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Assigned Event</label><select value={assignedEventId} onChange={(e) => setAssignedEventId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 font-bold transition-all appearance-none"><option value="" className="bg-slate-950 text-slate-500">Select Competition</option>{events.map(e => <option key={e.id} value={e.id} className="bg-slate-950">{e.name}</option>)}</select></div>
              <button onClick={handleCreateJudge} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-6">Create Judge Account</button>
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header tracking-tight">Participant Entry</h3><button onClick={() => setShowEnrollModal(null)} className="p-2 text-slate-600 hover:text-white transition-colors"><X size={28} /></button></div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 border-l-2 border-blue-500 pl-4">Category: <span className="text-blue-400">{events.find(e => e.id === showEnrollModal)?.name}</span></p>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Full Name</label><input type="text" value={newPartName} onChange={(e) => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 font-bold transition-all" placeholder="Juan Dela Cruz" /></div>
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">District / Division</label><input type="text" value={newPartDistrict} onChange={(e) => setNewPartDistrict(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 font-bold transition-all" placeholder="District IV - West Coast" /></div>
              <button onClick={handleEnrollParticipant} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all mt-6">Enroll Contestant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
