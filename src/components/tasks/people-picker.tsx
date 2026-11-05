"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EntityAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type PickerPerson = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  job_title?: string | null;
};

/** Multi-select list of people with search. */
export function PeoplePicker({
  people,
  value,
  onChange,
  placeholder = "Choose people",
  loading,
  disabled,
  id,
}: {
  people: PickerPerson[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = people.filter((p) => value.includes(p.user_id));
  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  function toggle(userId: string) {
    onChange(
      value.includes(userId)
        ? value.filter((v) => v !== userId)
        : [...value, userId],
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-auto min-h-9 w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="flex min-w-0 flex-wrap items-center gap-1 py-0.5">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">
                {loading ? "Loading people…" : placeholder}
              </span>
            ) : (
              selected.map((p) => (
                <span
                  key={p.user_id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs"
                >
                  <EntityAvatar
                    name={p.name}
                    src={p.avatar_url}
                    className="size-5 text-[8px]"
                  />
                  {p.name}
                </span>
              ))
            )}
          </span>
          {loading ? (
            <Loader2 className="animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search people"
          />
        </div>
        <ul
          className="max-h-64 overflow-y-auto p-1"
          role="listbox"
          aria-multiselectable="true"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {people.length === 0
                ? "Nobody has access to this company or project yet."
                : "No matches."}
            </li>
          ) : (
            filtered.map((p) => {
              const on = value.includes(p.user_id);
              return (
                <li key={p.user_id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(p.user_id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <EntityAvatar
                      name={p.name}
                      src={p.avatar_url}
                      className="size-7"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{p.name}</span>
                      {p.job_title && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.job_title}
                        </span>
                      )}
                    </span>
                    <Check
                      className={cn("size-4 text-primary", !on && "invisible")}
                    />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
