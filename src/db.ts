import Dexie, { Table } from 'dexie';
import { Task, TimeLog, Resource, UserProfile, Subject, TaskStatus, ResourceType, DiaryEntry } from './types';
import { MOCK_TASKS, MOCK_RESOURCES, MOCK_USER } from './constants';

export class UpscDatabase extends Dexie {
    tasks!: Table<Task>;
    // logs and evidences are now nested in tasks
    resources!: Table<Resource>;
    userProfile!: Table<UserProfile>;
    diary!: Table<DiaryEntry>;

    constructor() {
        super('UpscAtlasDB');
        this.version(5).stores({ // Increment version
            tasks: 'id, userId, status, subject, date, isArchived, isDeleted',
            resources: 'id, userId, subject, type',
            userProfile: 'id',
            diary: 'id, userId, date'
        });
    }
}

export const db = new UpscDatabase();

// Initialize with mock data if empty
db.on('populate', async () => {
    // MOCK_TASKS already has nested logs/evidences and userId
    await db.tasks.bulkAdd(MOCK_TASKS);

    // MOCK_RESOURCES already has userId
    await db.resources.bulkAdd(MOCK_RESOURCES);

    // Add user profile with unique ID 'Schamala'
    await db.userProfile.add({ ...MOCK_USER, id: 'Schamala', totalAppUsageMinutes: 0 } as any);
});
