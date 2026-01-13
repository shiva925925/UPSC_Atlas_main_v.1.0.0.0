import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { load, dump } from 'js-yaml'; // Import js-yaml for YAML parsing/dumping
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
const DELETED_TASKS_FILE = path.join(__dirname, '..', 'Data', 'deleted_tasks.json'); // NEW: Tombstone Registry
const USER_RESOURCES_YAML = path.join(__dirname, '..', 'Data', 'user_resources.yaml');
const DELETED_RESOURCES_FILE = path.join(__dirname, '..', 'Data', 'deleted_resources.json');
const MASTER_RESOURCE_CACHE_FILE = path.join(__dirname, '..', 'Data', 'master_resource_cache.json');
const UPLOADS_FOLDER = path.join(__dirname, '..', 'public', 'uploads');
const LIBRARY_FOLDER = path.join(__dirname, '..', 'public', 'library');

// Ensure directories and files exist
if (!fs.existsSync(TASKS_FOLDER)) fs.mkdirSync(TASKS_FOLDER, { recursive: true });
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

// Helper to init files
async function initFile(filePath, defaultContent) {
    if (!fs.existsSync(filePath)) {
        await fs.promises.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    }
}
initFile(DELETED_TASKS_FILE, []);
initFile(DELETED_RESOURCES_FILE, []);
if (!fs.existsSync(USER_RESOURCES_YAML)) fs.writeFileSync(USER_RESOURCES_YAML, '', 'utf8');

// --- Task Cacher Logic ---
let isRebuilding = false;

async function rebuildTaskCache() {
    if (isRebuilding) return;
    isRebuilding = true;
    console.log('%c[Server] Rebuilding master task cache...', 'color: orange; font-weight: bold;');

    try {
        const allTasks = [];
        const fullTaskIds = [];

        // 1. Load Tombstones (The Blacklist)
        let deletedTaskIds = new Set();
        try {
            if (fs.existsSync(DELETED_TASKS_FILE)) {
                const deletedData = await fs.promises.readFile(DELETED_TASKS_FILE, 'utf8');
                deletedTaskIds = new Set(JSON.parse(deletedData));
            }
        } catch (e) {
            console.warn('Could not read deleted_tasks.json', e);
        }

        // 2. Load Progress
        let progressData = {};
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
            if (data.trim()) progressData = JSON.parse(data);
        }

        // 3. Load User Tasks
        let userTasks = [];
        if (fs.existsSync(USER_TASKS_FILE)) {
            const data = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
            if (data.trim()) userTasks = JSON.parse(data);
        }

        // 4. Scan YAML Files (Immutable Source)
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

                    // --- TOMBSTONE CHECK ---
                    if (deletedTaskIds.has(task.id)) {
                        continue; // SKIP RESURRECTION
                    }

                    // Merge with progress
                    const progress = progressData[task.id] || {};
                    const mergedTask = {
                        ...task,
                        date: task.date || new Date().toISOString().split('T')[0],
                        status: progress.status || task.status || 'TODO',
                        priority: progress.priority || task.priority || 'Medium',
                        logs: progress.logs || [],
                        evidences: progress.evidences || [],
                        isArchived: progress.isArchived || false,
                        isDeleted: false, // Always alive if not in tombstone
                        deletedAt: null,
                        acceptanceCriteria: task.acceptanceCriteria || []
                    };

                    allTasks.push(mergedTask);
                    fullTaskIds.push(task.id);
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }

        // 5. Add User Tasks (Mutable Source)
        for (const task of userTasks) {
            if (!task.id) continue;
            // User tasks are usually deleted directly from user_tasks.json, 
            // but we check tombstone just in case
            if (deletedTaskIds.has(task.id)) continue;

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

// --- Resource Cacher Logic ---
let isResourceRebuilding = false;

async function rebuildResourceCache() {
    if (isResourceRebuilding) return;
    isResourceRebuilding = true;
    console.log('[Server] Rebuilding master resource cache...');

    try {
        const allResources = [];
        let deletedIds = new Set();

        // 1. Load Tombstones
        if (fs.existsSync(DELETED_RESOURCES_FILE)) {
            const d = await fs.promises.readFile(DELETED_RESOURCES_FILE, 'utf8');
            deletedIds = new Set(JSON.parse(d));
        }

        // 2. Scan Library Folder (PDFs)
        if (fs.existsSync(LIBRARY_FOLDER)) {
            const getFiles = async (dir) => {
                const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
                const files = await Promise.all(dirents.map((dirent) => {
                    const resPath = path.join(dir, dirent.name);
                    return dirent.isDirectory() ? getFiles(resPath) : resPath;
                }));
                return Array.prototype.concat(...files);
            };

            const files = await getFiles(LIBRARY_FOLDER);
            const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

            pdfFiles.forEach((absPath, index) => {
                const relPath = path.relative(LIBRARY_FOLDER, absPath);
                const filename = path.basename(relPath);
                const id = `lib_auto_${index + 1}`;

                if (deletedIds.has(id)) return;

                const pathParts = relPath.split(path.sep);
                let subject = 'UPSC Syllabus';
                if (pathParts.length > 1) {
                    const top = pathParts[0].toLowerCase();
                    if (top.includes('ethics')) subject = 'Ethics';
                    else if (top.includes('history')) subject = 'History';
                    else if (top.includes('polity')) subject = 'Polity';
                    else if (top.includes('economics')) subject = 'Economics';
                    else if (top.includes('geography')) subject = 'Geography';
                    else if (top.includes('csat')) subject = 'CSAT';
                    else if (top.includes('current')) subject = 'Current Affairs';
                    else subject = pathParts[0];
                }

                allResources.push({
                    id,
                    userId: 'Schamala',
                    title: filename.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ').trim(),
                    type: 'PDF',
                    subject,
                    url: `/library/${relPath.split(path.sep).join('/')}`,
                    path: relPath.split(path.sep).join('/'),
                    description: `Auto-detected PDF`,
                    isAuto: true
                });
            });
        }

        // 3. Load User Resources (YAML)
        if (fs.existsSync(USER_RESOURCES_YAML)) {
            const content = await fs.promises.readFile(USER_RESOURCES_YAML, 'utf8');
            const data = load(content);
            if (Array.isArray(data)) {
                data.forEach(res => {
                    if (res.id && !deletedIds.has(res.id)) {
                        allResources.push({ ...res, isAuto: false });
                    }
                });
            }
        }

        const payload = {
            resources: allResources,
            timestamp: Date.now()
        };

        await fs.promises.writeFile(MASTER_RESOURCE_CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`[Server] Resource cache rebuilt (${allResources.length} items).`);
    } catch (error) {
        console.error('Failed to rebuild resource cache:', error);
    } finally {
        isResourceRebuilding = false;
    }
}

// NOTE: Auto-watchers REMOVED as per 'Manual Rescan' requirement.

// App Endpoints

/**
 * GET Master Cache
 * Returns the pre-computed JSON file. Fast.
 */
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

/**
 * MANUAL RESCAN Trigger
 * User clicks "Sync" -> Calls this -> Rebuidls from YAMLs
 */
app.post('/api/rescan', async (req, res) => {
    console.log('[API] Manual Rescan Requested');
    try {
        await Promise.all([rebuildTaskCache(), rebuildResourceCache()]);
        res.json({ message: 'Rescan complete' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * DELETE Task (Permanent / Tombstone)
 * The Critical Fix for the "Resurrection" bug.
 */
app.delete('/api/tasks/:taskId', async (req, res) => {
    const { taskId } = req.params;
    console.log(`[API] Deleting task: ${taskId}`);

    try {
        // 1. Add to Tombstone (Deleted Tasks List)
        let deletedIds = [];
        try {
            if (fs.existsSync(DELETED_TASKS_FILE)) {
                const d = await fs.promises.readFile(DELETED_TASKS_FILE, 'utf8');
                deletedIds = JSON.parse(d);
            }
        } catch (e) { }

        if (!deletedIds.includes(taskId)) {
            deletedIds.push(taskId);
            await fs.promises.writeFile(DELETED_TASKS_FILE, JSON.stringify(deletedIds, null, 2));
        }

        // 2. Remove from User Tasks (if applicable)
        let userTasks = [];
        if (fs.existsSync(USER_TASKS_FILE)) {
            const d = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
            userTasks = JSON.parse(d);
            const initialLen = userTasks.length;
            userTasks = userTasks.filter(t => t.id !== taskId);
            if (userTasks.length !== initialLen) {
                await fs.promises.writeFile(USER_TASKS_FILE, JSON.stringify(userTasks, null, 2));
            }
        }

        // 3. Remove from Progress (Cleanup)
        let progress = {};
        if (fs.existsSync(PROGRESS_FILE)) {
            const d = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
            progress = JSON.parse(d);
            if (progress[taskId]) {
                delete progress[taskId];
                await fs.promises.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
            }
        }

        // 4. Force Rebuild Cache immediately
        await rebuildTaskCache();

        res.json({ message: 'Task deleted and tombstoned' });
    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ error: error.message });
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

        // Trigger cache rebuild
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
            if (!userTasksData.trim()) {
                res.json([]);
                return;
            }
            res.json(JSON.parse(userTasksData));
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error reading user tasks file:', error);
        res.status(500).json({ message: 'Failed to retrieve user tasks', error: error.message });
    }
});

// --- Resource Endpoints ---

app.get('/api/resources', async (req, res) => {
    try {
        if (!fs.existsSync(MASTER_RESOURCE_CACHE_FILE)) {
            await rebuildResourceCache();
        }
        const data = await fs.promises.readFile(MASTER_RESOURCE_CACHE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/resources', async (req, res) => {
    try {
        const newRes = req.body;
        let resources = [];
        if (fs.existsSync(USER_RESOURCES_YAML)) {
            const content = await fs.promises.readFile(USER_RESOURCES_YAML, 'utf8');
            resources = load(content) || [];
        }

        const idx = resources.findIndex(r => r.id === newRes.id);
        if (idx > -1) resources[idx] = newRes;
        else resources.push(newRes);

        await fs.promises.writeFile(USER_RESOURCES_YAML, dump(resources), 'utf8');
        await rebuildResourceCache();
        res.json({ message: 'Resource saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Add to Tombstone
        let tombstones = [];
        if (fs.existsSync(DELETED_RESOURCES_FILE)) {
            const d = await fs.promises.readFile(DELETED_RESOURCES_FILE, 'utf8');
            tombstones = JSON.parse(d);
        }
        if (!tombstones.includes(id)) {
            tombstones.push(id);
            await fs.promises.writeFile(DELETED_RESOURCES_FILE, JSON.stringify(tombstones, null, 2));
        }

        // 2. Remove from YAML if present
        if (fs.existsSync(USER_RESOURCES_YAML)) {
            const content = await fs.promises.readFile(USER_RESOURCES_YAML, 'utf8');
            let resources = load(content) || [];
            resources = resources.filter(r => r.id !== id);
            await fs.promises.writeFile(USER_RESOURCES_YAML, dump(resources), 'utf8');
        }

        await rebuildResourceCache();
        res.json({ message: 'Resource deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        const newEntry = req.body;
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
        const idToDelete = parseInt(req.params.id);
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

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// Serve static files from the uploads directory
app.use('/uploads', express.static(UPLOADS_FOLDER));

// --- API Endpoints ---

/**
 * POST /api/upload
 * Handles file uploads and returns the URL.
 */
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL that can be used to access the file
    // Note: Since server is on 3001, we return absolute URL or relative if handled by proxy
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname
    });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving tasks from: ${TASKS_FOLDER}`);
    console.log(`Tombstones active: ${DELETED_TASKS_FILE}`);
    console.log(`Uploads served at: http://localhost:${PORT}/uploads`);
});
