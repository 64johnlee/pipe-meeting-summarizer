import { pipe } from "@screenpipe/js";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// Meeting detection keywords — apps and window titles that indicate a meeting
const MEETING_APPS = ["zoom", "teams", "meet", "webex", "slack", "discord", "skype", "whereby", "around"];
const MEETING_WINDOWS = ["meeting", "call", "zoom", "teams", "meet", "webex", "standup", "sync", "interview", "1:1", "one on one"];

export const ActionItemSchema = z.object({
  task: z.string().describe("What needs to be done"),
  owner: z.string().describe("Who is responsible (use 'Me' if unclear)"),
  dueDate: z.string().optional().describe("Due date if mentioned"),
});

export const MeetingSummarySchema = z.object({
  title: z.string().describe("Short meeting title based on context"),
  attendees: z.array(z.string()).describe("Names of people mentioned or heard"),
  summary: z.string().describe("2-3 sentence executive summary"),
  keyPoints: z.array(z.string()).max(6).describe("Main discussion points"),
  decisions: z.array(z.string()).max(5).describe("Decisions made during the meeting"),
  actionItems: z.array(ActionItemSchema).max(8).describe("Action items with owners"),
  sentiment: z.enum(["positive", "neutral", "mixed", "tense"]).describe("Overall meeting tone"),
  duration: z.number().describe("Estimated duration in minutes"),
  nextMeeting: z.string().optional().describe("Next meeting mentioned if any"),
});

export type MeetingSummary = z.infer<typeof MeetingSummarySchema> & {
  id: string;
  startTime: string;
  endTime: string;
  generatedAt: string;
  rawTranscript: string;
};

export type TranscriptSegment = {
  timestamp: string;
  speaker?: string;
  text: string;
};

// Check if user is currently in a meeting
export async function detectMeeting(): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const screenData = await pipe.queryScreenpipe({
    startTime: oneMinuteAgo,
    endTime: new Date().toISOString(),
    limit: 20,
    contentType: "ocr",
  });

  if (!screenData?.data?.length) return false;

  for (const item of screenData.data) {
    if (item.type !== "OCR") continue;
    const appName = (item.content.appName ?? "").toLowerCase();
    const windowName = (item.content.windowName ?? "").toLowerCase();

    if (MEETING_APPS.some((app) => appName.includes(app))) return true;
    if (MEETING_WINDOWS.some((kw) => windowName.includes(kw))) return true;
  }

  return false;
}

// Fetch transcript for a time range
export async function fetchTranscript(
  startTime: string,
  endTime: string
): Promise<TranscriptSegment[]> {
  const audioData = await pipe.queryScreenpipe({
    startTime,
    endTime,
    limit: 500,
    contentType: "audio",
  });

  if (!audioData?.data?.length) return [];

  return audioData.data
    .filter((item): item is typeof item & { type: "Audio" } => item.type === "Audio")
    .filter((item) => item.content.transcription?.trim())
    .map((item) => ({
      timestamp: item.content.timestamp,
      speaker: item.content.speaker ?? undefined,
      text: item.content.transcription!.trim(),
    }));
}

// Generate full meeting summary from transcript
export async function generateMeetingSummary(
  startTime: string,
  endTime: string
): Promise<MeetingSummary | null> {
  const segments = await fetchTranscript(startTime, endTime);

  if (segments.length < 3) return null; // Not enough transcript to summarize

  const rawTranscript = segments
    .map((s) => `[${new Date(s.timestamp).toLocaleTimeString()}]${s.speaker ? ` ${s.speaker}:` : ""} ${s.text}`)
    .join("\n");

  const settings = await pipe.settings.getAll();
  const aiModel = settings?.aiModel ?? "gpt-4o-mini";
  const openaiKey = settings?.openaiApiKey ?? process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Error("No OpenAI API key. Please add it in screenpipe settings.");
  }

  const openai = createOpenAI({ apiKey: openaiKey });

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  const { object } = await generateObject({
    model: openai(aiModel),
    schema: MeetingSummarySchema,
    prompt: `You are an expert meeting assistant. Analyze this meeting transcript and generate comprehensive, structured notes.

Meeting date: ${startDate.toLocaleDateString()}
Start time: ${startDate.toLocaleTimeString()}
Approx duration: ${durationMinutes} minutes

Transcript:
${rawTranscript.slice(0, 10000)}

Generate detailed, actionable meeting notes. Be specific about decisions and action items. Extract real names from the transcript.`,
  });

  return {
    ...object,
    id: `meeting-${Date.now()}`,
    startTime,
    endTime,
    generatedAt: new Date().toISOString(),
    rawTranscript,
  };
}
