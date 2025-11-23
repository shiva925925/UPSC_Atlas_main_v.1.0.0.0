import { Task, TaskStatus, Subject, TimeLog, Achievement, UserProfile, Resource, ResourceType } from './types';

// Helper to get today's date string
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

export const MOCK_USER: UserProfile = {
  name: "Aarav Patel",
  targetYear: 2025,
  streak: 14,
  hoursLoggedTotal: 342,
  avatarUrl: "https://picsum.photos/200/200"
};

export const MOCK_TASKS: Task[] = [
  { 
    id: '1', 
    title: 'Complete Chapter 4: Fundamental Rights', 
    description: 'As an aspirant, I need to understand the 6 Fundamental Rights thoroughly so that I can answer case-study based questions in GS-2.',
    acceptanceCriteria: [
      { id: 'ac1', text: 'Read Laxmikanth Chapter 4 completely', isCompleted: true },
      { id: 'ac2', text: 'Make short notes on Art 14-32', isCompleted: true },
      { id: 'ac3', text: 'Solve 20 MCQs related to FRs', isCompleted: false },
      { id: 'ac4', text: 'Review landmark Supreme Court judgments', isCompleted: false }
    ],
    date: today, 
    status: TaskStatus.IN_PROGRESS, 
    subject: Subject.POLITY,
    priority: 'High'
  },
  { 
    id: '2', 
    title: 'Map Practice: Rivers of India', 
    description: 'I need to memorize the origin, tributaries, and flow direction of major peninsular rivers to handle Geography map questions.',
    acceptanceCriteria: [
      { id: 'ac1', text: 'Draw outline map of Peninsular India', isCompleted: false },
      { id: 'ac2', text: 'Mark Godavari, Krishna, Kaveri basins', isCompleted: false },
      { id: 'ac3', text: 'List West flowing rivers', isCompleted: false }
    ],
    date: today, 
    status: TaskStatus.TODO, 
    subject: Subject.GEOGRAPHY,
    priority: 'Medium'
  },
  { 
    id: '3', 
    title: 'Daily Hindu Editorial Analysis', 
    description: 'Analyze today\'s editorials to extract points for Mains answers regarding International Relations.',
    acceptanceCriteria: [
      { id: 'ac1', text: 'Read Lead Article', isCompleted: true },
      { id: 'ac2', text: 'Note down key statistics', isCompleted: true },
      { id: 'ac3', text: 'Update vocab journal', isCompleted: true }
    ],
    date: today, 
    status: TaskStatus.DONE, 
    subject: Subject.CURRENT_AFFAIRS,
    priority: 'High'
  },
  { 
    id: '4', 
    title: 'Mughal Empire Revision', 
    date: yesterday, 
    status: TaskStatus.DONE, 
    subject: Subject.HISTORY,
    description: 'Revise Akbar\'s administrative policies.',
    acceptanceCriteria: [
      { id: 'ac1', text: 'Review Mansabdari System', isCompleted: true },
      { id: 'ac2', text: 'Review Din-i-Ilahi', isCompleted: true }
    ],
    priority: 'Medium'
  },
  { 
    id: '5', 
    title: 'Mock Test: Economics Sectional', 
    date: twoDaysAgo, 
    status: TaskStatus.DONE, 
    subject: Subject.ECONOMICS,
    priority: 'High'
  },
  { 
    id: '6', 
    title: 'Ethics Case Studies - Integrity', 
    date: '2023-10-25', 
    status: TaskStatus.TODO, 
    subject: Subject.ETHICS,
    description: 'Practice answer writing for GS-4.',
    acceptanceCriteria: [
      { id: 'ac1', text: 'Write answer for Case Study 1', isCompleted: false },
      { id: 'ac2', text: 'Write answer for Case Study 2', isCompleted: false }
    ],
    priority: 'Low'
  },
];

export const MOCK_TIME_LOGS: TimeLog[] = [
  { id: 'l1', taskId: '1', date: today, durationMinutes: 120, subject: Subject.POLITY, description: 'Laxmikanth readings' },
  { id: 'l2', taskId: '3', date: today, durationMinutes: 45, subject: Subject.CURRENT_AFFAIRS, description: 'Newspaper reading' },
  { id: 'l3', taskId: '4', date: yesterday, durationMinutes: 180, subject: Subject.HISTORY, description: 'Deep dive into Modern History' },
  { id: 'l4', date: twoDaysAgo, durationMinutes: 60, subject: Subject.ECONOMICS, description: 'Budget analysis' },
  { id: 'l5', date: twoDaysAgo, durationMinutes: 90, subject: Subject.CSAT, description: 'Math problems' },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', date: today, title: 'Early Bird', badge: '🌅' },
  { id: 'a2', date: yesterday, title: '50 Hours Milestone', badge: '🔥' },
  { id: 'a3', date: twoDaysAgo, title: 'Mock Test Ace', badge: '🎯' },
];

export const MOCK_RESOURCES: Resource[] = [
  {
    id: 's1',
    title: 'UPSC CSE Official Syllabus PDF',
    type: ResourceType.PDF,
    url: '#',
    subject: Subject.SYLLABUS,
    description: 'Complete notification including Prelims and Mains syllabus breakdown.'
  },
  {
    id: 's2',
    title: 'Mains GS-1 Detailed Topic List',
    type: ResourceType.LINK,
    url: '#',
    subject: Subject.SYLLABUS,
    description: 'Micro-listing of topics for Art & Culture, History, and Geography.'
  },
  {
    id: 'r1',
    title: 'Polity: Fundamental Rights Summary',
    type: ResourceType.PDF,
    url: '#',
    subject: Subject.POLITY,
    date: today,
    description: 'Quick revision notes from class lecture.'
  },
  {
    id: 'r2',
    title: 'The Hindu: Editorial Link',
    type: ResourceType.LINK,
    url: 'https://www.thehindu.com',
    subject: Subject.CURRENT_AFFAIRS,
    date: today,
    description: 'Article regarding new foreign policy updates.'
  },
  {
    id: 'r3',
    title: 'Mughal Genealogy Chart',
    type: ResourceType.PDF,
    url: '#',
    subject: Subject.HISTORY,
    date: yesterday,
    description: 'Visual chart for quick memorization.'
  },
  {
    id: 'r4',
    title: 'Economic Survey 2024 Highlights',
    type: ResourceType.PDF,
    url: '#',
    subject: Subject.ECONOMICS,
    // No date, general resource
    description: 'Key points from the latest survey.'
  },
  {
    id: 'r5',
    title: 'Ethics Terminology Video',
    type: ResourceType.VIDEO,
    url: '#',
    subject: Subject.ETHICS,
    description: 'YouTube explainer on integrity vs aptitude.'
  }
];

export const SUBJECT_COLORS: Record<Subject, string> = {
  [Subject.HISTORY]: '#ef4444', // Red
  [Subject.POLITY]: '#3b82f6', // Blue
  [Subject.GEOGRAPHY]: '#22c55e', // Green
  [Subject.ECONOMICS]: '#eab308', // Yellow
  [Subject.ETHICS]: '#a855f7', // Purple
  [Subject.CSAT]: '#f97316', // Orange
  [Subject.CURRENT_AFFAIRS]: '#06b6d4', // Cyan
  [Subject.SYLLABUS]: '#6366f1', // Indigo
};