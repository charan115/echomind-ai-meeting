import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Meeting = {
  id: string;
  user_id: string | null;
  title: string;
  date: string;
  duration: string | null;
  raw_transcript: string | null;
  summary: string | null;
  tags: string[];
  created_at: string;
};

export type Decision = {
  id: string;
  meeting_id: string;
  decision_text: string;
  category: string | null;
  created_at: string;
};

export type ActionItem = {
  id: string;
  meeting_id: string;
  task: string;
  assignee: string | null;
  priority: string;
  status: string;
  due_date: string | null;
};

export type ChatMessage = {
  id: string;
  meeting_id: string;
  sender: string;
  message: string;
  created_at: string;
};

export const meetingsQuery = queryOptions({
  queryKey: ["meetings"],
  queryFn: async (): Promise<Meeting[]> => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Meeting[];
  },
});

export const allActionItemsQuery = queryOptions({
  queryKey: ["action_items", "all"],
  queryFn: async (): Promise<ActionItem[]> => {
    const { data, error } = await supabase.from("action_items").select("*");
    if (error) throw error;
    return (data ?? []) as ActionItem[];
  },
});

export const allDecisionsQuery = queryOptions({
  queryKey: ["decisions", "all"],
  queryFn: async (): Promise<Decision[]> => {
    const { data, error } = await supabase.from("decisions").select("id");
    if (error) throw error;
    return (data ?? []) as Decision[];
  },
});

export const meetingQuery = (id: string) =>
  queryOptions({
    queryKey: ["meeting", id],
    queryFn: async (): Promise<Meeting | null> => {
      const { data, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Meeting | null;
    },
  });

export const decisionsQuery = (id: string) =>
  queryOptions({
    queryKey: ["decisions", id],
    queryFn: async (): Promise<Decision[]> => {
      const { data, error } = await supabase
        .from("decisions")
        .select("*")
        .eq("meeting_id", id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Decision[];
    },
  });

export const actionItemsQuery = (id: string) =>
  queryOptions({
    queryKey: ["action_items", id],
    queryFn: async (): Promise<ActionItem[]> => {
      const { data, error } = await supabase
        .from("action_items")
        .select("*")
        .eq("meeting_id", id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ActionItem[];
    },
  });

export const chatQuery = (id: string) =>
  queryOptions({
    queryKey: ["chat_messages", id],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("meeting_id", id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });

export type TranscriptLine = { speaker: string; time: string; seconds: number; text: string };

export function parseTranscript(raw: string | null): TranscriptLine[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const match = line.match(/^(.+?)\s*\((\d{1,2}):(\d{2})\)\s*:\s*(.*)$/);
      if (!match) {
        return { speaker: "Speaker", time: "00:00", seconds: i * 15, text: line };
      }
      const [, speaker, mm, ss, text] = match;
      return {
        speaker: speaker!,
        time: `${mm}:${ss}`,
        seconds: Number(mm) * 60 + Number(ss),
        text: text!,
      };
    });
}