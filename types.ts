
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
  description?: string; // Guidance for judges
}

export interface Round {
  id: string;
  name: string;
  points: number;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  criteria: Criterion[];
  rounds?: Round[];
  numRounds?: number; // Quiz Bee specific
  hasTieBreak?: boolean; // Quiz Bee specific
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
  criteriaScores: Record<string, number>; // criterionId -> score
  totalScore: number;
  critique?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  assignedEventId?: string;
}
