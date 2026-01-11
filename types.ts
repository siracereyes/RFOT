
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
}

export interface Round {
  id: string;
  name: string; // Easy, Average, Difficult
  points: number;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  criteria: Criterion[];
  rounds?: Round[];
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
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  assignedEventId?: string;
}
