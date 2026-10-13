export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined")
  }

  const method = init.method?.toUpperCase() ?? "GET"
  const headers = new Headers(init.headers)

  headers.set("Content-Type", "application/json")

  if (method !== "GET") {
    const csrftoken = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")
      .slice(1)
      .join("=")

    if (csrftoken) {
      headers.set("X-CSRFToken", decodeURIComponent(csrftoken))
    }
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${await response.text()}`)
  }

  return response
}

export type Account = {
  id: number
  provider: string
  external_id: string
  name: string
  status: "active" | "needs_reauth" | "disconnected"
  scopes: string
  connected_at: string
}
export const getAccounts = async () =>
  (await apiFetch("/api/social-accounts/")).json() as Promise<Account[]>

export function facebookConnectUrl(reconnectId?: number): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
  const url = new URL("/api/auth/connect/facebook/", base)
  if (reconnectId !== undefined) url.searchParams.set("reconnect", String(reconnectId))
  return url.toString()
}

export type PostStatus = "draft" | "scheduled" | "publishing" | "posted" | "failed"

export type Post = {
  id: number
  account: number
  content: string
  scheduled_at: string | null
  status: PostStatus
  error: string | null
  external_post_id: string | null
  posted_at: string | null
  created_at: string
}

export async function login(username: string, password: string): Promise<void> {
  await apiFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout/", { method: "POST" })
}

export async function me(): Promise<{ id: number; username: string }> {
  return (await apiFetch("/api/auth/me/")).json() as Promise<{ id: number; username: string }>
}

export async function listAccounts(): Promise<Account[]> {
  return (await apiFetch("/api/social-accounts/")).json() as Promise<Account[]>
}

export async function listPosts(): Promise<Post[]> {
  return (await apiFetch("/api/posts/")).json() as Promise<Post[]>
}

export async function createPost({ account, content }: { account: number; content: string }): Promise<Post> {
  return (await apiFetch("/api/posts/", {
    method: "POST",
    body: JSON.stringify({ account, content }),
  })).json() as Promise<Post>
}

export async function updatePost(id: number, partial: Partial<Post>): Promise<Post> {
  return (await apiFetch(`/api/posts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(partial),
  })).json() as Promise<Post>
}

export async function deletePost(id: number): Promise<void> {
  await apiFetch(`/api/posts/${id}/`, { method: "DELETE" })
}

export async function schedulePost(id: number, scheduledAt: string): Promise<Post> {
  return (await apiFetch(`/api/posts/${id}/schedule/`, {
    method: "POST",
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  })).json() as Promise<Post>
}

export async function generate(topic: string): Promise<{ content: string }> {
  return (await apiFetch("/api/ai/generate/", {
    method: "POST",
    body: JSON.stringify({ topic }),
  })).json() as Promise<{ content: string }>
}
