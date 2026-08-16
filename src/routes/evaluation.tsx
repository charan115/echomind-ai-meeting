import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/TiltCard";
import { SUMMARY_PROMPT, DECISION_PROMPT, ACTION_PROMPT, CHAT_PROMPT } from "@/lib/prompts";
import { Gauge, Cpu, Coins, Thermometer } from "lucide-react";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Prompt Engineering & Evaluation Studio — EchoMind AI" },
      {
        name: "description",
        content:
          "Inspect EchoMind's system prompts and tune temperature, latency and token budgets for meeting summarization.",
      },
      { property: "og:title", content: "Prompt Engineering & Evaluation Studio — EchoMind AI" },
      {
        property: "og:description",
        content: "System prompt templates, temperature tuning and token optimization metrics.",
      },
    ],
  }),
  component: EvaluationPage,
});

const templates = [
  { name: "summarization.v3", prompt: SUMMARY_PROMPT, tokens: 96 },
  { name: "decision_extraction.v4", prompt: DECISION_PROMPT, tokens: 118 },
  { name: "action_matrix.v2", prompt: ACTION_PROMPT, tokens: 84 },
  { name: "meeting_qa.v1", prompt: CHAT_PROMPT, tokens: 72 },
];

function EvaluationPage() {
  const [temperature, setTemperature] = useState([0.3]);
  const [context, setContext] = useState([8]);
  const temp = temperature[0] ?? 0.3;
  const ctx = context[0] ?? 8;

  const metrics = useMemo(() => {
    const latency = Math.round(420 + ctx * 145 + temp * 260);
    const tokens = Math.round(ctx * 1024 * 0.78);
    const factuality = Math.max(58, Math.round(98 - temp * 46 - Math.max(0, ctx - 12) * 1.4));
    const creativity = Math.min(99, Math.round(28 + temp * 72));
    return { latency, tokens, factuality, creativity };
  }, [temp, ctx]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <header className="animate-rise max-w-3xl">
        <Badge variant="outline" className="border-accent/40 text-accent">
          Viva / Project defense mode
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold">
          Prompt Engineering &amp; <span className="text-gradient">Evaluation Studio</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          The exact system prompt templates powering EchoMind's synthesis pipeline, with live
          knobs for temperature, context window and token economics.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {templates.map((t, i) => (
            <TiltCard key={t.name} intensity={4} className="p-6" glow={i % 2 ? "cyan" : "violet"}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-mono text-sm text-accent">{t.name}</h2>
                <span className="text-xs text-muted-foreground">~{t.tokens} tokens</span>
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-background/50 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {t.prompt}
              </pre>
            </TiltCard>
          ))}
        </div>

        <div className="space-y-5">
          <TiltCard intensity={5} className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Thermometer className="size-4 text-primary" /> Inference controls
            </h2>

            <div className="mt-6 space-y-7">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Temperature</span>
                  <span className="font-mono text-primary">{temp.toFixed(2)}</span>
                </div>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  min={0}
                  max={1}
                  step={0.05}
                  className="mt-3"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Context window (K tokens)</span>
                  <span className="font-mono text-accent">{ctx}K</span>
                </div>
                <Slider value={context} onValueChange={setContext} min={2} max={32} step={1} className="mt-3" />
              </div>
            </div>
          </TiltCard>

          <TiltCard intensity={5} className="p-6" glow="cyan">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Gauge className="size-4 text-accent" /> Live estimates
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Metric icon={<Cpu className="size-4" />} label="Model latency" value={`${metrics.latency} ms`} />
              <Metric icon={<Coins className="size-4" />} label="Prompt tokens" value={metrics.tokens.toLocaleString()} />
              <Bar label="Factual grounding" value={metrics.factuality} tone="accent" />
              <Bar label="Generative variance" value={metrics.creativity} tone="primary" />
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              EchoMind runs decision extraction at temperature 0.20 for determinism, and the
              meeting Q&amp;A assistant at 0.35 to keep answers readable without drifting from the
              transcript.
            </p>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "primary" | "accent" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={tone === "primary" ? "h-full bg-primary" : "h-full bg-accent"}
          style={{ width: `${value}%`, transition: "width .4s cubic-bezier(.16,1,.3,1)" }}
        />
      </div>
      <div className="mt-2 font-mono text-sm">{value}%</div>
    </div>
  );
}