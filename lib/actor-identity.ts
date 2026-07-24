import { getStoredAuthUser } from "@/lib/auth-client"

const ANON_ID_STORAGE_KEY = "quiz-anon-id"

export function getAnonymousId() {
  if (typeof window === "undefined") {
    return null
  }

  const existing = window.localStorage.getItem(ANON_ID_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`

  window.localStorage.setItem(ANON_ID_STORAGE_KEY, generated)
  return generated
}

export function getActorId() {
  const authUser = getStoredAuthUser()
  if (authUser?.uid) {
    return authUser.uid
  }

  return getAnonymousId()
}

export function getActorDisplayName() {
  const authUser = getStoredAuthUser()
  if (authUser?.identifier) {
    const atIndex = authUser.identifier.indexOf("@")
    if (atIndex > 0) {
      return authUser.identifier.slice(0, atIndex)
    }
    return authUser.identifier
  }

  return "Anonymous"
}

export function getActorHeaders() {
  const actorId = getActorId()
  return actorId ? ({ "X-Anonymous-Id": actorId } as Record<string, string>) : {}
}
