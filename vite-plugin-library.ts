import { Plugin } from 'vite';
import { readdir, stat } from 'fs/promises';
import { join, relative, sep } from 'path';

export function libraryPlugin(): Plugin {
    return {
        name: 'vite-plugin-library',
        configureServer(server) {
            server.middlewares.use('/api/library', async (req, res) => {
                try {
                    const libraryPath = join(process.cwd(), 'public', 'library');

                    // Recursive function to get all files
                    async function getFiles(dir: string): Promise<string[]> {
                        const dirents = await readdir(dir, { withFileTypes: true });
                        const files = await Promise.all(dirents.map((dirent) => {
                            const res = join(dir, dirent.name);
                            return dirent.isDirectory() ? getFiles(res) : res;
                        }));
                        return Array.prototype.concat(...files);
                    }

                    const allFiles = await getFiles(libraryPath);

                    // Filter only PDF files
                    const pdfFiles = allFiles.filter(file => file.toLowerCase().endsWith('.pdf'));

                    // Generate resource objects
                    const resources = pdfFiles.map((absolutePath, index) => {
                        const relativePath = relative(libraryPath, absolutePath);
                        const filename = relativePath.split(sep).pop() || '';

                        // Infer subject from folder structure
                        // e.g., "History/Ancient/file.pdf" -> Subject: "History"
                        // If root, fallback to filename inference
                        const pathParts = relativePath.split(sep);
                        let subject = 'UPSC Syllabus';

                        if (pathParts.length > 1) {
                            // Use the top-level folder as subject
                            const topFolder = pathParts[0];
                            if (topFolder.toLowerCase().includes('ethics')) subject = 'Ethics';
                            else if (topFolder.toLowerCase().includes('history')) subject = 'History';
                            else if (topFolder.toLowerCase().includes('polity')) subject = 'Polity';
                            else if (topFolder.toLowerCase().includes('economics')) subject = 'Economics';
                            else if (topFolder.toLowerCase().includes('geography')) subject = 'Geography';
                            else if (topFolder.toLowerCase().includes('csat')) subject = 'CSAT';
                            else if (topFolder.toLowerCase().includes('current')) subject = 'Current Affairs';
                            else subject = topFolder; // Use folder name directly if no match
                        } else {
                            // Fallback to filename inference (existing logic)
                            const lowerFilename = filename.toLowerCase();
                            if (lowerFilename.includes('gs iv') || lowerFilename.includes('gs-4') || lowerFilename.includes('ethics')) {
                                subject = 'Ethics';
                            } else if (lowerFilename.includes('gs i') || lowerFilename.includes('gs-1') || lowerFilename.includes('history')) {
                                subject = 'History';
                            } else if (lowerFilename.includes('gs ii') || lowerFilename.includes('gs-2') || lowerFilename.includes('polity')) {
                                subject = 'Polity';
                            } else if (lowerFilename.includes('gs iii') || lowerFilename.includes('gs-3') || lowerFilename.includes('economics')) {
                                subject = 'Economics';
                            } else if (lowerFilename.includes('geography')) {
                                subject = 'Geography';
                            } else if (lowerFilename.includes('csat')) {
                                subject = 'CSAT';
                            } else if (lowerFilename.includes('current affairs')) {
                                subject = 'Current Affairs';
                            }
                        }

                        // Clean up title
                        const title = filename
                            .replace('.pdf', '')
                            .replace(/-\d+\.pdf$/, '')
                            .replace(/_/g, ' ')
                            .replace(/-/g, ' ')
                            .trim();

                        // Use forward slashes for URL regardless of OS
                        const urlPath = relativePath.split(sep).join('/');

                        return {
                            id: `lib_auto_${index + 1}`,
                            title: title,
                            filename: filename, // Keep for reference
                            subject: subject,
                            description: `Auto-detected PDF: ${title}`,
                            path: urlPath // New field for tree structure
                        };
                    });

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(resources));
                } catch (error) {
                    console.error('Error reading library folder:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to read library folder' }));
                }
            });
        }
    };
}
