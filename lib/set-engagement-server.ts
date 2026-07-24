import crypto from "node:crypto"
import type { NextRequest } from "next/server"
import { ServerValue } from "firebase-admin/database"
import { authenticateRequest } from "@/lib/auth-server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  DEFAULT_SET_STATS,
  type SetComment,
  type SetStats,
  type UserSetAction,
} from "@/lib/engagement-types"

export function hashActorId(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export async function resolveActor(request: NextRequest) {
  const authUser = await authenticateRequest(request)
  if (authUser) {
    return {
      uidHash: hashActorId(authUser.uid),
      uid: authUser.uid,
      displayName: authUser.identifier,
    }
  }

  const anonymousId = request.headers.get("x-anonymous-id")?.trim()
  if (anonymousId) {
    return {
      uidHash: hashActorId(anonymousId),
      uid: anonymousId,
      displayName: "Anonymous",
    }
  }

  return null
}

function normalizeStats(raw: unknown): SetStats {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    upvotes: Number(source.upvotes ?? 0),
    downvotes: Number(source.downvotes ?? 0),
    comments: Number(source.comments ?? 0),
    shares: Number(source.shares ?? 0),
  }
}

function normalizeUserAction(raw: unknown): UserSetAction {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const vote = source.vote
  return {
    vote: vote === "up" || vote === "down" ? vote : null,
    bookmarked: Boolean(source.bookmarked),
  }
}

function computeVoteDeltas(prevVote: "up" | "down" | null, nextVote: "up" | "down" | null) {
  const deltas = { upvotes: 0, downvotes: 0 }

  if (prevVote === "up") deltas.upvotes -= 1
  if (prevVote === "down") deltas.downvotes -= 1
  if (nextVote === "up") deltas.upvotes += 1
  if (nextVote === "down") deltas.downvotes += 1

  return deltas
}

export async function getSetEngagement(setId: string, uidHash?: string | null) {
  const db = getAdminDb()
  if (!db) {
    return {
      stats: DEFAULT_SET_STATS,
      userAction: { vote: null, bookmarked: false } satisfies UserSetAction,
    }
  }

  const statsSnapshot = await db.ref(`setStats/${setId}`).once("value")
  const stats = normalizeStats(statsSnapshot.val())

  if (!uidHash) {
    return {
      stats,
      userAction: { vote: null, bookmarked: false } satisfies UserSetAction,
    }
  }

  const actionSnapshot = await db.ref(`userActions/${setId}/${uidHash}`).once("value")
  const userAction = normalizeUserAction(actionSnapshot.val())

  return { stats, userAction }
}

export async function applyVote(setId: string, uidHash: string, desiredVote: "up" | "down") {
  const db = getAdminDb()
  if (!db) {
    throw new Error("Engagement service is not configured.")
  }

  const userRef = db.ref(`userActions/${setId}/${uidHash}`)
  let statDeltas = { upvotes: 0, downvotes: 0 }

  const result = await userRef.transaction((current) => {
    const previous = normalizeUserAction(current)
    const nextVote = previous.vote === desiredVote ? null : desiredVote
    statDeltas = computeVoteDeltas(previous.vote, nextVote)

    return {
      vote: nextVote,
      bookmarked: previous.bookmarked,
    }
  })

  if (!result.committed) {
    throw new Error("Unable to apply vote.")
  }

  const updates: Record<string, unknown> = {}
  if (statDeltas.upvotes !== 0) {
    updates[`setStats/${setId}/upvotes`] = ServerValue.increment(statDeltas.upvotes)
  }
  if (statDeltas.downvotes !== 0) {
    updates[`setStats/${setId}/downvotes`] = ServerValue.increment(statDeltas.downvotes)
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates)
  }

  return normalizeUserAction(result.snapshot.val())
}

export async function toggleBookmark(setId: string, uidHash: string) {
  const db = getAdminDb()
  if (!db) {
    throw new Error("Engagement service is not configured.")
  }

  const userRef = db.ref(`userActions/${setId}/${uidHash}`)
  const result = await userRef.transaction((current) => {
    const previous = normalizeUserAction(current)
    return {
      vote: previous.vote,
      bookmarked: !previous.bookmarked,
    }
  })

  if (!result.committed) {
    throw new Error("Unable to update bookmark.")
  }

  return normalizeUserAction(result.snapshot.val())
}

export async function incrementShare(setId: string) {
  const db = getAdminDb()
  if (!db) {
    throw new Error("Engagement service is not configured.")
  }

  await db.ref(`setStats/${setId}`).update({ shares: ServerValue.increment(1) })
}

export async function listComments(setId: string) {
  const db = getAdminDb()
  if (!db) {
    return [] as SetComment[]
  }

  const snapshot = await db.ref(`comments/${setId}`).once("value")
  const raw = snapshot.val()

  if (!raw || typeof raw !== "object") {
    return [] as SetComment[]
  }

  return Object.entries(raw as Record<string, unknown>)
    .map(([commentId, value]) => {
      const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
      return {
        commentId,
        text: typeof source.text === "string" ? source.text : "",
        authorUid: typeof source.authorUid === "string" ? source.authorUid : null,
        displayName: typeof source.displayName === "string" ? source.displayName : "Anonymous",
        createdAt: Number(source.createdAt ?? 0),
      } satisfies SetComment
    })
    .filter((comment) => comment.text.trim().length > 0)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function addComment(params: {
  setId: string
  text: string
  authorUid: string | null
  displayName: string
}) {
  const db = getAdminDb()
  if (!db) {
    throw new Error("Engagement service is not configured.")
  }

  const trimmed = params.text.trim()
  if (!trimmed) {
    throw new Error("Comment text is required.")
  }

  const commentRef = db.ref(`comments/${params.setId}`).push()
  const commentId = commentRef.key
  if (!commentId) {
    throw new Error("Unable to create comment.")
  }

  const createdAt = Date.now()
  const comment: Omit<SetComment, "commentId"> = {
    text: trimmed,
    authorUid: params.authorUid,
    displayName: params.displayName,
    createdAt,
  }

  await commentRef.set(comment)
  await db.ref(`setStats/${params.setId}`).update({ comments: ServerValue.increment(1) })

  return { commentId, ...comment } satisfies SetComment
}

export async function removeComment(setId: string, commentId: string) {
  const db = getAdminDb()
  if (!db) {
    throw new Error("Engagement service is not configured.")
  }

  const commentRef = db.ref(`comments/${setId}/${commentId}`)
  const snapshot = await commentRef.once("value")
  if (!snapshot.exists()) {
    throw new Error("Comment not found.")
  }

  await commentRef.remove()
  await db.ref(`setStats/${setId}`).update({ comments: ServerValue.increment(-1) })
}
