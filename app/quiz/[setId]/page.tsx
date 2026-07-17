"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/question-card";
import { ScoreCounter } from "@/components/score-counter";
import { useQuizData } from "@/lib/use-quiz-data";
import { Shuffle } from "lucide-react";

function shuffleArray<T>(array: T[]): T[] {
  // Fisher–Yates shuffle
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function QuizPage() {
  const params = useParams<{ setId: string }>();
  const { data, error, isLoading } = useQuizData();
  // answers maps questionId -> selected option id
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [displayQuestions, setDisplayQuestions] = useState<
    typeof set extends undefined ? any[] : any[]
  >([]);

  const set = useMemo(
    () => data?.sets.find((s) => s.setId === params.setId),
    [data, params.setId],
  );

  const total = set?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const score = useMemo(() => {
    if (!set) return 0;
    return set.questions.reduce(
      (acc, q) => (answers[(q.firebaseKey ?? "") || String(q.questionText)] === q.correctOptionId ? acc + 1 : acc),
      0,
    );
  }, [set, answers]);

  function handleSelect(questionKey: string, optionId: string) {
    setAnswers((prev) => {
      return { ...prev, [questionKey]: optionId };
    });
  }

  function shuffleQuiz() {
    if (!set) return;

    const shuffledQuestions = shuffleArray(
      set.questions.map((question) => ({
        ...question,
        options: shuffleArray(question.options),
      })),
    );

    setDisplayQuestions(shuffledQuestions);
    setAnswers({});
  }

  useEffect(() => {
    if (!set) return;

    setDisplayQuestions(set.questions);
  }, [set]);

  function resetQuiz() {
    setAnswers({});
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="lg">
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
      {error instanceof Error && (
        <p className="text-center text-sm text-destructive">
          Failed to load quiz data.
        </p>
      )}
      {data && !set && (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This quiz set could not be found.
          </p>
          <Button className="mt-4" size="sm">
            <Link href="/">Back to Sets</Link>
          </Button>
        </div>
      )}

      {set && (
        <>
          <header className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-balance text-2xl font-bold tracking-tight">
              {set.setName}
              <span className="text-sm text-muted-foreground"> ({total})</span>
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={shuffleQuiz}
              className="cursor-pointer"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle
            </Button>
          </header>

          <div className="flex flex-col gap-5">
            {displayQuestions.map((question, index) => {
              const questionKey = question.firebaseKey ?? `${question.questionText}-${index}`;
              return (
                <QuestionCard
                  key={questionKey}
                  question={question}
                  index={index}
                  selectedOptionId={answers[questionKey]}
                  onSelect={(optionId) => handleSelect(questionKey, optionId)}
                />
              );
            })}
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
