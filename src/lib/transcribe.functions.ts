import { createServerFn } from "@tanstack/react-start";

/**
 * Diarized transcription pipeline.
 *
 * Today this runs on Lovable AI (speech-to-text + a speaker-labelling pass).
 * Swap the STT_ENDPOINT block for Deepgram / AssemblyAI `diarize: true`
 * when a provider key is added — the return shape stays the same.
 */
export const transcribeRecording = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const v = input as { audioUrl?: unknown; mimeType?: unknown };
    if (typeof v?.audioUrl !== "string" || !v.audioUrl) throw new Error("audioUrl is required");
    return { audioUrl: v.audioUrl, mimeType: typeof v.mimeType === "string" ? v.mimeType : "audio/webm" };
  })
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const audioRes = await fetch(data.audioUrl);
    if (!audioRes.ok) throw new Error("Could not read the uploaded recording.");
    const bytes = await audioRes.arrayBuffer();
    if (bytes.byteLength < 2048) throw new Error("That recording was empty — please record again.");

    const ext = data.mimeType.includes("mp4") ? "mp4" : data.mimeType.includes("wav") ? "wav" : "webm";
    const form = new FormData();
    form.append("model", "openai/gpt-4o-transcribe");
    form.append("file", new Blob([bytes], { type: data.mimeType }), `recording.${ext}`);

    const stt = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!stt.ok) throw new Error(`Transcription failed: ${stt.status} ${await stt.text().catch(() => "")}`);
    const raw = ((await stt.json()) as { text?: string }).text?.trim() ?? "";
    if (!raw) throw new Error("No speech detected in that recording.");

    // Speaker diarization pass
    const diar = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You split raw meeting transcripts into speaker turns. Return ONLY lines formatted exactly as `Speaker A (MM:SS): text`. Infer turn changes from context, keep wording verbatim, and advance timestamps plausibly from 00:00.",
          },
          { role: "user", content: raw },
        ],
      }),
    });
    const diarized = diar.ok
      ? ((await diar.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim()
      : "";

    return { transcript: diarized || `Speaker A (00:00): ${raw}`, rawText: raw };
  });
