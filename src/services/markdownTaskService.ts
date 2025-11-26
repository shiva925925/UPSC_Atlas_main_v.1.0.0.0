import { load } from 'js-yaml';
import { db } from '../db';
import { Task, TaskStatus, Subject, Priority } from '../types';
import { parseFrontMatter } from '../utils';

export async function syncMarkdownTasks() {
    console.log('%c[Sync Service] Starting task sync...', 'color: blue; font-weight: bold;');
    try {
        // 1. Fetch the list of task files
        const response = await fetch(`/api/list-tasks?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch task list');
        }
        const taskFiles: string[] = await response.json();
        console.log(`%c[Sync Service] Found ${taskFiles.length} task files.`, 'color: blue;');

        // 2. Get all existing tasks from the database and put them in a Map for quick lookup
        const existingTasks = await db.tasks.toArray();
        const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));
        console.log(`%c[Sync Service] ${existingTasksMap.size} tasks currently in local database.`, 'color: blue;');

        // 3. Process each file
        for (const filename of taskFiles) {
            console.log(`%c[Sync Service] Processing file: ${filename}`, 'color: gray;');
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
                        acceptanceCriteria: parsedYaml.acceptanceCriteria || []
                    };
                } catch (e) {
                    console.error(`[Sync Service] Failed to parse YAML file: ${filename}`, e);
                    continue;
                }
            } else if (filename.toLowerCase().endsWith('.md')) {
                // Markdown parsing
                const { data, content } = parseFrontMatter(fileContent);
                taskId = data.id;
                fileTaskData = {
                    title: data.title || 'Untitled Task',
                    date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    subject: data.subject as Subject || Subject.GENERAL,
                    description: content.trim() || '',
                    priority: data.priority as Priority || 'Medium',
                };
            } else {
                console.warn(`[Sync Service] Unsupported file type: ${filename}`);
                continue;
            }

            // 5. Validate the parsed data
            if (!taskId || typeof taskId !== 'string') {
                console.warn(`[Sync Service] Task file ${filename} is missing a valid 'id'. Skipping.`);
                continue;
            }

            const existingTask = existingTasksMap.get(taskId);

            if (existingTask) {
                // 6a. If task exists, check for updates
                console.log(`%c[Sync Service] Task '${taskId}' exists. Comparing fields...`, 'color: darkorange');
                const updates: Partial<Task> = {};

                if (existingTask.title !== fileTaskData.title) updates.title = fileTaskData.title;
                if (existingTask.date !== fileTaskData.date) updates.date = fileTaskData.date;
                if (existingTask.subject !== fileTaskData.subject) updates.subject = fileTaskData.subject;
                if (existingTask.description !== fileTaskData.description) updates.description = fileTaskData.description;
                if (existingTask.priority !== fileTaskData.priority) updates.priority = fileTaskData.priority;

                // For YAML, we might have acceptance criteria in the file
                if (fileTaskData.acceptanceCriteria && JSON.stringify(existingTask.acceptanceCriteria) !== JSON.stringify(fileTaskData.acceptanceCriteria)) {
                    updates.acceptanceCriteria = fileTaskData.acceptanceCriteria;
                }

                if (Object.keys(updates).length > 0) {
                    console.log(`%c[Sync Service] Changes found for '${taskId}'. Updating...`, 'color: green;', updates);
                    await db.tasks.update(taskId, updates);
                } else {
                    console.log(`%c[Sync Service] No changes for '${taskId}'.`, 'color: gray;');
                }
            } else {
                // 6b. If it's a new task, add it to the database
                console.log(`%c[Sync Service] Task '${taskId}' is new. Adding to database...`, 'color: green;');
                const newTask: Task = {
                    id: taskId,
                    userId: 'Schamala', // Default user
                    status: TaskStatus.TODO,
                    acceptanceCriteria: [],
                    logs: [],
                    evidences: [],
                    isArchived: false,
                    isDeleted: false,
                    ...fileTaskData,
                };

                await db.tasks.add(newTask);
            }
        }
        console.log('%c[Sync Service] Task sync complete.', 'color: blue; font-weight: bold;');
    } catch (error) {
        console.error('%c[Sync Service] Error syncing tasks from Markdown/YAML files:', 'color: red; font-weight: bold;', error);
    }
}
