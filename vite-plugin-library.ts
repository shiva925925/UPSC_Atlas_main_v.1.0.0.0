import { Plugin } from 'vite';

/**
 * Redundant Vite plugin logic removed.
 * Library scanning and task listing are now handled by the main Express server (server/server.js)
 * to ensure consistency and cross-device synchronization through the Master Cache.
 */
export function libraryPlugin(): Plugin {
    return {
        name: 'vite-plugin-library',
        configureServer(server) {
            // Endpoints moved to server.js
        }
    };
}
