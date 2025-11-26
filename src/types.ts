export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  CALENDAR = 'CALENDAR',
  PROFILE = 'PROFILE',
  AI_ADVISOR = 'AI_ADVISOR',
  RESOURCES = 'RESOURCES'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum Subject {
  HISTORY = 'History',
  POLITY = 'Polity',
  GEOGRAPHY = 'Geography',
  ECONOMICS = 'Economics',
  ETHICS = 'Ethics',
  CSAT = 'CSAT',
  CURRENT_AFFAIRS = 'Current Affairs',
  SYLLABUS = 'UPSC Syllabus',
  GENERAL = 'General'
}

export type Priority = 'High' | 'Medium' | 'Low';

export interface AcceptanceCriterion {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  userId: string; // Added userId
  title: string;
  date: string; // ISO YYYY-MM-DD
  status: TaskStatus;
  subject: Subject;
  description?: string; // The "Story"
  acceptanceCriteria?: AcceptanceCriterion[]; // The checklist
  priority?: Priority;
  logs?: TimeLog[]; // Nested logs
  evidences?: Evidence[]; // Nested evidences
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: string; // ISO Date
}

export interface TimeLog {
  id: string;
  // taskId removed as it is nested
  date: string; // ISO YYYY-MM-DD
  durationMinutes: number;
  subject: Subject;
  description: string;
}

export enum EvidenceType {
  LINK = 'LINK',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface Evidence {
  id: string;
  // taskId removed as it is nested
  type: EvidenceType;
  content: string; // URL or text note
  timestamp: string;
}

export interface Achievement {
  id: string;
  userId: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  badge: string;
}

export enum ResourceType {
  PDF = 'PDF',
  LINK = 'LINK',
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE'
}

export interface Resource {
  id: string;
  userId: string;
  title: string;
  type: ResourceType;
  url: string;
  subject: Subject;
  date?: string;
  description?: string;
  content?: Blob;
  path?: string;
}

export interface CustomLink {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'prerequisite' | 'related' | 'example' | 'reference' | 'custom';
  label?: string;
  color?: string;
  bidirectional: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  targetYear: number;
  streak: number;
  hoursLoggedTotal: number;
  avatarUrl: string;
  totalAppUsageMinutes?: number;
}

export interface DiaryEntry {
  id: number;
  userId: string;
  date: string;
  content: string;
}

export enum CalendarFilter {
  ALL = 'All',
  TASKS = 'Tasks',
  TIME_LOGS = 'Time Logs',
  ACHIEVEMENTS = 'Achievements',
  RESOURCES = 'Resources'
}