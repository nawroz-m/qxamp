import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import type { QuizData, QuizQuestion, QuizSet } from "@/lib/quiz-types"
import { buildDbUrl } from "@/lib/firebase"

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

function normalizeQuestions(value: unknown): QuizQuestion[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter(Boolean) as QuizQuestion[]
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).filter(Boolean) as QuizQuestion[]
  }
  return []
}

function normalizeSets(raw: unknown): QuizData {
  if (!raw) {
    return { sets: [] }
  }

  if (Array.isArray(raw)) {
    return {
      sets: raw
        .filter((item): item is QuizSet => typeof item === "object" && item !== null && "setId" in item)
        .map((set) => ({
          setId: set.setId,
          setName: set.setName,
          questions: normalizeQuestions(set.questions).sort((a, b) => a.id - b.id),
        })),
    }
  }

  if (typeof raw === "object" && raw !== null) {
    return {
      sets: Object.values(raw)
        .filter((item): item is QuizSet => typeof item === "object" && item !== null && "setId" in item)
        .map((set) => ({
          setId: set.setId,
          setName: set.setName,
          questions: normalizeQuestions(set.questions).sort((a, b) => a.id - b.id),
        })),
    }
  }

  return { sets: [] }
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

    let targetSet: QuizSet

    if (setMode === "new") {
      if (!newSetId?.trim() || !newSetName?.trim()) {
        return NextResponse.json({ error: "New set ID and name are required" }, { status: 400 })
      }

      const setId = newSetId.trim()
      if ((setsById as Record<string, unknown>)[setId]) {
        return NextResponse.json({ error: "A set with this ID already exists" }, { status: 400 })
      }

      await fetch(buildDbUrl(`sets/${encodeURIComponent(setId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, setName: newSetName.trim() }),
      })

      targetSet = { setId, setName: newSetName.trim(), questions: [] }
    } else {
      const selectedSetId = existingSetId?.trim()
      if (!selectedSetId) {
        return NextResponse.json({ error: "Please select a question set" }, { status: 400 })
      }

      const setRecord = Array.isArray(setsById)
        ? (setsById as Array<unknown>).find(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null && (item as any).setId === selectedSetId,
          )
        : (setsById as Record<string, unknown>)[selectedSetId]
      if (!setRecord || typeof setRecord !== "object" || setRecord === null) {
        return NextResponse.json({ error: "Question set not found" }, { status: 404 })
      }

      targetSet = {
        setId: setRecord.setId,
        setName: setRecord.setName,
        questions: normalizeQuestions((setRecord as { questions?: unknown }).questions),
      }
    }

    const questionId =
      targetSet.questions.length > 0 ? Math.max(...targetSet.questions.map((q) => q.id)) + 1 : 1

    const question: QuizQuestion = {
      id: questionId,
      questionText: questionText.trim(),
      options: OPTION_IDS.map((id) => ({ id, text: optionTexts[id] })),
      correctOptionId,
    }

    if (explanation?.trim()) {
      question.explanation = explanation.trim()
    }

    const questionImage = formData.get("questionImage")
    if (questionImage instanceof File && questionImage.size > 0) {
      question.questionImage = await saveImage(questionImage, "questions", String(questionId))
    }

    const explanationImage = formData.get("explanationImage")
    if (explanationImage instanceof File && explanationImage.size > 0) {
      question.explanationImage = await saveImage(explanationImage, "explanations", String(questionId))
    }

    for (const id of OPTION_IDS) {
      const optionImage = formData.get(`optionImage_${id}`)
      if (optionImage instanceof File && optionImage.size > 0) {
        const option = question.options.find((o) => o.id === id)!
        option.img = await saveImage(optionImage, "options", `${questionId}-${id}`)
      }
    }

    const pushResponse = await fetch(
      buildDbUrl(`sets/${encodeURIComponent(targetSet.setId)}/questions`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(question),
      },
    )

    if (!pushResponse.ok) {
      throw new Error(`Failed to save question (${pushResponse.status})`)
    }

    return NextResponse.json({
      success: true,
      questionId,
      setId: targetSet.setId,
      setName: targetSet.setName,
    })
  } catch (err) {
    console.error("Failed to add question:", err)
    return NextResponse.json({ error: "Failed to save question" }, { status: 500 })
  }
}
