import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import useAuth from "@/hooks/useAuth"
import { isLoggedIn } from "@/hooks/useAuth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronRight, Home, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DepartmentsService, MachinesService, UnitsService } from "@/client"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
})

// Map route segment names to display labels (for non-entity paths)
const SEGMENT_LABELS: Record<string, string> = {
  config: "Config",
  "loss-codes": "Loss Codes",
  settings: "Settings",
  admin: "Admin",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Breadcrumb() {
  const location = useRouterState({ select: (s) => s.location })
  const pathname = location.pathname

  // Extract entity IDs from the departments hierarchy path
  const deptMatch = pathname.match(/^\/departments\/([^/]+)/)
  const unitMatch = pathname.match(/\/units\/([^/]+)/)
  const machineMatch = pathname.match(/\/machines\/([^/]+)/)

  const departmentId = deptMatch?.[1] && UUID_RE.test(deptMatch[1]) ? deptMatch[1] : null
  const unitId = unitMatch?.[1] && UUID_RE.test(unitMatch[1]) ? unitMatch[1] : null
  const machineId = machineMatch?.[1] && UUID_RE.test(machineMatch[1]) ? machineMatch[1] : null

  const { data: dept } = useQuery({
    queryKey: ["department", departmentId],
    queryFn: () => DepartmentsService.readDepartment({ id: departmentId! }),
    enabled: !!departmentId,
    staleTime: 30_000,
  })
  const { data: unit } = useQuery({
    queryKey: ["unit", unitId],
    queryFn: () => UnitsService.readUnit({ id: unitId! }),
    enabled: !!unitId,
    staleTime: 30_000,
  })
  const { data: machine } = useQuery({
    queryKey: ["machine", machineId],
    queryFn: () => MachinesService.readMachine({ id: machineId! }),
    enabled: !!machineId,
    staleTime: 30_000,
  })

  const crumbs: { label: string; path: string }[] = []

  if (departmentId) {
    crumbs.push({
      label: dept?.name ?? "…",
      path: `/departments/${departmentId}/`,
    })
    if (unitId) {
      crumbs.push({
        label: unit?.name ?? "…",
        path: `/departments/${departmentId}/units/${unitId}/`,
      })
    }
    if (machineId) {
      crumbs.push({
        label: machine?.name ?? "…",
        path: `/departments/${departmentId}/units/${unitId}/machines/${machineId}`,
      })
    }
  } else {
    // Static labels for config / settings / admin paths
    const parts = pathname.split("/").filter(Boolean)
    let running = ""
    for (const part of parts) {
      running += `/${part}`
      if (UUID_RE.test(part)) continue
      crumbs.push({ label: SEGMENT_LABELS[part] ?? part, path: running })
    }
  }

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map(({ label, path }) => (
        <span key={path} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link to={path} className="hover:text-foreground transition-colors">
            {label}
          </Link>
        </span>
      ))}
    </nav>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium truncate">{user?.full_name ?? user?.email}</p>
          {user?.full_name && (
            <p className="text-muted-foreground text-xs truncate">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ConfigMenu() {
  const { user } = useAuth()
  if (!user?.is_superuser) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
          <Settings2 className="h-4 w-4" />
          Config
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/config/departments">Departments</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/config/units">Units</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/config/machines">Machines</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/config/loss-codes">Loss Codes</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top navbar */}
      <header className="h-14 shrink-0 border-b bg-background flex items-center px-4 gap-4">
        <Link to="/" className="font-semibold text-base tracking-tight text-foreground hover:opacity-80 transition-opacity">
          FactoryLens
        </Link>
        <div className="h-5 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <Breadcrumb />
        </div>
        <ConfigMenu />
        <UserMenu />
      </header>

      {/* Main content — fills remaining viewport height */}
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

