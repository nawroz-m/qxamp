"use client"

import { useCallback, useEffect, useState } from "react"
import { getActorHeaders, getActorId } from "@/lib/actor-identity"
import { getAuthHeaders } from "@/lib/auth-client"
import { DEFAULT_SET_STATS, type SetStats, type UserSetAction } from "@/lib/engagement-types"

function buildEngagementHeaders() {
  return {
    ...getAuthHeaders(),
    ...getActorHeaders(),
    "Content-Type": "application/json",
  }
}

export function useSetActions(setId: string) {
  const [stats, setStats] = useState<SetStats>(DEFAULT_SET_STATS)
  const [userAction, setUserAction] = useState<UserSetAction>({ vote: null, bookmarked: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch(`/api/sets/${encodeURIComponent(setId)}/engagement`, {
        headers: buildEngagementHeaders(),
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to load engagement data.")
      }

      const payload = (await response.json()) as {
        stats?: SetStats
        userAction?: UserSetAction
      }

      setStats(payload.stats ?? DEFAULT_SET_STATS)
      setUserAction(payload.userAction ?? { vote: null, bookmarked: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load engagement data.")
    } finally {
      setIsLoading(false)
    }
  }, [setId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const performAction = useCallback(
    async (body: Record<string, unknown>) => {
      if (!getActorId()) {
        setError("Unable to identify this browser session.")
        return null
      }

      setIsUpdating(true)
      setError(null)

      try {
        const response = await fetch(`/api/sets/${encodeURIComponent(setId)}/engagement`, {
          method: "POST",
          headers: buildEngagementHeaders(),
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Failed to update engagement.")
        }

        const payload = (await response.json()) as {
          stats?: SetStats
          userAction?: UserSetAction
        }

        if (payload.stats) setStats(payload.stats)
        if (payload.userAction) setUserAction(payload.userAction)

        return payload
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update engagement.")
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    [setId],
  )

  const vote = useCallback(
    (voteValue: "up" | "down") => performAction({ action: "vote", vote: voteValue }),
    [performAction],
  )

  const toggleBookmark = useCallback(() => performAction({ action: "bookmark" }), [performAction])

  const share = useCallback(async () => {
    const payload = await performAction({ action: "share" })
    if (!payload) return false

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/quiz/${encodeURIComponent(setId)}`
        : `/quiz/${setId}`

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "QXAMP Quiz Set", url: shareUrl })
      } catch {
        // User dismissed native share sheet.
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
    }

    return true
  }, [performAction, setId])

  return {
    stats,
    userAction,
    isLoading,
    isUpdating,
    error,
    vote,
    toggleBookmark,
    share,
    refresh,
  }
}
