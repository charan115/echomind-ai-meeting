import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeMeeting } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { TiltCard } from "@/components/TiltCard";
import { ArrowLeft, Mic, Square, Sparkles, AudioLines, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/record")({
  component: RecordStudio,
});

function RecordStudio() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runAiAnalysis = useServerFn(analyzeMeeting);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [time, setTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- HARDWARE RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Using a small timeslice (1000ms) ensures data is constantly pushed to the chunk array
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Fire ondataavailable every 1 second
      setIsRecording(true);
      setAudioBlob(null);
      setTime(0);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Hardware Error: Please check Windows microphone privacy settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- THE ACTUAL PROCESSING ENGINE ---
  const processAudio = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error("No audio recorded.");
      
      // 1. Create the blank meeting in Supabase
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title: `Studio Recording — ${new Date().toLocaleDateString()}`,
          status: "processing",
          date: new Date().toISOString(),
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // 2. Here is where the actual transcription API (Deepgram/AssemblyAI) will be called.
      // For now, we simulate the transcription return so it doesn't break the UI pipeline.
      const simulatedTranscript = "This is a simulated transcript from the raw audio file. We need to plug Deepgram in here to convert the webm Blob to text.";

      // 3. Send it to the Gemini logic we built in ai.functions.ts
      await runAiAnalysis({
        data: {
          meetingId: meeting.id,
          transcript: simulatedTranscript, 
        },
      });

      return meeting.id;
    },
    onSuccess: (meetingId) => {
      toast.success("Audio transcribed and analyzed!");
      qc.invalidateQueries({ queryKey: ["meetings"] });
      navigate({ to: "/meeting/$id", params: { id: meetingId } });
    },
    onError: (e: Error) => {
      toast.error("Processing Failed: " + e.message);
    },
  });

  return (
    <div className="mx-auto flex min-h-[90vh] max-w-[1200px] flex-col px-6 py-10">
      <div className="flex w-full items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <TiltCard intensity={1} glow="blue" className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/5 bg-background/30 p-0 shadow-2xl backdrop-blur-2xl">
          
          <div className="flex items-center justify-between border-b border-white/5 bg-background/20 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <AudioLines className="size-5" />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Input Source</h2>
                <p className="text-sm font-medium text-foreground">System Microphone</p>
              </div>
            </div>

            {isRecording ? (
              <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2">
                <span className="size-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-destructive">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-secondary/30 px-4 py-2">
                <span className="size-2 rounded-full bg-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Standby</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center py-24">
            <div className={`text-7xl font-light tabular-nums tracking-tighter transition-colors duration-500 ${isRecording ? "text-primary drop-shadow-[0_0_25px_rgba(var(--primary),0.4)]" : "text-foreground"}`}>
              {formatTime(time)}
            </div>
          </div>

          <div className="flex flex-col items-center border-t border-white/5 bg-background/20 px-8 pb-10 pt-4 relative">
            <div className="relative group -mt-16 mb-6">
              {!isRecording ? (
                <>
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60 duration-1000" />
                  <div className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse" />
                  <Button size="icon" onClick={startRecording} className="relative z-10 size-24 rounded-full bg-primary shadow-[0_0_40px_-10px_rgba(var(--primary),0.6)] transition-transform hover:scale-105">
                    <Mic className="size-8 text-primary-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="absolute -inset-4 rounded-full bg-destructive/10 animate-pulse" />
                  <Button size="icon" onClick={stopRecording} className="relative z-10 size-24 rounded-full bg-destructive shadow-[0_0_40px_-10px_rgba(255,0,0,0.5)] transition-transform hover:scale-105">
                    <Square className="size-8 fill-white text-white" />
                  </Button>
                </>
              )}
            </div>

            {audioBlob && !isRecording && (
              <div className="mt-4 flex w-full flex-col animate-in fade-in slide-in-from-bottom-4 space-y-4">
                <audio src={URL.createObjectURL(audioBlob)} controls className="h-12 w-full opacity-70 transition-opacity hover:opacity-100" />
                <Button 
                  onClick={() => processAudio.mutate()} 
                  disabled={processAudio.isPending}
                  className="h-14 w-full text-base font-medium"
                >
                  {processAudio.isPending ? (
                    <><Loader2 className="mr-2 size-5 animate-spin" /> Processing Audio Engine...</>
                  ) : (
                    <><Sparkles className="mr-2 size-5" /> Synthesize Meeting</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </TiltCard>
      </div>
    </div>
  );
}