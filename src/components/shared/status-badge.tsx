import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

const tone: Record<
  string,
  "success" | "secondary" | "warning" | "destructive" | "default"
> = {
  active: "success",
  connected: "success",
  completed: "default",
  planning: "secondary",
  inactive: "secondary",
  archived: "secondary",
  invited: "warning",
  on_hold: "warning",
  awaiting_configuration: "warning",
  suspended: "destructive",
  error: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={tone[status] ?? "secondary"}>{humanize(status)}</Badge>
  );
}
