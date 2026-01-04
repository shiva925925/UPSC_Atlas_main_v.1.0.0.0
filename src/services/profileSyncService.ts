import { db } from '../db';
import { UserProfile, DiaryEntry } from '../types';

const PROFILE_API = '/api/profile';
const DIARY_API = '/api/diary';

// --- Profile Sync ---

export async function syncProfile() {
    console.log('%c[Profile Sync] Synchronizing profile...', 'color: teal;');
    try {
        const response = await fetch(PROFILE_API);
        if (response.ok) {
            const serverProfile: UserProfile = await response.json();
            if (serverProfile && serverProfile.id) {
                // Update local DB with server data (Server is source of truth for persistent profile)
                await db.userProfile.put(serverProfile);
                console.log('%c[Profile Sync] Profile synced from server.', 'color: teal;');
                return serverProfile;
            }
        } else if (response.status === 404) {
            console.warn('[Profile Sync] No profile found on server.');
        } else {
            console.error('[Profile Sync] Failed to fetch profile:', response.statusText);
        }
    } catch (error) {
        console.error('[Profile Sync] Error fetching profile:', error);
    }
}

export async function saveUserProfile(profile: UserProfile) {
    console.log('%c[Profile Sync] Saving profile...', 'color: teal;');

    // 1. Save to Local DB first (optimistic UI)
    await db.userProfile.put(profile);

    // 2. Send to Server
    try {
        const response = await fetch(PROFILE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status} ${response.statusText}`);
        }
        console.log('%c[Profile Sync] Profile saved to server.', 'color: teal;');
    } catch (error) {
        console.error('[Profile Sync] Error saving profile to server:', error);
        // Optionally notify user or retry
        throw error;
    }
}

// --- Diary Sync ---

export async function syncDiary() {
    console.log('%c[Diary Sync] Synchronizing diary entries...', 'color: teal;');
    try {
        const response = await fetch(DIARY_API);
        if (response.ok) {
            const serverEntries: DiaryEntry[] = await response.json();

            // Sync logic: Server overwrites local for simplicity/consistency in this "backup" model
            // Clear local diary and repopulate? Or merge?
            // Safer to merge "new" ones or strictly mirror server. 
            // Let's mirror server to ensure what's on disk is what's shown, but be careful not to wipe unsynced local changes if offline.
            // For this phase, "Server is Truth".

            if (Array.isArray(serverEntries)) {
                await db.diary.clear(); // Clear local cache to ensure exact mirror (prevents zombies)
                await db.diary.bulkAdd(serverEntries);
                console.log(`%c[Diary Sync] Synced ${serverEntries.length} entries.`, 'color: teal;');
            }
        } else {
            console.error('[Diary Sync] Failed to fetch diary:', response.statusText);
        }
    } catch (error) {
        console.error('[Diary Sync] Error fetching diary:', error);
    }
}

export async function addDiaryEntry(entry: DiaryEntry) {
    // 1. Save Local
    await db.diary.add(entry);

    // 2. Save Server
    try {
        const response = await fetch(DIARY_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        if (!response.ok) throw new Error('Failed to save to server');
    } catch (error) {
        console.error('Failed to sync diary entry to server:', error);
        // Queue for retry? For now, we just log.
    }
}

export async function deleteDiaryEntry(id: number) {
    // 1. Delete Local
    await db.diary.delete(id);

    // 2. Delete Server
    try {
        const response = await fetch(`${DIARY_API}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete on server');
    } catch (error) {
        console.error('Failed to delete diary entry on server:', error);
    }
}
