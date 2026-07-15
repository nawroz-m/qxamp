import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import type { QuizData, QuizQuestion, QuizSet } from "@/lib/quiz-types"

const DATA_PATH = path.join(process.cwd(), "public/data/questions.json")
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

    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const data: QuizData = JSON.parse(raw)

    let targetSet: QuizSet

    if (setMode === "new") {
      if (!newSetId?.trim() || !newSetName?.trim()) {
        return NextResponse.json({ error: "New set ID and name are required" }, { status: 400 })
      }
      const setId = newSetId.trim()
      if (data.sets.some((s) => s.setId === setId)) {
        return NextResponse.json({ error: "A set with this ID already exists" }, { status: 400 })
      }
      targetSet = { setId, setName: newSetName.trim(), questions: [] }
      data.sets.push(targetSet)
    } else {
      if (!existingSetId) {
        return NextResponse.json({ error: "Please select a question set" }, { status: 400 })
      }
      const found = data.sets.find((s) => s.setId === existingSetId)
      if (!found) {
        return NextResponse.json({ error: "Question set not found" }, { status: 404 })
      }
      targetSet = found
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

    targetSet.questions.push(question)
    await fs.writeFile(DATA_PATH, `${JSON.stringify(data, null, "\t")}\n`, "utf-8")

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
