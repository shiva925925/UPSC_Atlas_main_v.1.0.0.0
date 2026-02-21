import { db } from '../db';
import { Task, TaskStatus, Subject, Priority } from '../types';
import { BASELINE_ANCHOR_DATE } from '../constants';

const LIBRARY_API = '/api/library';
const PROGRESS_API = '/api/progress';
const USER_TASKS_API = '/api/user-tasks';
const DELETED_TASKS_API = '/api/deleted-tasks';
const RESCAN_API = '/api/rescan';
const LEGACY_TASKS_API = '/api/tasks';

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
 * MANUAL RESCAN: Triggers server to rebuild cache from YAMLs
 */
export async function triggerManualRescan() {
    console.log('[Sync Service] Triggering Manual Rescan...');
    const response = await fetch(RESCAN_API, { method: 'POST' });
    if (!response.ok) throw new Error('Rescan failed');
    // After rescan, do a full sync to get new data
    await fullLibrarySync();
}

/**
 * PERMANENT DELETE: Tells server to Tombstone the task
 */
export async function deleteTaskPermanently(taskId: string) {
    console.log(`[Sync Service] Deleting task ${taskId} permanently...`);
    await db.tasks.delete(taskId);
    const response = await fetch(`${LEGACY_TASKS_API}/${taskId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete on server');
}

/**
 * RECONCILIATION SYNC: The Core Fix.
 * Fetches Static Library and Dynamic Progress separately and merges them in the browser.
 */
export async function fullLibrarySync() {
    console.log('%c[Sync Service] Starting de-coupled library sync...', 'color: blue; font-weight: bold;');

    try {
        // 1. Fetch all streams concurrently
        const [libRes, progRes, userRes, delRes] = await Promise.all([
            fetch(LIBRARY_API),
            fetch(PROGRESS_API),
            fetch(USER_TASKS_API),
            fetch(DELETED_TASKS_API)
        ]);

        if (!libRes.ok || !progRes.ok || !userRes.ok || !delRes.ok) throw new Error("Sync network failure");

        const libraryData = await libRes.json(); // { tasks, fullTaskIds }
        const progressData = await progRes.json(); // { taskId: { progress } }
        const userTasksData = await userRes.json(); // Task[]
        const deletedIdsAsList: string[] = await delRes.json();
        const deletedIds = new Set(deletedIdsAsList);

        const staticTasks: Task[] = (libraryData.tasks || []).filter((t: Task) => !deletedIds.has(t.id));
        const userTasks: Task[] = (userTasksData || []).filter((t: Task) => !deletedIds.has(t.id));

        // Discovery Persistence: Track date for new tasks
        const existingTaskIds = await db.tasks.toCollection().primaryKeys();
        const existingIdSet = new Set(existingTaskIds as string[]);
        const updatesToSave: Record<string, Partial<Task>> = {};
        const todayStr = new Date().toISOString().split('T')[0];

        // 2. Perform the Merge (Client is now the engine of truth)
        const mergedTasks: Task[] = [
            ...staticTasks.map(task => {
                const prog = progressData[task.id] || {};
                const isNew = !existingIdSet.has(task.id);

                // Track missing dates for capturing first-sync
                if (!task.date && !prog.date) {
                    const captureDate = isNew ? todayStr : BASELINE_ANCHOR_DATE;
                    updatesToSave[task.id] = { date: captureDate };
                    prog.date = captureDate;
                }

                return mergeTaskWithProgress(task, prog);
            }),
            ...userTasks.map(task => {
                const prog = progressData[task.id] || {};
                return mergeTaskWithProgress(task, prog);
            })
        ];

        // Permanently save discovered dates to server
        if (Object.keys(updatesToSave).length > 0) {
            console.log(`[Sync Service] Capturing dates for ${Object.keys(updatesToSave).length} newly discovered tasks...`);
            await saveTaskProgressBulk(updatesToSave);
        }

        // 3. Selective local update
        await db.tasks.bulkPut(mergedTasks);

        // 4. Orphan Cleanup (If a task exists in DB but not in our merged list)
        const allIdsInSync = new Set(mergedTasks.map(t => t.id));
        const localTasks = await db.tasks.toArray();
        const orphans = localTasks.filter(t => !allIdsInSync.has(t.id));
        if (orphans.length > 0) {
            await db.tasks.bulkDelete(orphans.map(t => t.id));
        }

        console.log(`%c[Sync Service] Sync complete. Merged ${mergedTasks.length} tasks.`, 'color: green; font-weight: bold;');
    } catch (error: any) {
        console.error('[Sync Service] Sync failed:', error);
        throw error;
    }
}

/**
 * Unified helper to merge a base task (File/Memory) with progress data (JSON Progress)
 */
function mergeTaskWithProgress(task: Task, prog: Partial<Task>): Task {
    return {
        ...task,
        ...prog,
        // Only override lists/objects if they are explicitly provided in the progress packet
        acceptanceCriteria: prog.acceptanceCriteria !== undefined ? prog.acceptanceCriteria : (task.acceptanceCriteria || []),
        logs: prog.logs !== undefined ? prog.logs : (task.logs || []),
        evidences: prog.evidences !== undefined ? prog.evidences : (task.evidences || []),

        // Ensure status/priority have sensible defaults if missing entirely
        status: prog.status || task.status || TaskStatus.TODO,
        priority: prog.priority || task.priority || 'Medium',
        date: prog.date || task.date,

        // Flattened flags
        isArchived: prog.isArchived !== undefined ? prog.isArchived : (task.isArchived || false),
        isStarred: prog.isStarred !== undefined ? prog.isStarred : (task.isStarred || false),
        isDeleted: false,
        deletedAt: null
    };
}

// Remove old syncFileTasks as it is now redundant

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
    if (progress.description !== undefined && task.description !== progress.description) updates.description = progress.description;
    if (progress.date !== undefined && task.date !== progress.date) updates.date = progress.date;
    if (progress.linkedTaskIds !== undefined) updates.linkedTaskIds = progress.linkedTaskIds;

    const deepDiffer = (a: any, b: any) => JSON.stringify(a) !== JSON.stringify(b);

    if (progress.acceptanceCriteria !== undefined && deepDiffer(task.acceptanceCriteria, progress.acceptanceCriteria)) {
        updates.acceptanceCriteria = progress.acceptanceCriteria;
    }
    if (progress.logs !== undefined && deepDiffer(task.logs, progress.logs)) updates.logs = progress.logs;
    if (progress.evidences !== undefined && deepDiffer(task.evidences, progress.evidences)) updates.evidences = progress.evidences;
    if (progress.isDeleted !== undefined && task.isDeleted !== progress.isDeleted) updates.isDeleted = progress.isDeleted;
    if (progress.deletedAt !== undefined && task.deletedAt !== progress.deletedAt) updates.deletedAt = progress.deletedAt;
    if (progress.isStarred !== undefined && task.isStarred !== progress.isStarred) updates.isStarred = progress.isStarred;

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

/**
 * Saves a mapping of taskId -> updates to the server.
 */
export async function saveTaskProgressBulk(updates: { [taskId: string]: Partial<Task> }) {
    try {
        const response = await fetch(PROGRESS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error(`Failed to save bulk progress: ${response.statusText}`);
    } catch (error) {
        console.error('[Sync Service] Error saving bulk progress:', error);
        throw error;
    }
}

export async function updateTaskProgress(taskId: string, updates: Partial<Task>) {
    const progressUpdates: Partial<Task> = {};
    const keys = ['status', 'priority', 'logs', 'evidences', 'isArchived', 'isDeleted', 'deletedAt', 'description', 'acceptanceCriteria', 'date', 'linkedTaskIds', 'isStarred'];
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

/**
 * BI-DIRECTIONAL LINKING: Ensures both tasks reference each other.
 */
export async function linkTasks(taskAId: string, taskBId: string) {
    console.log(`[Sync Service] Linking ${taskAId} <-> ${taskBId}`);

    const taskA = await db.tasks.get(taskAId);
    const taskB = await db.tasks.get(taskBId);

    if (!taskA || !taskB) return;

    const updatedAIds = [...new Set([...(taskA.linkedTaskIds || []), taskBId])];
    const updatedBIds = [...new Set([...(taskB.linkedTaskIds || []), taskAId])];

    await Promise.all([
        db.tasks.update(taskAId, { linkedTaskIds: updatedAIds }),
        db.tasks.update(taskBId, { linkedTaskIds: updatedBIds }),
        updateTaskProgress(taskAId, { linkedTaskIds: updatedAIds }),
        updateTaskProgress(taskBId, { linkedTaskIds: updatedBIds })
    ]);
}

/**
 * BI-DIRECTIONAL UNLINKING: Removes references from both tasks.
 */
export async function unlinkTasks(taskAId: string, taskBId: string) {
    console.log(`[Sync Service] Unlinking ${taskAId} <-> ${taskBId}`);

    const taskA = await db.tasks.get(taskAId);
    const taskB = await db.tasks.get(taskBId);

    if (!taskA || !taskB) return;

    const updatedAIds = (taskA.linkedTaskIds || []).filter(id => id !== taskBId);
    const updatedBIds = (taskB.linkedTaskIds || []).filter(id => id !== taskAId);

    await Promise.all([
        db.tasks.update(taskAId, { linkedTaskIds: updatedAIds }),
        db.tasks.update(taskBId, { linkedTaskIds: updatedBIds }),
        updateTaskProgress(taskAId, { linkedTaskIds: updatedAIds }),
        updateTaskProgress(taskBId, { linkedTaskIds: updatedBIds })
    ]);
}

/**
 * TASK PROMOTION: Creates a new task from an acceptance criterion.
 */
export async function promoteCriterionToTask(parentTaskId: string, criterionText: string) {
    const parent = await db.tasks.get(parentTaskId);
    if (!parent) return;

    const newTaskId = `task_${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = {
        id: newTaskId,
        userId: parent.userId,
        title: criterionText,
        subject: parent.subject,
        priority: parent.priority || 'Medium',
        date: new Date().toISOString().split('T')[0],
        status: TaskStatus.TODO,
        description: `Created from parent task: ${parent.title}`,
        acceptanceCriteria: [],
        logs: [],
        evidences: [],
        isArchived: false,
        isDeleted: false,
        linkedTaskIds: [parentTaskId] // Link back to parent
    };

    // 1. Create New Task
    await db.tasks.add(newTask);
    await saveUserTask(newTask);

    // 2. Update Parent (Link to child + mark criterion as moved)
    const updatedLinkedIds = [...new Set([...(parent.linkedTaskIds || []), newTaskId])];
    const updatedAC = (parent.acceptanceCriteria || []).map(ac =>
        ac.text === criterionText ? { ...ac, text: `${ac.text} (PROMOTED → ${newTaskId})`, isCompleted: true } : ac
    );

    await db.tasks.update(parentTaskId, {
        linkedTaskIds: updatedLinkedIds,
        acceptanceCriteria: updatedAC
    });

    await updateTaskProgress(parentTaskId, {
        linkedTaskIds: updatedLinkedIds,
        acceptanceCriteria: updatedAC
    });

    return newTask;
}

/**
 * BULK SYNC: Saves multiple task updates in a single request.
 */
export async function saveBulkTaskProgress(bulkUpdates: Record<string, Partial<Task>>) {
    try {
        const response = await fetch(PROGRESS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bulkUpdates),
        });
        if (!response.ok) throw new Error(`Failed to update bulk progress: ${response.statusText}`);
    } catch (error) {
        console.error('[Sync Service] Error in bulk update:', error);
        throw error;
    }
}
