# Phase 2 — Task & Team Management

## Database

| Table | Purpose |
|---|---|
| `tasks` | Task with company (required), project, department, parent (subtasks, one level), category, priority, status, dates, reviewer, `requires_approval`, workflow timestamps (`started_at`, `submitted_at`, `approved_at`, `completed_at`) |
| `task_assignees` | Many assignees per task |
| `task_dependencies` | "Task A waits on task B" (same company, no direct cycles) |
| `task_comments` | Comments, `@mentions` (user ids), revision requests |
| `task_attachments` | Files in the private `task-files` bucket |
| `task_activity_logs` | Append-only history written by triggers |
| `daily_reports`, `daily_report_comments`, `daily_report_attachments` | One report per person / date / company (/ project), manager feedback, files |
| `notifications` | In-app notifications (Realtime); `email_sent_at` / `push_sent_at` ready for later channels |
| `private.task_deadline_notices` | Makes sure each deadline reminder is sent once |

Migration `20261106000013_phase2_tasks_workflow.sql` adds the workflow logic on
top of the Phase 1 schema.

## Permissions

| Action | Who |
|---|---|
| See a task | `tasks.view_all` in scope, or `tasks.view` and you created it, review it or are assigned |
| Create | `tasks.create` in the company/project |
| Assign others | `tasks.assign` (anyone who may create can assign themselves) |
| Be assigned | must hold `tasks.view` / `tasks.view_all` for that company/project (database check) |
| Edit details | `tasks.edit`, or the creator |
| Move status as assignee | forward through the workflow only; details stay frozen |
| Approve / request changes | `tasks.approve` |
| Complete a task that needs approval | `tasks.approve` |
| Delete | `tasks.delete` (soft delete) |
| Daily report | author writes; drafts are private; `daily_reports.view_all` / `.review` see submitted ones; only reviewers mark "reviewed", and cannot change content |
| Team performance page | `team.view_performance`; figures are RLS-filtered (people without `tasks.view_all` only see their own tasks) |

## Workflow & notifications

```
New → Assigned → In progress → Waiting for review → Approved → Completed
                       ↑                 │
                       └─ Revision required (with a note)    On hold / Cancelled at any time
```

| Event | Notified |
|---|---|
| Assigned | the assignee |
| Waiting for review | reviewer (or creator) |
| Revision required / Approved / Completed | assignees (+ creator on completion) |
| Comment | assignees, creator, reviewer (not the author) |
| @mention | the mentioned person — only if they can open the task |
| Due today / tomorrow, overdue | assignees (once per due date) |
| Deadline missed | creator, reviewer and each assignee's manager (`reports_to`) |
| Daily report submitted | the author's manager (`reports_to`, else department head) |
| Report reviewed / feedback | the author |

Deadline reminders run from `public.process_task_deadlines()`, scheduled hourly
with **pg_cron** when the extension is available. On Supabase: Database →
Extensions → enable `pg_cron`, then run once in the SQL editor:

```sql
select cron.schedule('process-task-deadlines', '7 * * * *', 'select public.process_task_deadlines()');
```

## Screens

| Route | What |
|---|---|
| `/my-work` | Employee dashboard: open / overdue / completed / average completion time, my open tasks, reviews waiting for me, today's report |
| `/tasks` | Board (drag between columns), List (sortable table) and Calendar (drag to reschedule); filters for status, overdue, priority, category, assignee; follows the header company/project |
| `/tasks/[id]` | Workflow buttons, approve / request changes, assignees, subtasks, dependencies, files, comments with @mentions, full history, time taken |
| `/daily-reports` | My reports, team reports (awaiting review / reviewed) |
| `/daily-reports/new`, `/daily-reports/[id]` | Write, save draft, submit, edit until reviewed, attachments, feedback, mark reviewed |
| `/team-performance` | Date range, totals, employee table (assigned, completed, pending, overdue, in review, revisions, average time, completion %), department completion chart, overdue list, who has not reported today |

Productivity is measured from task outcomes only — never from login time or
activity counts.

## Tests

`supabase/tests/03_phase2_workflow.test.sql` covers assignment checks,
notification fan-out (including mention privacy and no self-notifications),
one-time deadline reminders, subtask/dependency rules, RLS on the summary
function, daily-report notifications and draft privacy.
