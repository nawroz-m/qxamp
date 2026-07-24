"use client"

import Link from "next/link"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Bookmark,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserRound,
  X,
} from "lucide-react"
import { useSearch } from "@/lib/use-search"
import {
  clearStoredAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
  type AuthUser,
} from "@/lib/auth-client"
import { cn } from "@/lib/utils"

function isMacPlatform() {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
}

function highlightMatch(text: string, query: string) {
  const q = query.trim()
  if (!q) return text

  const lower = text.toLowerCase()
  const index = lower.indexOf(q.toLowerCase())
  if (index < 0) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/15 text-foreground">
        {text.slice(index, index + q.length)}
      </mark>
      {text.slice(index + q.length)}
    </>
  )
}

function SearchBar() {
  const search = useSearch()
  const shortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K"
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current) return
      if (!panelRef.current.contains(event.target as Node)) {
        search.setIsPanelOpen(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [search])

  const showPanel =
    search.isPanelOpen &&
    (search.hasActiveSearch || search.inputValue.trim().length > 0)

  return (
    <div ref={panelRef} className="relative w-full max-w-xl flex-1">
      {/* Mobile: collapsed icon */}
      <button
        type="button"
        aria-label="Open search"
        onClick={() => search.focusSearch()}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:hidden",
          search.isMobileSearchOpen && "hidden",
        )}
      >
        <Search className="size-4" aria-hidden="true" />
      </button>

      <div
        className={cn(
          "relative w-full",
          search.isMobileSearchOpen ? "block" : "hidden md:block",
        )}
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={search.inputRef}
          type="search"
          value={search.inputValue}
          onChange={(event) => search.setQuery(event.target.value)}
          onFocus={() => search.setIsPanelOpen(true)}
          placeholder="Search sets and tags…"
          className="h-10 w-full rounded-xl border border-input bg-muted/40 py-2 pr-20 pl-9 text-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/30"
          aria-label="Search quiz sets"
          aria-expanded={showPanel}
          aria-controls="search-results-panel"
          autoComplete="off"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {search.inputValue && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => search.clearSearch()}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <kbd className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            {shortcutLabel}
          </kbd>
          <button
            type="button"
            aria-label="Close search"
            onClick={() => {
              search.setIsMobileSearchOpen(false)
              search.setIsPanelOpen(false)
            }}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {showPanel && (
          <div
            id="search-results-panel"
            role="listbox"
            className="absolute top-[calc(100%+0.5rem)] left-0 z-50 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
          >
            {search.isLoading && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            )}

            {!search.isLoading && search.error && (
              <p className="px-4 py-6 text-center text-sm text-destructive">
                {search.error}
              </p>
            )}

            {!search.isLoading &&
              !search.error &&
              search.hasActiveSearch &&
              search.dropdownResults.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No sets match “{search.query || search.tagFilter}”.
                </p>
              )}

            {!search.isLoading && !search.error && search.dropdownResults.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-1">
                {search.dropdownResults.map((result) => (
                  <li key={result.setId}>
                    <Link
                      href={`/quiz/${result.setId}`}
                      role="option"
                      onClick={() => search.setIsPanelOpen(false)}
                      className="flex flex-col gap-1 px-4 py-2.5 transition-colors hover:bg-muted/70"
                    >
                      <span className="text-sm font-medium">
                        {highlightMatch(result.setName, search.query)}
                      </span>
                      {result.tags.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {result.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                search.setTagFilter(tag)
                              }}
                              className={cn(
                                "rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground",
                                search.tagFilter === tag && "ring-1 ring-primary",
                              )}
                            >
                              #{tag}
                            </button>
                          ))}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {search.isTruncated && (
              <Link
                href={`/?q=${encodeURIComponent(search.query)}${
                  search.tagFilter ? `&tag=${encodeURIComponent(search.tagFilter)}` : ""
                }`}
                onClick={() => search.setIsPanelOpen(false)}
                className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50"
              >
                View all {search.totalCount} results
              </Link>
            )}

            {!search.hasActiveSearch && search.inputValue.trim().length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Search by set name or tag.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setToken(getStoredAuthToken())
    setUser(getStoredAuthUser())
    const root = document.documentElement
    setDarkMode(root.classList.contains("dark"))
  }, [])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  function toggleDarkMode() {
    const root = document.documentElement
    const next = !root.classList.contains("dark")
    root.classList.toggle("dark", next)
    root.classList.toggle("light", !next)
    setDarkMode(next)
  }

  function handleSignOut() {
    clearStoredAuthSession()
    setToken(null)
    setUser(null)
    setOpen(false)
    router.refresh()
  }

  const initials = user?.identifier
    ? user.identifier.slice(0, 2).toUpperCase()
    : null

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
      >
        {initials ? (
          <span>{initials}</span>
        ) : (
          <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-56 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">
              {user?.identifier ?? "Guest"}
            </p>
            <p className="text-xs text-muted-foreground">
              {token ? "Signed in" : "Browsing anonymously"}
            </p>
          </div>
          <div className="flex flex-col py-1">
            <Link
              href={token ? "/auth?mode=signin" : "/auth?mode=signup"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <UserRound className="size-4" aria-hidden="true" />
              Edit Profile
            </Link>
            <Link
              href="/admin/add-question"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Settings className="size-4" aria-hidden="true" />
              Preferences
            </Link>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              {darkMode ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
              Dark Mode
              <span className="ml-auto text-xs">{darkMode ? "On" : "Off"}</span>
            </button>
            {token ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign Out
              </button>
            ) : (
              <Link
                href="/auth?mode=signin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SiteHeaderInner() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground sm:size-10">
            <img
              src="/apple-icon.png"
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
            />
          </span>
          <span className="text-lg font-bold tracking-tight sm:text-xl">QXAMP</span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <SearchBar />
        </div>

        <div className="flex shrink-0 items-center gap-3">

          <Link
            href="/admin/add-question"
            aria-label="Create new set"
            className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-800/100 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Link>


          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:h-16" />
    </header>
  )
}

export function SiteHeader() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <SiteHeaderInner />
    </Suspense>
  )
}
