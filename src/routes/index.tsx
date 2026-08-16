import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TiltCard } from "@/components/TiltCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { allActionItemsQuery, allDecisionsQuery, meetingsQuery } from "@/lib/meetings";
import { ArrowUpRight, CalendarClock, CircleCheck, Gavel, Sparkles, Waves } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EchoMind AI — Intelligent Meeting Synthesis" },
      {
        name: "description",
        content:
          "EchoMind AI turns meeting transcripts into summaries, key decisions and tracked action items with an AI assistant for every conversation.",
      },
      { property: "og:title", content: "EchoMind AI — Intelligent Meeting Synthesis" },
      {
        property: "og:description",
        content: "Summaries, key decisions and action items extracted from every meeting, automatically.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const meetings = useQuery(meetingsQuery);
  const actions = useQuery(allActionItemsQuery);
  const decisions = useQuery(allDecisionsQuery);

  const pending = (actions.data ?? []).filter((a) => a.status !== "Done").length;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-10">
      <TiltCard intensity={7} className="animate-rise overflow-hidden p-10 sm:p-14">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Waves className="mr-1.5 size-3.5" /> Live synthesis engine
          </Badge>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] sm:text-6xl">
            EchoMind AI
            <span className="block text-gradient">Intelligent Meeting Synthesis</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Every conversation becomes a structured record: an executive summary, the decisions
            that were actually made, and an action matrix that never loses an owner.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/new">
                <Sparkles className="mr-2 size-4" /> Analyze a meeting
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/evaluation">Evaluation studio</Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -bottom-32 right-24 size-72 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "1.5s" }}
        />
      </TiltCard>

      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        <Stat
          icon={<Waves className="size-4" />}
          label="Meetings analyzed"
          value={meetings.data?.length}
          loading={meetings.isLoading}
        />
        <Stat
          icon={<CircleCheck className="size-4" />}
          label="Pending action items"
          value={pending}
          loading={actions.isLoading}
          tone="accent"
        />
        <Stat
          icon={<Gavel className="size-4" />}
          label="Key decisions extracted"
          value={decisions.data?.length}
          loading={decisions.isLoading}
        />
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Recent meetings</h2>
          <span className="text-sm text-muted-foreground">{meetings.data?.length ?? 0} total</span>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {meetings.isLoading &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}

          {(meetings.data ?? []).map((m, i) => (
            <Link key={m.id} to="/meeting/$id" params={{ id: m.id }} className="block">
              <TiltCard
                intensity={11}
                glow={i % 2 ? "cyan" : "violet"}
                className="animate-rise h-full p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-snug">{m.title}</h3>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {new Date(m.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  · {m.duration ?? "—"}
                </p>
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-foreground/80">
                  {m.summary ?? "Awaiting synthesis."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(m.tags ?? []).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </TiltCard>
            </Link>
          ))}
        </div>

        {meetings.data?.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">
            No meetings yet —{" "}
            <Link to="/new" className="text-primary underline">
              analyze your first transcript
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  loading,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: "primary" | "accent";
}) {
  return (
    <TiltCard intensity={6} glow={tone === "accent" ? "cyan" : "violet"} className="p-6">
      <div
        className={`flex items-center gap-2 text-xs uppercase tracking-widest ${tone === "accent" ? "text-accent" : "text-primary"}`}
      >
        {icon}
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <div className="mt-3 font-display text-4xl font-semibold">{value ?? 0}</div>
      )}
    </TiltCard>
  );
}
