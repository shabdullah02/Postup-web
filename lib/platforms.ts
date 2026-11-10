import {
  Facebook01Icon,
  InstagramIcon,
  ThreadsIcon,
} from "@hugeicons/core-free-icons"

export type PlatformId = "facebook" | "instagram" | "threads"

export type Platform = {
  id: PlatformId
  name: string
  icon: typeof Facebook01Icon
  /** Fill class for the solid top face. Ignored when topGradient is set. */
  topFace: string
  /** Magenta-to-orange gradient used for the Instagram top face. */
  topGradient?: readonly [string, string, string]
  leftFace: string
  rightFace: string
  /** Text color class for the logo on the top face. */
  logo: string
  /** Set when the platform is announced but not live yet. */
  soon?: boolean
}

export const platforms: readonly Platform[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook01Icon,
    topFace: "fill-[#3C8DF5]",
    leftFace: "fill-[#1668D8]",
    rightFace: "fill-[#0E4FA8]",
    logo: "text-white",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: InstagramIcon,
    topFace: "fill-[#C13584]",
    topGradient: ["#833AB4", "#E1306C", "#F77737"],
    leftFace: "fill-[#8A2A67]",
    rightFace: "fill-[#6A1F4E]",
    logo: "text-white",
  },
  {
    id: "threads",
    name: "Threads",
    icon: ThreadsIcon,
    topFace: "fill-[#1A1A1A] dark:fill-[#F3EEE3]",
    leftFace: "fill-[#0C0C0C] dark:fill-[#CFC7B8]",
    rightFace: "fill-[#000000] dark:fill-[#B4AB9B]",
    logo: "text-white dark:text-[#111111]",
    soon: true,
  },
]
