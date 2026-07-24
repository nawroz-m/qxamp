"use client"

import { useCallback, useState } from "react"
import { getActorDisplayName, getActorHeaders } from "@/lib/actor-identity"
import { getAuthHeaders } from "@/lib/auth-client"
import type { SetComment } from "@/lib/engagement-types"

function buildCommentHeaders() {
  return {
    ...getAuthHeaders(),
    ...getActorHeaders(),
    "Content-Type": "application/json",
  }
}

export function useComments(setId: string) {
  const [comments, setComments] = useState<SetComment[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sets/${encodeURIComponent(setId)}/comments`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to load comments.")
      }

      const payload = (await response.json()) as { comments?: SetComment[] }
      setComments(payload.comments ?? [])
      setHasLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments.")
    } finally {
      setIsLoading(false)
    }
  }, [setId])

  const open = useCallback(async () => {
    setIsOpen(true)
    if (!hasLoaded) {
      await loadComments()
    }
  }, [hasLoaded, loadComments])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const addComment = useCallback(
    async (text: string) => {
      setIsSubmitting(true)
      setError(null)

      try {
        const response = await fetch(`/api/sets/${encodeURIComponent(setId)}/comments`, {
          method: "POST",
          headers: buildCommentHeaders(),
          body: JSON.stringify({
            text,
            displayName: getActorDisplayName(),
          }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Failed to post comment.")
        }

        const payload = (await response.json()) as { comment?: SetComment }
        if (payload.comment) {
          setComments((current) => [...current, payload.comment!])
        } else {
          await loadComments()
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post comment.")
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [loadComments, setId],
  )

  return {
    comments,
    isOpen,
    isLoading,
    isSubmitting,
    error,
    open,
    close,
    addComment,
    reload: loadComments,
  }
}
