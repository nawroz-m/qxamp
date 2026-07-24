"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { useComments } from "@/lib/use-comments";
import { cn } from "@/lib/utils";

type CommentThreadProps = {
  setName: string;
  commentsState: ReturnType<typeof useComments>;
  onCommentAdded?: () => void;
};

function formatCommentTime(timestamp: number) {
  if (!timestamp) return "Just now";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function CommentThread({
  setName,
  commentsState,
  onCommentAdded,
}: CommentThreadProps) {
  const {
    comments,
    isOpen,
    isLoading,
    isSubmitting,
    error,
    close,
    addComment,
  } = commentsState;
  const [draft, setDraft] = useState("");

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const posted = await addComment(trimmed);
    if (posted) {
      setDraft("");
      onCommentAdded?.();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Comments for ${setName}`}
      onClick={close}
    >
      <div
        className="flex max-h-[min(80vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg ring-1 ring-foreground/10"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold">Discussion</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            aria-label="Close comments"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading comments…
            </p>
          )}

          {!isLoading && comments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No comments yet. Start the discussion.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li
                key={comment.commentId}
                className="rounded-lg border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {comment.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                  {comment.text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <form className="border-t p-4" onSubmit={handleSubmit}>
          <label htmlFor={`comment-input-${setName}`} className="sr-only">
            Write a comment
          </label>
          <Textarea
            id={`comment-input-${setName}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            disabled={isSubmitting}
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !draft.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Post comment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CommentTriggerButton({
  count,
  onClick,
  disabled,
  className,
}: {
  count: number;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Open comments (${count})`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer",
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      <span className="text-xs font-medium tabular-nums">{count}</span>
    </button>
  );
}
