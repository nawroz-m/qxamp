import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import type { QuizQuestion, QuizSet } from "@/lib/quiz-types"
import { buildDbUrl } from "@/lib/firebase"
import { ensureSetTarget, normalizeQuestions, normalizeSets, saveQuestionToSet } from "@/lib/quiz-storage"
import { authenticateRequest } from "@/lib/auth-server"

const OPTION_IDS = ["a", "b", "c", "d"] as const

function getExtension(file: File): string {
  if (file.type === "image/png") return ".png"
  if (file.type === "image/jpeg") return ".jpg"
  if (file.type === "image/webp") return ".webp"
  if (file.type === "image/gif") return ".gif"
  const dot = file.name.lastIndexOf(".")
  if (dot >= 0) return file.name.slice(dot).toLowerCase()
  return ".jpg"
}

async function saveImage(
  file: File,
  category: "questions" | "options" | "explanations",
  basename: string,
): Promise<string> {
  const filename = `${basename}${getExtension(file)}`
  const relativePath = `images/${category}/${filename}`
  const fullPath = path.join(process.cwd(), "public", relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, Buffer.from(await file.arrayBuffer()))
  return relativePath
}

export async function GET() {
  try {
    const response = await fetch(buildDbUrl("sets"), { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to load quiz data (${response.status})`)
    }

    const raw = await response.json()
    const data = normalizeSets(raw)
    return NextResponse.json(data)
  } catch (err) {
    console.error("Failed to load quiz data from Firebase:", err)
    return NextResponse.json({ error: "Failed to load quiz data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const setMode = formData.get("setMode") as string
    const existingSetId = formData.get("existingSetId") as string | null
    const newSetId = formData.get("newSetId") as string | null
    const newSetName = formData.get("newSetName") as string | null
    const questionText = formData.get("questionText") as string
    const explanation = formData.get("explanation") as string | null
    const correctOptionId = formData.get("correctOptionId") as string

    if (!questionText?.trim()) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 })
    }

    if (!OPTION_IDS.includes(correctOptionId as (typeof OPTION_IDS)[number])) {
      return NextResponse.json({ error: "Correct answer is required" }, { status: 400 })
    }

    const optionTexts: Record<string, string> = {}
    for (const id of OPTION_IDS) {
      const text = formData.get(`optionText_${id}`) as string
      if (!text?.trim()) {
        return NextResponse.json({ error: `Option ${id.toUpperCase()} text is required` }, { status: 400 })
      }
      optionTexts[id] = text.trim()
    }

    const response = await fetch(buildDbUrl("sets"), { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to read quiz sets (${response.status})`)
    }

    const rawSets = await response.json()
    const setsById = typeof rawSets === "object" && rawSets !== null ? rawSets : {}
    const authUser = await authenticateRequest(request)

    let targetSet: QuizSet

    try {
      const resolved = await ensureSetTarget({
        setMode: setMode === "new" ? "new" : "existing",
        existingSetId,
        newSetId,
        newSetName,
        createdBy: authUser?.uid ?? null,
        setsById,
      })
      targetSet = resolved.targetSet
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve question set"
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
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const imageSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const question: QuizQuestion = {
      questionText: questionText.trim(),
      options: OPTION_IDS.map((id) => ({ id, text: optionTexts[id] })),
      correctOptionId,
    }

    if (explanation?.trim()) {
      question.explanation = explanation.trim()
    }

    const questionImage = formData.get("questionImage")
    if (questionImage instanceof File && questionImage.size > 0) {
      question.questionImage = await saveImage(questionImage, "questions", imageSuffix)
    }

    const explanationImage = formData.get("explanationImage")
    if (explanationImage instanceof File && explanationImage.size > 0) {
      question.explanationImage = await saveImage(explanationImage, "explanations", imageSuffix)
    }

    for (const id of OPTION_IDS) {
      const optionImage = formData.get(`optionImage_${id}`)
      if (optionImage instanceof File && optionImage.size > 0) {
        const option = question.options.find((o) => o.id === id)!
        option.img = await saveImage(optionImage, "options", `${imageSuffix}-${id}`)
      }
    }

    const saved = await saveQuestionToSet(targetSet.setId, question)

    if (!saved.success) {
      throw new Error("Failed to save question")
    }

    return NextResponse.json({
      success: true,
      questionId: saved.firebaseKey ?? "new-question",
      setId: targetSet.setId,
      setName: targetSet.setName,
    })
  } catch (err) {
    console.error("Failed to add question:", err)
    return NextResponse.json({ error: "Failed to save question" }, { status: 500 })
  }
}
