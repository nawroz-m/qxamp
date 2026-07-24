import { buildDbUrl } from "@/lib/firebase"
import type { QuizData, QuizOption, QuizQuestion, QuizSet } from "@/lib/quiz-types"

export const OPTION_IDS = ["a", "b", "c", "d"] as const
export type OptionId = (typeof OPTION_IDS)[number]

export type SanitizedGeneratedQuestion = {
  questionText: string
  options: Array<{ id: OptionId; text: string }>
  correctOptionId: OptionId
  explanation: string
}

export function normalizeQuestions(value: unknown): QuizQuestion[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({ ...(item as unknown as QuizQuestion) }))
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === "object" && item !== null)
      .map(([firebaseKey, item]) => ({
        ...(item as unknown as QuizQuestion),
        firebaseKey,
      }))
  }

  return []
}

export function normalizeSets(raw: unknown): QuizData {
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
          questions: normalizeQuestions(set.questions),
          createdBy: typeof set.createdBy === "string" ? set.createdBy : undefined,
          createdAt: typeof set.createdAt === "number" ? set.createdAt : undefined,
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
          questions: normalizeQuestions(set.questions),
          createdBy: typeof set.createdBy === "string" ? set.createdBy : undefined,
          createdAt: typeof set.createdAt === "number" ? set.createdAt : undefined,
        })),
    }
  }

  return { sets: [] }
}

export function sanitizeGeneratedQuestion(raw: unknown): SanitizedGeneratedQuestion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null
  }

  const source = raw as Record<string, unknown>
  const questionText = typeof source.questionText === "string" ? source.questionText.trim() : ""

  if (!questionText) {
    return null
  }

  const rawOptions = Array.isArray(source.options) ? source.options : []
  const options = OPTION_IDS.map((id, index) => {
    const option = rawOptions[index]
    const optionData = option && typeof option === "object" && option !== null ? (option as Record<string, unknown>) : null
    const text =
      typeof optionData?.text === "string"
        ? optionData.text
        : typeof optionData?.optionText === "string"
          ? optionData.optionText
          : ""

    return {
      id,
      text: text.trim(),
    }
  })

  const fallbackCorrectOptionId = options.find((option) => option.text.trim())?.id ?? OPTION_IDS[0]
  const correctOptionId =
    typeof source.correctOptionId === "string" && OPTION_IDS.includes(source.correctOptionId as OptionId)
      ? (source.correctOptionId as OptionId)
      : fallbackCorrectOptionId

  const explanation = typeof source.explanation === "string" ? source.explanation.trim() : ""

  return {
    questionText,
    options,
    correctOptionId,
    explanation,
  }
}

export async function fetchSetsSnapshot() {
  const response = await fetch(buildDbUrl("sets"), { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Failed to read quiz sets (${response.status})`)
  }

  const rawSets = await response.json()
  return normalizeSets(rawSets)
}

export async function ensureSetTarget(params: {
  setMode: "new" | "existing"
  existingSetId?: string | null
  newSetId?: string | null
  newSetName?: string | null
  createdBy?: string | null
  setsById: Record<string, unknown>
}): Promise<{ targetSet: QuizSet; created: boolean; setRecord: Record<string, unknown> | null }> {
  const { setMode, existingSetId, newSetId, newSetName, createdBy, setsById } = params

  if (setMode === "new") {
    if (!newSetId?.trim() || !newSetName?.trim()) {
      throw new Error("New set ID and name are required")
    }

    const setId = newSetId.trim()
    if ((setsById as Record<string, unknown>)[setId]) {
      throw new Error("A set with this ID already exists")
    }

    const createdAt = Date.now()
    const setPayload: Record<string, unknown> = {
      setId,
      setName: newSetName.trim(),
      createdAt,
    }
    if (createdBy?.trim()) {
      setPayload.createdBy = createdBy.trim()
    }

    const createResponse = await fetch(buildDbUrl(`sets/${encodeURIComponent(setId)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setPayload),
    })

    if (!createResponse.ok) {
      throw new Error(`Failed to create set (${createResponse.status})`)
    }

    return {
      targetSet: {
        setId,
        setName: newSetName.trim(),
        questions: [],
        createdBy: createdBy?.trim() || undefined,
        createdAt,
      },
      created: true,
      setRecord: { ...setPayload, questions: {} },
    }
  }

  const selectedSetId = existingSetId?.trim()
  if (!selectedSetId) {
    throw new Error("Please select a question set")
  }

  const setRecord = Array.isArray(setsById)
    ? (setsById as Array<unknown>).find(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && (item as Record<string, unknown>).setId === selectedSetId,
      )
    : (setsById as Record<string, unknown>)[selectedSetId]

  if (!setRecord || typeof setRecord !== "object" || setRecord === null) {
    throw new Error("Question set not found")
  }

  return {
    targetSet: {
      setId: String((setRecord as Record<string, unknown>).setId ?? selectedSetId),
      setName: String((setRecord as Record<string, unknown>).setName ?? selectedSetId),
      questions: normalizeQuestions((setRecord as { questions?: unknown }).questions),
    },
    created: false,
    setRecord: setRecord as Record<string, unknown>,
  }
}

export async function saveQuestionToSet(setId: string, question: QuizQuestion) {
  const response = await fetch(buildDbUrl(`sets/${encodeURIComponent(setId)}/questions`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(question),
  })

  if (!response.ok) {
    throw new Error(`Failed to save question (${response.status})`)
  }

  const savedBody = (await response.json()) as { name?: string }

  return { success: true, firebaseKey: savedBody.name }
}

export async function saveQuestionsToSet(setId: string, questions: QuizQuestion[]) {
  if (!questions.length) {
    return { success: true, count: 0, firebaseKeys: [] as string[] }
  }

  const savedKeys: string[] = []

  for (const question of questions) {
    const saved = await saveQuestionToSet(setId, question)
    if (saved.firebaseKey) {
      savedKeys.push(saved.firebaseKey)
    }
  }

  return { success: true, count: questions.length, firebaseKeys: savedKeys }
}
