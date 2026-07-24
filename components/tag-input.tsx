"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_SET_TAGS, normalizeTags } from "@/lib/search-index"
import { cn } from "@/lib/utils"

type TagInputProps = {
  id?: string
  label?: string
  value: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  disabled?: boolean
  className?: string
}

export function TagInput({
  id = "set-tags",
  label = "Tags",
  value,
  onChange,
  maxTags = MAX_SET_TAGS,
  disabled,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("")

  function commitDraft(raw: string) {
    const pieces = raw
      .split(/[,]+/)
      .map((piece) => piece.trim())
      .filter(Boolean)

    if (!pieces.length) {
      setDraft("")
      return
    }

    const next = normalizeTags([...value, ...pieces], maxTags)
    onChange(next)
    setDraft("")
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commitDraft(draft)
      return
    }

    if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag))
  }

  const atLimit = value.length >= maxTags

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{maxTags}
        </span>
      </div>

      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            #{tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              onClick={() => removeTag(tag)}
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
        <Input
          id={id}
          value={draft}
          disabled={disabled || atLimit}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commitDraft(draft)}
          placeholder={atLimit ? "Tag limit reached" : "Type and press Enter"}
          className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Lowercase, unique tags. Press Enter or comma to add.
      </p>
    </div>
  )
}
