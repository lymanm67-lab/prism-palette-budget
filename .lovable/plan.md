# Port App-Dev Cutoff to 6 Other Apps (Founder-Gated)

Target apps: **FocusOS, Coach Lyman App, FocusOSHR, Focused Driven Coach, Story Cast Academy, Montgomery Family Trust Vault**

## Gating model (answers your question)

In each target app the cutoff UI + data will be **hard-gated to your user_id** (`isFounder` check). Other users:
- Won't see the nudge, settings panel, or dashboard card
- Can't query the tables (RLS restricts SELECT/INSERT/UPDATE/DELETE to your user_id)
- Won't even see the route if added

This is stricter than PrismMoney's current household-scoped model. PrismMoney itself stays household-scoped (your household has only you anyway).

## Self-contained variant (no transaction reconciliation)

The other apps don't have `transactions`/`accounts`/`categories` schemas. So each gets a **lite version**:
- Manual credit log only (you log Lovable credits/$ spent per day)
- No auto-derivation from transactions
- Same status logic (ok / warn / over), same override flow, same monthly reset cron

## Per-app deliverables (×6, identical pattern)

**Migration** (3 tables, founder-only RLS):
- `app_dev_limits` (monthly_spend_limit, monthly_credit_limit, period_start, is_enabled, founder_user_id)
- `app_dev_credit_log` (date, amount_usd, credits_used, note, soft-delete)
- `app_dev_overrides` (reason, status, expires_at)
- RLS: `USING (auth.uid() = '<your-user-id>')` on all three
- GRANTs to `authenticated` + `service_role`

**Frontend** (4 files per app):
- `src/lib/founder.ts` — single hardcoded founder user_id constant
- `src/hooks/use-app-dev-cutoff.ts` — lite version (no tx/category deps)
- `src/components/AppDevCutoffNudge.tsx` — only renders if `isFounder`
- `src/components/AppDevCutoffPanel.tsx` — settings + manual log entry form
- Mount nudge in main dashboard, panel in settings (founder-gated)

**Edge function + cron** (1 per app):
- `app-dev-cutoff-reset` — rolls `period_start` on the 1st monthly
- pg_cron entry calling it with `CRON_SECRET`

## Execution order

1. Confirm your founder user_id (same across all 6 workspaces? — see Q below)
2. For each app in parallel batches of 2: migration → hook → components → mount → edge fn + cron
3. Verify nudge renders for you and is invisible when signed in as a test user

## Questions before I build

1. **Same user_id across all 6 apps?** Each Lovable Cloud project has its own auth.users table. I need to confirm your account email exists in each — or I'll add a fallback that checks email instead of user_id (slightly less strict but works cross-project).
2. **Limits — same $100 / 400 credits per app**, or one **shared global pool** across all 7 apps? (Shared = much more work: needs a central API; I'd recommend per-app for now.)
3. **Where to mount the nudge** in each app? Default: top of main dashboard/home route. Or only on a `/settings/app-dev` page?

## Credit estimate

Medium-Large. ~6 migrations + ~24 frontend files + 6 edge functions. Doing all 6 in one go is most efficient (shared patterns, parallel writes).
