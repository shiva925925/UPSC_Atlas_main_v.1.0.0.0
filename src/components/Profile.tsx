import React, { useState } from 'react';
import { Subject, SubjectCategory, DiaryEntry, UserProfile } from '../types';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../constants';
import { Edit2, BookHeart, Send, Trash2, Sun, Moon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import GlassCard from './ui/GlassCard';
import { useTheme } from '../contexts/ThemeContext';

import { syncProfile, saveUserProfile, syncDiary, addDiaryEntry, deleteDiaryEntry } from '../services/profileSyncService';

import EditProfileModal from './profile/EditProfileModal';
import BackgroundGradient from './ui/BackgroundGradient';
import Skeleton from './ui/Skeleton';

const Profile: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  // Fetch user profile from DB
  const userProfile = useLiveQuery(() => db.userProfile.get('Schamala'));

  // Fetch diary entries from DB
  const entries = useLiveQuery(() => db.diary.orderBy('date').reverse().toArray()) || [];

  const [newEntry, setNewEntry] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Initial Sync
  React.useEffect(() => {
    syncProfile();
    syncDiary();
  }, []);

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;
    const entry: DiaryEntry = {
      id: Date.now(),
      userId: 'Schamala',
      date: new Date().toISOString().split('T')[0],
      content: newEntry
    };
    await addDiaryEntry(entry); // Use Service
    setNewEntry('');
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteDiaryEntry(id); // Use Service
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    await saveUserProfile(updated);
  };

  if (!userProfile) {
    return (
      <div className="p-4 md:p-8 h-full flex flex-col gap-6 animate-pulse bg-app-bg">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="relative px-6">
          <div className="-mt-16 mb-4 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <Skeleton className="w-32 h-32 rounded-full border-4 border-card-border" />
            <div className="flex-1 pb-2">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in overflow-y-auto h-full bg-app-bg transition-colors duration-300">
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        userProfile={userProfile}
        onSave={handleSaveProfile}
      />

      <GlassCard variant="blur" className="overflow-hidden mb-8 border-card-border shadow-2xl">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-blue-600/60 to-indigo-700/60 backdrop-blur-md"></div>

        <div className="px-4 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row items-end -mt-12 mb-8">
            <img
              src={userProfile.avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-card-border shadow-md bg-white/5 object-cover backdrop-blur-sm"
            />
            <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-text-main">{userProfile.name}</h1>
                  <p className="text-text-muted">UPSC Aspirant • Target {userProfile.targetYear}</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md border border-card-border text-text-main bg-card-bg/50 hover:bg-card-bg transition-colors backdrop-blur-md"
                    title="Toggle Theme"
                  >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  </button>
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className="flex items-center justify-center px-4 py-2 border border-card-border rounded-md text-sm font-bold text-text-main bg-card-bg/30 hover:bg-card-bg/60 transition-all w-full sm:w-auto backdrop-blur-md active:scale-95"
                  >
                    <Edit2 size={16} className="mr-2" />
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Space Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BookHeart className="text-blue-500" size={24} />
              <h3 className="text-xl font-bold text-text-main">Aspirant's Space</h3>
            </div>
            <p className="text-text-muted text-sm mb-4">Reflect on your journey, write down your thoughts, or note what you're grateful for.</p>

            <div className="bg-card-bg/20 rounded-lg p-4 border border-card-border mb-6">
              <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full bg-card-bg/30 border border-card-border rounded-md p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none h-24 mb-3 text-text-main placeholder-text-muted/50"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddEntry}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 shadow-blue-500/20"
                >
                  <Send size={16} />
                  Save Entry
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-center text-text-muted italic py-8 border border-dashed border-card-border rounded-lg bg-white/5">No entries yet. Start writing your journey!</p>
              ) : (
                entries.map(entry => (
                  <GlassCard key={entry.id} variant="opaque" className="p-4 shadow-sm hover:shadow-md transition-all group relative border-card-border hover:translate-x-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-text-muted bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-widest border border-card-border">{entry.date}</span>
                      </div>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-text-main leading-relaxed whitespace-pre-wrap text-sm">{entry.content}</p>
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-card-border">
            <div>
              <h3 className="text-lg font-bold text-text-main mb-4">Focus Areas</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(SubjectCategory).map((category) => {
                  if (category === SubjectCategory.GENERAL) return null;
                  const colors = CATEGORY_COLORS[category];
                  return (
                    <span
                      key={category}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${colors.background} ${colors.text} border border-card-border/20`}
                    >
                      {category}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-text-main mb-4">About Me</h3>
              <div className="text-text-muted leading-relaxed text-sm bg-card-bg/20 p-4 rounded-lg border border-card-border italic">
                "Dedicated aspirant aiming for CSE {userProfile.targetYear}. Currently focusing on Mains answer writing and optional subject mastery."
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Profile;