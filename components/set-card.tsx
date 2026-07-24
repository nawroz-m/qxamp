"use client";

import Link from "next/link";
import { ArrowBigDown, ArrowBigUp, Bookmark, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CommentThread,
  CommentTriggerButton,
} from "@/components/comment-thread";
import type { QuizSet } from "@/lib/quiz-types";
import { resolveCoverImage } from "@/lib/cover-images";
import { useComments } from "@/lib/use-comments";
import { useSetActions } from "@/lib/use-set-actions";
import { cn } from "@/lib/utils";

function formatRelativeTimestamp(timestamp?: number) {
  if (!timestamp) return "Recently";

  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatReadTime(questionCount: number) {
  const minutes = Math.max(1, Math.ceil(questionCount * 0.5));
  return `${minutes}m read`;
}

function ActionButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer",
        active && "text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function SetCard({ set }: { set: QuizSet }) {
  const actions = useSetActions(set.setId);
  const commentsState = useComments(set.setId);

  const tags = (set.tags ?? []).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  const coverImage = resolveCoverImage(set.coverImage);
  const metadata = `${formatRelativeTimestamp(set.createdAt)} • ${formatReadTime(set.questions.length)}`;

  function stopCardNavigation(event: React.MouseEvent | React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <>
      <Card className="group overflow-hidden rounded-2xl transition-all hover:border-primary/40 hover:ring-primary/30 relative">
        <Link
          href={`/quiz/${set.setId}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Badge variant="secondary" className="absolute top-3 right-3">
            {set.questions.length} questions
          </Badge>
          <div className="flex flex-col gap-3 px-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold leading-snug text-balance">
                  {set.setName}
                </h3>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{metadata}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 px-4">
            <img
              src={coverImage}
              alt=""
              className="aspect-[16/9] w-full rounded-xl border object-cover"
            />
          </div>
        </Link>

        <footer
          className="mt-3 flex items-center justify-between gap-2 border-t px-3 py-2"
          onClick={stopCardNavigation}
          onKeyDown={stopCardNavigation}
        >
          <div className="flex items-center gap-0.5">
            <ActionButton
              label="Upvote"
              onClick={() => void actions.vote("up")}
              disabled={actions.isUpdating}
              active={actions.userAction.vote === "up"}
            >
              <ArrowBigUp className="size-4" aria-hidden="true" />
              <span className="text-xs font-medium tabular-nums">
                {actions.stats.upvotes}
              </span>
            </ActionButton>

            <ActionButton
              label="Downvote"
              onClick={() => void actions.vote("down")}
              disabled={actions.isUpdating}
              active={actions.userAction.vote === "down"}
            >
              <ArrowBigDown className="size-4" aria-hidden="true" />
            </ActionButton>

            <CommentTriggerButton
              count={actions.stats.comments}
              onClick={() => void commentsState.open()}
              disabled={actions.isUpdating}
            />
          </div>

          <div className="flex items-center gap-0.5">
            <ActionButton
              label={
                actions.userAction.bookmarked ? "Remove bookmark" : "Bookmark"
              }
              onClick={() => void actions.toggleBookmark()}
              disabled={actions.isUpdating}
              active={actions.userAction.bookmarked}
            >
              <Bookmark
                className={cn(
                  "size-4",
                  actions.userAction.bookmarked && "fill-current",
                  "cursor-pointer",
                )}
                aria-hidden="true"
              />
            </ActionButton>

            <ActionButton
              label="Share"
              onClick={() => void actions.share()}
              disabled={actions.isUpdating}
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span className="text-xs font-medium tabular-nums ">
                {actions.stats.shares}
              </span>
            </ActionButton>
          </div>
        </footer>
      </Card>

      <CommentThread
        setName={set.setName}
        commentsState={commentsState}
        onCommentAdded={() => void actions.refresh()}
      />
    </>
  );
}
