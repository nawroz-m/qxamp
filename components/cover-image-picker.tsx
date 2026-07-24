"use client"

import { Label } from "@/components/ui/label"
import {
  AVAILABLE_COVER_IMAGES,
  DEFAULT_COVER_IMAGE,
  type CoverImagePath,
} from "@/lib/cover-images"
import { cn } from "@/lib/utils"

type CoverImagePickerProps = {
  value: string
  onChange: (path: string) => void
  disabled?: boolean
}

export function CoverImagePicker({
  value,
  onChange,
  disabled,
}: CoverImagePickerProps) {
  const selected = (value || DEFAULT_COVER_IMAGE) as CoverImagePath

  return (
    <div className="flex flex-col gap-2">
      <Label>Cover image</Label>
      <div className="grid grid-cols-3 gap-2">
        {AVAILABLE_COVER_IMAGES.map((cover) => {
          const isSelected = selected === cover.path
          return (
            <button
              key={cover.path}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`Select ${cover.label}`}
              onClick={() => onChange(cover.path)}
              className={cn(
                "overflow-hidden rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-primary/40",
              )}
            >
              <img
                src={cover.path}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
