import { Briefcase, Camera, LayoutDashboard, Plus, Search, Settings2, ThumbsUp, type LucideIcon } from "lucide-react"
import { content } from "@/lib/content"

const platformIcons: Record<string, LucideIcon> = {
  Facebook: ThumbsUp,
  Instagram: Camera,
  LinkedIn: Briefcase,
}

const statusClass: Record<string, string> = {
  Published: "text-[var(--status-saved)]",
  Draft: "text-[var(--status-draft)]",
  Scheduled: "text-[var(--secondary-text)]",
}

export default function AppPreview() {
  return (
    <div className="w-full overflow-hidden rounded-[6px] border border-[var(--border-color)] bg-[var(--preview-background)] transition-opacity duration-150 hover:opacity-[0.98]">
      <div className="grid min-h-[37.5rem] grid-cols-[11.875rem_1fr] max-md:grid-cols-1">
        <aside className="hidden border-r border-[var(--border-color)] bg-[var(--preview-sidebar)] p-4 md:block">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-[var(--primary-text)]">
            <span className="flex size-7 items-center justify-center rounded-[4px] bg-[var(--button-background)] text-[var(--button-foreground)]">
              <LayoutDashboard className="size-4" aria-hidden="true" />
            </span>
            {content.appName}
          </div>
          <div className="space-y-1.5 text-sm text-[var(--secondary-text)]">
            {content.sidebarItems.map((item, index) => (
              <p
                key={item}
                className={`relative rounded-[4px] px-3 py-1.5 transition-colors duration-150 hover:bg-[var(--surface)] ${
                  index === 0
                    ? "bg-[var(--accent-soft)] text-[var(--primary-text)] hover:!bg-[var(--surface)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--accent)]"
                    : ""
                }`}
              >
                {item}
              </p>
            ))}
          </div>
          <div className="mt-10 border-t border-[var(--border-color)] pt-3 text-sm text-[var(--secondary-text)]">
            <p className="flex items-center gap-2 px-3 py-1.5"><Settings2 className="size-4" aria-hidden="true" /> Settings</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-[var(--border-color)] px-4 sm:px-6">
            <div className="flex items-center gap-3 text-sm text-[var(--secondary-text)]">
              <span className="text-[var(--primary-text)]">{content.workspace}</span>
              <span className="text-[var(--border-color)]">/</span>
              <span>{content.pageTitle}</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--secondary-text)]">
              <Search className="size-4" aria-label="Search" />
              <button type="button" aria-label="Create item" className="flex size-7 items-center justify-center rounded-[4px] bg-[var(--button-background)] text-[var(--button-foreground)]">
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--primary-text)]">{content.previewHeading}</h2>
                <p className="mt-1 text-sm text-[var(--secondary-text)]">{content.previewSupporting}</p>
              </div>
              <button type="button" className="rounded-[4px] border border-[var(--border-color)] px-3 py-1.5 text-sm text-[var(--primary-text)] transition-colors duration-150 hover:bg-[var(--surface)]">
                <Plus className="mr-2 inline size-4" aria-hidden="true" /> {content.actionLabel}
              </button>
            </div>

            <div className="mt-5 flex gap-5 border-b border-[var(--border-color)] text-sm">
              <button type="button" className="rounded-t-[4px] border-b-2 border-[var(--accent)] px-2 pb-2.5 font-medium text-[var(--primary-text)] transition-colors duration-150 hover:bg-[var(--surface)]">{content.tabs.preview}</button>
              <button type="button" className="rounded-t-[4px] px-2 pb-2.5 text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">{content.tabs.activity}</button>
            </div>

            <div className="mt-4 space-y-2.5">
              {content.posts.map((post) => {
                const PlatformIcon = platformIcons[post.platform]
                return (
                  <div key={post.caption} className="flex items-center justify-between gap-4 rounded-[5px] border border-[var(--border-color)] bg-[var(--preview-card)] p-3 transition-colors duration-150 hover:bg-[var(--surface)]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--preview-active)] text-[var(--secondary-text)]">
                        {PlatformIcon ? (
                          <PlatformIcon className="size-4" aria-hidden="true" />
                        ) : (
                          <span className="text-xs font-semibold">{post.platform.charAt(0)}</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--primary-text)]">{post.caption}</p>
                        <p className="mt-1 text-xs text-[var(--secondary-text)]">{post.schedule}</p>
                      </div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-2 text-xs ${statusClass[post.status]}`}>
                      <span className="size-2.5 rounded-full bg-current" aria-hidden="true" />
                      {post.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
