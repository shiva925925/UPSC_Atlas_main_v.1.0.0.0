import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

// Ensure the tasks folder exists
if (!fs.existsSync(TASKS_FOLDER)) {
    fs.mkdirSync(TASKS_FOLDER, { recursive: true });
    console.log(`Created tasks folder: ${TASKS_FOLDER}`);
}

// --- Utility Functions (Excel Parsing) ---
// This logic is adapted from your frontend helper but now uses ExcelJS
const COLUMN_ALIASES = {
    id: ['unqid', 'id', 'uniqueid', 'taskid'],
    title: ['topic', 'title', 'task', 'name', 'taskname', 'task title'],
    subject: ['subject', 'category'],
    priority: ['priority', 'importance', 'level'],
    date: ['date', 'duedate', 'targetdate'],
    description: ['description', 'notes', 'details'],
    paper: ['paper', 'gspaper'],
    acceptanceCriteria: ['acceptance criteria', 'checklist', 'criteria', 'acs'],
};

function normalizeHeader(header) {
    return header ? header.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

function findColumnValue(row, headerMap, key) {
    const aliases = COLUMN_ALIASES[key];
    if (!aliases) return undefined;
    for (const alias of aliases) {
        if (headerMap[alias] !== undefined) {
            return row[headerMap[alias]];
        }
    }
    return undefined;
}

async function parseExcelFile(filePath, sourceFile) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1); // Get first worksheet

    if (!worksheet) return [];

    const tasks = [];
    const headerRow = worksheet.getRow(1);
    const headerMap = {};

    if (!headerRow.values) return [];

    // Build header map for case-insensitive and alias matching
    headerRow.eachCell((cell, colNumber) => {
        const headerText = normalizeHeader(cell.text);
        for (const key in COLUMN_ALIASES) {
            if (COLUMN_ALIASES[key].includes(headerText)) {
                headerMap[headerText] = colNumber -1 ; // 0-indexed for array access
                break;
            }
        }
    });
    
    // Fallback if specific aliases not found, use original header text
    headerRow.eachCell((cell, colNumber) => {
        const headerText = cell.text ? String(cell.text).toLowerCase() : '';
        if (headerText && headerMap[headerText] === undefined) {
            headerMap[headerText] = colNumber -1 ;
        }
    });

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const rowValues = row.values.slice(1); // ExcelJS uses 1-based indexing for values
        
        // Basic check for empty row (if all cells are empty or null-like)
        if (rowValues.every(v => v === undefined || v === null || String(v).trim() === '')) {
            return; 
        }

        const idFromExcel = findColumnValue(rowValues, headerMap, 'id');
        const id = idFromExcel ? String(idFromExcel) : `excel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const title = findColumnValue(rowValues, headerMap, 'title') || 'Untitled Task';

        let subject = 'General';
        const rawSubject = findColumnValue(rowValues, headerMap, 'subject');
        if (rawSubject) {
            const normalizedRawSubject = String(rawSubject).toLowerCase();
            // This needs to match your frontend Subject enum values
            const validSubjects = ['history', 'polity', 'geography', 'economics', 'ethics', 'csat', 'current affairs', 'upsc syllabus', 'general'];
            if (validSubjects.includes(normalizedRawSubject)) {
                subject = normalizedRawSubject.charAt(0).toUpperCase() + normalizedRawSubject.slice(1); // Capitalize first letter
            } else if (normalizedRawSubject === 'currentaffairs') {
                subject = 'Current Affairs'; // Specific mapping for multi-word
            } else if (normalizedRawSubject === 'upscsyllabus') {
                subject = 'UPSC Syllabus';
            }
        }
        
        let priority = 'Medium';
        const rawPriority = findColumnValue(rowValues, headerMap, 'priority');
        if (rawPriority) {
            const normalizedRawPriority = String(rawPriority).toLowerCase();
            if (['high', 'medium', 'low'].includes(normalizedRawPriority)) {
                priority = normalizedRawPriority.charAt(0).toUpperCase() + normalizedRawPriority.slice(1);
            }
        }

        let dateStr = new Date().toISOString().split('T')[0];
        const rawDate = findColumnValue(rowValues, headerMap, 'date');
        if (rawDate) {
            try {
                let parsedDate;
                if (typeof rawDate === 'number') {
                    // Excel date numbers are days since 1900-01-01 (or 1904)
                    // ExcelJS might auto-convert to Date objects, but if not:
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1900-01-01 is day 1
                    parsedDate = new Date(excelEpoch.getTime() + (rawDate * 24 * 60 * 60 * 1000));
                } else {
                    parsedDate = new Date(rawDate);
                }
                if (!isNaN(parsedDate.getTime())) {
                    dateStr = parsedDate.toISOString().split('T')[0];
                } else {
                    console.warn(`Invalid date format for task '${title}': ${rawDate}. Using today's date.`);
                }
            } catch (e) {
                console.warn(`Error parsing date for task '${title}': ${rawDate}. Using today's date.`, e);
            }
        }

        let description = findColumnValue(rowValues, headerMap, 'description') || '';
        const paper = findColumnValue(rowValues, headerMap, 'paper');
        if (paper) {
            description = `Paper: ${paper}\n\n${description}`;
        }

        const acceptanceCriteria = [];
        const criteriaText = findColumnValue(rowValues, headerMap, 'acceptanceCriteria');
        if (criteriaText) {
            const lines = String(criteriaText).split(/\r?\n/).filter(line => line.trim() !== '');
            lines.forEach((line, idx) => {
                acceptanceCriteria.push({
                    id: `ac-${id}-${idx}`,
                    text: line.trim(),
                    isCompleted: false
                });
            });
        }

        tasks.push({
            id: id,
            userId: 'Schamala', // Default user, will be dynamic later
            title: title,
            date: dateStr,
            subject: subject,
            priority: priority,
            status: 'TODO', // Default status
            description: description,
            acceptanceCriteria: acceptanceCriteria,
            logs: [],
            evidences: [],
            isArchived: false,
            isDeleted: false,
            sourceFile: sourceFile, // The file this task came from
        });
    });

    return tasks;
}

// --- API Endpoints ---
app.get('/api/tasks', async (req, res) => {
    console.log('GET /api/tasks received.');
    try {
        const allTasks = [];
        const files = fs.readdirSync(TASKS_FOLDER);
        const excelFiles = files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

        for (const file of excelFiles) {
            const filePath = path.join(TASKS_FOLDER, file);
            console.log(`Parsing Excel file: ${file}`);
            try {
                const tasksFromFile = await parseExcelFile(filePath, file);
                allTasks.push(...tasksFromFile);
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
