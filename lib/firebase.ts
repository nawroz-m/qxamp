const DATABASE_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, "")

export function buildDbUrl(pathSegment: string) {
  if (!DATABASE_URL) {
    throw new Error("Missing FIREBASE_DATABASE_URL environment variable")
  }

  const normalized = pathSegment.replace(/^\/+|\/+$/g, "")
  return `${DATABASE_URL}/${normalized}.json`
}
