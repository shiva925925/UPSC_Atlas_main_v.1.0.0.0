import Dexie, { Table } from 'dexie';
import { Task, TimeLog, Resource, UserProfile, Subject, TaskStatus, ResourceType, DiaryEntry } from './types';
import { MOCK_TASKS, MOCK_TIME_LOGS, MOCK_RESOURCES, MOCK_USER } from './constants';

export class UpscDatabase extends Dexie {
    tasks!: Table<Task>;
    logs!: Table<TimeLog>;
    resources!: Table<Resource>;
    userProfile!: Table<UserProfile>;
    diary!: Table<DiaryEntry>;
    evidences!: Table<Evidence>;

    constructor() {
        super('UpscAtlasDB');
        this.version(3).stores({ // Increment version
            tasks: 'id, status, subject, date',
            logs: 'id, taskId, subject, date',
            resources: 'id, subject, type',
            userProfile: 'id',
            diary: 'id, date',
            evidences: 'id, taskId, type' // New table
        });
    }
}

export const db = new UpscDatabase();

// Initialize with mock data if empty
db.on('populate', async () => {
    await db.tasks.bulkAdd(MOCK_TASKS);
    await db.logs.bulkAdd(MOCK_TIME_LOGS);
    await db.resources.bulkAdd(MOCK_RESOURCES);
    // Add user profile with a fixed key 'current'
    await db.userProfile.add({ ...MOCK_USER, id: 'current', totalAppUsageMinutes: 0 } as any);
});
