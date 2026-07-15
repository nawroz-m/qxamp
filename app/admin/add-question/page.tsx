"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuizData } from "@/lib/use-quiz-data";

const OPTION_IDS = ["a", "b", "c", "d"] as const;
const NEW_SET_VALUE = "__new__";
const SET_ID_PATTERN = /^[a-z0-9_-]+$/;

function sanitizeSetId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

type OptionId = (typeof OPTION_IDS)[number];

const initialForm = {
  setMode: "existing" as "existing" | "new",
  existingSetId: "",
  newSetId: "",
  newSetName: "",
  questionText: "",
  explanation: "",
  correctOptionId: "" as OptionId | "",
  optionTexts: { a: "", b: "", c: "", d: "" } as Record<OptionId, string>,
};

export default function AddQuestionPage() {
  const { data, error, isLoading } = useQuizData();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const existingSetIds = data?.sets.map((s) => s.setId) ?? [];
  const trimmedNewSetId = form.newSetId.trim();
  const isNewSetIdDuplicate =
    form.setMode === "new" &&
    trimmedNewSetId.length > 0 &&
    existingSetIds.includes(trimmedNewSetId);
  const isNewSetIdFormatInvalid =
    form.setMode === "new" &&
    trimmedNewSetId.length > 0 &&
    !SET_ID_PATTERN.test(trimmedNewSetId);
  const newSetIdError = isNewSetIdDuplicate
    ? "This Set ID already exists. Please choose another."
    : isNewSetIdFormatInvalid
      ? "Use only lowercase letters, numbers, hyphens, or underscores."
      : null;
  const isNewSetIdValid =
    form.setMode !== "new" ||
    (trimmedNewSetId.length > 0 &&
      SET_ID_PATTERN.test(trimmedNewSetId) &&
      !isNewSetIdDuplicate);

  const isValid =
    (form.setMode === "existing"
      ? !!form.existingSetId
      : isNewSetIdValid && !!form.newSetName.trim()) &&
    !!form.questionText.trim() &&
    OPTION_IDS.every((id) => !!form.optionTexts[id].trim()) &&
    !!form.correctOptionId;

  function handleSetSelection(value: string | null) {
    if (!value) return;
    if (value === NEW_SET_VALUE) {
      setForm((prev) => ({ ...prev, setMode: "new", existingSetId: "" }));
    } else {
      setForm((prev) => ({
        ...prev,
        setMode: "existing",
        existingSetId: value,
        newSetId: "",
        newSetName: "",
      }));
    }
  }

  function resetForm() {
    setForm(initialForm);
    setSubmitError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("setMode", form.setMode);
    if (form.setMode === "existing") {
      formData.set("existingSetId", form.existingSetId);
    } else {
      formData.set("newSetId", form.newSetId.trim());
      formData.set("newSetName", form.newSetName.trim());
    }
    formData.set("questionText", form.questionText.trim());
    formData.set("explanation", form.explanation.trim());
    formData.set("correctOptionId", form.correctOptionId);
    for (const id of OPTION_IDS) {
      formData.set(`optionText_${id}`, form.optionTexts[id].trim());
    }

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error ?? "Failed to save question");
        return;
      }
      setSuccessMessage(
        `Question #${result.questionId} added to "${result.setName}" successfully.`,
      );
      resetForm();
    } catch {
      setSubmitError("Failed to save question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedSetValue =
    form.setMode === "new" ? NEW_SET_VALUE : form.existingSetId || null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="lg">
          <Link href="/" className="flex gap-3">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to Sets</span>
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Add Question
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Create a new quiz question and append it to an existing set or a
          brand-new set.
        </p>
      </header>

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-green-600/30 bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Question Set</CardTitle>
            <CardDescription>
              Choose an existing set or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading sets…</p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                Failed to load sets. Please refresh the page.
              </p>
            )}
            {data && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="set-select">Set</Label>
                  <Select
                    value={selectedSetValue}
                    onValueChange={handleSetSelection}
                  >
                    <SelectTrigger id="set-select" className="w-full">
                      <SelectValue placeholder="Select a question set" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.sets.map((set) => (
                        <SelectItem key={set.setId} value={set.setId}>
                          {set.setName}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_SET_VALUE}>
                        Create New Set
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.setMode === "new" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="newSetId">Set ID</Label>
                        <button
                          type="button"
                          className="inline-flex text-muted-foreground hover:text-foreground"
                          title="Use only lowercase letters, numbers, hyphens, or underscores. No spaces or special characters allowed."
                          aria-label="Set ID format rules"
                        >
                          <Info className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <Input
                        id="newSetId"
                        name="newSetId"
                        placeholder="e.g. set3"
                        value={form.newSetId}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            newSetId: sanitizeSetId(e.target.value),
                          }))
                        }
                        aria-invalid={!!newSetIdError}
                        aria-describedby={
                          newSetIdError ? "newSetId-error" : undefined
                        }
                        required
                      />
                      {newSetIdError && (
                        <p
                          id="newSetId-error"
                          role="alert"
                          className="text-sm text-destructive"
                        >
                          {newSetIdError}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="newSetName">Set Name</Label>
                      <Input
                        id="newSetName"
                        name="newSetName"
                        placeholder="e.g. History Basics"
                        value={form.newSetName}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            newSetName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question</CardTitle>
            <CardDescription>
              Enter the question text and an optional image.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="questionText">Question Text</Label>
              <Textarea
                id="questionText"
                name="questionText"
                placeholder="Enter the question…"
                value={form.questionText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, questionText: e.target.value }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="questionImage">Question Image (optional)</Label>
              <Input
                id="questionImage"
                name="questionImage"
                type="file"
                accept="image/*"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Answer Options</CardTitle>
            <CardDescription>
              Provide four options and mark the correct answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {OPTION_IDS.map((id) => (
              <div
                key={id}
                className="flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`optionText_${id}`}>
                    Option {id.toUpperCase()}
                  </Label>
                  <Input
                    id={`optionText_${id}`}
                    name={`optionText_${id}`}
                    placeholder={`Option ${id.toUpperCase()} text`}
                    value={form.optionTexts[id]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        optionTexts: {
                          ...prev.optionTexts,
                          [id]: e.target.value,
                        },
                      }))
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`optionImage_${id}`}>
                    Option {id.toUpperCase()} Image (optional)
                  </Label>
                  <Input
                    id={`optionImage_${id}`}
                    name={`optionImage_${id}`}
                    type="file"
                    accept="image/*"
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <Label>Correct Answer</Label>
              <RadioGroup
                value={form.correctOptionId}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    correctOptionId: value as OptionId,
                  }))
                }
                className="grid gap-2 sm:grid-cols-2"
              >
                {OPTION_IDS.map((id) => (
                  <label
                    key={id}
                    htmlFor={`correct-${id}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 has-checked:border-primary has-checked:bg-primary/5"
                  >
                    <RadioGroupItem value={id} id={`correct-${id}`} />
                    <span className="text-sm">Option {id.toUpperCase()}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explanation</CardTitle>
            <CardDescription>
              Optional explanation shown after answering.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="explanation">Explanation Text (optional)</Label>
              <Textarea
                id="explanation"
                name="explanation"
                placeholder="Explain the correct answer…"
                value={form.explanation}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, explanation: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="explanationImage">
                Explanation Image (optional)
              </Label>
              <Input
                id="explanationImage"
                name="explanationImage"
                type="file"
                accept="image/*"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          size="lg"
          disabled={!isValid || isSubmitting || isLoading || !!error}
        >
          {isSubmitting ? "Saving…" : "Add Question"}
        </Button>
      </form>
    </main>
  );
}
