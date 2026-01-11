
import React from 'react';
import { UserRole, User, Event, Participant } from './types';
import { LayoutDashboard, Award, Users, Trophy } from 'lucide-react';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'System Administrator',
  role: UserRole.SUPER_ADMIN,
  email: 'admin@rfot.gov.ph'
};

// Start with empty arrays for a clean slate
export const MOCK_EVENTS: Event[] = [];
export const MOCK_PARTICIPANTS: Participant[] = [];

export const NAV_ITEMS = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: [UserRole.SUPER_ADMIN, UserRole.EVENT_ADMIN] },
  { label: 'Events', icon: <Trophy size={20} />, path: '/events', roles: [UserRole.SUPER_ADMIN, UserRole.EVENT_ADMIN] },
  { label: 'Scoring', icon: <Award size={20} />, path: '/scoring', roles: [UserRole.JUDGE] },
  { label: 'Public View', icon: <Users size={20} />, path: '/public', roles: [UserRole.SUPER_ADMIN, UserRole.EVENT_ADMIN, UserRole.JUDGE] },
];
