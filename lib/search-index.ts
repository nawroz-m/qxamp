import { buildDbUrl } from "@/lib/firebase"

export const MAX_SET_TAGS = 8

export type SearchIndexEntry = {
  setId: string
  setName: string
  tags: string[]
  searchTokens: string[]
  createdAt: number
}

export function normalizeTags(raw: unknown, max = MAX_SET_TAGS): string[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const tags: string[] = []

  for (const item of raw) {
    if (typeof item !== "string") continue
    const tag = item.trim().toLowerCase().replace(/^#/, "")
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= max) break
  }

  return tags
}

export function buildSearchTokens(setName: string, tags: string[]): string[] {
  const tokens = new Set<string>()

  function add(value: string) {
    const lower = value.trim().toLowerCase()
    if (!lower) return
    tokens.add(lower)
    for (const part of lower.split(/[\s/_-]+/)) {
      if (part) tokens.add(part)
    }
  }

  add(setName)
  for (const tag of tags) add(tag)

  return Array.from(tokens)
}

export function buildSearchIndexEntry(params: {
  setId: string
  setName: string
  tags?: string[] | null
  createdAt?: number | null
}): SearchIndexEntry {
  const tags = normalizeTags(params.tags ?? [])
  return {
    setId: params.setId,
    setName: params.setName.trim(),
    tags,
    searchTokens: buildSearchTokens(params.setName, tags),
    createdAt: typeof params.createdAt === "number" ? params.createdAt : Date.now(),
  }
}

export async function upsertSearchIndexEntry(entry: SearchIndexEntry): Promise<void> {
  const response = await fetch(buildDbUrl(`searchIndex/${encodeURIComponent(entry.setId)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      setName: entry.setName,
      tags: entry.tags,
      searchTokens: entry.searchTokens,
      createdAt: entry.createdAt,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update search index (${response.status})`)
  }
}

export function normalizeSearchIndex(raw: unknown): SearchIndexEntry[] {
  if (!raw || typeof raw !== "object") return []

  return Object.entries(raw as Record<string, unknown>)
    .map(([setId, value]) => {
      if (!value || typeof value !== "object") return null
      const record = value as Record<string, unknown>
      const setName = typeof record.setName === "string" ? record.setName : setId
      const tags = normalizeTags(record.tags)
      const searchTokens = Array.isArray(record.searchTokens)
        ? record.searchTokens
            .filter((token): token is string => typeof token === "string")
            .map((token) => token.toLowerCase())
        : buildSearchTokens(setName, tags)
      const createdAt = typeof record.createdAt === "number" ? record.createdAt : 0

      return {
        setId,
        setName,
        tags,
        searchTokens: Array.from(new Set(searchTokens)),
        createdAt,
      } satisfies SearchIndexEntry
    })
    .filter((entry): entry is SearchIndexEntry => entry !== null)
}

export type ScoredSearchResult = SearchIndexEntry & {
  score: number
  matchedOn: Array<"name" | "tag" | "token">
}

export function scoreSearchResults(
  entries: SearchIndexEntry[],
  query: string,
  tagFilter?: string | null,
): ScoredSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedTag = tagFilter?.trim().toLowerCase().replace(/^#/, "") || null
  const queryParts = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : []

  const scored: ScoredSearchResult[] = []

  for (const entry of entries) {
    if (normalizedTag && !entry.tags.includes(normalizedTag)) {
      continue
    }

    if (!normalizedQuery) {
      if (normalizedTag) {
        scored.push({ ...entry, score: 1, matchedOn: ["tag"] })
      }
      continue
    }

    let score = 0
    const matchedOn = new Set<"name" | "tag" | "token">()
    const nameLower = entry.setName.toLowerCase()

    if (nameLower === normalizedQuery) {
      score += 100
      matchedOn.add("name")
    } else if (nameLower.startsWith(normalizedQuery)) {
      score += 60
      matchedOn.add("name")
    } else if (nameLower.includes(normalizedQuery)) {
      score += 40
      matchedOn.add("name")
    }

    for (const tag of entry.tags) {
      if (tag === normalizedQuery) {
        score += 50
        matchedOn.add("tag")
      } else if (tag.includes(normalizedQuery) || normalizedQuery.includes(tag)) {
        score += 25
        matchedOn.add("tag")
      }
    }

    for (const part of queryParts) {
      if (entry.searchTokens.some((token) => token.includes(part) || part.includes(token))) {
        score += 10
        matchedOn.add("token")
      }
    }

    if (score > 0) {
      scored.push({ ...entry, score, matchedOn: Array.from(matchedOn) })
    }
  }

  return scored.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
}
