import { NextResponse } from "next/server";
import { generateMeetingSummary, fetchTranscript } from "@/lib/meeting";

export async function POST(request: Request) {
  try {
    const { startTime, endTime } = await request.json() as {
      startTime: string;
      endTime: string;
    };

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    const summary = await generateMeetingSummary(startTime, endTime);

    if (!summary) {
      return NextResponse.json(
        { error: "Not enough transcript data for this time range. Make sure screenpipe recorded audio during this period." },
        { status: 404 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[meeting-summarizer] summarize error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
