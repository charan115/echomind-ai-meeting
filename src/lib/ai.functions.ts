import { createServerFn } from "@tanstack/react-start";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Explicitly initialize the Google provider with the API key from the environment
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const analyzeMeeting = createServerFn()
  .validator((data: { meetingId: string; transcript: string }) => data)
  .handler(async ({ data }) => {
    console.log("Analyzing transcript with Structured Outputs...");

    // 1. Force the AI to return a strict JSON object
    const result = await generateObject({
      model: google("gemini-3.5-flash"), // Upgraded to the current, active 3.5 Flash model
      prompt: `You are an expert executive assistant. Analyze this meeting transcript and extract the key information.
      
      Transcript:
      ${data.transcript}`,
      schema: z.object({
        summary: z.string().describe("A clean, 2-to-3 sentence executive summary of the meeting."),
        decisions: z.array(
          z.object({
            category: z.string().describe("E.g., Engineering, Budget, Design, HR"),
            decision_text: z.string().describe("What was actually decided?"),
          })
        ),
        actionItems: z.array(
          z.object({
            task: z.string(),
            assignee: z.string().describe("The name of the person responsible, or 'Unassigned'"),
            priority: z.enum(["Low", "Medium", "High"]),
          })
        ),
      }),
    });

    const { summary, decisions, actionItems } = result.object;

    // 2. Save the perfectly clean Summary to Supabase
    await supabase
      .from("meetings")
      .update({ summary: summary, status: "analyzed" })
      .eq("id", data.meetingId);

    // 3. Save Decisions to Supabase
    if (decisions.length > 0) {
      const decisionInserts = decisions.map((d) => ({
        meeting_id: data.meetingId,
        category: d.category,
        decision_text: d.decision_text,
      }));
      await supabase.from("decisions").insert(decisionInserts);
    }

    // 4. Save Action Items to Supabase
    if (actionItems.length > 0) {
      const actionInserts = actionItems.map((a) => ({
        meeting_id: data.meetingId,
        task: a.task,
        assignee: a.assignee,
        priority: a.priority,
        status: "To Do",
      }));
      await supabase.from("action_items").insert(actionInserts);
    }

    console.log("Meeting successfully analyzed and saved to database!");
    return result.object;
  });

export const askMeeting = createServerFn()
  .validator((data: { question: string; transcript: string; summary: string }) => data)
  .handler(async ({ data }) => {
    console.log("Querying the Meeting Assistant...");

    const result = await generateText({
      model: google("gemini-3.5-flash"), // Upgraded to the current, active 3.5 Flash model
      prompt: `You are a highly intelligent executive assistant. You are answering a question about a specific meeting.
      
      Here is the overall summary of the meeting:
      ${data.summary}
      
      Here is the full, raw transcript of the meeting:
      ${data.transcript}
      
      User's Question: "${data.question}"
      
      Instructions:
      1. Answer the user's question directly and concisely.
      2. Base your answer STRICTLY on the provided transcript.
      3. If the answer is not in the transcript, explicitly state that it was not discussed. Do not make things up.`,
    });

    console.log("Assistant replied successfully!");
    
    return { answer: result.text };
  });