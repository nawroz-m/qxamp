"use client"

import Link from "next/link"
import { ArrowRight, ListChecks } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { QuizSet } from "@/lib/quiz-types"

export function SetCard({ set }: { set: QuizSet }) {
  return (
    <Link href={`/quiz/${set.setId}`} className="group block focus:outline-none">
      <Card className="h-full transition-colors group-hover:border-primary group-focus-visible:border-primary">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <ListChecks className="size-5" aria-hidden="true" />
            </span>
            <Badge variant="secondary">{set.questions.length} questions</Badge>
          </div>
          <CardTitle className="mt-4 text-balance">{set.setName}</CardTitle>
          <CardDescription>Test your knowledge with this question set.</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Start quiz
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
