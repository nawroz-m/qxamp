"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/question-card";
import { ScoreCounter } from "@/components/score-counter";
import { useQuizData } from "@/lib/use-quiz-data";

export default function QuizPage() {
  const params = useParams<{ setId: string }>();
  const { data, error, isLoading } = useQuizData();
  // answers maps questionId -> selected option id
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const set = useMemo(
    () => data?.sets.find((s) => s.setId === params.setId),
    [data, params.setId],
  );

  const total = set?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const score = useMemo(() => {
    if (!set) return 0;
    return set.questions.reduce(
      (acc, q) => (answers[q.id] === q.correctOptionId ? acc + 1 : acc),
      0,
    );
  }, [set, answers]);

  function handleSelect(questionId: number, optionId: string) {
    setAnswers((prev) => {
      if (prev[questionId] !== undefined) return prev; // locked
      return { ...prev, [questionId]: optionId };
    });
  }

  function resetQuiz() {
    setAnswers({});
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="lg">
          <Link href="/" className="flex gap-3">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to Sets</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetQuiz}
          disabled={answeredCount === 0}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset Quiz
        </Button>
      </div>

      {isLoading && (
        <p className="text-center text-sm text-muted-foreground">
          Loading questions…
        </p>
      )}
      {error && (
        <p className="text-center text-sm text-destructive">
          Failed to load quiz data.
        </p>
      )}
      {data && !set && (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This quiz set could not be found.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/">Back to Sets</Link>
          </Button>
        </div>
      )}

      {set && (
        <>
          <header className="mb-6">
            <h1 className="text-balance text-2xl font-bold tracking-tight">
              {set.setName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {total} questions · select an answer to lock it in
            </p>
          </header>

          <div className="flex flex-col gap-5">
            {set.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                selectedOptionId={answers[question.id]}
                onSelect={(optionId) => handleSelect(question.id, optionId)}
              />
            ))}
          </div>
        </>
      )}

      {set && (
        <div className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2">
          <ScoreCounter score={score} answered={answeredCount} total={total} />
        </div>
      )}
    </main>
  );
}
