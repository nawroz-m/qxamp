"use client"

import { Suspense } from "react"
import { SetCard } from "@/components/set-card"
import { useQuizData } from "@/lib/use-quiz-data"
import { useSearch } from "@/lib/use-search"

function SetsSection() {
  const { data, error, isLoading } = useQuizData()
  const search = useSearch()
  const hasQuizError = error !== undefined
  const quizError =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "Failed to load quiz data. Please try again."

  const visibleSets =
    data && search.hasActiveSearch
      ? data.sets.filter((set) =>
          search.results.some((result) => result.setId === set.setId),
        )
      : data?.sets ?? []

  return (
    <section aria-label="Available quiz sets" className="flex flex-col gap-4">
      {search.hasActiveSearch && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {search.isLoading
              ? "Searching…"
              : `${search.totalCount} result${search.totalCount === 1 ? "" : "s"}`}
            {search.query ? (
              <>
                {" "}
                for <span className="font-medium text-foreground">“{search.query}”</span>
              </>
            ) : null}
            {search.tagFilter ? (
              <>
                {" "}
                tagged <span className="font-medium text-foreground">#{search.tagFilter}</span>
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => search.clearSearch()}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {isLoading && (
        <p className="text-center text-sm text-muted-foreground">
          Loading question sets…
        </p>
      )}
      {hasQuizError && (
        <p className="text-center text-sm text-destructive">{quizError}</p>
      )}
      {data && visibleSets.length === 0 && search.hasActiveSearch && (
        <p className="text-center text-sm text-muted-foreground">
          No matching sets. Try a different name or tag.
        </p>
      )}
      {data && visibleSets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {visibleSets.map((set) => (
            <SetCard key={set.setId} set={set} />
          ))}
        </div>
      )}
      {data && !search.hasActiveSearch && data.sets.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No quiz sets yet. Create one to get started.
        </p>
      )}
    </section>
  )
}

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-10">
      <div className="sr-only">
        <h1>QXAMP</h1>
        <p>Turn What You Learn Into What You Remember</p>
      </div>

      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">
            Loading question sets…
          </p>
        }
      >
        <SetsSection />
      </Suspense>
    </main>
  )
}
