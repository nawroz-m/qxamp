"use client"

import { Trophy } from "lucide-react"

export function ScoreCounter({
  score,
  answered,
  total,
}: {
  score: number
  answered: number
  total: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border bg-card/90 px-4 py-2 shadow-sm backdrop-blur">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Trophy className="size-4" aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p className="text-lg font-bold tabular-nums">
          {score}/{total}
        </p>
        <p className="text-xs text-muted-foreground">{answered} answered</p>
      </div>
    </div>
  )
}
