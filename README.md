# meeting-summarizer

> Granola-inspired AI meeting assistant — live transcript, structured notes, action items and decisions from your screenpipe audio.

## What it does

Meeting Summarizer turns your screenpipe audio recordings into structured meeting notes automatically — no manual effort required.

**Features:**
- 📋 **AI-generated notes** — title, executive summary, key points, decisions
- ✅ **Action items** — extracted with owners and due dates
- 🎙️ **Live transcript** — full timestamped transcript with speaker detection
- 😊 **Sentiment analysis** — detects meeting tone (positive/neutral/mixed/tense)
- 👥 **Attendee detection** — extracts participant names from audio
- ⚡ **Auto mode** — detects Zoom/Teams/Meet sessions every 10 min, auto-summarizes when meeting ends
- 🕐 **Manual mode** — pick any time range and generate notes on demand

## Setup

1. Install the pipe in screenpipe
2. Make sure **audio recording** is enabled in screenpipe settings
3. Add your OpenAI API key in screenpipe settings
4. Open the UI after your next meeting and click **Generate Meeting Notes**

## How it works

1. screenpipe continuously records your microphone and system audio
2. The pipe detects active meetings by watching for Zoom/Teams/Meet/etc. in your screen
3. When a meeting ends, it fetches the audio transcript from screenpipe's database
4. An AI model (GPT-4o-mini by default) analyzes the transcript and generates structured notes
5. Notes are sent to your screenpipe inbox and displayed in the UI

## Supported meeting apps

Zoom, Microsoft Teams, Google Meet, Webex, Slack huddles, Discord, Skype, Whereby, Around, and any app with "meeting", "call", or "standup" in the window title.

## Tech

- Next.js 14 (App Router)
- `@screenpipe/js` SDK for audio transcript queries
- Vercel AI SDK (`generateObject`) with Zod schema validation
- Tailwind CSS

## Development

```bash
bun install
bun dev
```

Open http://localhost:3003
