import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface TileGridProps {
  children: ReactNode
  className?: string
}

export function TileGrid({ children, className }: TileGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 p-4",
        "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]",
        className,
      )}
    >
      {children}
    </div>
  )
}
