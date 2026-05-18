import { NextResponse } from "next/server";
import { fetchTranscript } from "@/lib/meeting";

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

    const segments = await fetchTranscript(startTime, endTime);
    return NextResponse.json({ segments });
  } catch (error) {
    console.error("[meeting-summarizer] transcript error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
