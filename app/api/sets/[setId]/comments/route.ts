import { NextRequest, NextResponse } from "next/server"
import { addComment, listComments, resolveActor } from "@/lib/set-engagement-server"

type RouteContext = { params: Promise<{ setId: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { setId } = await context.params
    const comments = await listComments(setId)
    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Failed to load comments:", error)
    return NextResponse.json({ error: "Failed to load comments." }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { setId } = await context.params
    const body = await request.json()
    const text = typeof body?.text === "string" ? body.text : ""
    const actor = await resolveActor(request)

    const displayName =
      typeof body?.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim()
        : actor?.displayName ?? "Anonymous"

    const comment = await addComment({
      setId,
      text,
      authorUid: actor?.uidHash ?? null,
      displayName,
    })

    return NextResponse.json({ comment })
  } catch (error) {
    console.error("Failed to add comment:", error)
    const message = error instanceof Error ? error.message : "Failed to add comment."
    const status = message === "Comment text is required." ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
