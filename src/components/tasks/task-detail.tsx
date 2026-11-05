"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  Link2,
  ListTree,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityAvatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import {
  FileAttachments,
  type AttachmentItem,
} from "@/components/shared/file-attachments";
import { useShell } from "@/components/layout/shell-context";
import {
  allowedStatusMoves,
  CATEGORY_LABELS,
  STATUS_LABELS,
  taskCode,
  type TaskInput,
  type TaskStatus,
} from "@/lib/validations/task";
import {
  addTaskAttachment,
  addTaskComment,
  addTaskDependency,
  deleteTask,
  deleteTaskAttachment,
  deleteTaskComment,
  getAssignableUsers,
  getTaskFileUrl,
  removeTaskDependency,
  setTaskAssignees,
  updateTaskStatus,
  type AssignableUser,
} from "@/server/actions/tasks";
import type {
  Person,
  TaskCreationScopes,
  TaskListItem,
} from "@/server/queries/tasks";
import type { DepartmentOption } from "@/server/queries/team";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { DueDate, PriorityBadge, TaskStatusBadge } from "./task-badges";
import { TaskFormDialog } from "./task-form-dialog";
import { PeoplePicker } from "./people-picker";
import { CommentBox } from "./comment-box";

export type TaskDetailData = {
  id: string;
  task_number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskInput["priority"];
  category: TaskInput["category"];
  company_id: string;
  company_name: string;
  project_id: string | null;
  project_name: string | null;
  department_id: string | null;
  department_name: string | null;
  parent: { id: string; title: string; task_number: number } | null;
  start_date: string | null;
  due_date: string | null;
  requires_approval: boolean;
  reviewer: Person | null;
  creator: Person | null;
  created_at: string;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  assignees: Person[];
};

export type CommentItem = {
  id: string;
  body: string;
  created_at: string;
  is_revision_request: boolean;
  author: Person;
};

export type HistoryItem = {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor: string | null;
};

type TaskRef = {
  id: string;
  task_number: number;
  title: string;
  status: TaskStatus;
};

export function TaskDetail({
  task,
  subtasks,
  dependsOn,
  blocking,
  dependencyCandidates,
  comments,
  history,
  attachments,
  scopes,
  departments,
  peopleNames,
}: {
  task: TaskDetailData;
  subtasks: TaskListItem[];
  dependsOn: TaskRef[];
  blocking: TaskRef[];
  dependencyCandidates: TaskRef[];
  comments: CommentItem[];
  history: HistoryItem[];
  attachments: AttachmentItem[];
  scopes: TaskCreationScopes;
  departments: DepartmentOption[];
  peopleNames: Record<string, string>;
}) {
  const router = useRouter();
  const { can, userId } = useShell();
  const scope = { companyId: task.company_id, projectId: task.project_id };
  const isCreator = task.creator?.user_id === userId;
  const isAssignee = task.assignees.some((a) => a.user_id === userId);
  const canEdit = can("tasks.edit", scope) || isCreator;
  const canApprove = can("tasks.approve", scope);
  const canAssign = can("tasks.assign", scope);
  const canDelete = can("tasks.delete", scope);
  const canCreate = can("tasks.create", scope);
  const moves = allowedStatusMoves(task.status, {
    canEdit,
    canApprove,
    isAssignee,
    requiresApproval: task.requires_approval,
  });

  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [people, setPeople] = useState<AssignableUser[]>([]);
  const [assigneeIds, setAssigneeIds] = useState(
    task.assignees.map((a) => a.user_id),
  );
  const [dependency, setDependency] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAssignableUsers(task.company_id, task.project_id).then((list) => {
      if (!cancelled) setPeople(list);
    });
    return () => {
      cancelled = true;
    };
  }, [task.company_id, task.project_id]);

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    after?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.message) toast.success(res.message);
      if (after) after();
      else router.refresh();
    });
  }

  const unfinishedDeps = dependsOn.filter(
    (d) => !["completed", "approved", "cancelled"].includes(d.status),
  );
  const completionHours = task.completed_at
    ? (new Date(task.completed_at).getTime() -
        new Date(task.started_at ?? task.created_at).getTime()) /
      3600000
    : null;
  const mentionable = [
    ...new Map(
      [
        ...task.assignees,
        ...(task.creator ? [task.creator] : []),
        ...(task.reviewer ? [task.reviewer] : []),
        ...people.map((p) => ({
          user_id: p.user_id,
          name: p.name,
          avatar_url: p.avatar_url,
        })),
      ].map((p) => [p.user_id, p]),
    ).values(),
  ].filter((p) => p.user_id !== userId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-1">
            <Link href="/tasks" className="hover:underline">
              Tasks
            </Link>
            <span>/</span>
            <span className="font-mono">{taskCode(task.task_number)}</span>
            {task.parent && (
              <>
                <span>· subtask of</span>
                <Link
                  href={`/tasks/${task.parent.id}`}
                  className="hover:underline"
                >
                  {taskCode(task.parent.task_number)}
                </Link>
              </>
            )}
          </span>
        }
        title={task.title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <DueDate due={task.due_date} status={task.status} />
          </span>
        }
        actions={
          <>
            {canApprove && task.status === "waiting_for_review" && (
              <>
                <Button
                  onClick={() =>
                    run(() => updateTaskStatus(task.id, "approved"))
                  }
                  loading={pending}
                >
                  <CheckCircle2 /> Approve
                </Button>
                <Button variant="outline" onClick={() => setRevisionOpen(true)}>
                  <RotateCcw /> Request changes
                </Button>
              </>
            )}
            {moves.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={pending}>
                    <ArrowRightLeft /> Move to <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change status</DropdownMenuLabel>
                  {moves.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() =>
                        s === "revision_required"
                          ? setRevisionOpen(true)
                          : run(() => updateTaskStatus(task.id, s))
                      }
                    >
                      {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditOpen(true)}
                aria-label="Edit task"
              >
                <Pencil />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete task"
              >
                <Trash2 />
              </Button>
            )}
          </>
        }
      />

      {unfinishedDeps.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-warning-soft/60 px-4 py-3 text-sm text-amber-900">
          <GitBranch className="mt-0.5 size-4 shrink-0" />
          <span>
            Waiting on {unfinishedDeps.length} unfinished task
            {unfinishedDeps.length === 1 ? "" : "s"}:{" "}
            {unfinishedDeps.map((d, i) => (
              <span key={d.id}>
                {i > 0 && ", "}
                <Link href={`/tasks/${d.id}`} className="font-medium underline">
                  {taskCode(d.task_number)}
                </Link>
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">
                {task.description || (
                  <span className="text-muted-foreground">No description.</span>
                )}
              </p>
            </CardContent>
          </Card>

          {!task.parent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTree className="size-4 text-muted-foreground" /> Subtasks
                  <span className="text-sm font-normal text-muted-foreground">
                    {subtasks.filter((s) => s.status === "completed").length}/
                    {subtasks.length} done
                  </span>
                </CardTitle>
                {canCreate && (
                  <CardAction>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSubtaskOpen(true)}
                    >
                      <Plus /> Add subtask
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                {subtasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Break this task into smaller steps.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {subtasks.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/tasks/${s.id}`}
                          className="flex items-center gap-3 p-2.5 hover:bg-muted/50"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {taskCode(s.task_number)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {s.title}
                          </span>
                          <TaskStatusBadge status={s.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" /> Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Waiting on
                </p>
                {dependsOn.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing.</p>
                ) : (
                  <ul className="space-y-1">
                    {dependsOn.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Link
                          href={`/tasks/${d.id}`}
                          className="min-w-0 flex-1 truncate hover:underline"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {taskCode(d.task_number)}
                          </span>{" "}
                          {d.title}
                        </Link>
                        <TaskStatusBadge status={d.status} />
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              run(() => removeTaskDependency(task.id, d.id))
                            }
                            aria-label="Remove dependency"
                          >
                            <X />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && dependencyCandidates.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={dependency} onValueChange={setDependency}>
                      <SelectTrigger aria-label="Task this one waits on">
                        <SelectValue placeholder="Add a task this one waits on…" />
                      </SelectTrigger>
                      <SelectContent>
                        {dependencyCandidates
                          .filter((c) => !dependsOn.some((d) => d.id === c.id))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {taskCode(c.task_number)} · {c.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      disabled={!dependency || pending}
                      onClick={() =>
                        run(
                          () => addTaskDependency(task.id, dependency),
                          () => {
                            setDependency("");
                            router.refresh();
                          },
                        )
                      }
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
              {blocking.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Blocking
                  </p>
                  <ul className="space-y-1">
                    {blocking.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Link
                          href={`/tasks/${d.id}`}
                          className="min-w-0 flex-1 truncate hover:underline"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {taskCode(d.task_number)}
                          </span>{" "}
                          {d.title}
                        </Link>
                        <TaskStatusBadge status={d.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              <FileAttachments
                bucket="task-files"
                entityId={task.id}
                items={attachments}
                currentUserId={userId}
                canUpload
                canDeleteAny={canEdit}
                maxBytes={100 * 1024 * 1024}
                onRegister={(input) => addTaskAttachment(task.id, input)}
                onDelete={(id) => deleteTaskAttachment(id, task.id)}
                getUrl={getTaskFileUrl}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments">
                    <MessageSquare /> Comments ({comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History ({history.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="space-y-5">
                  <CommentBox
                    people={mentionable}
                    onSubmit={async (body, mentions) => {
                      const res = await addTaskComment({
                        task_id: task.id,
                        body,
                        mentions,
                      });
                      if (!res.ok) {
                        toast.error(res.error);
                        return false;
                      }
                      router.refresh();
                      return true;
                    }}
                  />
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No comments yet.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {comments.map((c) => (
                        <li key={c.id} className="flex gap-3">
                          <EntityAvatar
                            name={c.author.name}
                            src={c.author.avatar_url}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium">
                                {c.author.name}
                              </span>
                              <span
                                className="text-xs text-muted-foreground"
                                title={formatDateTime(c.created_at)}
                              >
                                {timeAgo(c.created_at)}
                              </span>
                              {c.is_revision_request && (
                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                                  Changes requested
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-sm whitespace-pre-line">
                              {highlightMentions(c.body)}
                            </p>
                          </div>
                          {c.author.user_id === userId && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                run(() => deleteTaskComment(c.id, task.id))
                              }
                              aria-label="Delete comment"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="history">
                  <ol className="space-y-3 border-l pl-4">
                    {history.map((h) => (
                      <li key={h.id} className="relative text-sm">
                        <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-card bg-primary" />
                        <span className="font-medium">
                          {h.actor ?? "System"}
                        </span>{" "}
                        {describe(h, peopleNames)}
                        <span className="block text-xs text-muted-foreground">
                          {formatDateTime(h.created_at)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canAssign ? (
                <>
                  <PeoplePicker
                    people={people}
                    value={assigneeIds}
                    onChange={setAssigneeIds}
                    placeholder="Unassigned"
                  />
                  {[...assigneeIds].sort().join() !==
                    task.assignees
                      .map((a) => a.user_id)
                      .sort()
                      .join() && (
                    <Button
                      size="sm"
                      loading={pending}
                      onClick={() =>
                        run(() => setTaskAssignees(task.id, assigneeIds))
                      }
                    >
                      Save assignees
                    </Button>
                  )}
                </>
              ) : task.assignees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              ) : (
                <ul className="space-y-2">
                  {task.assignees.map((a) => (
                    <li
                      key={a.user_id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <EntityAvatar
                        name={a.name}
                        src={a.avatar_url}
                        className="size-7"
                      />{" "}
                      {a.name}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                <Row label="Company">
                  <Link
                    href={`/companies/${task.company_id}`}
                    className="hover:underline"
                  >
                    {task.company_name}
                  </Link>
                </Row>
                <Row label="Project">
                  {task.project_id ? (
                    <Link
                      href={`/projects/${task.project_id}`}
                      className="hover:underline"
                    >
                      {task.project_name}
                    </Link>
                  ) : (
                    "Company-level"
                  )}
                </Row>
                <Row label="Category">{CATEGORY_LABELS[task.category]}</Row>
                <Row label="Department">{task.department_name ?? "—"}</Row>
                <Row label="Start">{formatDate(task.start_date)}</Row>
                <Row label="Due">{formatDate(task.due_date)}</Row>
                <Row label="Approval">
                  {task.requires_approval ? "Required" : "Not required"}
                </Row>
                <Row label="Reviewer">
                  {task.reviewer?.name ?? task.creator?.name ?? "—"}
                </Row>
                <Row label="Created by">{task.creator?.name ?? "—"}</Row>
                <Row label="Created">{formatDateTime(task.created_at)}</Row>
                {task.started_at && (
                  <Row label="Started">{formatDateTime(task.started_at)}</Row>
                )}
                {task.submitted_at && (
                  <Row label="Submitted">
                    {formatDateTime(task.submitted_at)}
                  </Row>
                )}
                {task.approved_at && (
                  <Row label="Approved">{formatDateTime(task.approved_at)}</Row>
                )}
                {task.completed_at && (
                  <Row label="Completed">
                    {formatDateTime(task.completed_at)}
                  </Row>
                )}
                {completionHours !== null && (
                  <Row label="Time taken">
                    {completionHours < 48
                      ? `${completionHours.toFixed(1)} hours`
                      : `${(completionHours / 24).toFixed(1)} days`}
                  </Row>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {canEdit && (
        <TaskFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          scopes={withCurrentScope(scopes, task)}
          departments={departments}
          task={{
            id: task.id,
            company_id: task.company_id,
            project_id: task.project_id ?? "",
            department_id: task.department_id ?? "",
            parent_task_id: task.parent?.id ?? "",
            title: task.title,
            description: task.description ?? "",
            category: task.category,
            priority: task.priority,
            start_date: task.start_date ?? "",
            due_date: task.due_date ?? "",
            requires_approval: task.requires_approval,
            reviewer_id: task.reviewer?.user_id ?? "",
            assignee_ids: [],
          }}
        />
      )}
      {canCreate && !task.parent && (
        <TaskFormDialog
          open={subtaskOpen}
          onOpenChange={setSubtaskOpen}
          scopes={withCurrentScope(scopes, task)}
          departments={departments}
          parentTitle={task.title}
          defaults={{
            company_id: task.company_id,
            project_id: task.project_id ?? "",
            parent_task_id: task.id,
            category: task.category,
            department_id: task.department_id ?? "",
          }}
        />
      )}

      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Tell the assignees what needs to change. This is saved as a
              comment.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="What should be changed?"
            aria-label="Requested changes"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!revisionNote.trim()}
              onClick={() =>
                run(
                  () =>
                    updateTaskStatus(
                      task.id,
                      "revision_required",
                      revisionNote,
                    ),
                  () => {
                    setRevisionOpen(false);
                    setRevisionNote("");
                    router.refresh();
                  },
                )
              }
            >
              Send back for changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {taskCode(task.task_number)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The task disappears from boards and reports. Its history is kept
              in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                run(
                  () => deleteTask(task.id),
                  () => router.push("/tasks"),
                )
              }
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </>
  );
}

// The edit/subtask dialogs need the task's own company/project in the lists
// even if the user could not create new tasks there.
function withCurrentScope(
  scopes: TaskCreationScopes,
  task: TaskDetailData,
): TaskCreationScopes {
  const companies = scopes.companies.some((c) => c.id === task.company_id)
    ? scopes.companies
    : [
        ...scopes.companies,
        {
          id: task.company_id,
          name: task.company_name,
          companyLevel: !task.project_id,
          canAssign: false,
        },
      ];
  const projects =
    !task.project_id || scopes.projects.some((p) => p.id === task.project_id)
      ? scopes.projects
      : [
          ...scopes.projects,
          {
            id: task.project_id,
            name: task.project_name ?? "",
            company_id: task.company_id,
            canAssign: false,
          },
        ];
  return { companies, projects };
}

function highlightMentions(body: string) {
  return body.split(/(@[\w.\-]+(?: [A-Z][\w.\-]+)?)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span
        key={i}
        className="rounded bg-primary-soft px-0.5 font-medium text-primary-strong"
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function describe(h: HistoryItem, names: Record<string, string>) {
  const status = (v: string | null) =>
    v ? (STATUS_LABELS[v as TaskStatus] ?? v) : "—";
  switch (h.action) {
    case "created":
      return "created the task";
    case "status_changed":
      return (
        <>
          moved it from <b>{status(h.from_value)}</b> to{" "}
          <b>{status(h.to_value)}</b>
        </>
      );
    case "priority_changed":
      return `changed priority from ${h.from_value} to ${h.to_value}`;
    case "due_date_changed":
      return `changed the due date from ${formatDate(h.from_value)} to ${formatDate(h.to_value)}`;
    case "details_edited":
      return "edited the details";
    case "assignee_added":
      return `assigned ${names[h.to_value ?? ""] ?? "someone"}`;
    case "assignee_removed":
      return `unassigned ${names[h.from_value ?? ""] ?? "someone"}`;
    case "deleted":
      return "deleted the task";
    default:
      return h.action.replace(/_/g, " ");
  }
}
