import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askMeeting } from "@/lib/ai.functions";
import {
  actionItemsQuery,
  chatQuery,
  decisionsQuery,
  meetingQuery,
  parseTranscript,
  type ActionItem,
} from "@/lib/meetings";
import { TiltCard } from "@/components/TiltCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Gavel,
  Loader2,
  Pause,
  Play,
  Send,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/meeting/$id")({
  head: () => ({
    meta: [
      { title: "Meeting Workspace — EchoMind AI" },
      {
        name: "description",
        content:
          "Transcript, decisions, action item matrix and an AI assistant for a single meeting, side by side.",
      },
      { property: "og:title", content: "Meeting Workspace — EchoMind AI" },
      {
        property: "og:description",
        content: "Synced transcript, key decisions, action items and meeting Q&A in one workspace.",
      },
    ],
  }),
  component: MeetingWorkspace,
});

const PRIORITY_TONE: Record<string, string> = {
  High: "border-destructive/50 bg-destructive/15 text-destructive",
  Medium: "border-primary/50 bg-primary/15 text-primary",
  Low: "border-accent/50 bg-accent/15 text-accent",
};

function MeetingWorkspace() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const meeting = useQuery(meetingQuery(id));
  const decisions = useQuery(decisionsQuery(id));
  const actions = useQuery(actionItemsQuery(id));
  const chat = useQuery(chatQuery(id));
  const ask = useServerFn(askMeeting);

  const lines = useMemo(() => parseTranscript(meeting.data?.raw_transcript ?? null), [meeting.data]);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [question, setQuestion] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing || lines.length === 0) return;
    const t = setInterval(() => {
      setCursor((c) => {
        if (c >= lines.length - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 2200);
    return () => clearInterval(t);
  }, [playing, lines.length]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.data?.length]);

  // --- OPTIMISTIC UI UPDATE HANDLER ---
  const handleItemUpdate = async (item: ActionItem, patch: Partial<ActionItem>) => {
    // 1. Instantly update UI locally (Optimistic Update)
    qc.setQueryData(["action_items", id], (old: ActionItem[] | undefined) => {
      if (!old) return [];
      return old.map((act) => (act.id === item.id ? { ...act, ...patch } : act));
    });

    // 2. Persist change to Supabase
    const { error } = await supabase
      .from("action_items")
      .update(patch)
      .eq("id", item.id);

    if (error) {
      console.error("Supabase error:", error.message);
      toast.error("Failed to update database: " + error.message);
      // Revert if error
      qc.invalidateQueries({ queryKey: ["action_items", id] });
    } else {
      toast.success("Action item updated!");
    }
  };
  // ------------------------------------

  const sendQuestion = useMutation({
    mutationFn: async (text: string) => {
      await supabase.from("chat_messages").insert({ meeting_id: id, sender: "user", message: text });
      await qc.invalidateQueries({ queryKey: ["chat_messages", id] });
      const res = await ask({
        data: {
          question: text,
          transcript: meeting.data?.raw_transcript ?? "",
          summary: meeting.data?.summary ?? "",
        },
      });
      await supabase
        .from("chat_messages")
        .insert({ meeting_id: id, sender: "assistant", message: res.answer });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat_messages", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const exportMarkdown = () => {
    const md = buildMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.data?.title ?? "meeting"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown exported");
  };

  const buildMarkdown = () => {
    const m = meeting.data;
    return [
      `# ${m?.title ?? "Meeting"}`,
      "",
      m?.summary ?? "",
      "",
      "## Key Decisions",
      ...(decisions.data ?? []).map((d) => `- **${d.category ?? "Decision"}** — ${d.decision_text}`),
      "",
      "## Action Items",
      ...(actions.data ?? []).map(
        (a) => `- [${a.status === "Done" ? "x" : " "}] ${a.task} — ${a.assignee ?? "Unassigned"} (${a.priority}, due ${a.due_date ?? "n/a"})`,
      ),
    ].join("\n");
  };

  const copyNotion = async () => {
    await navigator.clipboard.writeText(buildMarkdown());
    toast.success("Copied as Notion-ready blocks");
  };

  if (meeting.isLoading) {
    return (
      <div className="mx-auto max-w-[1500px] px-5 py-12">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!meeting.data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-2xl font-semibold">Meeting not found</h1>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const m = meeting.data;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <div className="animate-rise mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{m.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(m.date).toLocaleString()} · {m.duration ?? "—"} ·{" "}
            {(m.tags ?? []).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="mr-2 size-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <Download className="mr-2 size-4" /> Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={copyNotion}>
            <Copy className="mr-2 size-4" /> Notion blocks
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.25fr_0.85fr]">
        {/* Transcript */}
        <TiltCard intensity={3} className="flex max-h-[76vh] flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Transcript
            </h2>
            <Button size="icon" variant="secondary" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
          </div>

          <div className="mt-4 flex h-14 items-end gap-[3px] overflow-hidden rounded-xl bg-background/40 px-3 py-2">
            {Array.from({ length: 64 }).map((_, i) => {
              const active = lines.length ? i / 64 <= cursor / Math.max(1, lines.length - 1) : false;
              const h = 18 + Math.abs(Math.sin(i * 1.7)) * 70;
              return (
                <span
                  key={i}
                  className={`w-full rounded-full transition-colors duration-300 ${active ? "bg-primary" : "bg-secondary"}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>

          <div className="mt-4 space-y-3 overflow-y-auto pr-1">
            {lines.map((l, i) => {
              const speakers = Array.from(new Set(lines.map((x) => x.speaker)));
              const idx = speakers.indexOf(l.speaker);
              const tone = [
                "bg-primary/15 text-primary",
                "bg-accent/15 text-accent",
                "bg-secondary text-foreground",
                "bg-destructive/15 text-destructive",
              ][idx % 4];
              const initials = l.speaker
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <button key={i} onClick={() => setCursor(i)} className="flex w-full gap-2.5 text-left">
                  <span className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${tone}`}>
                    {initials}
                  </span>
                  <span
                    className={`flex-1 rounded-2xl rounded-tl-sm border p-3 transition-colors ${
                      i === cursor
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/50 bg-background/40 hover:bg-secondary/40"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[11px] font-medium">
                      <span className="text-foreground/80">{l.speaker}</span>
                      <span className="font-mono text-muted-foreground">{l.time}</span>
                    </span>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{l.text}</p>
                  </span>
                </button>
              );
            })}
            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground">No transcript captured for this meeting.</p>
            )}
          </div>
        </TiltCard>

        {/* Workspace */}
        <div className="space-y-5">
          <TiltCard intensity={3} className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="size-4 text-primary" /> Summary
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">
              {m.summary ?? "No summary generated yet."}
            </p>
          </TiltCard>

          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <Gavel className="size-4 text-accent" /> Key decisions
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(decisions.data ?? []).map((d) => (
                <TiltCard key={d.id} intensity={7} glow="cyan" className="p-4">
                  <Badge variant="outline" className="border-accent/40 text-accent">
                    {d.category ?? "Decision"}
                  </Badge>
                  <p className="mt-2.5 text-sm leading-relaxed">{d.decision_text}</p>
                </TiltCard>
              ))}
              {decisions.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">No decisions extracted.</p>
              )}
            </div>
          </div>

          <TiltCard intensity={3} className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Action items matrix
            </h2>
            <div className="mt-4 space-y-3">
              {(actions.data ?? []).map((a) => (
                <div
                  key={a.id}
                  className="grid gap-3 rounded-xl border border-border/60 bg-background/40 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                >
                  <div>
                    <p className={`text-sm ${a.status === "Done" ? "text-muted-foreground line-through" : ""}`}>
                      {a.task}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.assignee ?? "Unassigned"} · due {a.due_date ?? "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className={PRIORITY_TONE[a.priority] ?? ""}>
                    {a.priority}
                  </Badge>
                  <Select
                    value={a.status}
                    onValueChange={(status) => handleItemUpdate(a, { status })}
                  >
                    <SelectTrigger className="w-[140px] bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={a.priority}
                    onValueChange={(priority) => handleItemUpdate(a, { priority })}
                  >
                    <SelectTrigger className="w-[110px] bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {actions.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">No action items yet.</p>
              )}
            </div>
          </TiltCard>
        </div>

        {/* Assistant */}
        <TiltCard intensity={3} glow="cyan" className="flex max-h-[76vh] flex-col p-5 xl:sticky xl:top-24">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Meeting assistant
          </h2>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {(chat.data ?? []).length === 0 && (
              <p className="rounded-xl bg-background/40 p-3 text-sm text-muted-foreground">
                Ask anything about this meeting — e.g. “What did Sarah say about the budget?”
              </p>
            )}
            {(chat.data ?? []).map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  c.sender === "user"
                    ? "ml-6 bg-primary/15 text-foreground"
                    : "mr-2 bg-background/50 text-foreground/90"
                }`}
              >
                {c.message}
              </div>
            ))}
            {sendQuestion.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> EchoMind is reading the transcript…
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = question.trim();
              if (!q || sendQuestion.isPending) return;
              setQuestion("");
              sendQuestion.mutate(q);
            }}
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about this meeting…"
              className="bg-background/50"
            />
            <Button type="submit" size="icon" disabled={sendQuestion.isPending}>
              <Send className="size-4" />
            </Button>
          </form>
        </TiltCard>
      </div>
    </div>
  );
}