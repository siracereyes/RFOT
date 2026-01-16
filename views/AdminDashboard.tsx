
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Plus, Lock, Unlock, Award, UserPlus, X, Edit3, Trash2, Loader2, Save, Hash, RefreshCw, BookOpen, Music, Microscope, Layout, Sparkles, AlertCircle, Mail, Key, UserCheck, ChevronRight, BarChart3, Medal, TrendingUp } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'overall' | 'system'>('events');
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

  // --- OVERALL STANDING CALCULATION LOGIC ---
  const overallStandings = useMemo(() => {
    if (events.length === 0) return [];

    // 1. Calculate Ranks for each SDO in each event
    const matrix: Record<string, Record<string, number>> = {}; // district -> eventId -> rank
    const SDO_COUNT = SDO_LIST.length;

    events.forEach(event => {
      const eventScores = scores.filter(s => s.eventId === event.id);
      const eventParticipants = participants.filter(p => p.eventId === event.id);

      // Map SDO to its average score in this event
      const sdoAverages = SDO_LIST.map(district => {
        const districtParts = eventParticipants.filter(p => p.district === district);
        if (districtParts.length === 0) return { district, score: -1 }; // Non-participant

        const pIds = districtParts.map(p => p.id);
        const pScores = eventScores.filter(s => pIds.includes(s.participantId));
        
        const avg = pScores.length > 0 
          ? pScores.reduce((sum, s) => sum + s.totalScore, 0) / pScores.length 
          : 0;
        
        return { district, score: avg };
      });

      // Rank the participating SDOs
      const participantsOnly = sdoAverages
        .filter(s => s.score !== -1)
        .sort((a, b) => b.score - a.score);

      SDO_LIST.forEach(district => {
        if (!matrix[district]) matrix[district] = {};
        
        const perf = sdoAverages.find(s => s.district === district);
        if (!perf || perf.score === -1) {
          matrix[district][event.id] = SDO_COUNT; // Assign lowest rank for non-participation
        } else {
          // Find index in sorted list
          const rankIndex = participantsOnly.findIndex(p => p.district === district);
          matrix[district][event.id] = rankIndex + 1;
        }
      });
    });

    // 2. Aggregate average rank for each SDO
    const finalStandings = SDO_LIST.map(district => {
      const eventRanks = Object.values(matrix[district]);
      const meanRank = eventRanks.reduce((sum, r) => sum + r, 0) / Math.max(1, events.length);
      return {
        district,
        eventRanks: matrix[district],
        meanRank: Number(meanRank.toFixed(2))
      };
    });

    // 3. Sort by lowest mean rank (Lower is better)
    return finalStandings.sort((a, b) => a.meanRank - b.meanRank);
  }, [events, scores, participants]);

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
              { id: 'overall', label: 'Overall Standing', icon: <Medal size={16} /> }
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
                  <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
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

      {activeTab === 'overall' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black font-header text-slate-900">RFOT 2026 Overall Standing</h2>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Matrix of Regional Excellence • All Districts</p>
            </div>
            <div className="px-5 py-2.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <TrendingUp size={14} /> Rank-Average Based Standings
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden relative">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-50 px-8 py-10 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100 min-w-[240px]">District (SDO)</th>
                    {events.map(event => (
                      <th key={event.id} className="px-6 py-10 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100 min-w-[120px] text-center">
                        <div className="max-w-[100px] mx-auto truncate" title={event.name}>{event.name}</div>
                      </th>
                    ))}
                    <th className="px-8 py-10 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/30 text-center min-w-[140px]">Mean Rank</th>
                    <th className="px-8 py-10 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50/30 text-center min-w-[140px]">Final Placement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overallStandings.map((res, i) => (
                    <tr key={res.district} className="hover:bg-slate-50/30 transition-all group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-8 py-6 border-r border-slate-100">
                        <div className="flex items-center gap-4">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${
                             i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-400'
                           }`}>
                             {i + 1}
                           </div>
                           <span className="text-sm font-black text-slate-900">{res.district}</span>
                        </div>
                      </td>
                      {events.map(event => {
                        const r = res.eventRanks[event.id];
                        return (
                          <td key={event.id} className="px-6 py-6 text-center border-r border-slate-100">
                            <span className={`text-sm font-black tabular-nums ${
                              r === 1 ? 'text-amber-500' : r === 16 ? 'text-slate-200' : 'text-slate-400'
                            }`}>
                              {r === 16 ? '—' : r}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-8 py-6 text-center bg-blue-50/10 font-black text-blue-600 text-lg tabular-nums">
                        {res.meanRank}
                      </td>
                      <td className="px-8 py-6 text-center bg-amber-50/10">
                        <div className="flex items-center justify-center gap-2">
                           {i === 0 && <Medal className="text-amber-500" size={20} />}
                           {i === 1 && <Medal className="text-slate-400" size={20} />}
                           {i === 2 && <Medal className="text-orange-500" size={20} />}
                           <span className={`font-black text-sm uppercase tracking-widest ${i < 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                             {i === 0 ? 'Champion' : i === 1 ? '2nd Place' : i === 2 ? '3rd Place' : `${i + 1}th`}
                           </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Technical Formula</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">Non-Participation Rule</p>
                <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider">
                  Districts not participating in a category are automatically assigned Rank 16 (lowest standing) for that event to maintain mathematical consistency across all regional assessments.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">Mean Rank Determination</p>
                <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider">
                  The Overall Champion is the district with the lowest Mean Rank average across all contested categories.
                </p>
              </div>
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
