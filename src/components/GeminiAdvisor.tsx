import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Sparkles, MessageSquare, BookOpen, BrainCircuit, Loader2 } from 'lucide-react';
import { generateStudyInsights } from '../services/geminiService';
import { Subject } from '../types';

const GeminiAdvisor: React.FC = () => {
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const allLogs = tasks.flatMap(t => t.logs || []);

  const [activeTab, setActiveTab] = useState<'insights' | 'schedule'>('insights');
  const [selectedSubject, setSelectedSubject] = useState<Subject>(Subject.POLITY);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateInsight = async () => {
    setLoading(true);
    try {
      const result = await generateStudyInsights(tasks, allLogs);
      setInsight(result);
    } catch (error) {
      console.error("Gemini Error:", error);
      setInsight("Sorry, I couldn't generate insights right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    setLoading(true);
    try {
      // Placeholder for schedule generation logic
      // In a real app, this would call a different service function
      await new Promise(resolve => setTimeout(resolve, 2000));
      setInsight(`Here is a suggested schedule for ${selectedSubject}:\n\n- Monday: Read Chapter 1-2 (2 hours)\n- Tuesday: Revise notes (1 hour)\n- Wednesday: Practice questions (1.5 hours)`);
    } catch (error) {
      setInsight("Failed to generate schedule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 animate-fade-in h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Sparkles className="text-purple-600" /> AI Study Advisor
        </h1>
        <p className="text-gray-600 mt-2">Get personalized insights and study plans powered by Gemini.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Controls Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-bold text-gray-700 mb-4">What do you need?</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${activeTab === 'insights' ? 'bg-purple-50 text-purple-700 border border-purple-200 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BrainCircuit size={20} />
                Study Insights
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${activeTab === 'schedule' ? 'bg-purple-50 text-purple-700 border border-purple-200 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BookOpen size={20} />
                Plan Schedule
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-700 mb-4">Configuration</h3>

            {activeTab === 'insights' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-gray-600">
                  I will look at your <b>{tasks.length} tasks</b> and <b>{allLogs.length} time logs</b> to identify strengths and weaknesses.
                </p>
                <button
                  onClick={handleGenerateInsight}
                  disabled={loading}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Analyze Now
                </button>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4 animate-fade-in">
                <label className="block text-sm font-medium text-gray-700">Subject Focus</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                  className="w-full border-gray-300 border rounded-md p-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                >
                  {Object.values(Subject).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateSchedule}
                  disabled={loading}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Create Plan
                </button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-lg text-white shadow-lg">
            <h4 className="font-bold text-lg mb-2">Pro Tip</h4>
            <p className="text-indigo-100 text-sm opacity-90">
              Consistent revision beats marathon sessions. Use the AI advisor every Sunday to plan your week ahead.
            </p>
          </div>
        </div>

        {/* Output Area */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 min-h-[400px] flex flex-col relative">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-4">
            {activeTab === 'insights' ? 'Performance Analysis' : 'Suggested Schedule'}
          </h3>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p>Consulting the AI...</p>
            </div>
          ) : insight ? (
            <div className="prose prose-purple max-w-none text-gray-700 overflow-y-auto custom-scrollbar flex-1 whitespace-pre-wrap leading-relaxed">
              {insight}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
              <Sparkles size={48} className="mb-4 text-gray-200" />
              <p>Select an option on the left to generate content.</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            AI-generated content can be inaccurate. Use as a guide.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiAdvisor;