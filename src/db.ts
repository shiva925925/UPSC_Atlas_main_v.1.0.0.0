import Dexie, { Table } from 'dexie';
import { Task, TimeLog, Resource, UserProfile, Subject, TaskStatus, ResourceType, DiaryEntry, CustomLink } from './types';
import { MOCK_TASKS, MOCK_RESOURCES, MOCK_USER } from './constants';

export class UpscDatabase extends Dexie {
    tasks!: Table<Task>;
    // logs and evidences are now nested in tasks
    resources!: Table<Resource>;
    userProfile!: Table<UserProfile>;
    diary!: Table<DiaryEntry>;
    customLinks!: Table<CustomLink>;
    dayMetadata!: Table<import('./types').DayMetadata>;

    constructor() {
        super('UpscAtlasDB');
        this.version(8).stores({ // Increment version
            tasks: 'id, userId, status, subject, date, isArchived, isDeleted, sourceFile',
            resources: 'id, userId, subject, type',
            userProfile: 'id',
            diary: 'id, userId, date',
            customLinks: 'id, userId, sourceNodeId, targetNodeId',
            dayMetadata: 'id, userId' // id is the date string
        });
    }
}

export const db = new UpscDatabase();

// Initialize with default user if empty
db.on('populate', async () => {
    // Add user profile with unique ID 'Schamala'
    await db.userProfile.add({ ...MOCK_USER, id: 'Schamala' } as any);
});
