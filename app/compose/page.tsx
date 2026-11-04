"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"
import { useAuth } from "@/components/AuthProvider"
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
  publishPostNow,
  schedulePost,
  updatePost,
  type Account,
  type Post,
  ApiError,
} from "@/lib/api"
import { canEditPost, instagramImageValidationError, localDateTimeToIsoWithOffset } from "@/lib/social"

const MAX_CONTENT_LENGTH = 10000
type PublishMode = "now" | "schedule"

function ComposePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const requiresEmailVerification = Boolean(user && !user.is_superuser && !user.email_verified)
  const postId = searchParams.get("id")

  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [topic, setTopic] = useState("")
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [publishMode, setPublishMode] = useState<PublishMode>("now")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [publishError, setPublishError] = useState("")
  const [publishSuccess, setPublishSuccess] = useState<{ permalinkUrl: string | null } | null>(null)
  const [generationError, setGenerationError] = useState("")
  const [scheduleError, setScheduleError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isEditable, setIsEditable] = useState(true)
  const submitInProgress = useRef(false)

  const selectedAccount = accounts.find((account) => account.id === Number(accountId))
  const isInstagramAccount = selectedAccount?.provider === "instagram"

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
            if (!canEditPost(postToEdit)) {
              setIsEditable(false)
              setError("This post can no longer be edited.")
            } else {
              setAccountId(postToEdit.account.toString())
              setContent(postToEdit.content)
              setImageUrl(postToEdit.image_url ?? "")
              setScheduleTime(postToEdit.scheduled_at ? postToEdit.scheduled_at.slice(0, 16) : "")
              if (postToEdit.status === "scheduled") setPublishMode("schedule")
            }
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
    if (submitInProgress.current) return
    if (!accountId) {
      setError("Select an account.")
      return
    }

    submitInProgress.current = true
    setIsSaving(true)
    setError("")

    try {
      if (postId) {
        await updatePost(Number(postId), { account: Number(accountId), content, image_url: imageUrl.trim() || null })
      } else {
        await createPost({
          account: Number(accountId),
          content,
          ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
        })
      }
      router.push("/dashboard")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save draft")
    } finally {
      submitInProgress.current = false
      setIsSaving(false)
    }
  }

  function clearPublishResult() {
    setError("")
    setPublishError("")
    setPublishSuccess(null)
    setScheduleError("")
  }

  function clearComposer() {
    setTopic("")
    setContent("")
    setImageUrl("")
    setScheduleTime("")
  }

  async function handlePostNow() {
    if (submitInProgress.current) return
    if (!accountId) {
      setError("Select an account.")
      return
    }

    if (selectedAccount?.status === "needs_reauth") {
      setError("Reconnect this account before publishing.")
      return
    }

    submitInProgress.current = true
    setIsSubmitting(true)
    clearPublishResult()

    let draft: Post
    try {
      draft = postId
        ? await updatePost(Number(postId), {
            account: Number(accountId),
            content,
            image_url: imageUrl.trim() || null,
          })
        : await createPost({
            account: Number(accountId),
            content,
            ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
          })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create post")
      submitInProgress.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const result = await publishPostNow(draft.id)
      if (result.status === "posted") {
        setPublishSuccess({ permalinkUrl: result.permalink_url })
        clearComposer()
      } else if (result.status === "failed" && result.error === "failed: reauth required") {
        setPublishError("Your Facebook connection expired.")
      } else {
        setPublishError(result.error || "Publishing failed.")
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message)
      } else {
        setError("Your post was saved as a draft and can be published from the posts list.")
      }
    } finally {
      submitInProgress.current = false
      setIsSubmitting(false)
    }
  }

  async function handleSchedule() {
    if (submitInProgress.current) return
    if (requiresEmailVerification) {
      setScheduleError("Verify your email before scheduling a post.")
      return
    }
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

    const scheduledAt = localDateTimeToIsoWithOffset(scheduleTime)
    if (!scheduledAt) {
      setScheduleError("Select a valid schedule time.")
      return
    }

    const imageValidationError = instagramImageValidationError(selectedAccount?.provider, imageUrl)
    if (imageValidationError) {
      setScheduleError(imageValidationError)
      return
    }

    submitInProgress.current = true
    setIsSubmitting(true)
    setError("")
    setPublishError("")
    setPublishSuccess(null)

    try {
      const post = postId
        ? await updatePost(Number(postId), { account: Number(accountId), content, image_url: imageUrl.trim() || null })
        : await createPost({
            account: Number(accountId),
            content,
            ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
          })

      await schedulePost(post.id, scheduledAt)
      router.push("/dashboard")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to schedule post")
    } finally {
      submitInProgress.current = false
      setIsSubmitting(false)
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
                  {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
                  {publishError ? (
                    <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                      <p>{publishError}</p>
                      {publishError === "Your Facebook connection expired." ? (
                        <Link href="/accounts" className="font-medium underline underline-offset-4">
                          Reconnect this account
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  {publishSuccess ? (
                    <p role="status" className="rounded-md border border-green-600/30 bg-green-600/10 p-4 text-sm">
                      Post published successfully.
                      {publishSuccess.permalinkUrl ? (
                        <>
                          {" "}
                          <a
                            href={publishSuccess.permalinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline underline-offset-4"
                          >
                            View post
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : null}

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

                  <fieldset className="space-y-2" disabled={isSubmitting}>
                    <legend className="text-sm font-medium">When to publish</legend>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={publishMode === "now" ? "default" : "outline"}
                        aria-pressed={publishMode === "now"}
                        onClick={() => {
                          setPublishMode("now")
                          clearPublishResult()
                        }}
                      >
                        Post now
                      </Button>
                      <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before scheduling a post." : undefined}>
                        <Button
                          type="button"
                          variant={publishMode === "schedule" ? "default" : "outline"}
                          aria-pressed={publishMode === "schedule"}
                          disabled={requiresEmailVerification}
                          onClick={() => {
                            setPublishMode("schedule")
                            clearPublishResult()
                          }}
                        >
                          Schedule
                        </Button>
                      </span>
                    </div>
                  </fieldset>

                  {isInstagramAccount ? (
                    <div className="space-y-2">
                      <label htmlFor="image-url">Image URL</label>
                      <Input
                        id="image-url"
                        type="url"
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        placeholder="https://example.com/image.jpg"
                        aria-describedby="instagram-image-help"
                      />
                      <p id="instagram-image-help" className="text-sm text-muted-foreground">
                        Instagram posts require a publicly accessible HTTPS image URL.
                      </p>
                    </div>
                  ) : null}

                  {publishMode === "schedule" ? (
                    <div className="space-y-2">
                      <label htmlFor="schedule">Schedule time</label>
                      <Input
                        id="schedule"
                        type="datetime-local"
                        value={scheduleTime}
                        disabled={requiresEmailVerification}
                        onChange={(event) => setScheduleTime(event.target.value)}
                      />
                      {scheduleError ? <p role="alert" className="text-sm text-destructive">{scheduleError}</p> : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void handleSaveDraft()} disabled={isSaving || isSubmitting || !isEditable}>
                      {isSaving ? "Saving..." : "Save draft"}
                    </Button>
                    <span className="inline-flex" title={requiresEmailVerification && publishMode === "schedule" ? "Verify your email before scheduling a post." : undefined}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void (publishMode === "now" ? handlePostNow() : handleSchedule())}
                        disabled={isSaving || isSubmitting || !isEditable || (publishMode === "now" && selectedAccount?.status === "needs_reauth") || (publishMode === "schedule" && requiresEmailVerification)}
                      >
                        {isSubmitting
                          ? publishMode === "now" ? "Publishing..." : "Scheduling..."
                          : publishMode === "now" ? "Post now" : "Schedule post"}
                      </Button>
                    </span>
                  </div>
                  {publishMode === "now" && selectedAccount?.status === "needs_reauth" ? (
                    <p className="text-sm text-muted-foreground">
                      Reconnect this account before publishing.{" "}
                      <Link href="/accounts" className="font-medium text-primary underline underline-offset-4">
                        Go to accounts
                      </Link>
                    </p>
                  ) : null}
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
