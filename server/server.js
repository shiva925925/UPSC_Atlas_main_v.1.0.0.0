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
const TASKS_FOLDER = path.join(__dirname, '..', 'Data', 'Tasks'); // e.g., Data/Tasks within project root
const PROGRESS_FILE = path.join(__dirname, '..', 'Data', 'task_progress.json');
const USER_TASKS_FILE = path.join(__dirname, '..', 'Data', 'user_tasks.json');
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

// --- Multer Storage Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_FOLDER);
    },
    filename: function (req, file, cb) {
        // Use original name, but maybe prefix with timestamp to avoid collisions if needed
        // For now, keep it simple as requested (original name) or safe name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const upload = multer({ storage: storage });

// --- API Endpoints ---

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    // Return the public URL. Since 'public' is the root of the frontend dev server,
    // the URL should be /uploads/filename
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename, originalName: req.file.originalname });
});

app.get('/api/tasks', async (req, res) => {
    console.log('GET /api/tasks received.');
    try {
        const allTasks = [];
        const files = fs.readdirSync(TASKS_FOLDER);
        const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

        for (const file of yamlFiles) {
            const filePath = path.join(TASKS_FOLDER, file);
            console.log(`Parsing YAML file: ${file}`);
            try {
                const fileContent = await fs.promises.readFile(filePath, 'utf8');
                const tasksFromFile = load(fileContent);
                if (Array.isArray(tasksFromFile)) {
                    allTasks.push(...tasksFromFile.map(task => ({ ...task, sourceFile: file })));
                } else if (typeof tasksFromFile === 'object' && tasksFromFile !== null) {
                    allTasks.push({ ...tasksFromFile, sourceFile: file });
                }
            } catch (parseError) {
                console.error(`Error parsing file ${file}:`, parseError);
                // Continue to next file even if one fails
            }
        }
        res.json(allTasks);
    } catch (error) {
        console.error('Failed to read tasks from file system:', error);
        res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
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
        res.status(200).json({ message: 'Task progress updated successfully' });
    } catch (error) {
        console.error('Error writing task progress file:', error);
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

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving tasks from: ${TASKS_FOLDER}`);
    console.log(`Managing task progress in: ${PROGRESS_FILE}`);
    console.log(`Managing user tasks in: ${USER_TASKS_FILE}`);
});
