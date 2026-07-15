"use client";

import { Check, X, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/quiz-types";

function resolveImage(path?: string) {
  if (!path) return undefined;
  // stored paths look like "images/questions/gk-3.png" and live in /public/images/...
  return `/${path.replace(/^\/+/, "")}`;
}

export function QuestionCard({
  question,
  index,
  selectedOptionId,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}) {
  const answered = selectedOptionId !== undefined;
  const isCorrect = selectedOptionId === question.correctOptionId;
  const questionImage = resolveImage(question.questionImage);
  const explanationImage = resolveImage(question.explanationImage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Badge
            variant={
              answered ? (isCorrect ? "default" : "destructive") : "secondary"
            }
            className="mt-0.5 shrink-0"
          >
            Q{index + 1}
          </Badge>
          <h2 className="text-pretty text-base font-semibold leading-relaxed sm:text-lg">
            {question.questionText}
          </h2>
        </div>
        {questionImage && (
          <img
            src={questionImage || "/placeholder.svg"}
            alt={`Illustration for question ${index + 1}`}
            className="mt-3 max-h-64 w-full rounded-lg border object-cover"
          />
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2" role="list">
          {question.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const isTheCorrect = option.id === question.correctOptionId;
            const showCorrect = answered && isTheCorrect;
            const showWrong = answered && isSelected && !isTheCorrect;
            const optionImage = resolveImage(option.img);

            return (
              <li key={option.id}>
                <button
                  type="button"
                  // disabled={answered}
                  onClick={() => onSelect(option.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                    "hover:border-primary hover:bg-accent cursor-pointer",
                    // "disabled:cursor-not-allowed",
                    // !answered && "hover:border-primary hover:bg-accent",
                    showCorrect &&
                      "border-green-600 bg-green-50 text-green-900 dark:border-green-500 dark:bg-green-950/40 dark:text-green-100",
                    showWrong &&
                      "border-red-600 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100",
                    answered && !showCorrect && !showWrong && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase",
                      showCorrect && "border-green-600 bg-green-600 text-white",
                      showWrong && "border-red-600 bg-red-600 text-white",
                    )}
                  >
                    {showCorrect ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : showWrong ? (
                      <X className="size-3.5" aria-hidden="true" />
                    ) : (
                      option.id
                    )}
                  </span>
                  <span className="flex-1">{option.text}</span>
                  {optionImage && (
                    <img
                      src={optionImage || "/placeholder.svg"}
                      alt={`Option ${option.id}`}
                      className="size-12 rounded-md border object-cover"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {answered && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-primary" aria-hidden="true" />
              {isCorrect ? "Correct!" : "Explanation"}
            </div>
            {question.explanation && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {question.explanation}
              </p>
            )}
            {explanationImage && (
              <img
                src={explanationImage || "/placeholder.svg"}
                alt={`Explanation for question ${index + 1}`}
                className="mt-3 max-h-64 w-full rounded-lg border object-cover"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
