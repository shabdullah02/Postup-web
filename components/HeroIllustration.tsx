type HeroIllustrationProps = {
  tileColor?: string
}

export default function HeroIllustration({ tileColor = "var(--tile-solid)" }: HeroIllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none h-full w-full"
      width="100%"
      viewBox="0 0 1200 840"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
      </defs>

      <g stroke="var(--tile-outline)" strokeWidth="1" strokeLinejoin="round">
        <path d="m110 418 122-69 122 69-122 70-122-70Z" fill="var(--tile-fill)" />
        <path d="m110 418 122 70v40l-122-70v-40Z" fill="var(--tile-tint)" />
        <path d="m354 418-122 70v40l122-70v-40Z" fill="var(--tile-side)" />

        <path d="m366 311 122-69 122 69-122 70-122-70Z" fill="var(--tile-fill)" />
        <path d="m366 311 122 70v40l-122-70v-40Z" fill="var(--tile-tint)" />
        <path d="m610 311-122 70v40l122-70v-40Z" fill="var(--tile-side)" />

        <path d="m520 424 122-69 122 69-122 70-122-70Z" fill="var(--tile-fill)" />
        <path d="m520 424 122 70v40l-122-70v-40Z" fill="var(--tile-tint)" />
        <path d="m764 424-122 70v40l122-70v-40Z" fill="var(--tile-side)" />

        <path d="m662 230 122-69 122 69-122 70-122-70Z" fill="var(--tile-fill)" />
        <path d="m662 230 122 70v40l-122-70v-40Z" fill="var(--tile-tint)" />
        <path d="m906 230-122 70v40l122-70v-40Z" fill="var(--tile-side)" />

        <path d="m318 167 122-69 122 69-122 70-122-70Z" fill="none" strokeOpacity=".24" />
      </g>

      <g strokeLinejoin="round">
        <path d="m618 318 134-76 134 76-134 77-134-77Z" fill={tileColor} stroke="var(--primary-text)" strokeWidth="1" />
        <path d="m618 318 134 77v48l-134-77v-48Z" fill="var(--tile-solid-side)" stroke="var(--primary-text)" strokeWidth="1" />
        <path d="m886 318-134 77v48l134-77v-48Z" fill="var(--tile-solid-dark)" stroke="var(--primary-text)" strokeWidth="1" />
        <path d="m713 316 39-22 39 22-39 23-39-23Z" fill={tileColor} />
        <rect x="738" y="305" width="28" height="19" rx="4" transform="skewY(30)" fill="var(--tile-icon)" />
        <path d="m744 313 6-5 6 5m-12 6 6 5 6-5" stroke="var(--primary-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}