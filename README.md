# MarketingHQ — Multi-Company Digital Marketing Platform

Internal platform to manage, assign, monitor and report digital marketing work
across multiple companies and their projects: tasks, social media calendars,
Meta & Google Ads monitoring, creative and video production, SEO and team
productivity — with role-based access down to each company, project and module.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn-style components on Radix · TanStack Table · Recharts · React Hook Form ·
Zod · Supabase (Auth, Postgres + RLS, Storage, Realtime).

* Architecture, ER diagrams, permission design and roadmap: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Status

**Phases 1 (Foundation) and 2 (Tasks & Team) are complete.** The full database
for all six phases is in place with Row Level Security and tests; the modules
of Phases 3–6 get their screens in the next phases. Only implemented modules
appear in the navigation. Phase 2 details: [`docs/PHASE-2.md`](docs/PHASE-2.md).

What works now:

| Area | Features |
|---|---|
| Authentication | Sign up, sign in, password reset, invitation acceptance (set password), session refresh, sign out |
| Organization | First-run setup (first user becomes owner + Super Admin), profile, logo, currency, time zone |
| Companies | Create, edit, logo upload, contacts, status, soft delete, company settings (approval rules, brand), company team |
| Projects | Create, edit, image, manager, dates, status, soft delete, project settings (approval overrides, ad budget, target CPL), project team |
| Team | Directory, invite by email, add existing accounts, departments, reporting lines, suspend / restore / remove, per-person roles across organization / company / project |
| Roles & permissions | 8 default roles, custom roles, copy from an existing role, permission matrix by module, who-has-this-role |
| Shell | Dark sidebar, company + project switcher (filters lists and dashboard), permission-aware global search (⌘K), live notification bell, mobile navigation |
| Dashboard | Real counts filtered by the selected company/project, projects-by-status chart, getting-started checklist, my access, recent activity |
| Tasks | Board / list / calendar views with drag-and-drop, subtasks, dependencies, multiple assignees, comments with @mentions, files, approvals and revision requests, full history |
| Daily reports | Write / draft / submit, manager review and feedback, attachments; drafts stay private |
| Dashboards | My Work (per employee) and Team Performance (per employee and department, date ranges, overdue work, missing reports) |
| Notifications | Assignment, review, revision, approval, completion, comments, mentions, due soon, overdue, missed deadlines, daily reports — live in the bell |
| Audit | Every change to companies, projects, roles, permissions, members and assignments is logged |

## 1. Prerequisites

* Node.js 20.9+ (22 recommended)
* A Supabase project (free tier works) — or the Supabase CLI with Docker for a local stack
* For running the database tests locally: PostgreSQL 15+ binaries (`initdb`, `pg_ctl`, `psql`)

## 2. Set up Supabase

1. **Create a project** at <https://supabase.com/dashboard>.
2. **Apply the migrations** (pick one):
   * CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, then `npm run db:push`
   * Dashboard: run each file in `supabase/migrations/` in order in the SQL editor.
3. **Auth → URL configuration**
   * Site URL: your app URL (e.g. `https://marketing.example.com`, or `http://localhost:3000`)
   * Redirect URLs: `<site>/auth/callback` and `<site>/auth/set-password`
4. **Auth → Providers → Email**: keep "Confirm email" on. After you have created
   the first (owner) account you can turn **"Allow new users to sign up" off** —
   everyone else joins through invitations.
5. **Auth → Email templates (recommended)** — makes links work across devices and
   browsers by using token hashes:
   * *Invite user*: link to
     `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite`
   * *Reset password*: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`
   * *Confirm signup*: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`

   The default templates also work (the app handles both link styles).
6. **Realtime**: the migration adds `notifications` to the `supabase_realtime`
   publication when it exists. If you created the project without Realtime,
   enable it for the `notifications` table under Database → Publications.
7. **Deadline reminders**: enable the `pg_cron` extension (Database →
   Extensions) and schedule `public.process_task_deadlines()` hourly — see
   [`docs/PHASE-2.md`](docs/PHASE-2.md).
8. **Custom SMTP** (Auth → SMTP) is strongly recommended for production; the
   built-in sender is rate-limited.

## 3. Run the app locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(Project Settings → API keys) and, for invitations, `SUPABASE_SECRET_KEY`.

```bash
npm run dev
```

Open <http://localhost:3000>, create your account, confirm the email, and set up
the organization. You are now the owner and Super Admin.

**First steps:** add companies → add projects → Team → *Invite member* (choose a
first role and the company/project it applies to) → adjust roles in
Settings → Roles & permissions.

## 4. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | Regenerate route types and run TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test:db` | Applies every migration to a throw-away Postgres and runs the RLS test suites in `supabase/tests` |
| `npm run db:types` | Regenerates `src/types/database.types.ts` (`SUPABASE_PROJECT_ID=… npm run db:types`, or `DB_URL=…`) |
| `npm run db:push` | Applies migrations to the linked Supabase project |

## 5. Deploying

Any Node host works; Vercel is the simplest:

1. Import the repository, framework preset **Next.js**.
2. Set the environment variables from `.env.example` (`SUPABASE_SECRET_KEY` as
   a server-only variable — never prefix it with `NEXT_PUBLIC_`).
3. Set `NEXT_PUBLIC_SITE_URL` to the production URL and add that URL's
   `/auth/callback` and `/auth/set-password` to Supabase redirect URLs.
4. Deploy. Run `npm run db:push` (or CI) whenever new migrations are added.

## 6. Security model in one paragraph

Every table has Row Level Security. A person's access comes only from role
assignments at organization, company or project level; the database checks
those for every query, write, file download and upload, and triggers enforce
workflow rules (approvals, immutable approved versions, read-only API data,
soft-delete permission). The app talks to Supabase as the signed-in user; the
service-role key is used only to send invitations and never reaches the
browser. OAuth tokens for future integrations live in a private, encrypted
table the API cannot reach. Details: `docs/ARCHITECTURE.md` §3 and §8.

## 7. Operational notes

* **Deactivate rather than delete people.** Suspend them in Team; deleting an
  Auth user who authored approvals is blocked to preserve the audit trail.
* **Soft delete**: deleted companies/projects disappear from the app but their
  history stays for reporting and audit.
* **Integrations** (Meta, Google Ads, Search Console, GA4) arrive in Phases 4–5.
  They will show "awaiting configuration" until connected and successfully
  synced — never placeholder numbers.
