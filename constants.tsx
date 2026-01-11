
import React from 'react';
import { UserRole, User, Event, Participant } from './types';
import { LayoutDashboard, Award, Users, Trophy, BarChart3 } from 'lucide-react';

export const SDO_LIST = [
  "SDO Caloocan",
  "SDO Las Piñas",
  "SDO Makati",
  "SDO Malabon",
  "SDO Mandaluyong",
  "SDO Manila",
  "SDO Marikina",
  "SDO Muntinlupa",
  "SDO Navotas",
  "SDO Parañaque",
  "SDO Pasay",
  "SDO Pasig",
  "SDO Quezon",
  "SDO San Juan",
  "SDO Taguig and Pateros",
  "SDO Valenzuela"
];

export const MOCK_USER: User = {
  id: 'u1',
  name: 'System Administrator',
  role: UserRole.SUPER_ADMIN,
  email: 'admin@rfot.gov.ph'
};

export const MOCK_EVENTS: Event[] = [];
export const MOCK_PARTICIPANTS: Participant[] = [];

export const NAV_ITEMS = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: [UserRole.SUPER_ADMIN, UserRole.EVENT_ADMIN] },
  { label: 'Events', icon: <Trophy size={20} />, path: '/events', roles: [UserRole.SUPER_ADMIN, UserRole.EVENT_ADMIN] },
  { label: 'Scoring', icon: <Award size={20} />, path: '/scoring', roles: [UserRole.JUDGE] },
  { label: 'Public View', icon: <Users size={20} />, path: '/public', roles: [UserRole.SUPER_ADMIN, UserRole.EVENT_ADMIN, UserRole.JUDGE] },
];
