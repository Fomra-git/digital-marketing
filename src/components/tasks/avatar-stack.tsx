import { EntityAvatar } from "@/components/ui/avatar";
import type { Person } from "@/server/queries/tasks";

export function AvatarStack({
  people,
  max = 3,
}: {
  people: Person[];
  max?: number;
}) {
  if (!people.length)
    return <span className="text-xs text-muted-foreground">Unassigned</span>;
  return (
    <div
      className="flex items-center -space-x-2"
      title={people.map((p) => p.name).join(", ")}
    >
      {people.slice(0, max).map((p) => (
        <EntityAvatar
          key={p.user_id}
          name={p.name}
          src={p.avatar_url}
          className="size-6 border-2 border-card text-[9px]"
        />
      ))}
      {people.length > max && (
        <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-medium">
          +{people.length - max}
        </span>
      )}
    </div>
  );
}
