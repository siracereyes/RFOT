
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  EVENT_ADMIN = 'EVENT_ADMIN',
  JUDGE = 'JUDGE'
}

export enum EventType {
  JUDGING = 'JUDGING',
  QUIZ_BEE = 'QUIZ_BEE'
}

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  description?: string;
}

export interface Round {
  id: string;
  name: string;
  points: number;
  isTieBreaker?: boolean;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  criteria: Criterion[];
  rounds?: Round[];
  numRounds?: number;
  hasTieBreak?: boolean;
  isLocked: boolean;
  eventAdminId: string;
}

export interface Participant {
  id: string;
  name: string;
  district: string;
  eventId: string;
}

export interface Score {
  id: string;
  judgeId: string;
  participantId: string;
  eventId: string;
  criteriaScores: Record<string, number>; // criterionId -> score OR roundId -> score
  totalScore: number;
  critique?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
  assignedEventId?: string;
}
