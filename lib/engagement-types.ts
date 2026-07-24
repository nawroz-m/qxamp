export interface SetStats {
  upvotes: number
  downvotes: number
  comments: number
  shares: number
}

export interface UserSetAction {
  vote: "up" | "down" | null
  bookmarked: boolean
}

export interface SetComment {
  commentId: string
  text: string
  authorUid: string | null
  displayName: string
  createdAt: number
}

export const DEFAULT_SET_STATS: SetStats = {
  upvotes: 0,
  downvotes: 0,
  comments: 0,
  shares: 0,
}
