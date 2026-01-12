import { db } from '../db';
import { Task, TaskStatus, Subject, Priority } from '../types';

const TASKS_API = '/api/tasks'; // Reads Data/Tasks (Excel/YAML)
const PROGRESS_API = '/api/progress';
const USER_TASKS_API = '/api/user-tasks';

/**
 * AUTOMATIC SYNC: Pulls only progress data from the server.
 * Does not add or delete tasks. Only updates status/logs for existing tasks.
 */
export async function pullProgressOnly() {
    console.log('%c[Sync Service] Starting automatic progress sync...', 'color: teal; font-weight: bold;');

    try {
        const response = await fetch(PROGRESS_API);
        if (!response.ok) throw new Error(`Failed to fetch progress: ${response.statusText}`);

        const serverProgress = await response.json();
        const existingTasks = await db.tasks.toArray();
        const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

        let updateCount = 0;
        for (const [taskId, progress] of Object.entries(serverProgress)) {
            const task = existingTasksMap.get(taskId);
            if (task) {
                const updates = getProgressUpdates(task, progress as Partial<Task>);
                if (Object.keys(updates).length > 0) {
                    await db.tasks.update(taskId, updates);
                    updateCount++;
                }
            }
        }
        console.log(`%c[Sync Service] Progress sync complete. Updated ${updateCount} tasks.`, 'color: teal;');
    } catch (e) {
        console.warn('[Sync Service] Automatic progress sync skipped or failed:', e);
    }
}

/**
 * MANUAL SYNC: Imports task definitions from files (Data/Tasks - Excel/YAML).
 */
export async function fullLibrarySync() {
    console.log('%c[Sync Service] Starting manual library sync...', 'color: blue; font-weight: bold;');
    const errors: string[] = [];

    // 1. Fetch Progress first so we have accurate state for new tasks
    let serverProgress: { [taskId: string]: Partial<Task> } = {};
    try {
        const response = await fetch(PROGRESS_API);
        if (response.ok) serverProgress = await response.json();
    } catch (e) {
        console.warn('[Sync Service] Could not fetch progress for full sync.');
    }

    const activeFileTaskIds = new Set<string>();

    // 2. Sync from Data/Tasks folder (Modern Unified API)
    try {
        await syncFileTasks(serverProgress, activeFileTaskIds);
    } catch (e: any) {
        errors.push(`File Sync Error: ${e.message}`);
    }

    // 3. User Tasks Sync
    try {
        await syncUserTasks(serverProgress);
    } catch (e: any) {
        errors.push(`User Sync Error: ${e.message}`);
    }

    // 4. Orphan Cleanup
    const allTasks = await db.tasks.toArray();
    for (const task of allTasks) {
        // Only cleanup tasks that come from files (have a sourceFile) 
        // and are NOT in the list we just fetched.
        if (task.sourceFile && !activeFileTaskIds.has(task.id)) {
            console.log(`%c[Sync Service] Deleting orphan task '${task.title}' (ID: ${task.id})`, 'color: red;');
            await db.tasks.delete(task.id);
        }
    }

    if (errors.length > 0) throw new Error(errors.join('\n'));
    console.log('%c[Sync Service] Manual sync complete.', 'color: blue; font-weight: bold;');
}

/**
 * Fetches tasks from /api/tasks (which scans Data/Tasks folder)
 */
async function syncFileTasks(serverProgress: { [taskId: string]: Partial<Task> }, activeFileTaskIds: Set<string>) {
    const response = await fetch(`${TASKS_API}?t=${Date.now()}`); // Cache-busting
    if (!response.ok) throw new Error(`Failed to fetch tasks from server: ${response.statusText}`);

    const fileTasks: any[] = await response.json();
    const existingTasks = await db.tasks.toArray();
    const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

    for (const task of fileTasks) {
        if (!task.id) continue;

        // Prepare standardized data from file
        const fileTaskData = {
            title: task.title,
            date: task.date || new Date().toISOString().split('T')[0], // Default to Today
            subject: task.subject,
            description: task.description || '',
            acceptanceCriteria: task.acceptanceCriteria || [],
            sourceFile: task.sourceFile,
            // These might be in the file, but we'll use them as defaults for NEW tasks only
            priority: task.priority || 'Medium',
            status: task.status || TaskStatus.TODO
        };

        await smartUpdate(task.id, fileTaskData, existingTasksMap, serverProgress);
        activeFileTaskIds.add(task.id);
    }
}

/**
 * Handles the logic of what to update based on source of truth rules.
 */
async function smartUpdate(
    taskId: string,
    fileTaskData: any,
    existingTasksMap: Map<string, Task>,
    serverProgress: { [taskId: string]: Partial<Task> }
) {
    const existingTask = existingTasksMap.get(taskId);
    const progressFromServer = serverProgress[taskId] || {};

    if (existingTask) {
        const updates: Partial<Task> = {};

        // Helper: Strict string comparison
        const strDiff = (a: any, b: any) => (a || '').toString().trim() !== (b || '').toString().trim();

        // CATEGORY 2: Content (File is Master)
        if (strDiff(existingTask.title, fileTaskData.title)) updates.title = fileTaskData.title;
        if (strDiff(existingTask.subject, fileTaskData.subject)) updates.subject = fileTaskData.subject;
        if (strDiff(existingTask.date, fileTaskData.date)) updates.date = fileTaskData.date;
        if (strDiff(existingTask.description, fileTaskData.description)) updates.description = fileTaskData.description;
        if (strDiff(existingTask.sourceFile, fileTaskData.sourceFile)) updates.sourceFile = fileTaskData.sourceFile;

        // Acceptance Criteria (File is Master)
        const dbAC = JSON.stringify((existingTask.acceptanceCriteria || []).map(ac => ac.text.trim()).sort());
        const fileAC = JSON.stringify((fileTaskData.acceptanceCriteria || []).map((ac: any) => (typeof ac === 'string' ? ac : ac.text || '').trim()).sort());
        if (dbAC !== fileAC) {
            updates.acceptanceCriteria = (fileTaskData.acceptanceCriteria || []).map((ac: any) => {
                if (typeof ac === 'string') return { id: Math.random().toString(36).substr(2, 9), text: ac, isCompleted: false };
                return { id: ac.id || Math.random().toString(36).substr(2, 9), text: ac.text || '', isCompleted: !!ac.isCompleted };
            });
        }

        // CATEGORY 1: Status & Progress (App/Server is Master)
        // We only pull status/priority from serverProgress if it exists. 
        // We EXPLICITLY do NOT pull it from fileTaskData for existing tasks.
        const progUpdates = getProgressUpdates(existingTask, progressFromServer);
        Object.assign(updates, progUpdates);

        if (Object.keys(updates).length > 0) {
            console.log(`[Sync] Updating task ${taskId}...`, updates);
            await db.tasks.update(taskId, updates);
        }
    } else {
        // NEW TASK: Initialize with File Data + Server Progress (if any)
        console.log(`[Sync] Adding NEW task ${taskId}`);
        const newTask: Task = {
            id: taskId,
            userId: 'Schamala',
            status: fileTaskData.status || TaskStatus.TODO,
            priority: fileTaskData.priority || 'Medium',
            acceptanceCriteria: [],
            logs: [],
            evidences: [],
            isArchived: false,
            isDeleted: false,
            ...fileTaskData,
            ...progressFromServer, // Overrides with user progress if it somehow existed on server
        };
        await db.tasks.add(newTask);
    }
}

/**
 * Helper to identify only progress-related differences
 */
function getProgressUpdates(task: Task, progress: Partial<Task>): Partial<Task> {
    const updates: Partial<Task> = {};
    if (progress.status !== undefined && task.status !== progress.status) updates.status = progress.status;
    if (progress.priority !== undefined && task.priority !== progress.priority) updates.priority = progress.priority;

    const deepDiffer = (a: any, b: any) => JSON.stringify(a) !== JSON.stringify(b);
    if (progress.logs !== undefined && deepDiffer(task.logs, progress.logs)) updates.logs = progress.logs;
    if (progress.evidences !== undefined && deepDiffer(task.evidences, progress.evidences)) updates.evidences = progress.evidences;
    if (progress.isArchived !== undefined && task.isArchived !== progress.isArchived) updates.isArchived = progress.isArchived;
    if (progress.isDeleted !== undefined && task.isDeleted !== progress.isDeleted) updates.isDeleted = progress.isDeleted;
    if (progress.deletedAt !== undefined && task.deletedAt !== progress.deletedAt) updates.deletedAt = progress.deletedAt;

    return updates;
}

// Backward compatibility
export const syncAllTasks = fullLibrarySync;

async function syncUserTasks(serverProgress: { [taskId: string]: Partial<Task> }) {
    let userTasks: Task[] = [];
    try {
        const response = await fetch(USER_TASKS_API);
        if (response.ok) userTasks = await response.json();
    } catch (error) { return; }

    const existingTasks = await db.tasks.toArray();
    const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

    for (const task of userTasks) {
        if (!task.id) continue;
        await smartUpdate(task.id, task, existingTasksMap, serverProgress);
    }
}

export async function saveUserTask(task: Task) {
    try {
        const response = await fetch(USER_TASKS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        });
        if (!response.ok) throw new Error(`Failed to save user task: ${response.statusText}`);
    } catch (error) {
        console.error('[Sync Service] Error saving user task:', error);
        throw error;
    }
}

export async function saveTaskProgress(allTasks: Task[]) {
    const progressToSave: { [taskId: string]: Partial<Task> } = {};
    allTasks.forEach(task => {
        progressToSave[task.id] = {
            status: task.status,
            priority: task.priority,
            logs: task.logs,
            evidences: task.evidences,
            isArchived: task.isArchived,
            isDeleted: task.isDeleted,
            deletedAt: task.deletedAt
        };
    });

    try {
        const response = await fetch(PROGRESS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressToSave),
        });
        if (!response.ok) throw new Error(`Failed to save progress: ${response.statusText}`);
    } catch (error) {
        console.error('[Sync Service] Error saving task progress:', error);
        throw error;
    }
}

export async function updateTaskProgress(taskId: string, updates: Partial<Task>) {
    const progressUpdates: Partial<Task> = {};
    const keys = ['status', 'priority', 'logs', 'evidences', 'isArchived', 'isDeleted', 'deletedAt'];
    keys.forEach(k => { if ((updates as any)[k] !== undefined) (progressUpdates as any)[k] = (updates as any)[k]; });

    if (Object.keys(progressUpdates).length === 0) return;

    try {
        const response = await fetch(`${PROGRESS_API}/${encodeURIComponent(taskId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressUpdates),
        });
        if (!response.ok) throw new Error(`Failed to update progress: ${response.statusText}`);
    } catch (error) {
        console.error(`[Sync Service] Error updating task '${taskId}':`, error);
        throw error;
    }
}
