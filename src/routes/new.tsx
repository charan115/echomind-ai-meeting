import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeMeeting } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { TiltCard } from "@/components/TiltCard";

export const Route = createFileRoute("/new")({
  component: AnalyzeMeeting,
});

function AnalyzeMeeting() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runAiAnalysis = useServerFn(analyzeMeeting);
  
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");

  const analyze = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !transcript.trim()) {
        throw new Error("Please provide both a title and a transcript.");
      }
      
      // 1. Create a blank meeting in Supabase
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title,
          raw_transcript: transcript,
          status: "processing",
          date: new Date().toISOString(),
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // 2. Send the transcript to our new Structured JSON AI function
      await runAiAnalysis({
        data: {
          meetingId: meeting.id,
          transcript,
        },
      });

      return meeting.id;
    },
    onSuccess: (meetingId) => {
      toast.success("AI Analysis Complete!");
      qc.invalidateQueries({ queryKey: ["meetings"] });
      
      // 3. Teleport the user to their newly generated meeting workspace
      navigate({ to: "/meeting/$id", params: { id: meetingId } });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Dashboard
      </Link>
      
      <div className="mt-8">
        <h1 className="text-3xl font-semibold">Analyze a Meeting</h1>
        <p className="mt-2 text-muted-foreground">
          Paste your raw meeting transcript below. EchoMind's AI will automatically extract the executive summary, decisions, and action items.
        </p>
      </div>

      <TiltCard intensity={2} className="mt-8 p-6 space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Meeting Title</label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g., Q3 Product Roadmap Sync"
            className="bg-background/50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Raw Transcript</label>
          <Textarea 
            value={transcript} 
            onChange={(e) => setTranscript(e.target.value)} 
            placeholder="Paste the raw text conversation here..."
            className="min-h-[350px] bg-background/50 font-mono text-sm leading-relaxed"
          />
        </div>

        <Button 
          className="w-full h-12 text-md" 
          onClick={() => analyze.mutate()} 
          disabled={analyze.isPending || !title || !transcript}
        >
          {analyze.isPending ? (
            <><Loader2 className="mr-2 size-5 animate-spin" /> Processing with AI...</>
          ) : (
            <><Sparkles className="mr-2 size-5" /> Analyze Meeting</>
          )}
        </Button>
      </TiltCard>
    </div>
  );
}