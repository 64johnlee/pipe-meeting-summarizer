import { NextResponse } from "next/server";
import { detectMeeting, generateMeetingSummary } from "@/lib/meeting";
import { pipe } from "@screenpipe/js";

// Simple in-memory state to track meeting start (resets on server restart)
// In production this would use screenpipe's storage
let meetingStartTime: string | null = null;

export async function GET() {
  try {
    const inMeeting = await detectMeeting();
    const now = new Date().toISOString();

    if (inMeeting && !meetingStartTime) {
      // Meeting just started
      meetingStartTime = now;
      console.log(`[meeting-summarizer] meeting started at ${meetingStartTime}`);
      return NextResponse.json({ ok: true, status: "meeting_started", startTime: meetingStartTime });
    }

    if (!inMeeting && meetingStartTime) {
      // Meeting just ended — generate summary
      const startTime = meetingStartTime;
      meetingStartTime = null;

      const durationMs = new Date(now).getTime() - new Date(startTime).getTime();
      const durationMin = durationMs / 60000;

      // Only summarize meetings longer than 3 minutes
      if (durationMin < 3) {
        console.log("[meeting-summarizer] meeting too short, skipping");
        return NextResponse.json({ ok: true, status: "too_short" });
      }

      console.log(`[meeting-summarizer] meeting ended, generating summary...`);
      const summary = await generateMeetingSummary(startTime, now);

      if (!summary) {
        return NextResponse.json({ ok: true, status: "no_transcript" });
      }

      // Notify via inbox
      await pipe.inbox.send({
        title: `📋 Meeting Notes: ${summary.title}`,
        body: `${summary.summary}\n\n✅ ${summary.actionItems.length} action items · 💡 ${summary.decisions.length} decisions`,
        actions: [{ label: "View Notes", action: "open" }],
      });

      return NextResponse.json({ ok: true, status: "summary_generated", summary });
    }

    return NextResponse.json({
      ok: true,
      status: inMeeting ? "in_meeting" : "no_meeting",
      meetingStartTime,
    });
  } catch (error) {
    console.error("[meeting-summarizer] cron error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
