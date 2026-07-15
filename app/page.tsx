"use client"

import { GraduationCap } from "lucide-react"
import { SetCard } from "@/components/set-card"
import { useQuizData } from "@/lib/use-quiz-data"

export default function HomePage() {
  const { data, error, isLoading } = useQuizData()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Quiz Master</h1>
        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          Choose a question set below to start. Answer each question and get instant feedback with explanations.
        </p>
      </header>

      <section aria-label="Available quiz sets">
        {isLoading && <p className="text-center text-sm text-muted-foreground">Loading question sets…</p>}
        {error && (
          <p className="text-center text-sm text-destructive">Failed to load quiz data. Please try again.</p>
        )}
        {data && (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.sets.map((set) => (
              <SetCard key={set.setId} set={set} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
