"use client";

import { useState } from "react";
import {
  Mic, Loader2, FileText, CheckSquare, Lightbulb,
  Users, Clock, TrendingUp, AlertCircle
} from "lucide-react";
import type { MeetingSummary, TranscriptSegment } from "@/lib/meeting";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-green-400 bg-green-900/20 border-green-800",
  neutral: "text-gray-400 bg-gray-800/50 border-gray-700",
  mixed: "text-yellow-400 bg-yellow-900/20 border-yellow-800",
  tense: "text-red-400 bg-red-900/20 border-red-800",
};

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  mixed: "🤔",
  tense: "😬",
};

export default function Home() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [startTime, setStartTime] = useState(
    oneHourAgo.toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(now.toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "transcript">("notes");

  async function loadTranscript() {
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });
      const data = await res.json() as { segments: TranscriptSegment[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setTranscript(data.segments);
    } catch (e) {
      console.error("Transcript load error:", e);
    }
  }

  async function summarize() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const [summaryRes] = await Promise.all([
        fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
          }),
        }),
        loadTranscript(),
      ]);

      const data = await summaryRes.json() as MeetingSummary & { error?: string };
      if (!summaryRes.ok) throw new Error(data.error ?? "Summarization failed");
      setSummary(data);
      setActiveTab("notes");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Meeting Summarizer</h1>
            <p className="text-gray-400 text-sm">AI meeting notes from your audio — inspired by Granola</p>
          </div>
        </div>

        {/* Time range picker */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-300 mb-3">Meeting time range</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <button
            onClick={summarize}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating notes…</>
              : <><FileText className="w-4 h-4" /> Generate Meeting Notes</>
            }
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex gap-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Results */}
        {(summary || transcript.length > 0) && (
          <>
            {/* Tabs */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
              {(["notes", "transcript"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "notes" ? "📋 Notes" : `🎙️ Transcript (${transcript.length})`}
                </button>
              ))}
            </div>

            {/* Notes tab */}
            {activeTab === "notes" && summary && (
              <div className="space-y-4">
                {/* Header card */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h2 className="text-lg font-bold text-white">{summary.title}</h2>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {summary.duration} min</span>
                    {summary.attendees.length > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {summary.attendees.join(", ")}</span>
                    )}
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${SENTIMENT_COLORS[summary.sentiment]}`}>
                      {SENTIMENT_EMOJI[summary.sentiment]} {summary.sentiment}
                    </span>
                  </div>
                  <p className="mt-3 text-gray-300 text-sm leading-relaxed">{summary.summary}</p>
                  {summary.nextMeeting && (
                    <p className="mt-2 text-xs text-violet-400">📅 Next meeting: {summary.nextMeeting}</p>
                  )}
                </div>

                {/* Key points */}
                {summary.keyPoints.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                      <span className="font-medium text-sm">Key Points</span>
                    </div>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-300">
                          <span className="text-violet-400 mt-0.5 shrink-0">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {summary.decisions.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium text-sm">Decisions Made</span>
                    </div>
                    <ul className="space-y-2">
                      {summary.decisions.map((decision, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-300">
                          <span className="text-yellow-400 mt-0.5 shrink-0">✓</span>
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action items */}
                {summary.actionItems.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="w-4 h-4 text-green-400" />
                      <span className="font-medium text-sm">Action Items</span>
                      <span className="ml-auto text-xs text-gray-500">{summary.actionItems.length} items</span>
                    </div>
                    <ul className="space-y-3">
                      {summary.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded border border-gray-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-200">{item.task}</p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-xs text-violet-400">@{item.owner}</span>
                              {item.dueDate && (
                                <span className="text-xs text-gray-500">· {item.dueDate}</span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Transcript tab */}
            {activeTab === "transcript" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                {transcript.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No transcript available for this time range.</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {transcript.map((seg, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-xs text-gray-600 shrink-0 mt-0.5 w-16">
                          {new Date(seg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div>
                          {seg.speaker && (
                            <span className="text-xs font-medium text-violet-400 block mb-0.5">{seg.speaker}</span>
                          )}
                          <p className="text-sm text-gray-300">{seg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-600 text-center">
          Auto-detects meetings every 10 min · Requires screenpipe audio recording enabled
        </p>
      </div>
    </main>
  );
}
