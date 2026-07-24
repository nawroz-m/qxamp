import { NextRequest, NextResponse } from "next/server"
import { removeComment } from "@/lib/set-engagement-server"

type RouteContext = { params: Promise<{ setId: string; commentId: string }> }

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { setId, commentId } = await context.params
    await removeComment(setId, commentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete comment:", error)
    const message = error instanceof Error ? error.message : "Failed to delete comment."
    const status = message === "Comment not found." ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
