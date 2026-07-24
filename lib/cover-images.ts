/** Cover images available under /public for set cards. */
export const DEFAULT_COVER_IMAGE = "/SetCoverAI.png"

export const AVAILABLE_COVER_IMAGES = [
  { path: "/SetCoverAI.png", label: "Cover A" },
  { path: "/SerCoverAI2.png", label: "Cover B" },
  { path: "/SerCoverAI3.png", label: "Cover C" },
] as const

export type CoverImagePath = (typeof AVAILABLE_COVER_IMAGES)[number]["path"]

export function resolveCoverImage(coverImage?: string | null): string {
  if (!coverImage?.trim()) return DEFAULT_COVER_IMAGE
  const normalized = coverImage.trim()
  const isAllowed = AVAILABLE_COVER_IMAGES.some((cover) => cover.path === normalized)
  return isAllowed ? normalized : DEFAULT_COVER_IMAGE
}
