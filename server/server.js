import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { load, dump } from 'js-yaml';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// --- Configuration ---
const TASKS_FOLDER = path.join(__dirname, '..', 'Data', 'Tasks');
const PROGRESS_FILE = path.join(__dirname, '..', 'Data', 'task_progress.json');
const USER_TASKS_FILE = path.join(__dirname, '..', 'Data', 'user_tasks.json');
const MASTER_CACHE_FILE = path.join(__dirname, '..', 'Data', 'master_task_cache.json');
const DELETED_TASKS_FILE = path.join(__dirname, '..', 'Data', 'deleted_tasks.json');
const USER_RESOURCES_YAML = path.join(__dirname, '..', 'Data', 'user_resources.yaml');
const DELETED_RESOURCES_FILE = path.join(__dirname, '..', 'Data', 'deleted_resources.json');
const MASTER_RESOURCE_CACHE_FILE = path.join(__dirname, '..', 'Data', 'master_resource_cache.json');
const UPLOADS_FOLDER = path.join(__dirname, '..', 'public', 'uploads');
const LIBRARY_FOLDER = path.join(__dirname, '..', 'public', 'library');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));

// Ensure directories exist
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

const USER_PROFILE_FILE = path.join(__dirname, '..', 'Data', 'user_profile.json');
const DIARY_ENTRIES_FILE = path.join(__dirname, '..', 'Data', 'diary_entries.json');

// --- DECOUPLED STATE (Step 1) ---
let memoryLibrary = []; // Static Syllabus from YAMLs
let fullLibraryIds = [];

/**
 * Loads all YAML files into memory. 
 * This is the ONLY time we do heavy Disk I/O for the syllabus.
 */
async function refreshMemoryLibrary() {
    console.log('[Server] Loading Static Syllabus into memory...');
    try {
        const allTasks = [];
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
                    if (task.id) allTasks.push(task);
                }
            } catch (err) {
                console.error(`Error loading ${file}:`, err);
            }
        }
        memoryLibrary = allTasks;
        fullLibraryIds = allTasks.map(t => t.id);
        console.log(`[Server] Library loaded: ${memoryLibrary.length} tasks.`);
    } catch (error) {
        console.error('Critical failure loading library:', error);
    }
}

/**
 * Unified getter for the "Global Master List" (Legacy Support)
 * Merges memoryLibrary + progress on-the-fly without disk writes.
 */
async function getMergedTasks() {
    // 1. Load Progress
    let progressData = {};
    if (fs.existsSync(PROGRESS_FILE)) {
        const data = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
        if (data.trim()) progressData = JSON.parse(data);
    }

    // 2. Load User Tasks
    let userTasks = [];
    if (fs.existsSync(USER_TASKS_FILE)) {
        const data = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
        if (data.trim()) userTasks = JSON.parse(data);
    }

    // 3. Load Tombstones
    let deletedIds = [];
    if (fs.existsSync(DELETED_TASKS_FILE)) {
        const data = await fs.promises.readFile(DELETED_TASKS_FILE, 'utf8');
        deletedIds = JSON.parse(data);
    }
    const deletedSet = new Set(deletedIds);

    // 4. Merge
    const merged = memoryLibrary
        .filter(t => !deletedSet.has(t.id))
        .map(task => {
            const prog = progressData[task.id] || {};
            return {
                ...task,
                date: prog.date || task.date || new Date().toISOString().split('T')[0],
                status: prog.status || task.status || 'TODO',
                priority: prog.priority || task.priority || 'Medium',
                description: prog.description || task.description || '',
                acceptanceCriteria: prog.acceptanceCriteria || task.acceptanceCriteria || [],
                logs: prog.logs || [],
                evidences: prog.evidences || [],
                isArchived: prog.isArchived || false,
                isDeleted: false,
                deletedAt: null
            };
        });

    // 5. Add User Tasks
    userTasks.forEach(t => {
        if (!deletedSet.has(t.id)) merged.push(t);
    });

    return merged;
}

// Startup
refreshMemoryLibrary();

// --- API ENDPOINTS ---

/**
 * GET /api/library (NEW)
 * The raw, static syllabus. Fast, from memory.
 */
app.get('/api/library', (req, res) => {
    res.json({ tasks: memoryLibrary, fullTaskIds: fullLibraryIds });
});

/**
 * GET /api/progress (NEW/REFINED) 
 * Only the user edits. Tiny and fast.
 */
app.get('/api/progress', async (req, res) => {
    try {
        if (!fs.existsSync(PROGRESS_FILE)) return res.json({});
        const data = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * PATCH /api/progress/:taskId
 * Updates ONLY the progress file. No "Universe Rebuild".
 */
app.patch('/api/progress/:taskId', async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body;

    try {
        let progress = {};
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = await fs.promises.readFile(PROGRESS_FILE, 'utf8');
            if (data.trim()) progress = JSON.parse(data);
        }

        progress[taskId] = { ...(progress[taskId] || {}), ...updates };
        await fs.promises.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));

        res.json({ message: 'Saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * GET /api/tasks (LEGACY)
 * Serves the merged view for current frontend compatibility.
 */
app.get('/api/tasks', async (req, res) => {
    const merged = await getMergedTasks();
    res.json({ tasks: merged, fullTaskIds: [...fullLibraryIds] });
});

/**
 * POST /api/rescan
 * Triggers a memory reload of YAMLs.
 */
app.post('/api/rescan', async (req, res) => {
    await refreshMemoryLibrary();
    res.json({ message: 'Memory Reloaded' });
});

// --- User Tasks Endpoints ---
app.get('/api/user-tasks', async (req, res) => {
    if (!fs.existsSync(USER_TASKS_FILE)) return res.json([]);
    const data = await fs.promises.readFile(USER_TASKS_FILE, 'utf8');
    res.json(JSON.parse(data || '[]'));
});

// --- Delete Task ---
app.delete('/api/tasks/:taskId', async (req, res) => {
    const { taskId } = req.params;
    try {
        let deleted = [];
        if (fs.existsSync(DELETED_TASKS_FILE)) {
            const d = await fs.promises.readFile(DELETED_TASKS_FILE, 'utf8');
            deleted = JSON.parse(d);
        }
        if (!deleted.includes(taskId)) {
            deleted.push(taskId);
            await fs.promises.writeFile(DELETED_TASKS_FILE, JSON.stringify(deleted, null, 2));
        }
        res.json({ message: 'Tombstoned' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- Resources Endpoints ---
let isResourceRebuilding = false;
async function rebuildResourceCache() {
    if (isResourceRebuilding) return;
    isResourceRebuilding = true;
    console.log('[Server] Rebuilding master resource cache...');

    try {
        const allResources = [];
        let deletedIds = new Set();

        if (fs.existsSync(DELETED_RESOURCES_FILE)) {
            const d = await fs.promises.readFile(DELETED_RESOURCES_FILE, 'utf8');
            deletedIds = new Set(JSON.parse(d));
        }

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

        const payload = { resources: allResources, timestamp: Date.now() };
        await fs.promises.writeFile(MASTER_RESOURCE_CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`[Server] Resource cache rebuilt (${allResources.length} items).`);
    } catch (error) {
        console.error('Failed to rebuild resource cache:', error);
    } finally {
        isResourceRebuilding = false;
    }
}

app.get('/api/resources', async (req, res) => {
    try {
        if (!fs.existsSync(MASTER_RESOURCE_CACHE_FILE)) await rebuildResourceCache();
        const data = await fs.promises.readFile(MASTER_RESOURCE_CACHE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) { res.status(500).json({ error: error.message }); }
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
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let tombstones = [];
        if (fs.existsSync(DELETED_RESOURCES_FILE)) {
            const d = await fs.promises.readFile(DELETED_RESOURCES_FILE, 'utf8');
            tombstones = JSON.parse(d);
        }
        if (!tombstones.includes(id)) {
            tombstones.push(id);
            await fs.promises.writeFile(DELETED_RESOURCES_FILE, JSON.stringify(tombstones, null, 2));
        }
        if (fs.existsSync(USER_RESOURCES_YAML)) {
            const content = await fs.promises.readFile(USER_RESOURCES_YAML, 'utf8');
            let resources = load(content) || [];
            resources = resources.filter(r => r.id !== id);
            await fs.promises.writeFile(USER_RESOURCES_YAML, dump(resources), 'utf8');
        }
        await rebuildResourceCache();
        res.json({ message: 'Resource deleted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- Profile & Diary Endpoints ---
app.get('/api/profile', async (req, res) => {
    try {
        if (!fs.existsSync(USER_PROFILE_FILE)) return res.status(404).json({ message: 'Not found' });
        const data = await fs.promises.readFile(USER_PROFILE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/profile', async (req, res) => {
    try {
        await fs.promises.writeFile(USER_PROFILE_FILE, JSON.stringify(req.body, null, 2));
        res.json({ message: 'Profile updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/diary', async (req, res) => {
    try {
        if (!fs.existsSync(DIARY_ENTRIES_FILE)) return res.json([]);
        const data = await fs.promises.readFile(DIARY_ENTRIES_FILE, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/diary', async (req, res) => {
    try {
        let entries = [];
        if (fs.existsSync(DIARY_ENTRIES_FILE)) {
            const data = await fs.promises.readFile(DIARY_ENTRIES_FILE, 'utf8');
            entries = JSON.parse(data || '[]');
        }
        entries.push(req.body);
        await fs.promises.writeFile(DIARY_ENTRIES_FILE, JSON.stringify(entries, null, 2));
        res.json({ message: 'Entry added' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/diary/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (fs.existsSync(DIARY_ENTRIES_FILE)) {
            const data = await fs.promises.readFile(DIARY_ENTRIES_FILE, 'utf8');
            let entries = JSON.parse(data || '[]');
            entries = entries.filter(e => e.id !== id);
            await fs.promises.writeFile(DIARY_ENTRIES_FILE, JSON.stringify(entries, null, 2));
            res.json({ message: 'Deleted' });
        } else res.status(404).json({ message: 'Not found' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Professional Server running on http://localhost:${PORT}`);
    console.log(`Decoupled architecture Step 1: Active.`);
});
