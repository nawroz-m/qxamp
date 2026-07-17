import { NextRequest, NextResponse } from "next/server"

import { buildDbUrl } from "@/lib/firebase"
import { ensureSetTarget, normalizeQuestions, saveQuestionsToSet } from "@/lib/quiz-storage"
import type { QuizQuestion } from "@/lib/quiz-types"

type IncomingQuestion = {
  questionText?: string
  options?: Array<{ id?: string; text?: string }>
  correctOptionId?: string
  explanation?: string
}

function toQuizQuestion(question: IncomingQuestion, fallbackId: number): QuizQuestion {
  const optionIds = ["a", "b", "c", "d"] as const
  const safeOptions = (question.options ?? []).slice(0, 4)
  const options = optionIds.map((id, index) => ({
    id,
    text: safeOptions[index]?.text?.trim() ?? "",
  }))

  const correctOptionId =
    question.correctOptionId && optionIds.includes(question.correctOptionId as (typeof optionIds)[number])
      ? question.correctOptionId
      : optionIds[0]

  return {
    id: fallbackId,
    questionText: question.questionText?.trim() ?? "",
    options,
    correctOptionId,
    explanation: question.explanation?.trim() ? question.explanation.trim() : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const setMode = payload?.setMode === "new" ? "new" : "existing"
    const setName = typeof payload?.setName === "string" ? payload.setName.trim() : ""
    const setId = typeof payload?.setId === "string" ? payload.setId.trim() : ""
    const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : []

    if (!rawQuestions.length) {
      return NextResponse.json({ error: "No questions were provided" }, { status: 400 })
    }

    const response = await fetch(buildDbUrl("sets"), { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to read quiz sets (${response.status})`)
    }

    const rawSets = await response.json()
    const setsById = typeof rawSets === "object" && rawSets !== null ? rawSets : {}

    const resolved = await ensureSetTarget({
      setMode,
      existingSetId: setMode === "existing" ? setId : null,
      newSetId: setMode === "new" ? setId : null,
      newSetName: setMode === "new" ? setName : null,
      setsById,
    })

    const existingQuestions = normalizeQuestions((resolved.targetSet as { questions?: unknown }).questions)
    const nextQuestions = rawQuestions.map((question, index) =>
      toQuizQuestion(question as IncomingQuestion, existingQuestions.length + index + 1),
    )

    const saveResult = await saveQuestionsToSet(
      resolved.targetSet.setId,
      resolved.targetSet.setName,
      nextQuestions,
      existingQuestions,
    )

    return NextResponse.json({
      success: true,
      setId: resolved.targetSet.setId,
      setName: resolved.targetSet.setName,
      count: saveResult.count,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save generated questions"
    if (message === "Question set not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (
      message === "Please select a question set" ||
      message === "New set ID and name are required" ||
      message === "A set with this ID already exists"
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error("Failed to save generated questions:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
