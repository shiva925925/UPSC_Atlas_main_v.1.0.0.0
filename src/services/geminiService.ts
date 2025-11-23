import { GoogleGenAI } from "@google/genai";
import { Task, TimeLog, Achievement, Subject } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
};

export const generateStudyInsights = async (
  tasks: Task[],
  logs: TimeLog[]
): Promise<string> => {
  const ai = getClient();

  // Aggregate data for the prompt
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const pendingTasks = tasks.filter(t => t.status !== 'DONE').length;
  const totalMinutes = logs.reduce((acc, log) => acc + log.durationMinutes, 0);
  
  const subjectBreakdown = logs.reduce((acc, log) => {
    acc[log.subject] = (acc[log.subject] || 0) + log.durationMinutes;
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    You are an expert UPSC Exam Coach. Analyze the following student data for the last few days:
    - Completed Tasks: ${completedTasks}
    - Pending Tasks: ${pendingTasks}
    - Total Study Time: ${totalMinutes} minutes
    - Subject Breakdown (minutes): ${JSON.stringify(subjectBreakdown)}
    
    Provide a concise, motivating summary of their progress. 
    Point out 1 strength and 1 area for improvement. 
    Suggest a focus area for tomorrow based on what seems neglected (Assume a balanced diet of History, Polity, Geography, Economics, Ethics, CSAT, Current Affairs).
    Keep it professional but encouraging, like a Jira dashboard update.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to your AI Coach. Please check your API key.";
  }
};

export const suggestSchedule = async (
  focusSubject: Subject
): Promise<string> => {
  const ai = getClient();
  const prompt = `
    Create a detailed 1-day study schedule focusing on ${focusSubject} for a UPSC aspirant.
    Format the response as a simple list of time blocks (e.g., "08:00 AM - 10:00 AM: Topic").
    Include breaks. Keep it realistic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No schedule generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating schedule.";
  }
};