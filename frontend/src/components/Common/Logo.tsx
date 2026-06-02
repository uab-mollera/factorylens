import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
  /** Force white/light colours — use on dark backgrounds (e.g. Deep Sea sidebar) */
  onDark?: boolean
}

const LOGO_SRC = "/assets/images/Uddeholm_logo_CMYK_corrected.svg"
const BLUE = "#00A3E0"
const WHITE = "#ffffff"
const STEEL = "#575756"
const STONE = "#A8A8A7"

/** The Uddeholm U mark — rendered from the official SVG file */
function UMark({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden="true"
      className={className}
    />
  )
}

/** Full horizontal Uddeholm logo: U mark + UDDEHOLM wordmark + tagline */
function FullLogo({
  onDark = false,
  className,
}: {
  onDark?: boolean
  className?: string
}) {
  const textColor = onDark ? WHITE : BLUE
  const taglineColor = onDark ? STONE : STEEL

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="img"
      aria-label="Uddeholm — a voestalpine company"
    >
      <img src={LOGO_SRC} alt="" aria-hidden="true" className="h-full w-auto" />
      <div className="flex flex-col justify-center leading-none gap-0.5">
        <span
          style={{
            fontFamily: "Arial, Helvetica, 'Liberation Sans', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.08em",
            color: textColor,
          }}
        >
          UDDEHOLM
        </span>
        <span
          style={{
            fontFamily: "Arial, Helvetica, 'Liberation Sans', sans-serif",
            fontSize: "0.65rem",
            color: taglineColor,
          }}
        >
          a voestalpine company
        </span>
      </div>
    </div>
  )
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
  onDark = false,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <FullLogo
          onDark={onDark}
          className={cn(
            "h-9 w-auto group-data-[collapsible=icon]:hidden",
            className,
          )}
        />
        <UMark
          className={cn(
            "size-7 hidden group-data-[collapsible=icon]:block",
            className,
          )}
        />
      </>
    ) : variant === "full" ? (
      <FullLogo onDark={onDark} className={cn("h-10 w-auto", className)} />
    ) : (
      <UMark className={cn("size-7", className)} />
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}

