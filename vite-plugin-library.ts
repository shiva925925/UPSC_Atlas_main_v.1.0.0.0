import { Plugin } from 'vite';
import { readdir } from 'fs/promises';
import { join } from 'path';

export function libraryPlugin(): Plugin {
    return {
        name: 'vite-plugin-library',
        configureServer(server) {
            server.middlewares.use('/api/library', async (req, res) => {
                try {
                    const libraryPath = join(process.cwd(), 'public', 'library');
                    const files = await readdir(libraryPath);

                    // Filter only PDF files
                    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

                    // Generate resource objects
                    const resources = pdfFiles.map((filename, index) => {
                        // Try to extract subject from filename
                        let subject = 'UPSC Syllabus';
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

                        // Clean up title (remove .pdf and numbers/dashes)
                        const title = filename
                            .replace('.pdf', '')
                            .replace(/-\d+\.pdf$/, '') // Remove trailing -1, -2, etc.
                            .replace(/_/g, ' ')
                            .replace(/-/g, ' ')
                            .trim();

                        return {
                            id: `lib_auto_${index + 1}`,
                            title: title,
                            filename: filename,
                            subject: subject,
                            description: `Auto-detected PDF: ${title}`
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
