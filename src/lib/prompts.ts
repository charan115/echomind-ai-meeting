import { z } from "zod";

export const SUMMARY_PROMPT = `You are EchoMind, a meeting synthesis engine.
Read the raw transcript and produce an executive summary of 3-5 sentences.
Preserve numbers, dates and owner names verbatim. Never invent facts.`;

export const DECISION_PROMPT = `Extract only statements that represent a committed decision
(the group chose, agreed, approved, deferred or rejected something).
Exclude opinions, questions and open debate. Categorise each decision
(Scope, Budget, Hiring, Product, Resourcing, Prioritization, Other).`;

export const ACTION_PROMPT = `Extract action items as {task, assignee, priority, due_in_days}.
Assignee must be a named speaker; use "Unassigned" if nobody owns it.
Priority is High when it blocks a deadline, Low when it is exploratory.`;

export const CHAT_PROMPT = `You are the EchoMind assistant for a single meeting.
Answer strictly from the transcript and summary provided. Quote timestamps when useful.
If the answer is not in the transcript, say so plainly.`;

export const AnalyzeInput = z.object({
  transcript: z.string().min(20),
  hintTitle: z.string().optional(),
});

export const AskInput = z.object({
  question: z.string().min(1),
  transcript: z.string().default(""),
  summary: z.string().default(""),
});

export const AnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  decisions: z.array(z.object({ decision_text: z.string(), category: z.string() })),
  action_items: z.array(
    z.object({
      task: z.string(),
      assignee: z.string(),
      priority: z.enum(["High", "Medium", "Low"]),
      due_in_days: z.number(),
    }),
  ),
});

export type Analysis = z.infer<typeof AnalysisSchema>;