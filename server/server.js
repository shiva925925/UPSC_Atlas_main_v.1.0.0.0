import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { load } from 'js-yaml'; // Import js-yaml for YAML parsing
import multer from 'multer'; // Import multer for file uploads

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Allow cross-origin requests from your frontend
app.use(express.json()); // For parsing application/json

// --- Configuration ---
const TASKS_FOLDER = path.join(__dirname, '..', 'Data', 'Tasks');
const PROGRESS_FILE = path.join(__dirname, '..', 'Data', 'task_progress.json');
const USER_TASKS_FILE = path.join(__dirname, '..', 'Data', 'user_tasks.json');
const MASTER_CACHE_FILE = path.join(__dirname, '..', 'Data', 'master_task_cache.json');
const UPLOADS_FOLDER = path.join(__dirname, '..', 'public', 'uploads');

// Ensure directories exist
if (!fs.existsSync(TASKS_FOLDER)) {
    fs.mkdirSync(TASKS_FOLDER, { recursive: true });
    console.log(`Created tasks folder: ${TASKS_FOLDER}`);
}
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
    console.log(`Created uploads folder: ${UPLOADS_FOLDER}`);
}

// --- Task Cacher Logic ---
let isRebuilding = false;

async function rebuildTaskCache() {
    if (isRebuilding) return;
    isRebuilding = true;
    console.log('%c[Server] Rebuilding master task cache...', 'color: orange; font-weight: bold;');

    try {
        const allTasks = [];
        const fullTaskIds = [];

        // 1. Load Progress and User Tasks for merging
        let progressData = {};
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
            if (data.trim()) progressData = JSON.parse(data);
        }

        let userTasks = [];
        if (fs.existsSync(USER_TASKS_FILE)) {
            const data = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
            if (data.trim()) userTasks = JSON.parse(data);
        }

        // 2. Scan YAML Files
        const files = fs.readdirSync(TASKS_FOLDER);
        const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

        for (const file of yamlFiles) {
            const filePath = path.join(TASKS_FOLDER, file);
            try {
                const fileContent = await fs.promises.readFile(filePath, 'utf8');
                const tasksFromFile = load(fileContent);
                let tasksInThisFile = [];

                if (Array.isArray(tasksFromFile)) {
                    tasksInThisFile = tasksFromFile.map(task => ({ ...task, sourceFile: file }));
                } else if (typeof tasksFromFile === 'object' && tasksFromFile !== null) {
                    tasksInThisFile = [{ ...tasksFromFile, sourceFile: file }];
                }

                for (const task of tasksInThisFile) {
                    if (!task.id) continue;

                    // Merge with progress
                    const progress = progressData[task.id] || {};
                    const mergedTask = {
                        ...task,
                        date: task.date || new Date().toISOString().split('T')[0], // Default to Today
                        status: progress.status || task.status || 'TODO',
                        priority: progress.priority || task.priority || 'Medium',
                        logs: progress.logs || [],
                        evidences: progress.evidences || [],
                        isArchived: progress.isArchived || false,
                        isDeleted: progress.isDeleted || false,
                        deletedAt: progress.deletedAt || null,
                        acceptanceCriteria: task.acceptanceCriteria || []
                    };

                    allTasks.push(mergedTask);
                    fullTaskIds.push(task.id);
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }

        // 3. Add User Tasks
        for (const task of userTasks) {
            if (!task.id) continue;
            allTasks.push(task);
            fullTaskIds.push(task.id);
        }

        const cachePayload = {
            tasks: allTasks,
            fullTaskIds: [...new Set(fullTaskIds)],
            timestamp: Date.now()
        };

        await fs.promises.writeFile(MASTER_CACHE_FILE, JSON.stringify(cachePayload, null, 2), 'utf8');
        console.log(`%c[Server] Cache rebuilt successfully (${allTasks.length} tasks).`, 'color: green;');
    } catch (error) {
        console.error('Failed to rebuild task cache:', error);
    } finally {
        isRebuilding = false;
    }
}

// Watch for file changes in Data/Tasks
let watchTimeout = null;
fs.watch(TASKS_FOLDER, (eventType, filename) => {
    if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
        console.log(`[Watcher] Detect change in ${filename}. Scheduling rebuild...`);
        if (watchTimeout) clearTimeout(watchTimeout);
        watchTimeout = setTimeout(rebuildTaskCache, 1000); // 1s debounce
    }
});

// App Endpoints
app.get('/api/tasks', async (req, res) => {
    try {
        if (!fs.existsSync(MASTER_CACHE_FILE)) {
            await rebuildTaskCache();
        }
        const data = await fs.promises.readFile(MASTER_CACHE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ message: 'Failed to serve master cache', error: error.message });
    }
});

// GET endpoint for task progress
app.get('/api/progress', async (req, res) => {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const progressData = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
            res.json(JSON.parse(progressData));
        } else {
            res.json({}); // Return empty object if file doesn't exist yet
        }
    } catch (error) {
        console.error('Error reading task progress file:', error);
        res.status(500).json({ message: 'Failed to retrieve task progress', error: error.message });
    }
});

// POST endpoint for updating task progress
app.post('/api/progress', async (req, res) => {
    try {
        const progressUpdates = req.body;
        await fs.promises.writeFile(PROGRESS_FILE, JSON.stringify(progressUpdates, null, 2), 'utf8');
        rebuildTaskCache();
        res.status(200).json({ message: 'Task progress updated successfully' });
    } catch (error) {
        console.error('Error writing task progress file:', error);
        res.status(500).json({ message: 'Failed to update task progress', error: error.message });
    }
});

// PATCH endpoint for updating a single task's progress (Incremental Sync)
app.patch('/api/progress/:taskId', async (req, res) => {
    console.log(`[DEBUG] PATCH request received for URL: ${req.url}`);
    console.log(`[DEBUG] Params:`, req.params);
    try {
        const { taskId } = req.params;
        const updates = req.body;

        let progressData = {};
        if (fs.existsSync(PROGRESS_FILE)) {
            const fileContent = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
            if (fileContent.trim()) {
                progressData = JSON.parse(fileContent);
            }
        }

        // Merge updates
        progressData[taskId] = {
            ...(progressData[taskId] || {}),
            ...updates
        };

        await fs.promises.writeFile(PROGRESS_FILE, JSON.stringify(progressData, null, 2), 'utf8');

        // Trigger cache rebuild (async, but we don't necessarily need to wait for it to return 200, 
        // though for safety we'll await it or let it run in background)
        rebuildTaskCache();

        res.status(200).json({ message: `Task ${taskId} progress updated successfully` });
    } catch (error) {
        console.error(`Error updating progress for task ${req.params.taskId}:`, error);
        res.status(500).json({ message: 'Failed to update task progress', error: error.message });
    }
});

// GET endpoint for user-created tasks
app.get('/api/user-tasks', async (req, res) => {
    try {
        if (fs.existsSync(USER_TASKS_FILE)) {
            const userTasksData = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
            // Handle case where file might be empty string
            if (!userTasksData.trim()) {
                res.json([]);
                return;
            }
            res.json(JSON.parse(userTasksData));
        } else {
            res.json([]); // Return empty array if file doesn't exist yet
        }
    } catch (error) {
        console.error('Error reading user tasks file:', error);
        res.status(500).json({ message: 'Failed to retrieve user tasks', error: error.message });
    }
});

// POST endpoint for creating a new user task
app.post('/api/user-tasks', async (req, res) => {
    try {
        const newTask = req.body;
        let existingTasks = [];

        if (fs.existsSync(USER_TASKS_FILE)) {
            const fileContent = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
            if (fileContent.trim()) {
                existingTasks = JSON.parse(fileContent);
            }
        }

        // Append new task
        existingTasks.push(newTask);

        await fs.promises.writeFile(USER_TASKS_FILE, JSON.stringify(existingTasks, null, 2), 'utf8');
        res.status(200).json({ message: 'User task created successfully' });
    } catch (error) {
        console.error('Error writing user tasks file:', error);
        res.status(500).json({ message: 'Failed to create user task', error: error.message });
    }
});

// --- Profile & Diary Endpoints ---

const USER_PROFILE_FILE = path.join(__dirname, '..', 'Data', 'user_profile.json');
const DIARY_ENTRIES_FILE = path.join(__dirname, '..', 'Data', 'diary_entries.json');

// GET Profile
app.get('/api/profile', async (req, res) => {
    try {
        if (fs.existsSync(USER_PROFILE_FILE)) {
            const data = await fs.promises.readFile(USER_PROFILE_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ message: 'Profile not found' });
        }
    } catch (error) {
        console.error('Error reading profile:', error);
        res.status(500).json({ message: 'Failed to read profile' });
    }
});

// POST Profile
app.post('/api/profile', async (req, res) => {
    try {
        const profile = req.body;
        await fs.promises.writeFile(USER_PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf8');
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error saving profile:', error);
        res.status(500).json({ message: 'Failed to save profile' });
    }
});

// GET Diary Entries
app.get('/api/diary', async (req, res) => {
    try {
        if (fs.existsSync(DIARY_ENTRIES_FILE)) {
            const data = await fs.promises.readFile(DIARY_ENTRIES_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error reading diary:', error);
        res.status(500).json({ message: 'Failed to read diary entries' });
    }
});

// POST Diary Entry
app.post('/api/diary', async (req, res) => {
    try {
        const newEntry = req.body; // Expecting single entry or array? Let's handling single entry append usually, but syncing might send all.
        // For simplicity with the sync service we'll build next, let's assume we append new entries. 
        // OR better: The UI might send a single entry to add.

        // Actually, for a robust sync, sometimes it is easier to overwrite the whole file or append. 
        // Let's implement append logic for now to allow adding one by one.

        let entries = [];
        if (fs.existsSync(DIARY_ENTRIES_FILE)) {
            const data = await fs.promises.readFile(DIARY_ENTRIES_FILE, 'utf8');
            if (data.trim()) {
                entries = JSON.parse(data);
            }
        }
        entries.push(newEntry);

        await fs.promises.writeFile(DIARY_ENTRIES_FILE, JSON.stringify(entries, null, 2), 'utf8');
        res.json({ message: 'Diary entry added successfully' });
    } catch (error) {
        console.error('Error saving diary entry:', error);
        res.status(500).json({ message: 'Failed to save diary entry' });
    }
});

// DELETE Diary Entry
app.delete('/api/diary/:id', async (req, res) => {
    try {
        const idToDelete = parseInt(req.params.id); // Assuming ID is number timestamp
        if (fs.existsSync(DIARY_ENTRIES_FILE)) {
            const data = await fs.promises.readFile(DIARY_ENTRIES_FILE, 'utf8');
            let entries = JSON.parse(data);
            entries = entries.filter(e => e.id !== idToDelete);
            await fs.promises.writeFile(DIARY_ENTRIES_FILE, JSON.stringify(entries, null, 2), 'utf8');
            res.json({ message: 'Entry deleted successfully' });
        } else {
            res.status(404).json({ message: 'Diary file not found' });
        }
    } catch (error) {
        console.error('Error deleting diary entry:', error);
        res.status(500).json({ message: 'Failed to delete entry' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving tasks from: ${TASKS_FOLDER}`);
    console.log(`Managing task progress in: ${PROGRESS_FILE}`);
    console.log(`Managing user tasks in: ${USER_TASKS_FILE}`);
    console.log(`Managing profile in: ${USER_PROFILE_FILE}`);
    console.log(`Managing diary in: ${DIARY_ENTRIES_FILE}`);
});
