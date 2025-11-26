import { Task, TaskStatus, Subject, TimeLog, Achievement, UserProfile, Resource, ResourceType } from './types';

// Helper to get today's date string
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

export const MOCK_USER: UserProfile = {
  id: 'Schamala',
  name: "Schamala",
  targetYear: 2025,
  streak: 0,
  hoursLoggedTotal: 0,
  avatarUrl: "https://ui-avatars.com/api/?name=Schamala&background=0D8ABC&color=fff"
};

export const MOCK_TASKS: Task[] = [];

export const MOCK_ACHIEVEMENTS: Achievement[] = [];

export const MOCK_RESOURCES: Resource[] = [];

export const SUBJECT_COLORS: Record<Subject, string> = {
  [Subject.HISTORY]: '#ef4444', // Red
  [Subject.POLITY]: '#3b82f6', // Blue
  [Subject.GEOGRAPHY]: '#22c55e', // Green
  [Subject.ECONOMICS]: '#eab308', // Yellow
  [Subject.ETHICS]: '#a855f7', // Purple
  [Subject.CSAT]: '#f97316', // Orange
  [Subject.CURRENT_AFFAIRS]: '#06b6d4', // Cyan
  [Subject.SYLLABUS]: '#6366f1', // Indigo
  [Subject.GENERAL]: '#9ca3af', // Gray
};