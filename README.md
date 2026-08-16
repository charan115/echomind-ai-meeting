# EchoMind AI: Meeting Synthesis

Build a ultra-premium, full-stack AI Meeting Assistant & Transcript Summarization SaaS platform called "EchoMind AI" with a modern dark-mode aesthetic, floating 3D perspective titlecards, smooth spring animations, glassmorphism, and deep Supabase integration.

### UI / Theme Guidelines:

- Aesthetic: Deep obsidian dark mode (#090D16 base), translucent frosted glass cards with subtle glowing borders, interactive 3D titlecards with mouse-hover tilt effects (CSS 3D perspective transform).

- Typography & Polish: Modern sans-serif, ultra-crisp hierarchy, subtle gradient text accents (violet-to-cyan), smooth page transitions using framer-motion style physics.

### Core Features & Views:

1. 3D Animated Hero & Dashboard (`/`):

   - A floating 3D hero titlecard displaying "EchoMind AI: Intelligent Meeting Synthesis".

   - Quick stats: Total Meetings Analyzed, Pending Action Items, Key Decisions Extracted.

   - Recent Meetings gallery with 3D glass cards showing meeting title, date, duration, and key tags.

2. New Meeting Creation / Upload Studio (`/new`):

   - Option to paste a raw text transcript, upload an audio/video file, or simulate live mic transcription.

   - Interactive AI processing animation with step-by-step progress steps (Parsing audio -> Extracting key speakers -> Identifying decisions -> Drafting action items).

3. Meeting Deep-Dive Workspace (`/meeting/:id`):

   - A 3-column power layout:

     * Left Column (Transcript & Audio): Interactive audio wave player with synced transcript timestamps and speaker badges (e.g., "Speaker A (02:15)").

     * Middle Column (Notion AI Workspace): Formatted summary block, "Key Decisions" highlighted in visual glass cards, and a dynamic "Action Items Matrix" with assignees, priority tags (High/Medium/Low), status toggles (To Do/In Progress/Done), and due dates.

     * Right Column (ChatGPT Assistant Sidebar): Floating chat panel allowing users to ask natural language questions about the meeting (e.g., "What did Sarah say about the budget?").

4. Prompt Engineering & Evaluation Studio (`/evaluation`) - [For Project Defense/Viva]:

   - A dedicated tab showcasing the system prompt templates used for decision extraction and summarization.

   - Interactive sliders to test temperature, model latency visuals, and token count optimization metrics.

5. Export & Sync:

   - One-click buttons to export the summary as PDF, Markdown, or copy as Notion blocks.

### Database Architecture (Supabase):

Create and connect the following SQL tables in Supabase:

- `meetings`: id (uuid, primary key), user_id (uuid), title (text), date (timestamptz), duration (text), raw_transcript (text), summary (text), created_at (timestamptz).

- `decisions`: id (uuid, primary key), meeting_id (uuid, foreign key), decision_text (text), category (text), created_at (timestamptz).

- `action_items`: id (uuid, primary key), meeting_id (uuid, foreign key), task (text), assignee (text), priority (text), status (text), due_date (date).

- `chat_messages`: id (uuid, primary key), meeting_id (uuid, foreign key), sender (text), message (text), created_at (timestamptz).

Enable Row Level Security (RLS) policies so authenticated users can CRUD their own meeting data. Ensure mock data is seeded for demo purposes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d3a76ec7-7979-41ef-a149-294e3501eaf3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
