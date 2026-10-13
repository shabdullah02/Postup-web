"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createPost,
  generate,
  listAccounts,
  listPosts,
  schedulePost,
  updatePost,
  type Account,
  type Post,
} from "@/lib/api"

const MAX_CONTENT_LENGTH = 10000

function ComposePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = searchParams.get("id")

  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [topic, setTopic] = useState("")
  const [content, setContent] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [error, setError] = useState("")
  const [generationError, setGenerationError] = useState("")
  const [scheduleError, setScheduleError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setError("")
        const [accountData, postsData] = await Promise.all([listAccounts(), listPosts()])
        setAccounts(accountData)

        const firstAccountId = accountData[0]?.id
        const selectedAccountId = firstAccountId?.toString() ?? ""
        setAccountId(selectedAccountId)

        if (postId) {
          const postToEdit = postsData.find((post) => post.id === Number(postId))
          if (postToEdit) {
            setAccountId(postToEdit.account.toString())
            setContent(postToEdit.content)
            setScheduleTime(postToEdit.scheduled_at ? postToEdit.scheduled_at.slice(0, 16) : "")
          } else {
            setError("Post not found.")
          }
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load data")
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [postId])

  async function handleGenerate() {
    if (!topic.trim()) {
      setGenerationError("Enter a topic to generate content.")
      return
    }

    setGenerationError("")
    setIsGenerating(true)

    try {
      const result = await generate(topic.trim())
      setContent(result.content)
    } catch (requestError) {
      setGenerationError(requestError instanceof Error ? requestError.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveDraft() {
    if (!accountId) {
      setError("Select an account.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      if (postId) {
        await updatePost(Number(postId), { account: Number(accountId), content })
      } else {
        await createPost({ account: Number(accountId), content })
      }
      router.push("/dashboard")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save draft")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSchedule() {
    if (!accountId) {
      setError("Select an account.")
      return
    }

    const selectedTime = new Date(scheduleTime)
    const now = new Date()
    setScheduleError("")

    if (!scheduleTime || Number.isNaN(selectedTime.getTime())) {
      setScheduleError("Select a schedule time.")
      return
    }

    if (selectedTime <= now) {
      setScheduleError("Schedule time must be in the future.")
      return
    }

    setIsScheduling(true)
    setError("")

    try {
      const post = postId
        ? await updatePost(Number(postId), { account: Number(accountId), content })
        : await createPost({ account: Number(accountId), content })

      await schedulePost(post.id, selectedTime.toISOString())
      router.push("/dashboard")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to schedule post")
    } finally {
      setIsScheduling(false)
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading...</main>}>
      <AuthGate>
        <main className="min-h-screen p-6">
          <div className="mx-auto w-full max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>{postId ? "Edit post" : "Create post"}</CardTitle>
                <CardDescription>
                  {postId ? "Update the selected post." : "Create a new draft or schedule a post."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading...</p>
                ) : (
                  <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}

                  <div className="space-y-2">
                    <label htmlFor="topic">Topic</label>
                    <div className="flex gap-2">
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="Describe the post you want to generate"
                      />
                      <Button type="button" onClick={() => void handleGenerate()} disabled={isGenerating}>
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                    {generationError ? <p className="text-sm text-destructive">{generationError}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="content">Content</label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(event) => setContent(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
                      placeholder="Write your post content here"
                      rows={10}
                    />
                    <p className="text-right text-sm text-muted-foreground">
                      {wordCount} words / {MAX_CONTENT_LENGTH} chars
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="account">Account</label>
                    <Select
                      value={accountId}
                      onValueChange={(value) => setAccountId(value ?? "")}
                    >
                      <SelectTrigger id="account" className="w-full">
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="schedule">Schedule time</label>
                    <Input
                      id="schedule"
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                    />
                    {scheduleError ? <p className="text-sm text-destructive">{scheduleError}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void handleSaveDraft()} disabled={isSaving || isScheduling}>
                      {isSaving ? "Saving..." : "Save draft"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleSchedule()}
                      disabled={isSaving || isScheduling}
                    >
                      {isScheduling ? "Scheduling..." : "Schedule"}
                    </Button>
                  </div>
                </form>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </AuthGate>
    </Suspense>
  )
}

export default function ComposePage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading...</main>}>
      <ComposePageContent />
    </Suspense>
  )
}
