import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, enforceOpenAiLimit } from "@/lib/auth-server";

// ---- Types ----
type Option = { id: "a" | "b" | "c" | "d"; text: string };
type Question = {
  questionText: string;
  options: Option[];
  correctOptionId: "a" | "b" | "c" | "d";
  explanation: string;
};


// ---- Prompt builder ----
function buildPrompt(content: string, count: number) {
  return `You will be given source content (raw notes, an article, a textbook chapter, existing Q&A, or similar). Generate multiple-choice quiz questions from this content, formatted to match the schema below exactly.

Requirements:
1. Question count: Generate ${count} questions covering the key facts, concepts, and details from the content — spread evenly across the material, not clustered on one section.
2. Question quality:
   - Each question must be answerable directly from the provided content — do not invent facts not present in the source.
   - Avoid trivial or overly obvious questions; test real understanding.
   - Avoid ambiguous wording where more than one option could reasonably be correct.
   - Vary question types where the content allows (definitions, cause/effect, comparisons, numerical facts, sequences, etc.).
3. Options:
   - Exactly 4 options per question (a, b, c, d).
   - Only one correct answer per question.
   - Wrong options ("distractors") should be plausible and related to the topic — not random or obviously silly.
   - Keep option lengths roughly similar so the correct answer isn't guessable by length alone.
4. Explanation: Include a 1–3 sentence explanation for the correct answer, referencing the source content, for each question.
5. Output format: Return ONLY a valid JSON array matching this exact structure — no markdown, no code fences, no commentary before or after:

[
  {
    "questionText": "According to Henry's Law, the concentration of a gas dissolved in seawater is:",
    "options": [
      { "id": "a", "text": "Inversely proportional to its partial pressure above the sea" },
      { "id": "b", "text": "Proportional to its partial pressure above the sea, via an equilibrium constant" },
      { "id": "c", "text": "Independent of temperature and salinity" },
      { "id": "d", "text": "Only dependent on the gas's molecular weight" }
    ],
    "correctOptionId": "b",
    "explanation": ""
  }
]

Do not include questionImage, img, or explanationImage fields.

If the content is insufficient to generate the requested number of quality questions, generate as many good ones as the content supports and state the count in a top-level "note" field instead of padding with weak or duplicate questions.

CONTENT:
${content}`;
}



// function extractJsonPayload(raw: string): unknown {
//   const trimmed = raw.trim();
//   const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
//   const candidate = fencedMatch ? fencedMatch[1] : trimmed;
//   const firstBrace = candidate.indexOf("{");
//   const lastBrace = candidate.lastIndexOf("}");
//   const firstBracket = candidate.indexOf("[");
//   const lastBracket = candidate.lastIndexOf("]");

//   if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
//     return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
//   }

//   if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
//     return JSON.parse(candidate.slice(firstBracket, lastBracket + 1));
//   }

//   return JSON.parse(candidate);
// }
// ---- Safe JSON extraction (returns null instead of throwing) ----
function extractJsonPayload(raw: string): unknown | null {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;

  const firstBracket = candidate.indexOf("[");
  const lastBracket = candidate.lastIndexOf("]");
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  try {
    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      return JSON.parse(candidate.slice(firstBracket, lastBracket + 1));
    }
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// ---- Manual validation (no external deps) ----
// Returns { valid: true, questions, note? } or { valid: false, errors: string[] }
function validateGeneratedPayload(payload: unknown):
  | { valid: true; questions: Question[]; note?: string }
  | { valid: false; errors: string[] } {
  const errors: string[] = [];

  const rawQuestions: unknown = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).questions)
      ? (payload as Record<string, unknown>).questions
      : null;

  const note =
    payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).note === "string"
      ? ((payload as Record<string, unknown>).note as string)
      : undefined;

  if (!Array.isArray(rawQuestions)) {
    return { valid: false, errors: ["Payload is not an array and has no 'questions' array."] };
  }

  const validIds = ["a", "b", "c", "d"];
  const questions: Question[] = [];

  rawQuestions.forEach((q, i) => {
    if (!q || typeof q !== "object") {
      errors.push(`Question ${i}: not an object.`);
      return;
    }
    const obj = q as Record<string, unknown>;

    if (typeof obj.questionText !== "string" || !obj.questionText.trim()) {
      errors.push(`Question ${i}: missing or invalid 'questionText'.`);
      return;
    }
    if (!Array.isArray(obj.options) || obj.options.length !== 4) {
      errors.push(`Question ${i}: 'options' must be an array of exactly 4 items.`);
      return;
    }

    const options: Option[] = [];
    let optionsValid = true;
    for (const opt of obj.options) {
      if (
        !opt ||
        typeof opt !== "object" ||
        !validIds.includes((opt as Record<string, unknown>).id as string) ||
        typeof (opt as Record<string, unknown>).text !== "string" ||
        !(opt as Record<string, unknown>).text
      ) {
        optionsValid = false;
        break;
      }
      options.push(opt as Option);
    }
    if (!optionsValid) {
      errors.push(`Question ${i}: one or more options are malformed.`);
      return;
    }

    if (!validIds.includes(obj.correctOptionId as string)) {
      errors.push(`Question ${i}: invalid 'correctOptionId'.`);
      return;
    }
    if (!options.some((o) => o.id === obj.correctOptionId)) {
      errors.push(`Question ${i}: 'correctOptionId' does not match any option id.`);
      return;
    }

    questions.push({
      questionText: obj.questionText as string,
      options,
      correctOptionId: obj.correctOptionId as Option["id"],
      explanation: typeof obj.explanation === "string" ? obj.explanation : "",
    });
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, questions, note };
}


function normalizeQuestions(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).questions)) {
    return (payload as Record<string, unknown>).questions;
  }

  return [];
}

export async function POST(request: NextRequest) {
  let rawContent = "";

  try {
    const user = await authenticateRequest(request);
    const limitCheck = await enforceOpenAiLimit(request, user);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: limitCheck.status });
    }

    const { content, model, count } = await request.json();
    const promptContent = typeof content === "string" ? content.trim() : "";
    const questionCount = Math.min(Math.max(Number(count) || 4, 1), 10);

    if (!promptContent) {
      return NextResponse.json({ error: "Please provide content to generate questions from." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You return only valid JSON. Never include markdown code fences or commentary.",
          },
          {
            role: "user",
            content: buildPrompt(promptContent, questionCount),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "OpenAI request failed.");
    }

    const data = await response.json();
    rawContent = data?.choices?.[0]?.message?.content ?? "";

    if (!rawContent.trim()) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsed = extractJsonPayload(rawContent);

    if (parsed === null) {
      console.error("Failed to parse model output as JSON:", rawContent);
      return NextResponse.json(
        { error: "Model did not return valid JSON.", rawResponse: rawContent },
        { status: 400 }
      );
    }

    const result = validateGeneratedPayload(parsed);

    if (!result.valid) {
      console.error("Schema validation failed:", result.errors, "\nRaw model output:", rawContent);
      return NextResponse.json(
        {
          error: "Generated questions did not match the expected schema.",
          issues: result.errors,
          rawResponse: rawContent,
        },
        { status: 422 }
      );
    }

    if (!result.questions.length) {
      return NextResponse.json({ error: "No questions were generated.", note: result.note }, { status: 422 });
    }

    return NextResponse.json({ questions: result.questions, ...(result.note ? { note: result.note } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate questions.";
    console.error("AI generate error:", message, rawContent ? `\nRaw model output: ${rawContent}` : "");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
