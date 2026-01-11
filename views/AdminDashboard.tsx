
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Check, Layers, GitBranch, Trash2, Key, UserCheck, BarChart4, ClipboardList, Info, Star, Medal, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const toggleEventExpand = (id: string) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Master calculation for all events
  const masterEventData = useMemo(() => {
    return events.map(event => {
      const eventParticipants = participants.filter(p => p.eventId === event.id);
      const eventScores = scores.filter(s => s.eventId === event.id);
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
          if (!judgeRanks[jId][p.id]) judgeRanks[jId][p.id] = eventParticipants.length || 0;
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
            judgeName: users.find(u => u.id === jId)?.name || 'Judge', 
            rank: judgeRanks[jId][p.id] 
          }))
        };
      }).sort((a, b) => {
        if (event.type === EventType.JUDGING) {
          if (a.rankSum !== b.rankSum) return a.rankSum - b.rankSum;
          return b.averageRaw - a.averageRaw;
        }
        return b.averageRaw - a.averageRaw;
      });

      return {
        event,
        judges: judgesInvolved.map(jId => users.find(u => u.id === jId)?.name || 'Judge'),
        results: processed
      };
    });
  }, [events, participants, scores, users]);

  // Overall Festival Standings logic (Medal Tally)
  const overallStandings = useMemo(() => {
    const sdoPoints: Record<string, { gold: number, silver: number, bronze: number, points: number }> = {};
    SDO_LIST.forEach(sdo => sdoPoints[sdo] = { gold: 0, silver: 0, bronze: 0, points: 0 });

    masterEventData.forEach(data => {
      const results = data.results;
      if (results.length === 0) return;

      if (results[0]) { sdoPoints[results[0].district].gold++; sdoPoints[results[0].district].points += 5; }
      if (results[1]) { sdoPoints[results[1].district].silver++; sdoPoints[results[1].district].points += 3; }
      if (results[2]) { sdoPoints[results[2].district].bronze++; sdoPoints[results[2].district].points += 1; }
    });

    return Object.entries(sdoPoints)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.points - a.points || b.gold - a.gold);
  }, [masterEventData]);

  // Selected Results Tab logic (Filtered View)
  const resultsData = masterEventData.find(d => d.event.id === selectedResultEventId);

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
                {t === 'overall' ? 'Festival Hub' : t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
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
          {events.length === 0 ? (
            <div className="col-span-full glass p-20 rounded-[3rem] text-center border border-white/10">
              <Award size={48} className="mx-auto text-slate-800 mb-4" />
              <p className="text-slate-500 font-medium">No events created yet. Use the "Create New Event" button to start.</p>
            </div>
          ) : events.map(event => (
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
              {judges.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-600 italic font-medium">No judge accounts created yet.</td></tr>
              ) : judges.map(judge => (
                <tr key={judge.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 font-bold">{judge.name}</td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">{events.find(e => e.id === judge.assignedEventId)?.name || 'Unassigned'}</span></td>
                  <td className="px-8 py-6 text-right"><button onClick={() => onRemoveJudge(judge.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 border-t border-white/5 flex justify-end">
             <button onClick={() => setShowJudgeModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm">
                <UserPlus size={18} /> Assign New Judge
             </button>
          </div>
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

          {/* Fix: Replaced resultEvent with resultsData which is the correct variable name defined on line 131 */}
          {!resultsData ? (
            <div className="glass p-20 rounded-[3rem] text-center"><ClipboardList size={48} className="mx-auto text-slate-800 mb-4" /><p className="text-slate-500">Select an event category from the dropdown above to view detailed rankings and judge breakdown.</p></div>
          ) : resultsData && resultsData.results.length > 0 ? (
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
                  {resultsData.results.map((p, i) => (
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

      {activeTab === 'overall' && (
        <div className="space-y-16 animate-in slide-in-from-bottom-10 duration-700">
          {/* General Championship Medal Tally */}
          <div className="space-y-6">
            <div className="text-center py-10 relative overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>
               <h2 className="text-4xl lg:text-6xl font-black font-header tracking-tighter bg-gradient-to-r from-yellow-400 via-white to-yellow-600 bg-clip-text text-transparent drop-shadow-2xl">General Championship</h2>
               <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[11px] mt-4 max-w-lg mx-auto leading-relaxed">
                 Aggregate Medal Standing across all contest categories. <br/> 
                 <span className="text-yellow-500/60 font-black">Gold=5pt | Silver=3pt | Bronze=1pt</span>
               </p>
            </div>
            
            <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Rank</th>
                    <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-500">Schools Division Office (SDO)</th>
                    <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-yellow-400 text-center">Gold</th>
                    <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-slate-300 text-center">Silver</th>
                    <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-amber-600 text-center">Bronze</th>
                    <th className="px-10 py-8 text-xs font-black uppercase tracking-widest text-blue-400 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {overallStandings.map((sdo, i) => (
                    <tr key={sdo.name} className={`hover:bg-white/[0.03] transition-colors ${i === 0 ? 'bg-yellow-500/5' : i === 1 ? 'bg-slate-500/5' : i === 2 ? 'bg-amber-600/5' : ''}`}>
                      <td className="px-10 py-8">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                          i === 0 ? 'bg-yellow-400 text-black' : 
                          i === 1 ? 'bg-slate-300 text-black' : 
                          i === 2 ? 'bg-amber-600 text-white' : 'text-slate-600 border border-white/10'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-10 py-8 font-black text-xl tracking-tight">{sdo.name}</td>
                      <td className="px-10 py-8 text-center font-bold text-yellow-400 text-lg">{sdo.gold}</td>
                      <td className="px-10 py-8 text-center font-bold text-slate-300 text-lg">{sdo.silver}</td>
                      <td className="px-10 py-8 text-center font-bold text-amber-600 text-lg">{sdo.bronze}</td>
                      <td className="px-10 py-8 text-right font-black text-4xl text-blue-400 tracking-tighter drop-shadow-sm">{sdo.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Master Result Sheet per Event */}
          <div className="space-y-10 border-t border-white/5 pt-16">
            <div className="flex items-center gap-4 px-2">
              <ScrollText size={32} className="text-blue-400" />
              <div>
                <h3 className="text-3xl font-black font-header tracking-tight">Master Event Results</h3>
                <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">Complete breakdown of all category balloting</p>
              </div>
            </div>

            <div className="space-y-6">
              {masterEventData.length === 0 ? (
                <div className="glass p-16 rounded-[3rem] text-center italic text-slate-600">No events found to report.</div>
              ) : masterEventData.map(data => (
                <div key={data.event.id} className="glass rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl transition-all hover:border-blue-500/20">
                  <button 
                    onClick={() => toggleEventExpand(data.event.id)}
                    className="w-full px-8 py-6 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        {data.event.type === EventType.JUDGING ? <Award size={24} /> : <Layers size={24} />}
                      </div>
                      <div>
                        <h4 className="text-xl font-black tracking-tight">{data.event.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.event.type.replace('_', ' ')}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{data.results.length} Entries Ranked</span>
                        </div>
                      </div>
                    </div>
                    {expandedEvents[data.event.id] ? <ChevronUp size={24} className="text-slate-600" /> : <ChevronDown size={24} className="text-slate-600" />}
                  </button>
                  
                  {expandedEvents[data.event.id] && (
                    <div className="overflow-x-auto animate-in slide-in-from-top-4 duration-300">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900/50 border-y border-white/5">
                          <tr>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Place</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">SDO / Contestant</th>
                            {data.judges.map((jName, idx) => (
                              <th key={idx} className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-blue-500/70 text-center">{jName}<br/>Rank</th>
                            ))}
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-emerald-400 text-right">Rank Sum</th>
                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Avg Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.results.length === 0 ? (
                            <tr><td colSpan={10} className="px-8 py-10 text-center text-slate-700 italic">No scores available for this category.</td></tr>
                          ) : data.results.map((p, i) => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-5">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                  i === 0 ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 
                                  i === 1 ? 'bg-slate-300 text-black' : 
                                  i === 2 ? 'bg-amber-600 text-white' : 'text-slate-600 border border-white/5'
                                }`}>
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="font-bold text-slate-200">{p.district}</div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{p.name}</div>
                              </td>
                              {p.individualRanks.map((r, idx) => (
                                <td key={idx} className="px-8 py-5 text-center font-bold text-slate-400">{r.rank}</td>
                              ))}
                              <td className="px-8 py-5 text-right font-black text-xl text-emerald-400/80">{p.rankSum}</td>
                              <td className="px-8 py-5 text-right font-mono text-xs text-slate-600">{p.averageRaw.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Show Wizard Modal (Create/Edit Event) */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 rounded-[3rem] border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black font-header tracking-tight">{editingEventId ? 'Edit Competition' : 'New Event Setup'}</h2>
              <button onClick={resetForm} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
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
        </div>
      )}

      {/* Enrollment Modal - Using SDO List */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black font-header tracking-tight">Enroll Participant</h3>
              <button onClick={() => setShowEnrollModal(null)} className="p-2 text-slate-600 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 border-l-2 border-blue-500 pl-4">Category: <span className="text-blue-400">{events.find(e => e.id === showEnrollModal)?.name}</span></p>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Contestant Name / ID</label>
                <input type="text" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none focus:border-blue-500/50" placeholder="e.g. Contestant #1" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Schools Division Office</label>
                <select value={newPartDistrict} onChange={e => setNewPartDistrict(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold outline-none appearance-none focus:border-blue-500/50">
                  {SDO_LIST.map(sdo => <option key={sdo} value={sdo} className="bg-slate-900">{sdo}</option>)}
                </select>
              </div>
              <button onClick={handleEnrollParticipant} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Confirm Enrollment</button>
            </div>
          </div>
        </div>
      )}

      {/* Judge Management Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black font-header tracking-tight">Assign Judge</h3><button onClick={() => setShowJudgeModal(false)} className="p-2 text-slate-600 hover:text-white transition-colors"><X size={24} /></button></div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Username</label>
                <input type="text" placeholder="Username" value={judgeUsername} onChange={e => setJudgeUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none focus:border-indigo-500/50" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Password</label>
                <input type="password" placeholder="Password" value={judgePassword} onChange={e => setJudgePassword(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none focus:border-indigo-500/50" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Assign To Event</label>
                <select value={assignedEventId} onChange={e => setAssignedEventId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-bold outline-none appearance-none focus:border-indigo-500/50">
                  <option value="" className="bg-slate-900">Select Event</option>
                  {events.map(e => <option key={e.id} value={e.id} className="bg-slate-950">{e.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreateJudge} className="w-full bg-indigo-600 hover:bg-indigo-700 p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
