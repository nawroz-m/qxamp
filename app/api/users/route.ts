// import { NextResponse } from "next/server"
import { buildDbUrl } from "@/lib/firebase"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch(buildDbUrl("users"), { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to load quiz data (${response.status})`)
    }

    const raw = await response.json()
    // const data = normalizeSets(raw)
    return NextResponse.json(raw)
  } catch (err) {
    console.error("Failed to load quiz data from Firebase:", err)
    return NextResponse.json({ error: "Failed to load quiz data" }, { status: 500 })
  }
}