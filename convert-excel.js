import XLSX from 'xlsx';
import { dump } from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TASKS_DIR = path.join(__dirname, 'Data', 'Tasks');

// Define column aliases for robust header matching
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
    return header ? header.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

function findColumnMapping(headers) {
    const headerMap = {}; // Maps alias key (e.g., 'id') to actual column header in Excel
    const normalizedHeaders = headers.map(h => normalizeHeader(h));

    for (const key in COLUMN_ALIASES) {
        for (const alias of COLUMN_ALIASES[key]) {
            const normalizedAlias = normalizeHeader(alias);
            const foundIndex = normalizedHeaders.indexOf(normalizedAlias);
            if (foundIndex !== -1) {
                headerMap[key] = headers[foundIndex]; // Store original header name
                break;
            }
        }
    }
    return headerMap;
}

function parseDate(dateValue) {
    if (!dateValue) return undefined;

    let parsedDate;
    // XLSX.read tries to convert Excel numbers to JS Date objects automatically
    if (dateValue instanceof Date) {
        parsedDate = dateValue;
    } else if (typeof dateValue === 'number') {
        // Fallback for raw Excel numbers if not auto-converted (days since 1900-01-01)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel's epoch start
        parsedDate = new Date(excelEpoch.getTime() + (dateValue * 24 * 60 * 60 * 1000));
    } else {
        // Try parsing as string
        const dateStr = String(dateValue).trim();
        parsedDate = new Date(dateStr);
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    console.warn(`Warning: Could not parse date '${dateValue}'. Skipping date for this task.`);
    return undefined;
}

async function convertExcelToYaml(excelFilePath) {
    console.log(`Reading Excel file: ${excelFilePath}`);
    const workbook = XLSX.readFile(excelFilePath, { type: 'file' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get headers from the first row
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
    if (!headers) {
        console.warn(`No headers found in ${excelFilePath}. Skipping.`);
        return null;
    }

    const headerMap = findColumnMapping(headers);

    // Convert sheet to JSON, skipping the header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 }); // range: 1 skips first row
    if (!rawData || rawData.length === 0) {
        console.warn(`No data rows found in ${excelFilePath}. Skipping.`);
        return null;
    }

    const tasks = [];
    for (const row of rawData) {
        if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue; // Skip entirely empty rows
        }

        const task = {};
        let taskId = String(row[headers.indexOf(headerMap.id)]) || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        task.id = taskId.trim();

        task.title = String(row[headers.indexOf(headerMap.title)] || 'Untitled Task').trim();
        task.subject = String(row[headers.indexOf(headerMap.subject)] || 'General').trim();
        task.priority = String(row[headers.indexOf(headerMap.priority)] || 'Medium').trim();

        const date = parseDate(row[headers.indexOf(headerMap.date)]);
        if (date) task.date = date;

        let description = String(row[headers.indexOf(headerMap.description)] || '').trim();
        const paper = String(row[headers.indexOf(headerMap.paper)] || '').trim();
        if (paper) {
            description = `Paper: ${paper}\n\n${description}`;
        }
        if (description) {
            task.description = description;
        }

        const criteriaText = String(row[headers.indexOf(headerMap.acceptanceCriteria)] || '').trim();
        if (criteriaText) {
            const lines = criteriaText.split(/\r?\n/).filter(line => line.trim() !== '');
            const acceptanceCriteria = lines.map(line => ({ text: line.trim(), isCompleted: false }));
            if (acceptanceCriteria.length > 0) {
                task.acceptanceCriteria = acceptanceCriteria;
            }
        }

        tasks.push(task);
    }

    return tasks;
}

async function main() {
    if (!fs.existsSync(TASKS_DIR)) {
        console.error(`Error: Directory '${TASKS_DIR}' not found. Please create it.`);
        return;
    }

    const excelFiles = fs.readdirSync(TASKS_DIR).filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'));

    if (excelFiles.length === 0) {
        console.log(`No Excel files found in '${TASKS_DIR}'.`);
        return;
    }

    console.log(`Found ${excelFiles.length} Excel files in '${TASKS_DIR}'. Starting conversion...`);

    for (const excelFile of excelFiles) {
        const excelPath = path.join(TASKS_DIR, excelFile);
        const yamlFilename = path.parse(excelFile).name + '.yaml';
        const yamlPath = path.join(TASKS_DIR, yamlFilename);

        console.log(`Converting '${excelFile}' to '${yamlFilename}'...
`);
        try {
            const tasksData = await convertExcelToYaml(excelPath);
            if (tasksData && tasksData.length > 0) {
                fs.writeFileSync(yamlPath, dump(tasksData, { indent: 2, lineWidth: -1 }), 'utf-8');
                console.log(`Successfully converted '${excelFile}' to '${yamlFilename}'.`);
            } else {
                console.log(`No tasks data to write for '${excelFile}'. Skipping YAML creation.`);
            }
        } catch (error) {
            console.error(`Error converting '${excelFile}':`, error);
        }
    }

    console.log("\nConversion process complete.");
}

main();
