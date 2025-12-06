import { Subject, SubjectCategory, Task, TimeLog, Achievement, UserProfile, Resource, ResourceType } from './types';

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
export const MOCK_RESOURCES: Resource[] = [];

export const SUBJECT_HIERARCHY: Record<Subject, SubjectCategory> = {
  // Generic Subjects (these match SubjectCategory names for easier mapping)
  [Subject.HISTORY]: SubjectCategory.HISTORY,
  [Subject.GEOGRAPHY]: SubjectCategory.GEOGRAPHY,
  [Subject.INDIAN_SOCIETY]: SubjectCategory.INDIAN_SOCIETY,
  [Subject.POLITY_GOVERNANCE]: SubjectCategory.POLITY_GOVERNANCE,
  [Subject.ECONOMY]: SubjectCategory.ECONOMY,
  [Subject.ENVIRONMENT_SCIENCE]: SubjectCategory.ENVIRONMENT_SCIENCE,
  [Subject.SECURITY]: SubjectCategory.SECURITY,
  [Subject.ETHICS]: SubjectCategory.ETHICS,

  // Specific History & Culture (GS 1)
  [Subject.ART_AND_CULTURE]: SubjectCategory.HISTORY,
  [Subject.ANCIENT_HISTORY]: SubjectCategory.HISTORY,
  [Subject.MEDIEVAL_HISTORY]: SubjectCategory.HISTORY,
  [Subject.MODERN_HISTORY]: SubjectCategory.HISTORY,
  [Subject.POST_INDEPENDENCE]: SubjectCategory.HISTORY,
  [Subject.WORLD_HISTORY]: SubjectCategory.HISTORY,

  // Specific Geography (GS 1)
  [Subject.PHYSICAL_GEOGRAPHY]: SubjectCategory.GEOGRAPHY,
  [Subject.HUMAN_ECONOMIC_GEOGRAPHY]: SubjectCategory.GEOGRAPHY,
  [Subject.INDIAN_GEOGRAPHY]: SubjectCategory.GEOGRAPHY,
  [Subject.WORLD_GEOGRAPHY]: SubjectCategory.GEOGRAPHY,

  // Specific Polity & Governance (GS 2)
  [Subject.INDIAN_POLITY]: SubjectCategory.POLITY_GOVERNANCE,
  [Subject.GOVERNANCE]: SubjectCategory.POLITY_GOVERNANCE,
  [Subject.SOCIAL_JUSTICE]: SubjectCategory.POLITY_GOVERNANCE,
  [Subject.INTERNATIONAL_RELATIONS]: SubjectCategory.POLITY_GOVERNANCE,

  // Specific Economy & Agriculture (GS 3)
  [Subject.INDIAN_ECONOMY]: SubjectCategory.ECONOMY,
  [Subject.ECONOMIC_DEVELOPMENT]: SubjectCategory.ECONOMY,
  [Subject.AGRICULTURE]: SubjectCategory.ECONOMY,

  // Specific Science, Tech & Environment (GS 3)
  [Subject.SCIENCE_TECHNOLOGY]: SubjectCategory.ENVIRONMENT_SCIENCE,
  [Subject.BIODIVERSITY_ENVIRONMENT]: SubjectCategory.ENVIRONMENT_SCIENCE,
  [Subject.DISASTER_MANAGEMENT]: SubjectCategory.ENVIRONMENT_SCIENCE,

  // Specific Internal Security (GS 3)
  [Subject.INTERNAL_SECURITY]: SubjectCategory.SECURITY,

  // Specific Ethics (GS 4)
  [Subject.ETHICS_INTEGRITY]: SubjectCategory.ETHICS,
  [Subject.CASE_STUDIES]: SubjectCategory.ETHICS,

  // General / Others
  [Subject.CSAT]: SubjectCategory.GENERAL,
  [Subject.CURRENT_AFFAIRS]: SubjectCategory.GENERAL,
  [Subject.UPSC_SYLLABUS]: SubjectCategory.GENERAL,
  [Subject.ESSAY]: SubjectCategory.GENERAL,
  [Subject.GENERAL]: SubjectCategory.GENERAL,
};

// Define colors for Subject Categories using Tailwind CSS classes
export const CATEGORY_COLORS: Record<SubjectCategory, { background: string, text: string, hex: string }> = {
  [SubjectCategory.HISTORY]: { background: 'bg-yellow-100', text: 'text-yellow-800', hex: '#fef3c7' }, // yellow-100
  [SubjectCategory.GEOGRAPHY]: { background: 'bg-green-100', text: 'text-green-800', hex: '#dcfce7' }, // green-100
  [SubjectCategory.INDIAN_SOCIETY]: { background: 'bg-purple-100', text: 'text-purple-800', hex: '#f3e8ff' }, // purple-100
  [SubjectCategory.POLITY_GOVERNANCE]: { background: 'bg-blue-100', text: 'text-blue-800', hex: '#dbeafe' }, // blue-100
  [SubjectCategory.ECONOMY]: { background: 'bg-indigo-100', text: 'text-indigo-800', hex: '#e0e7ff' }, // indigo-100
  [SubjectCategory.ENVIRONMENT_SCIENCE]: { background: 'bg-emerald-100', text: 'text-emerald-800', hex: '#d1fae5' }, // emerald-100
  [SubjectCategory.SECURITY]: { background: 'bg-red-100', text: 'text-red-800', hex: '#fee2e2' }, // red-100
  [SubjectCategory.ETHICS]: { background: 'bg-pink-100', text: 'text-pink-800', hex: '#fce7f3' }, // pink-100
  [SubjectCategory.GENERAL]: { background: 'bg-gray-100', text: 'text-gray-800', hex: '#f3f4f6' }, // gray-100
};