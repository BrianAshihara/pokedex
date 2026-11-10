import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const BookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </Icon>
)

export const FlaskIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 3h6M10 3v6.5L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9.5V3" />
    <path d="M7 15h10" />
  </Icon>
)

export const BagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 8h12l1.2 11.2A1.6 1.6 0 0 1 17.6 21H6.4a1.6 1.6 0 0 1-1.6-1.8L6 8Z" />
    <path d="M9 11V6a3 3 0 0 1 6 0v5" />
  </Icon>
)

export const MapPinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </Icon>
)

const ENCOUNTER_KIND_PATHS: Record<string, string> = {
  grass: 'M12 21c0-5 0-9-3-13M12 21c0-4 1-8 5-11M12 21c-1-3-3-6-7-7M12 21c1-3 3-5 7-6',
  cave: 'M3 20 9.5 6l4 7 2-3 5.5 10ZM9.5 20v-3a2.5 2.5 0 0 1 5 0v3',
  water: 'M2 9c2.5-2.5 5-2.5 7 0s4.5 2.5 6.5 0 4.5-2.5 6.5 0M2 15c2.5-2.5 5-2.5 7 0s4.5 2.5 6.5 0 4.5-2.5 6.5 0',
  fishing: 'M15 3v11a5 5 0 0 1-10 0v-2l3 3M13 3h4',
  tree: 'M12 22v-7M12 3a6 6 0 0 0-5.7 7.9A4.5 4.5 0 0 0 8 19h8a4.5 4.5 0 0 0 1.7-8.1A6 6 0 0 0 12 3Z',
  rock: 'M4 18l2.5-8L11 5l7 2 3 7-3 5H6ZM11 5l1 6 9 3M12 11l-6 8',
  gift: 'M4 11h16v10H4zM2.5 7h19v4h-19zM12 7v14M12 7S10 2.5 7.5 3.5 9 7 12 7ZM12 7s2-4.5 4.5-3.5S15 7 12 7Z',
  fixed: 'M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8Z',
  trade: 'M4 8h14l-3-3M20 16H6l3 3',
  roaming: 'M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h6',
  other: 'M12 17h.01M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.3-1.5 2.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
}

export const EncounterKindIcon = ({ kind, ...props }: IconProps & { kind: string }) => (
  <Icon {...props}>
    <path d={ENCOUNTER_KIND_PATHS[kind] ?? ENCOUNTER_KIND_PATHS.other} />
  </Icon>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const SwordIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
    <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
  </Icon>
)

export const DiceIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Icon>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
)

export const BlockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.7 5.7 12.6 12.6" />
  </Icon>
)

export const GithubIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </Icon>
)

export const LinkedinIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 4.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </Icon>
)

export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
  </Icon>
)
