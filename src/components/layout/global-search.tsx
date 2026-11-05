"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FolderKanban,
  ListTodo,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { globalSearch, type SearchResult } from "@/server/actions/search";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Search> = {
  company: Building2,
  project: FolderKanban,
  member: User,
  task: ListTodo,
};
const LABELS: Record<string, string> = {
  company: "Company",
  project: "Project",
  member: "Team member",
  task: "Task",
};

/** Ctrl/⌘ + K search across everything the user is allowed to see. */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const latest = useRef("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    latest.current = q;
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(q);
        if (latest.current === q) {
          setResults(res);
          setActive(0);
        }
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const shown = query.trim().length < 2 ? [] : results;

  function go(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.url);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-9 justify-start gap-2 px-0 text-muted-foreground sm:w-56 sm:px-3 max-sm:justify-center"
        aria-label="Search"
      >
        <Search />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[12%] translate-y-0 gap-0 p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, shown.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && shown[active]) {
                  go(shown[active]);
                }
              }}
              placeholder="Search companies, projects, people and tasks…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search query"
            />
            {pending && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Type at least two characters.
              </p>
            ) : shown.length === 0 && !pending ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results you have access to.
              </p>
            ) : (
              <ul role="listbox">
                {shown.map((r, i) => {
                  const Icon = ICONS[r.entity_type] ?? Search;
                  return (
                    <li
                      key={`${r.entity_type}-${r.id}`}
                      role="option"
                      aria-selected={i === active}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                          i === active ? "bg-muted" : "hover:bg-muted/60",
                        )}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-strong">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {r.title}
                          </span>
                          {r.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.subtitle}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {LABELS[r.entity_type] ?? r.entity_type}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
