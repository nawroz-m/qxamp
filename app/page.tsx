"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/components/set-card";
import { useQuizData } from "@/lib/use-quiz-data";
import { AuthNav } from "@/components/auth-nav";

export default function HomePage() {
  const { data, error, isLoading } = useQuizData();
  const hasQuizError = error !== undefined;
  const quizError = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : "Failed to load quiz data. Please try again.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col items-center gap-3 text-center ">
        <span className="flex gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground ">
            <img
              src={"/apple-icon.png"}
              alt={`QXAMP`}
              width={100}
              height={100}
              className="border-0 object-cover rounded-full"
            />
          </span>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            QXAMP
          </h1>
        </span>
        <h2 className="text-balance  font-semibold leading-relaxed">
          Turn What You Learn Into What You Remember
        </h2>
        <p  className="sr-only max-w-md text-pretty leading-relaxed text-muted-foreground">
          QXAMP transforms your notes, articles, and study material into interactive quizzes — instantly.
          Paste your content, choose how many questions you want, and let AI turn it into a quiz you can revisit anytime, anywhere.
        </p>
        <p className="sr-only max-w-md text-pretty leading-relaxed text-muted-foreground">
          Every quiz you create joins a growing, community-built library — anonymous,
          open, and free for anyone curious enough to learn something new by simply answering a question.
          </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="lg">
            <Link href="/admin/add-question" className="p-4 flex gap-2">
              <Plus className="size-4" aria-hidden="true" />{" "}
              <span>Add Question</span>
            </Link>
          </Button>
          <AuthNav />
        </div>
      </header>

      <section aria-label="Available quiz sets">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Loading question sets…
          </p>
        )}
        {hasQuizError && (
          <p className="text-center text-sm text-destructive">{quizError}</p>
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
  );
}
