import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteViewDialogProps {
  viewId: string | null
  viewName: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteViewDialog({
  viewId,
  viewName,
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteViewDialogProps) {
  return (
    <Dialog
      open={viewId !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete View</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the view &ldquo;{viewName}&rdquo;?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
