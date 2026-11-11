"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"
import { useAuth } from "@/components/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { cn } from "cn"
import { deletePost, listAccounts, listPosts, logout, publishPostNow, type Account, type Post } from "@/lib/api"
import { canEditPost, postStatusLabel, providerLabel } from "@/lib/social"

const STATUS_ORDER = ["scheduled", "publishing", "draft", "posted", "failed", "deleted_on_facebook"] as const
const ALWAYS_VISIBLE = new Set<string>(["scheduled", "publishing"])
const POSTED_PREVIEW = 3

type PostStatusGroup = (typeof STATUS_ORDER)[number]

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not scheduled"
}

function timeOf(value: string | null) {
  return value ? new Date(value).getTime() : 0
}

export default function DashboardPage() {
  const router = useRouter()
  const { clearUser } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<"all" | "facebook" | "instagram">("all")
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [publishingPostIds, setPublishingPostIds] = useState<number[]>([])
  const publishingPostIdsRef = useRef(new Set<number>())

  async function loadData(initialLoad = false) {
    try {
      const [accountsData, postsData] = await Promise.all([listAccounts(), listPosts()])
      setError("")
      setAccounts(accountsData)
      setPosts(postsData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load posts")
    } finally {
      if (initialLoad) setIsLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadData(true)
    }, 0)
    const interval = window.setInterval(() => {
      void loadData()
    }, 15000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [])

  const filteredAccounts = selectedProvider === "all"
    ? accounts
    : accounts.filter((account) => account.provider === selectedProvider)
  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const activeAccountId = filteredAccounts.some((account) => account.id === selectedAccountId)
    ? selectedAccountId
    : filteredAccounts[0]?.id ?? null
  const failedCount = posts.filter((post) => post.account === activeAccountId && post.status === "failed").length
  const { groupedPosts, hiddenCount } = useMemo(() => {
    const mine = posts.filter((post) => post.account === activeAccountId)
    const groups = {} as Record<PostStatusGroup, Post[]>
    let hidden = 0

    for (const status of STATUS_ORDER) {
      const items = mine.filter((post) => post.status === status)

      if (status === "scheduled" || status === "publishing") {
        items.sort((a, b) => timeOf(a.scheduled_at) - timeOf(b.scheduled_at))
      } else {
        items.sort(
          (a, b) => timeOf(b.posted_at ?? b.created_at) - timeOf(a.posted_at ?? a.created_at)
        )
      }

      if (showAll || ALWAYS_VISIBLE.has(status)) {
        groups[status] = items
      } else if (status === "posted") {
        groups[status] = items.slice(0, POSTED_PREVIEW)
        hidden += Math.max(0, items.length - POSTED_PREVIEW)
      } else {
        groups[status] = []
        hidden += items.length
      }
    }

    return { groupedPosts: groups, hiddenCount: hidden }
  }, [posts, activeAccountId, showAll])

  async function handleDelete(post: Post) {
    if (!window.confirm("Delete this post?")) {
      return
    }

    try {
      await deletePost(post.id)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete post")
    }
  }

  async function handlePublishNow(post: Post, accountName: string) {
    if (publishingPostIdsRef.current.has(post.id)) return
    if (!window.confirm(`Publish this to ${accountName} now?`)) return

    publishingPostIdsRef.current.add(post.id)
    setPublishingPostIds((current) => [...current, post.id])
    setError("")

    try {
      const updatedPost = await publishPostNow(post.id)
      setPosts((current) => current.map((item) => item.id === updatedPost.id ? updatedPost : item))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish post")
    } finally {
      publishingPostIdsRef.current.delete(post.id)
      setPublishingPostIds((current) => current.filter((id) => id !== post.id))
    }
  }

  async function handleLogout() {
    try {
      await logout()
      clearUser()
      router.push("/login")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to log out")
    }
  }

  return (
    <AuthGate>
      <main className="min-h-screen p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className={buttonVariants()} href="/compose">
                New post
              </Link>
              <Link className={buttonVariants({ variant: "outline" })} href="/accounts">
                Accounts
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </header>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading posts...</p> : null}

          {!isLoading && !error && accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No social accounts connected.</p>
          ) : null}

          {accounts.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2" aria-label="Filter posts by provider">
                {(["all", "facebook", "instagram"] as const).map((provider) => (
                  <Button
                    key={provider}
                    size="sm"
                    variant={selectedProvider === provider ? "default" : "outline"}
                    onClick={() => setSelectedProvider(provider)}
                  >
                    {provider === "all" ? "All providers" : providerLabel(provider)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
              {filteredAccounts.map((account) => (
                <Button
                  key={account.id}
                  size="sm"
                  variant={account.id === activeAccountId ? "default" : "outline"}
                  onClick={() => {
                    setSelectedAccountId(account.id)
                    setShowAll(false)
                  }}
                >
                  <span>{account.name}</span>
                  <Badge variant="outline">{providerLabel(account.provider)}</Badge>
                  {account.status !== "active" ? ` (${account.status.replace("_", " ")})` : ""}
                </Button>
              ))}
              {failedCount > 0 ? <Badge variant="destructive" aria-label={`${failedCount} failed posts`}>{failedCount} failed</Badge> : null}
              </div>
            </>
          )}

          {STATUS_ORDER.map((status) => {
            const sectionPosts = groupedPosts[status]
            if (sectionPosts.length === 0) {
              return null
            }

            return (
              <section key={status} className="space-y-3">
                <h2 className="text-lg font-medium capitalize">{postStatusLabel(status)}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionPosts.map((post) => {
                    const account = accountMap.get(post.account)
                    const dateValue = post.status === "scheduled" ? post.scheduled_at : post.posted_at

                    return (
                      <Card key={post.id} className="h-full">
                        <CardHeader className="gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <Badge variant={post.status === "failed" ? "destructive" : "secondary"}>
                              {postStatusLabel(post.status)}
                            </Badge>
                            {account ? (
                              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                {account.name}
                                <Badge variant="outline">{providerLabel(account.provider)}</Badge>
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm leading-6">{post.content.slice(0, 140)}{post.content.length > 140 ? "…" : ""}</p>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(dateValue)}
                          </p>
                          {post.permalink_url ? (
                            <Link
                              href={post.permalink_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-foreground underline underline-offset-4"
                            >
                              View on {providerLabel(account?.provider ?? "facebook")}
                            </Link>
                          ) : null}
                          {post.status === "failed" && post.error ? (
                            <p className="text-sm text-destructive">{post.error}</p>
                          ) : null}
                          {canEditPost(post) && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => void handlePublishNow(post, account?.name ?? "this account")}
                                disabled={publishingPostIds.includes(post.id)}
                              >
                                {publishingPostIds.includes(post.id) ? "Publishing..." : "Post now"}
                              </Button>
                              <Link
                                className={cn(buttonVariants({ size: "sm" }))}
                                href={`/compose?id=${post.id}`}
                              >
                                Edit
                              </Link>
                              <Button variant="destructive" size="sm" onClick={() => void handleDelete(post)}>
                                Delete
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {(hiddenCount > 0 || showAll) && (
            <div>
              <Button variant="outline" size="sm" onClick={() => setShowAll((value) => !value)}>
                {showAll ? "Show less" : `See more (${hiddenCount})`}
              </Button>
            </div>
          )}

          {!isLoading && !error && accounts.length > 0 &&
            STATUS_ORDER.every((status) => groupedPosts[status].length === 0) && (
              <p className="text-sm text-muted-foreground">
                No scheduled or recent posts for this account.
              </p>
            )}
        </div>
      </main>
    </AuthGate>
  )
}
