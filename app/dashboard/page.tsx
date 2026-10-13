"use client"

import { useEffect, useState } from "react"
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
  CardTitle,
} from "@/components/ui/card"
import { cn } from "cn"
import { deletePost, listAccounts, listPosts, logout, type Account, type Post } from "@/lib/api"

const STATUS_ORDER = ["scheduled", "draft", "posted", "failed"] as const

type PostStatusGroup = (typeof STATUS_ORDER)[number]

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not scheduled"
}

export default function DashboardPage() {
  const router = useRouter()
  const { clearUser } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState("")

  async function loadData() {
    try {
      setError("")
      const [accountsData, postsData] = await Promise.all([listAccounts(), listPosts()])
      setAccounts(accountsData)
      setPosts(postsData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load posts")
    }
  }

  useEffect(() => {
    void loadData()
    const interval = window.setInterval(() => {
      void loadData()
    }, 15000)

    return () => window.clearInterval(interval)
  }, [])

  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const groupedPosts = STATUS_ORDER.reduce(
    (groups, status) => {
      groups[status] = posts.filter((post) => post.status === status)
      return groups
    },
    {} as Record<PostStatusGroup, Post[]>
  )

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

          {STATUS_ORDER.map((status) => {
            const sectionPosts = groupedPosts[status]
            if (sectionPosts.length === 0) {
              return null
            }

            return (
              <section key={status} className="space-y-3">
                <h2 className="text-lg font-medium capitalize">{status}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionPosts.map((post) => {
                    const account = accountMap.get(post.account)
                    const dateValue = post.status === "scheduled" ? post.scheduled_at : post.posted_at

                    return (
                      <Card key={post.id} className="h-full">
                        <CardHeader className="gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <Badge variant={post.status === "failed" ? "destructive" : "secondary"}>
                              {post.status}
                            </Badge>
                            {account ? <span className="text-sm text-muted-foreground">{account.name}</span> : null}
                          </div>
                          <p className="text-sm leading-6">{post.content.slice(0, 140)}{post.content.length > 140 ? "…" : ""}</p>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(dateValue)}
                          </p>
                          {post.status === "failed" && post.error ? (
                            <p className="text-sm text-destructive">{post.error}</p>
                          ) : null}
                          {(post.status === "draft" || post.status === "scheduled") && (
                            <div className="flex gap-2">
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
        </div>
      </main>
    </AuthGate>
  )
}
