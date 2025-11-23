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
  SYLLABUS = 'UPSC Syllabus'
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  status: TaskStatus;
  subject: Subject;
  description?: string; // The "Story"
  acceptanceCriteria?: AcceptanceCriterion[]; // The checklist
  priority?: 'High' | 'Medium' | 'Low';
}

export interface TimeLog {
  id: string;
  taskId?: string; // Link log to a specific task
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
  taskId: string;
  type: EvidenceType;
  content: string; // URL or text note
  timestamp: string;
}

export interface Achievement {
  id: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  badge: string;
}

export enum ResourceType {
  PDF = 'PDF',
  LINK = 'LINK',
  VIDEO = 'VIDEO'
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  subject: Subject;
  date?: string; // ISO YYYY-MM-DD, Optional association with a date
  description?: string;
}

export interface UserProfile {
  name: string;
  targetYear: number;
  streak: number;
  hoursLoggedTotal: number;
  avatarUrl: string;
  totalAppUsageMinutes?: number; // New field for session tracking
}

export interface DiaryEntry {
  id: number;
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