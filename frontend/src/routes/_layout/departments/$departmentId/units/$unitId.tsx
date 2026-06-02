import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_layout/departments/$departmentId/units/$unitId",
)({
  component: () => <Outlet />,
})
