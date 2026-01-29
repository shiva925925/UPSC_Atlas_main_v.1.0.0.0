# UPSC Atlas: User Manual

Welcome to **UPSC Atlas**, your professional dashboard for navigating the UPSC syllabus and tracking your study progress with high-speed synchronization and advanced knowledge-linking features.

## 1. Getting Started
UPSC Atlas is a "Local-First" application. This means:
*   **Speed**: Data is served from your local browser database (IndexedDB) for instant access.
*   **Security**: Your study logs and progress are saved in the `Data/` folder in your project directory.
*   **AI Access**: To use the Study Advisor, ensure your `GEMINI_API_KEY` is configured in the `.env` file.

## 2. Focus Mode (Default View)
To maximize productivity, UPSC Atlas starts in **Focus Mode** by default:
*   **Default View**: Land directly in the Tasks view.
*   **Collapsed Sidebar**: Navigation is minimized to icons to save horizontal space. Click the blue chevron to expand.
*   **Minimized Overview**: Subject statistics are hidden to clear the vertical space. Toggle using the "Syllabus Overview" header.
*   **Auto-Filter**: Shows your **In-Progress** tasks immediately upon launch.

## 3. The Task System
The heart of UPSC Atlas is the Task System, which breaks down the mammoth UPSC syllabus into manageable objectives.

### Types of Tasks
1.  **Immoveable Syllabus (YAML)**: These are the core topics imported from your `Data/Tasks` folder. These are your "Master Topics."
2.  **User-Created Tasks**: Tasks you create manually using the "Create Task" button. These are stored in `user_tasks.json`.

### Managing Progress
*   **Status**: Change status between `TODO`, `IN_PROGRESS`, and `DONE`.
*   **Acceptance Criteria**: Each task has a checklist. Marking criteria as complete increases the task's visual progress bar.
*   **Description**: Use the "Story" or "Notes" section to capture your summary of the topic.

## 3. Knowledge Graph Features
UPSC topics are rarely isolated. Atlas allows you to build a "Knowledge Graph" of connections.

### Linked Topics
In the **Task Detail Panel**, use the **"Linked Topics"** section to connect related tasks.
*   **Bi-directional**: If you link "Fiscal Deficit" to "Economy Governance," both tasks will automatically show a link to each other.
*   **Context**: Clicking a linked topic instantly redirects you to that task's details.

### "Promote to Task" (Expansion)
If an Acceptance Criterion turns out to be a major topic on its own:
1.  Click the **Promote (Arrow Up)** icon next to the criterion.
2.  A new standalone task will be created with that title.
3.  The new task will be automatically linked to the "Parent" for traceability.

## 4. Study Library
The Library view provides a hierarchical tree of the entire syllabus.
*   **PDF Detection**: Any PDF placed in `public/library/` is automatically detected and categorized.
*   **Syllabus Tree**: Navigate through GS1, GS2, GS3, and GS4 with ease.

## 5. Synchronization & Data Integrity
UPSC Atlas uses a decoupled sync architecture to prevent data loss.

### Library vs. Progress
*   **Static Library**: Topics loaded from your YAML files.
*   **Dynamic Progress**: Your personal status, notes, and links.
*   **Merge Logic**: The app automatically prioritizing your edits over the static files.

### Manual Rescan
If you add new YAML files to the `Data/Tasks` directory, click the **"Sync" (Refresh Icon)** in the Tasks View header to trigger a memory reload on the server.

## 6. AI Study Advisor
Click the **Advisor** tab to chat with Gemini.
*   **Context-Aware**: The AI knows your syllabus and current progress.
*   **Planning**: Ask "What should I focus on next?" or "Give me a 7-day plan for GS3 Environment."

---
*Developed for Advanced UPSC Aspirants.*
