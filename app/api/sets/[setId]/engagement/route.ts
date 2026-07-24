import { NextRequest, NextResponse } from "next/server"
import {
  applyVote,
  getSetEngagement,
  incrementShare,
  resolveActor,
  toggleBookmark,
} from "@/lib/set-engagement-server"

type RouteContext = { params: Promise<{ setId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { setId } = await context.params
    const actor = await resolveActor(request)
    const engagement = await getSetEngagement(setId, actor?.uidHash)

    return NextResponse.json(engagement)
  } catch (error) {
    console.error("Failed to load set engagement:", error)
    return NextResponse.json({ error: "Failed to load engagement data." }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { setId } = await context.params
    const actor = await resolveActor(request)
    if (!actor) {
      return NextResponse.json({ error: "Missing actor identity." }, { status: 400 })
    }

    const body = await request.json()
    const action = typeof body?.action === "string" ? body.action : ""

    if (action === "vote") {
      const vote = body?.vote
      if (vote !== "up" && vote !== "down") {
        return NextResponse.json({ error: "Invalid vote value." }, { status: 400 })
      }

      const userAction = await applyVote(setId, actor.uidHash, vote)
      const engagement = await getSetEngagement(setId, actor.uidHash)
      return NextResponse.json({ ...engagement, userAction })
    }

    if (action === "bookmark") {
      const userAction = await toggleBookmark(setId, actor.uidHash)
      const engagement = await getSetEngagement(setId, actor.uidHash)
      return NextResponse.json({ ...engagement, userAction })
    }

    if (action === "share") {
      await incrementShare(setId)
      const engagement = await getSetEngagement(setId, actor.uidHash)
      return NextResponse.json(engagement)
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 })
  } catch (error) {
    console.error("Failed to update set engagement:", error)
    const message = error instanceof Error ? error.message : "Failed to update engagement."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
