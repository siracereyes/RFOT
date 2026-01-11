
import React, { useState } from 'react';
import { Trophy, Users, Shield, Plus, Lock, Unlock, ArrowRight, Award, UserPlus, X } from 'lucide-react';
import WeightingWizard from '../components/WeightingWizard';
import { Event, EventType, Criterion, Participant } from '../types';

interface AdminDashboardProps {
  events: Event[];
  participants: Participant[];
  onAddEvent: (e: Event) => void;
  onUpdateEvent: (e: Event) => void;
  onAddParticipant: (p: Participant) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ events, participants, onAddEvent, onUpdateEvent, onAddParticipant }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null); // eventId
  
  // New Event State
  const [newEventName, setNewEventName] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>(EventType.JUDGING);
  const [newCriteria, setNewCriteria] = useState<Criterion[]>([]);
  
  // New Participant State
  const [newPartName, setNewPartName] = useState('');
  const [newPartDistrict, setNewPartDistrict] = useState('');

  const handleCreateEvent = () => {
    if (!newEventName || (newEventType === EventType.JUDGING && newCriteria.reduce((sum, c) => sum + c.weight, 0) !== 100)) {
      alert("Please ensure event name is set and criteria weights total 100%");
      return;
    }

    const event: Event = {
      id: Math.random().toString(36).substr(2, 9),
      name: newEventName,
      type: newEventType,
      criteria: newCriteria,
      isLocked: false,
      eventAdminId: 'u1'
    };

    onAddEvent(event);
    setShowWizard(false);
    setNewEventName('');
    setNewCriteria([]);
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
    if (event) {
      onUpdateEvent({ ...event, isLocked: !event.isLocked });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-header tracking-tight">Event Management</h1>
          <p className="text-slate-400 mt-2">Manage your RFOT events, participants, and scoring parameters.</p>
        </div>
        {!showWizard && (
          <button 
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Create New Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <Trophy size={24} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Total Events</p>
          <h3 className="text-3xl font-black mt-1">{events.length}</h3>
        </div>
        <div className="glass p-6 rounded-3xl border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <Users size={24} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Total Participants</p>
          <h3 className="text-3xl font-black mt-1">{participants.length}</h3>
        </div>
        <div className="glass p-6 rounded-3xl border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Shield size={24} />
          </div>
          <p className="text-slate-400 text-sm font-medium">System Status</p>
          <h3 className="text-3xl font-black mt-1">Live</h3>
        </div>
      </div>

      {showWizard ? (
        <div className="glass-card p-8 rounded-3xl border border-white/10 animate-in slide-in-from-bottom-10 duration-500">
           <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold font-header">New Event Setup</h2>
            <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-white transition-colors">Cancel</button>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Event Name</label>
                  <input 
                    type="text" 
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="e.g., Vocal Solo Competition" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Event Type</label>
                  <select 
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as EventType)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value={EventType.JUDGING}>Judging (Criteria-based)</option>
                    <option value={EventType.QUIZ_BEE}>Quiz Bee (Round-based)</option>
                  </select>
                </div>
                <button 
                  onClick={handleCreateEvent}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20"
                >
                  Create Event
                </button>
              </div>
              <div className="glass bg-white/5 p-6 rounded-2xl">
                {newEventType === EventType.JUDGING ? (
                  <WeightingWizard onChange={setNewCriteria} />
                ) : (
                  <div className="p-4 text-center text-slate-400 italic">
                    Quiz Bee rounds configuration coming soon. Standard cumulative scoring applied.
                  </div>
                )}
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-header flex items-center gap-2">
            Active Events
          </h2>
          {events.length === 0 ? (
            <div className="glass p-12 rounded-3xl border border-white/10 text-center space-y-4">
              <Trophy size={48} className="mx-auto text-slate-600" />
              <div>
                <h3 className="text-xl font-bold">No events created yet</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">Get started by creating your first festival event to manage participants and scoring.</p>
              </div>
              <button 
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-xl font-bold transition-all border border-white/10"
              >
                <Plus size={18} />
                Add Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {events.map(event => (
                <div key={event.id} className="glass group hover:bg-white/[0.05] transition-all p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400">
                      <Award size={28} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{event.name}</h4>
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        {participants.filter(p => p.eventId === event.id).length} Participants • {event.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowEnrollModal(event.id)}
                      className="p-3 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600/20 transition-all title='Enroll Participant'"
                    >
                      <UserPlus size={20} />
                    </button>
                    <button 
                      onClick={() => toggleLock(event.id)}
                      className={`p-3 rounded-2xl transition-all ${
                        event.isLocked 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                      title={event.isLocked ? "Unlock Scoring" : "Lock Scoring"}
                    >
                      {event.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enroll Participant Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-header">Enroll Participant</h3>
              <button onClick={() => setShowEnrollModal(null)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Enrolling for: <span className="text-blue-400 font-bold">{events.find(e => e.id === showEnrollModal)?.name}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                <input 
                  type="text" 
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500" 
                  placeholder="e.g., Juan Dela Cruz"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">District/School</label>
                <input 
                  type="text" 
                  value={newPartDistrict}
                  onChange={(e) => setNewPartDistrict(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500" 
                  placeholder="e.g., District IV"
                />
              </div>
              <button 
                onClick={handleEnrollParticipant}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all mt-4"
              >
                Enroll Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
