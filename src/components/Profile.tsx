import React, { useState } from 'react';
import { Subject, SubjectCategory, DiaryEntry } from '../types';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../constants';
import { Edit2, BookHeart, Send, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const Profile: React.FC = () => {
  // Fetch user profile from DB
  const userProfile = useLiveQuery(() => db.userProfile.get('Schamala'));

  // Fetch diary entries from DB
  const entries = useLiveQuery(() => db.diary.orderBy('date').reverse().toArray()) || [];

  const [newEntry, setNewEntry] = useState('');

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;
    const entry: DiaryEntry = {
      id: Date.now(),
      userId: 'Schamala',
      date: new Date().toISOString().split('T')[0],
      content: newEntry
    };
    await db.diary.add(entry);
    setNewEntry('');
  };

  const handleDeleteEntry = async (id: number) => {
    await db.diary.delete(id);
  };

  if (!userProfile) return <div>Loading profile...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in overflow-y-auto h-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

        <div className="px-4 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row items-end -mt-12 mb-8">
            <img
              src={userProfile.avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-200 object-cover"
            />
            <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{userProfile.name}</h1>
                  <p className="text-gray-500">UPSC Aspirant • Target {userProfile.targetYear}</p>
                </div>
                <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto">
                  <Edit2 size={16} className="mr-2" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Space Section - Replaces Metrics */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BookHeart className="text-pink-600" size={24} />
              <h3 className="text-xl font-bold text-gray-800">Space</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">Reflect on your journey, write down your thoughts, or note what you're grateful for.</p>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
              <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 mb-3"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddEntry}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Send size={16} />
                  Save Entry
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-center text-gray-400 italic py-8">No entries yet. Start writing your journey!</p>
              ) : (
                entries.map(entry => (
                  <div key={entry.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{entry.date}</span>
                      </div>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{entry.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Focus Areas</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(SubjectCategory).map((category) => {
                  // Exclude general/meta categories from "Focus Areas"
                  if (category === SubjectCategory.GENERAL || category === SubjectCategory.UPSC_SYLLABUS || category === SubjectCategory.ESSAY) {
                    return null;
                  }
                  const colors = CATEGORY_COLORS[category];
                  return (
                    <span
                      key={category}
                      className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm ${colors.background} ${colors.text}`}
                    >
                      {category}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">About Me</h3>
              <p className="text-gray-600 leading-relaxed text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
                Dedicated aspirant aiming for CSE {userProfile.targetYear}. Currently focusing on Mains answer writing and optional subject mastery.
                Background in Engineering.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;