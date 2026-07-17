"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Sparkles, Trash2 } from "lucide-react";
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
import { sanitizeGeneratedQuestion } from "@/lib/quiz-storage";

const OPTION_IDS = ["a", "b", "c", "d"] as const;
const NEW_SET_VALUE = "__new__";
const SET_ID_PATTERN = /^[a-z0-9_-]+$/;

type OptionId = (typeof OPTION_IDS)[number];

type GeneratedOption = {
  id: OptionId;
  text: string;
};

type GeneratedQuestion = {
  questionText: string;
  options: GeneratedOption[];
  correctOptionId: OptionId;
  explanation: string;
};

function sanitizeSetId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

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
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const existingSetIds = data?.sets.map((s) => s.setId) ?? [];
  const hasQuizDataError = error !== undefined;
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

  function updateGeneratedQuestion(
    index: number,
    updater: (question: GeneratedQuestion) => GeneratedQuestion,
  ) {
    setGeneratedQuestions((prev) =>
      prev.map((question, questionIndex) =>
        questionIndex === index ? updater(question) : question,
      ),
    );
  }

  async function handleGenerateQuestions() {
    if (!aiPrompt.trim() || isAiGenerating) return;

    setIsAiGenerating(true);
    setAiError(null);
    setAiSuccess(null);

    try {
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: aiPrompt.trim(), model: aiModel }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? "Failed to generate questions.");
      }

      const generatedItems: unknown[] = Array.isArray(result.questions) ? result.questions : [];
      const nextQuestions = generatedItems
        .map((item: unknown) => sanitizeGeneratedQuestion(item))
        .filter((item: GeneratedQuestion | null): item is GeneratedQuestion => Boolean(item));

      if (nextQuestions.length === 0) {
        throw new Error("No questions were returned.");
      }

      setGeneratedQuestions(nextQuestions);
      setIsAiPanelOpen(true);
    } catch (err) {
      setGeneratedQuestions([]);
      setAiError(
        err instanceof Error ? err.message : "Failed to generate questions.",
      );
    } finally {
      setIsAiGenerating(false);
    }
  }

  async function handleAcceptGeneratedQuestions() {
    if (!generatedQuestions.length) return;

    const canSaveToSet =
      (form.setMode === "existing"
        ? !!form.existingSetId
        : isNewSetIdValid && !!form.newSetName.trim()) || false;

    if (!canSaveToSet) {
      setAiError("Please choose a set before accepting generated questions.");
      return;
    }

    setAiError(null);
    setAiSuccess(null);

    try {
      const payload = {
        setMode: form.setMode,
        setName: form.setMode === "new" ? form.newSetName.trim() : undefined,
        setId: form.setMode === "new" ? form.newSetId.trim() : form.existingSetId,
        questions: generatedQuestions.map((question) => ({
          questionText: question.questionText.trim(),
          options: question.options.map((option) => ({ id: option.id, text: option.text.trim() })),
          correctOptionId: question.correctOptionId,
          explanation: question.explanation.trim(),
        })),
      };

      const res = await fetch("/api/questions/save-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? "Failed to save generated questions.");
      }

      setAiSuccess(`Generated questions were added to "${result.setName}" successfully.`);
      setGeneratedQuestions([]);
      setAiPrompt("");
      setIsAiPanelOpen(false);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Failed to save generated questions.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="lg">
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
            {hasQuizDataError && (
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Generate with AI</CardTitle>
                <CardDescription>
                  Paste notes, articles, or raw text and turn them into editable
                  MCQ questions.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAiPanelOpen((prev) => !prev)}
              >
                {isAiPanelOpen ? "Hide" : "Open"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!isAiPanelOpen ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Paste content to generate questions quickly, then review and
                accept them for your selected set.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ai-prompt">Paste content</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Paste your notes or content here to generate questions..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={7}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 flex flex-col gap-2">
                    <Label htmlFor="ai-model">Model</Label>
                    <Select
                      value={aiModel}
                      onValueChange={(value) => setAiModel(value ?? "gpt-4o-mini")}
                    >
                      <SelectTrigger id="ai-model" className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">
                          OpenAI GPT-4o mini
                        </SelectItem>
                        <SelectItem value="gpt-4o">OpenAI GPT-4o</SelectItem>
                        <SelectItem value="claude" disabled>
                          Claude (coming soon)
                        </SelectItem>
                        <SelectItem value="gemini" disabled>
                          Gemini (coming soon)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerateQuestions}
                    disabled={!aiPrompt.trim() || isAiGenerating}
                  >
                    {isAiGenerating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="size-4" />
                        Generate
                      </span>
                    )}
                  </Button>
                </div>

                {aiError && (
                  <p role="alert" className="text-sm text-destructive">
                    {aiError}
                  </p>
                )}

                {aiSuccess && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-lg border border-green-600/30 bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{aiSuccess}</span>
                  </div>
                )}

                {generatedQuestions.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                      <div>
                        <p className="font-medium">Editable preview</p>
                        <p className="text-sm text-muted-foreground">
                          Review each question before accepting it into your set.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateQuestions}
                          disabled={isAiGenerating}
                        >
                          Regenerate
                        </Button>
                        <Button type="button" onClick={handleAcceptGeneratedQuestions}>
                          Accept
                        </Button>
                      </div>
                    </div>

                    {generatedQuestions.map((question, questionIndex) => (
                      <div
                        key={`${questionIndex}-${question.questionText}`}
                        className="flex flex-col gap-4 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">Question {questionIndex + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            Edit before accepting
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`generated-question-${questionIndex}`}>
                            Question text
                          </Label>
                          <Textarea
                            id={`generated-question-${questionIndex}`}
                            value={question.questionText}
                            onChange={(e) =>
                              updateGeneratedQuestion(questionIndex, (prev) => ({
                                ...prev,
                                questionText: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label>Options</Label>
                          <div className="flex flex-col gap-2">
                            {question.options.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                              >
                                <input
                                  type="radio"
                                  id={`generated-${questionIndex}-${option.id}`}
                                  name={`generated-correct-${questionIndex}`}
                                  checked={question.correctOptionId === option.id}
                                  onChange={() =>
                                    updateGeneratedQuestion(questionIndex, (prev) => ({
                                      ...prev,
                                      correctOptionId: option.id,
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor={`generated-${questionIndex}-${option.id}`}
                                  className="min-w-16 text-sm"
                                >
                                  {option.id.toUpperCase()}
                                </Label>
                                <Input
                                  value={option.text}
                                  onChange={(e) =>
                                    updateGeneratedQuestion(questionIndex, (prev) => ({
                                      ...prev,
                                      options: prev.options.map((item) =>
                                        item.id === option.id
                                          ? { ...item, text: e.target.value }
                                          : item,
                                      ),
                                    }))
                                  }
                                  placeholder={`Option ${option.id.toUpperCase()} text`}
                                />
                                <button
                                  type="button"
                                  className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                  onClick={() =>
                                    updateGeneratedQuestion(questionIndex, (prev) => ({
                                      ...prev,
                                      options: prev.options.map((item) =>
                                        item.id === option.id
                                          ? { ...item, text: "" }
                                          : item,
                                      ),
                                    }))
                                  }
                                  aria-label={`Clear option ${option.id.toUpperCase()}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`generated-explanation-${questionIndex}`}>
                            Explanation (optional)
                          </Label>
                          <Textarea
                            id={`generated-explanation-${questionIndex}`}
                            value={question.explanation}
                            onChange={(e) =>
                              updateGeneratedQuestion(questionIndex, (prev) => ({
                                ...prev,
                                explanation: e.target.value,
                              }))
                            }
                            placeholder="Explain the correct answer..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {!isAiPanelOpen && (
          <>
          
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
        </>
        )}
      </form>
    </main>
  );
}
