import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LossCodesService, LossEntriesService } from "@/client"
import type {
  LossCodeCategoryInHierarchy,
  LossCodeInHierarchy,
  LossCodeTypeWithHierarchy,
  MachineStatusPublic,
} from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

const schema = z.object({
  loss_code_id: z.string().min(1, "Select a loss code"),
  start_time: z.string().min(1, "Required"),
  end_time: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof schema>

function toInputDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface LossCodeEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machineId: string
  machineName: string
  /** Pre-fills the start/end time from a clicked timeline block */
  prefillBlock?: MachineStatusPublic | null
  prefillEndTime?: Date | null
}

export function LossCodeEntryModal({
  open,
  onOpenChange,
  machineId,
  machineName,
  prefillBlock,
  prefillEndTime,
}: LossCodeEntryModalProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Cascading selection state
  const [selectedTypeId, setSelectedTypeId] = useState<string>("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  const { data: hierarchy = [] } = useQuery({
    queryKey: ["loss-code-hierarchy"],
    queryFn: () => LossCodesService.readLossCodeHierarchy(),
    enabled: open,
  })

  // Derive filtered lists
  const selectedType = hierarchy.find((t: LossCodeTypeWithHierarchy) => t.id === selectedTypeId)
  const categories: LossCodeCategoryInHierarchy[] = selectedType?.categories ?? []
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const lossCodes: LossCodeInHierarchy[] = selectedCategory?.loss_codes ?? []

  // Reset cascade when dialog closes / type changes
  useEffect(() => {
    if (!open) {
      setSelectedTypeId("")
      setSelectedCategoryId("")
    }
  }, [open])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      loss_code_id: "",
      start_time: prefillBlock?.timestamp
        ? toInputDatetime(new Date(prefillBlock.timestamp))
        : "",
      end_time: prefillEndTime ? toInputDatetime(prefillEndTime) : "",
      notes: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      LossEntriesService.createLossEntryEndpoint({
        requestBody: {
          machine_id: machineId,
          loss_code_id: data.loss_code_id,
          start_time: new Date(data.start_time).toISOString(),
          end_time: data.end_time ? new Date(data.end_time).toISOString() : undefined,
          notes: data.notes || undefined,
        },
      }),
    onSuccess: () => {
      showSuccessToast("Loss entry saved")
      queryClient.invalidateQueries({ queryKey: ["machine-loss-entries", machineId] })
      form.reset()
      setSelectedTypeId("")
      setSelectedCategoryId("")
      onOpenChange(false)
    },
    onError: (err: any) => showErrorToast(err.message ?? "Failed to save"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Loss — {machineName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            {/* Type selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={selectedTypeId}
                onValueChange={(v) => {
                  setSelectedTypeId(v)
                  setSelectedCategoryId("")
                  form.setValue("loss_code_id", "")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchy.map((t: LossCodeTypeWithHierarchy) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={selectedCategoryId}
                onValueChange={(v) => {
                  setSelectedCategoryId(v)
                  form.setValue("loss_code_id", "")
                }}
                disabled={!selectedTypeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: LossCodeCategoryInHierarchy) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loss code selector */}
            <FormField
              control={form.control}
              name="loss_code_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Code</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedCategoryId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason code…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lossCodes.map((lc: LossCodeInHierarchy) => (
                        <SelectItem key={lc.id} value={lc.id}>
                          <span className="font-mono mr-1">{lc.code}</span> – {lc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

