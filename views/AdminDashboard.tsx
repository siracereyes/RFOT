
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, GitBranch, Trash2, Key, UserCheck, BarChart4, ClipboardList, Info, Star, Medal } from 'lucide-react';
import WeightingWizard from '../components/WeightingWizard';
import { Event, EventType, Criterion, Participant, User, UserRole, Score } from '../types';
import { SDO_LIST } from '../constants';

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
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'results' | 'overall'>('events');
  const [showWizard, setShowWizard] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [selectedResultEventId, setSelectedResultEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.JUDGING);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [numRounds, setNumRounds] = useState<number>(3);
  const [hasTieBreak, setHasTieBreak] = useState<boolean>(true);

  const [judgeUsername, setJudgeUsername] = useState('');
  const [judgePassword, setJudgePassword] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');

  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState(SDO_LIST[0]);

  // Results Tab logic (Sum of Ranks)
  const resultEvent = events.find(e => e.id === selectedResultEventId);
  const resultsData = useMemo(() => {
    if (!resultEvent) return null;
    
    const eventParticipants = participants.filter(p => p.eventId === resultEvent.id);
    const eventScores = scores.filter(s => s.eventId === resultEvent.id);
    const judgesInvolved = [...new Set(eventScores.map(s => s.judgeId))] as string[];
    
    const judgeRanks: Record<string, Record<string, number>> = {};
    judgesInvolved.forEach(jId => {
      const jScores = eventScores.filter(s => s.judgeId === jId);
      const sorted = [...jScores].sort((a, b) => b.totalScore - a.totalScore);
      judgeRanks[jId] = {};
      sorted.forEach((s, i) => {
        judgeRanks[jId][s.participantId] = i + 1;
      });
      eventParticipants.forEach(p => {
        if (!judgeRanks[jId][p.id]) judgeRanks[jId][p.id] = eventParticipants.length;
      });
    });

    const processed = eventParticipants.map(p => {
      let rankSum = 0;
      judgesInvolved.forEach(jId => { rankSum += judgeRanks[jId][p.id]; });
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

  // Overall Festival Standings logic
  const overallStandings = useMemo(() => {
    const sdoPoints: Record<string, { gold: number, silver: number, bronze: number, points: number }> = {};
    // Fix: Corrected the initialization of the bronze property value
    SDO_LIST.forEach(sdo => sdoPoints[sdo] = { gold: 0, silver: 0, bronze: 0, points: 0 });

    events.forEach(event => {
      const eventParticipants = participants.filter(p => p.eventId === event.id);
      const eventScores = scores.filter(s => s.eventId === event.id);
      const judgesInvolved = [...new Set(eventScores.map(s => s.judgeId))] as string[];

      if (eventScores.length === 0) return;

      const judgeRanks: Record<string, Record<string, number>> = {};
      judgesInvolved.forEach(jId => {
        const jScores = eventScores.filter(s => s.judgeId === jId);
        const sorted = [...jScores].sort((a, b) => b.totalScore - a.totalScore);
        judgeRanks[jId] = {};
        sorted.forEach((s, i) => judgeRanks[jId][s.participantId] = i + 1);
        eventParticipants.forEach(p => { if (!judgeRanks[jId][p.id]) judgeRanks[jId][p.id] = eventParticipants.length; });
      });

      const processed = eventParticipants.map(p => {
        let rankSum = 0;
        judgesInvolved.forEach(jId => rankSum += judgeRanks[jId][p.id]);
        const pScores = eventScores.filter(s => s.participantId === p.id);
        const avg = pScores.length > 0 ? pScores.reduce((sum, s) => sum + s.totalScore, 0) / pScores.length : 0;
        return { district: p.district, rankSum, averageRaw: avg };
      }).sort((a, b) => a.rankSum - b.rankSum || b.averageRaw - a.averageRaw);

      if (processed[0]) { sdoPoints[processed[0].district].gold++; sdoPoints[processed[0].district].points += 5; }
      if (processed[1]) { sdoPoints[processed[1].district].silver++; sdoPoints[processed[1].district].points += 3; }
      if (processed[2]) { sdoPoints[processed[2].district].bronze++; sdoPoints[processed[2].district].points += 1; }
    });

    return Object.entries(sdoPoints)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.points - a.points || b.gold - a.gold);
  }, [events, participants, scores]);

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
      if (existing) onUpdateEvent({ ...existing, name: eventName, type: eventType, criteria: criteria, numRounds: eventType === EventType.QUIZ_BEE ? numRounds : undefined, hasTieBreak: eventType === EventType.QUIZ_BEE ? hasTieBreak : undefined });
    } else {
      onAddEvent({ id: Math.random().toString(36).substr(2, 9), name: eventName, type: eventType, criteria: criteria, numRounds: eventType === EventType.QUIZ_BEE ? numRounds : undefined, hasTieBreak: eventType === EventType.QUIZ_BEE ? hasTieBreak : undefined, isLocked: false, eventAdminId: 'u1' });
    }
    resetForm();
  };

  const handleCreateJudge = () => {
    if (!judgeUsername || !judgePassword || !assignedEventId) return alert("Fill all details.");
    onAddJudge({ id: Math.random().toString(36).substr(2, 9), name: judgeUsername, password: judgePassword, email: `${judgeUsername}@rfot.gov.ph`, role: UserRole.JUDGE, assignedEventId });
    setJudgeUsername(''); setJudgePassword(''); setAssignedEventId(''); setShowJudgeModal(false);
  };

  const resetForm = () => { setShowWizard(false); setEditingEventId(null); setEventName(''); setCriteria([]); setEventType(EventType.JUDGING); };

  const handleEnrollParticipant = () => {
    if (!newPartName || !newPartDistrict || !showEnrollModal) return;
    onAddParticipant({ id: Math.random().toString(36).substr(2, 9), name: newPartName, district: newPartDistrict, eventId: showEnrollModal });
    setNewPartName(''); setShowEnrollModal(null);
  };

  const judges = users.filter(u => u.role === UserRole.JUDGE);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-header tracking-tight">Management Console</h1>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {['events', 'judges', 'results', 'overall'].map((t) => (
              <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {t.replace('_', ' ')} Hub
              </button>
            ))}
          </div>
        </div>
        {!showWizard && activeTab === 'events' && (
          <button onClick={() => { resetForm(); setShowWizard(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
            <Plus size={20} /> Create New Event
          </button>
        )}
      </div>

      {activeTab === 'events' && (
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
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Judge Username</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500">Assigned Event</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 font-bold">{judge.name}</td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">{events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}</span></td>
                  <td className="px-8 py-6 text-right"><button onClick={() => onRemoveJudge(judge.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'overall' && (
        <div className="space-y-6">
          <div className="text-center py-10">
            <h2 className="text-4xl font-black font-header tracking-tighter bg-gradient-to-r from-yellow-400 via-white to-yellow-600 bg-clip-text text-transparent">General Championship Standings</h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Aggregate Medal Tally (Gold=5pt, Silver=3pt, Bronze=1pt)</p>
          </div>
          <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Rank</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Schools Division Office (SDO)</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-yellow-400 text-center">G</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-300 text-center">S</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-amber-600 text-center">B</th>
                  <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-blue-400 text-right">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {overallStandings.map((sdo, i) => (
                  <tr key={sdo.name} className={`hover:bg-white/[0.03] transition-colors ${i === 0 ? 'bg-yellow-500/5' : ''}`}>
                    <td className="px-10 py-8 font-black text-2xl text-slate-700">{i + 1}</td>
                    <td className="px-10 py-8 font-black text-xl">{sdo.name}</td>
                    <td className="px-10 py-8 text-center font-bold text-yellow-400">{sdo.gold}</td>
                    <td className="px-10 py-8 text-center font-bold text-slate-300">{sdo.silver}</td>
                    <td className="px-10 py-8 text-center font-bold text-amber-600">{sdo.bronze}</td>
                    <td className="px-10 py-8 text-right font-black text-3xl text-blue-400 tracking-tighter">{sdo.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Show Wizard Modal (Create/Edit Event) - existing logic */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between mb-8">
              <h2 className="text-2xl font-bold">{editingEventId ? 'Edit Event' : 'Create Event'}</h2>
              <button onClick={resetForm}><X /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Event Name" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setEventType(EventType.JUDGING)} className={`p-4 rounded-xl border ${eventType === EventType.JUDGING ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'}`}>Judging</button>
                  <button onClick={() => setEventType(EventType.QUIZ_BEE)} className={`p-4 rounded-xl border ${eventType === EventType.QUIZ_BEE ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'}`}>Quiz Bee</button>
                </div>
                <button onClick={handleSaveEvent} className="w-full bg-blue-600 p-4 rounded-xl font-bold">Save Event</button>
              </div>
              <div>{eventType === EventType.JUDGING && <WeightingWizard initialCriteria={criteria} onChange={setCriteria} />}</div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Modal - Using SDO List */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black font-header">Enroll Participant</h3>
              <button onClick={() => setShowEnrollModal(null)}><X /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Contestant Name / ID</label>
                <input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Schools Division Office</label>
                <select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl font-bold">
                  {SDO_LIST.map(sdo => <option key={sdo} value={sdo}>{sdo}</option>)}
                </select>
              </div>
              <button onClick={handleEnrollParticipant} className="w-full bg-blue-600 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl">Confirm Enrollment</button>
            </div>
          </div>
        </div>
      )}

      {/* Judge Management Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black">Assign Judge</h3><button onClick={() => setShowJudgeModal(false)}><X /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Username" value={judgeUsername} onChange={e => setJudgeUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
              <input type="password" placeholder="Password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
              <select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl">
                <option value="">Assign Event</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={handleCreateJudge} className="w-full bg-indigo-600 p-4 rounded-xl font-bold">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
