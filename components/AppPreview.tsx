import Image from "next/image"

export default function AppPreview() {
  return (
    <div className="w-full overflow-hidden rounded-[6px] border border-[var(--border-color)] bg-[var(--preview-background)] transition-opacity duration-150 hover:opacity-[0.98]">
      <Image
        src="/workspacelight.png"
        alt="Postup workspace in light mode"
        width={1789}
        height={856}
        sizes="(max-width: 1152px) 100vw, 1152px"
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src="/workspacedark.png"
        alt="Postup workspace in dark mode"
        width={1796}
        height={850}
        sizes="(max-width: 1152px) 100vw, 1152px"
        className="hidden h-auto w-full dark:block"
      />
    </div>
  )
}
