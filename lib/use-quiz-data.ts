"use client"

import { useEffect, useState } from "react"
import type { QuizData } from "@/lib/quiz-types"

// Simple module-level cache so navigating between pages doesn't refetch.
let cache: QuizData | null = null

export function useQuizData() {
  const [data, setData] = useState<QuizData | undefined>(cache ?? undefined)
  const [error, setError] = useState<unknown>(undefined)
  const [isLoading, setIsLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return
    let active = true
    fetch("/api/questions")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load quiz data (${res.status})`)
        return res.json() as Promise<QuizData>
      })
      .then((json) => {
        cache = json
        if (active) setData(json)
      })
      .catch((err) => {
        if (active) setError(err)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { data, error, isLoading }
}
