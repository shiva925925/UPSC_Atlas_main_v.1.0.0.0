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
  // Generic Subjects (these match SubjectCategory names for easier mapping)
  HISTORY = 'History',
  GEOGRAPHY = 'Geography',
  INDIAN_SOCIETY = 'Indian Society',
  POLITY_GOVERNANCE = 'Polity & Governance',
  ECONOMY = 'Economy',
  ENVIRONMENT_SCIENCE = 'Environment & Science',
  SECURITY = 'Security',
  ETHICS = 'Ethics',

  // Specific History & Culture (GS 1)
  ART_AND_CULTURE = 'Art & Culture',
  ANCIENT_HISTORY = 'Ancient History',
  MEDIEVAL_HISTORY = 'Medieval History',
  MODERN_HISTORY = 'Modern History',
  POST_INDEPENDENCE = 'Post-Independence India',
  WORLD_HISTORY = 'World History',

  // Specific Geography (GS 1)
  PHYSICAL_GEOGRAPHY = 'Physical Geography',
  HUMAN_ECONOMIC_GEOGRAPHY = 'Human & Economic Geography',
  INDIAN_GEOGRAPHY = 'Indian Geography',
  WORLD_GEOGRAPHY = 'World Geography',

  // Specific Polity & Governance (GS 2)
  INDIAN_POLITY = 'Indian Polity',
  GOVERNANCE = 'Governance',
  SOCIAL_JUSTICE = 'Social Justice',
  INTERNATIONAL_RELATIONS = 'International Relations',

  // Specific Economy & Agriculture (GS 3)
  INDIAN_ECONOMY = 'Indian Economy',
  ECONOMIC_DEVELOPMENT = 'Economic Development',
  AGRICULTURE = 'Agriculture',

  // Specific Science, Tech & Environment (GS 3)
  SCIENCE_TECHNOLOGY = 'Science & Technology',
  BIODIVERSITY_ENVIRONMENT = 'Biodiversity & Environment',
  DISASTER_MANAGEMENT = 'Disaster Management',

  // Specific Internal Security (GS 3)
  INTERNAL_SECURITY = 'Internal Security',

  // Specific Ethics (GS 4)
  ETHICS_INTEGRITY = 'Ethics & Integrity',
  CASE_STUDIES = 'Case Studies',

  // General / Others
  CSAT = 'CSAT',
  CURRENT_AFFAIRS = 'Current Affairs',
  UPSC_SYLLABUS = 'UPSC Syllabus',
  ESSAY = 'Essay',
  GENERAL = 'General',
}

export enum SubjectCategory {
  HISTORY = 'History',
  GEOGRAPHY = 'Geography',
  INDIAN_SOCIETY = 'Indian Society',
  POLITY_GOVERNANCE = 'Polity & Governance',
  ECONOMY = 'Economy',
  ENVIRONMENT_SCIENCE = 'Environment & Science',
  SECURITY = 'Security',
  ETHICS = 'Ethics',
  GENERAL = 'General',
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
  sourceFile?: string; // The name of the file from which this task was imported
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
  IMAGE = 'IMAGE',
  FILE = 'FILE'
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