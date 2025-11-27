import { load } from 'js-yaml';
import { db } from '../db';
import { Task, TaskStatus, Subject, Priority } from '../types';
import { parseFrontMatter } from '../utils';

const EXCEL_TASKS_API = '/api/tasks';
const PROGRESS_API = '/api/progress';
const USER_TASKS_API = '/api/user-tasks';

export async function syncAllTasks() {
    console.log('%c[Sync Service] Starting full sync...', 'color: blue; font-weight: bold;');
    const errors: string[] = [];

    let serverProgress: { [taskId: string]: Partial<Task> } = {};
    try {
        const response = await fetch(PROGRESS_API);
        if (!response.ok) {
            throw new Error(`Failed to fetch task progress: ${response.statusText}`);
        }
        serverProgress = await response.json();
        console.log(`%c[Sync Service] Fetched ${Object.keys(serverProgress).length} task progress entries from server.`, 'color: blue;');
    } catch (e: any) {
        console.error('[Sync Service] Failed to fetch server progress:', e);
        errors.push(`Progress Fetch: ${e.message}`);
        // Continue even if progress fetch fails, to sync basic task data
    }

    try {
        await syncMarkdownTasks(serverProgress);
    } catch (e: any) {
        console.error('[Sync Service] Markdown sync failed:', e);
        errors.push(`Markdown Sync: ${e.message}`);
    }

    try {
        await syncExcelTasks(serverProgress);
    } catch (e: any) {
        console.error('[Sync Service] Excel sync failed:', e);
        errors.push(`Excel Sync: ${e.message}`);
    }

    try {
        await syncUserTasks(serverProgress);
    } catch (e: any) {
        console.error('[Sync Service] User tasks sync failed:', e);
        errors.push(`User Tasks Sync: ${e.message}`);
    }

    // 4. Update tasks that exist locally (e.g. created in UI) but not in files
    // The above sync functions only touch tasks found in files.
    // We need to apply server progress to tasks that are purely local/UI-based too.
    const allTasks = await db.tasks.toArray();
    for (const task of allTasks) {
        const progress = serverProgress[task.id];
        if (progress) {
             const updates: Partial<Task> = {};
             if (progress.status !== undefined && task.status !== progress.status) updates.status = progress.status;
             if (progress.logs !== undefined && JSON.stringify(task.logs) !== JSON.stringify(progress.logs)) updates.logs = progress.logs;
             if (progress.evidences !== undefined && JSON.stringify(task.evidences) !== JSON.stringify(progress.evidences)) updates.evidences = progress.evidences;
             if (progress.isArchived !== undefined && task.isArchived !== progress.isArchived) updates.isArchived = progress.isArchived;
             if (progress.isDeleted !== undefined && task.isDeleted !== progress.isDeleted) updates.isDeleted = progress.isDeleted;
             if (progress.deletedAt !== undefined && task.deletedAt !== progress.deletedAt) updates.deletedAt = progress.deletedAt;

             if (Object.keys(updates).length > 0) {
                 console.log(`%c[Sync Service] Updating local-only task '${task.id}' from server progress...`, 'color: orange;', updates);
                 await db.tasks.update(task.id, updates);
             }
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
    console.log('%c[Sync Service] Full sync complete.', 'color: blue; font-weight: bold;');
}

async function syncUserTasks(serverProgress: { [taskId: string]: Partial<Task> }) {
    console.log('%c[Sync Service] Starting User Tasks server sync...', 'color: blue;');
    
    let userTasks: Task[] = [];
    try {
        const response = await fetch(USER_TASKS_API);
        if (!response.ok) {
            throw new Error(`Failed to connect to User Tasks server: ${response.statusText}`);
        }
        userTasks = await response.json();
    } catch (error) {
        console.warn('[Sync Service] Could not fetch from User Tasks server.');
        return; 
    }

    console.log(`%c[Sync Service] Found ${userTasks.length} user tasks from server.`, 'color: blue;');

    const existingTasks = await db.tasks.toArray();
    const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

    for (const task of userTasks) {
        if (!task.id) continue;
        // User tasks from server are the source of truth for their own content
        await smartUpdate(task.id, task, existingTasksMap, serverProgress);
    }
}

export async function saveUserTask(task: Task) {
    console.log('%c[Sync Service] Saving new user task to server...', 'color: purple; font-weight: bold;');
    try {
        const response = await fetch(USER_TASKS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(task),
        });

        if (!response.ok) {
            throw new Error(`Failed to save user task: ${response.statusText}`);
        }
        console.log('%c[Sync Service] User task saved successfully.', 'color: purple; font-weight: bold;');
    } catch (error) {
        console.error('%c[Sync Service] Error saving user task:', 'color: red; font-weight: bold;', error);
        throw error;
    }
}

async function syncMarkdownTasks(serverProgress: { [taskId: string]: Partial<Task> }) {
    console.log('%c[Sync Service] Starting Markdown/YAML sync...', 'color: blue;');
    
    // 1. Fetch the list of task files
    const response = await fetch(`/api/list-tasks?t=${Date.now()}`);
    if (!response.ok) {
        // If 404, maybe the plugin isn't running or folder is empty?
        if (response.status === 404) {
             console.warn('[Sync Service] /api/list-tasks endpoint not found. Skipping Markdown sync.');
             return;
        }
        throw new Error(`Failed to fetch task list: ${response.statusText}`);
    }
    const taskFiles: string[] = await response.json();
    console.log(`%c[Sync Service] Found ${taskFiles.length} Markdown/YAML files.`, 'color: blue;');

    // 2. Get all existing tasks from the database and put them in a Map for quick lookup
    const existingTasks = await db.tasks.toArray();
    const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

    // 3. Process each file
    for (const filename of taskFiles) {
        const fileResponse = await fetch(`/library/tasks/${filename}?v=${Date.now()}`);
        if (!fileResponse.ok) {
            console.warn(`[Sync Service] Failed to fetch task file: ${filename}`);
            continue;
        }
        const fileContent = await fileResponse.text();

        let fileTaskData: any = {};
        let taskId = '';

        // 4. Parse based on file extension
        if (filename.toLowerCase().endsWith('.yaml') || filename.toLowerCase().endsWith('.yml')) {
            try {
                const parsedYaml = load(fileContent) as any;
                taskId = parsedYaml.id;
                fileTaskData = {
                    title: parsedYaml.title || 'Untitled Task',
                    date: parsedYaml.date ? new Date(parsedYaml.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    subject: parsedYaml.subject as Subject || Subject.GENERAL,
                    description: parsedYaml.description || '',
                    priority: parsedYaml.priority as Priority || 'Medium',
                    acceptanceCriteria: parsedYaml.acceptanceCriteria || [],
                    sourceFile: filename
                };
            } catch (e) {
                console.error(`[Sync Service] Failed to parse YAML file: ${filename}`, e);
                continue;
            }
        } else if (filename.toLowerCase().endsWith('.md')) {
            const { data, content } = parseFrontMatter(fileContent);
            taskId = data.id;
            fileTaskData = {
                title: data.title || 'Untitled Task',
                date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                subject: data.subject as Subject || Subject.GENERAL,
                description: content.trim() || '',
                priority: data.priority as Priority || 'Medium',
                sourceFile: filename
            };
        } else {
            continue;
        }

        if (!taskId || typeof taskId !== 'string') {
            console.warn(`[Sync Service] Task file ${filename} is missing a valid 'id'. Skipping.`);
            continue;
        }

        await smartUpdate(taskId, fileTaskData, existingTasksMap, serverProgress);
    }
}

async function syncExcelTasks(serverProgress: { [taskId: string]: Partial<Task> }) {
    console.log('%c[Sync Service] Starting Excel server sync...', 'color: blue;');
    
    // 1. Fetch tasks from the server
    let excelTasks: any[] = [];
    try {
        const response = await fetch(EXCEL_TASKS_API);
        if (!response.ok) {
            throw new Error(`Failed to connect to Excel server: ${response.statusText}`);
        }
        excelTasks = await response.json();
    } catch (error) {
        console.warn('[Sync Service] Could not fetch from Excel server. Is it running on port 3001?');
        // We don't throw here to allow partial sync (e.g. only Markdown)
        return; 
    }

    console.log(`%c[Sync Service] Found ${excelTasks.length} tasks from Excel server.`, 'color: blue;');

    // 2. Get all existing tasks
    const existingTasks = await db.tasks.toArray();
    const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

    // 3. Process each task
    for (const task of excelTasks) {
        if (!task.id) continue;
        
        // Prepare the data from the file (server)
        // We carefully select fields that should be controlled by the file
        const fileTaskData = {
            title: task.title,
            date: task.date,
            subject: task.subject,
            priority: task.priority,
            description: task.description,
            acceptanceCriteria: task.acceptanceCriteria,
            sourceFile: task.sourceFile,
            // We do NOT include status, logs, evidences here
        };

        await smartUpdate(task.id, fileTaskData, existingTasksMap, serverProgress);
    }
}

async function smartUpdate(
    taskId: string,
    fileTaskData: any,
    existingTasksMap: Map<string, Task>,
    serverProgress: { [taskId: string]: Partial<Task> }
) {
    const existingTask = existingTasksMap.get(taskId);
    const progressFromServer = serverProgress[taskId] || {};

    if (existingTask) {
        // Hybrid Update: Update content fields from file, merge/prioritize progress fields from server
        const updates: Partial<Task> = {};

        // Fields from file (overwrites existing if different)
        if (existingTask.title !== fileTaskData.title) updates.title = fileTaskData.title;
        if (existingTask.date !== fileTaskData.date) updates.date = fileTaskData.date;
        if (existingTask.subject !== fileTaskData.subject) updates.subject = fileTaskData.subject;
        if (existingTask.description !== fileTaskData.description) updates.description = fileTaskData.description;
        if (existingTask.priority !== fileTaskData.priority) updates.priority = fileTaskData.priority;
        if (existingTask.sourceFile !== fileTaskData.sourceFile) updates.sourceFile = fileTaskData.sourceFile;

        // Acceptance Criteria: Overwrite from file if changed, as file is source of truth for structure
        if (fileTaskData.acceptanceCriteria && JSON.stringify(existingTask.acceptanceCriteria?.map(ac => ({ text: ac.text }))) !== JSON.stringify(fileTaskData.acceptanceCriteria?.map((ac: any) => ({ text: ac.text })))) {
             updates.acceptanceCriteria = fileTaskData.acceptanceCriteria;
        }

        // Progress-related fields from server (prioritize server state)
        if (progressFromServer.status !== undefined && existingTask.status !== progressFromServer.status) {
            updates.status = progressFromServer.status;
        }
        if (progressFromServer.logs !== undefined && JSON.stringify(existingTask.logs) !== JSON.stringify(progressFromServer.logs)) {
            updates.logs = progressFromServer.logs;
        }
        if (progressFromServer.evidences !== undefined && JSON.stringify(existingTask.evidences) !== JSON.stringify(progressFromServer.evidences)) {
            updates.evidences = progressFromServer.evidences;
        }
        if (progressFromServer.isArchived !== undefined && existingTask.isArchived !== progressFromServer.isArchived) {
            updates.isArchived = progressFromServer.isArchived;
        }
        if (progressFromServer.isDeleted !== undefined && existingTask.isDeleted !== progressFromServer.isDeleted) {
            updates.isDeleted = progressFromServer.isDeleted;
        }
        // deletedAt is part of isDeleted state, should be managed by the same source (server progress)
        if (progressFromServer.deletedAt !== undefined && existingTask.deletedAt !== progressFromServer.deletedAt) {
            updates.deletedAt = progressFromServer.deletedAt;
        }

        if (Object.keys(updates).length > 0) {
            console.log(`%c[Sync Service] Updating '${taskId}' (${fileTaskData.title})...`, 'color: green;', updates);
            await db.tasks.update(taskId, updates);
        }
    } else {
        // New Task: Combine file data with server progress
        console.log(`%c[Sync Service] Adding new task '${taskId}' (${fileTaskData.title})...`, 'color: green;');
        const newTask: Task = {
            id: taskId,
            userId: 'Schamala',
            // Default status, logs, evidences, archived, deleted flags
            // These will be overridden by progressFromServer if present
            status: TaskStatus.TODO,
            acceptanceCriteria: [],
            logs: [],
            evidences: [],
            isArchived: false,
            isDeleted: false,
            ...
            fileTaskData,
            ...progressFromServer, // Overrides defaults and fileTaskData for progress fields
        };
        await db.tasks.add(newTask);
    }
}

export async function saveTaskProgress(allTasks: Task[]) {
    console.log('%c[Sync Service] Saving task progress to server...', 'color: purple; font-weight: bold;');
    const progressToSave: { [taskId: string]: Partial<Task> } = {};

    allTasks.forEach(task => {
        progressToSave[task.id] = {
            status: task.status,
            logs: task.logs,
            evidences: task.evidences,
            isArchived: task.isArchived,
            isDeleted: task.isDeleted,
            deletedAt: task.deletedAt // Include deletedAt if it exists
        };
    });

    try {
        const response = await fetch(PROGRESS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(progressToSave),
        });

        if (!response.ok) {
            throw new Error(`Failed to save task progress: ${response.statusText}`);
        }
        console.log('%c[Sync Service] Task progress saved successfully.', 'color: purple; font-weight: bold;');
    } catch (error) {
        console.error('%c[Sync Service] Error saving task progress:', 'color: red; font-weight: bold;', error);
        throw error; // Re-throw to allow calling components to handle it
    }
}
