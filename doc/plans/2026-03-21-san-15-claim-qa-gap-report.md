# SAN-15 claim QA gap report

Date: 2026-03-21
Issue: SAN-15 — Run end-to-end claim QA for evidence, approval, and notification delivery

## Summary

I attempted to execute the requested QA flow against the current `paperclip-dev` repository and found that the acceptance criteria do not map to the product that exists in this codebase.

The repository currently exposes:

- company-scoped board routes such as `/issues/:issueId` and `/approvals/:approvalId`
- issue attachments in the issue detail page
- approval review pages under `/approvals`
- in-app live toast notifications for board activity

The repository does **not** currently expose or implement:

- `/claim/status`
- `/admin/claims`
- a claim submission domain model or claim review workflow
- notification delivery tracking for claimant review emails

Because those features are absent, I could not run the requested end-to-end claimant/admin QA path in this repository.

## Evidence gathered

### 1. UI route inventory does not include claim pages

Command:

```sh
sed -n '120,330p' ui/src/App.tsx
```

Result:

- Board routes include `issues`, `approvals`, `agents`, `projects`, `costs`, `activity`, and `inbox`.
- There are no routes for `/claim/status`, `/admin/claims`, or any other claim-specific pages.

### 2. The closest matching UI surface is issue attachments, not claim evidence

Command:

```sh
sed -n '620,940p' ui/src/pages/IssueDetail.tsx
```

Result:

- Issue detail supports uploading and rendering attachments.
- Attachments are visible within issue detail only.
- This is not a claimant-facing status page or an admin claim review page.

### 3. The closest matching approval flow is the board approvals UI

Command:

```sh
sed -n '1,260p' ui/src/pages/Approvals.tsx
sed -n '1,260p' ui/src/pages/ApprovalDetail.tsx
```

Result:

- Approvals can be approved/rejected from `/approvals` and `/approvals/:approvalId`.
- These flows are for board approvals tied to Paperclip entities, not customer claims.
- The approval detail page mentions notifying the requesting agent, not claimants or email recipients.

### 4. Repository search shows no claim feature implementation matching SAN-15

Command:

```sh
rg -n "\\bclaim\\b|claim/status|admin/claims|evidence link|notification delivery" server ui packages docs -g '!node_modules' -g '!dist'
```

Result:

- Search results only found board-claim ownership, API key claim flows, and generic documentation text.
- No claimant/admin claims module was found.

### 5. Repository search shows no email notification delivery feature for claims

Command:

```sh
rg -n "email|mailer|notification status|delivery state|notification" server ui packages -g '!node_modules' -g '!dist'
```

Result:

- The codebase contains auth email fields and in-app toast/live-update notifications.
- No claim-review email delivery pipeline or claimant notification status tracking was found.

## Acceptance criteria status

### Requested acceptance

- One successful pending -> approved path
- One successful pending -> rejected path
- Evidence links render in both admin and claimant views
- Notification status is traceable for each reviewed claim

### Current status in this repository

- Pending -> approved path: **blocked** (no claims workflow)
- Pending -> rejected path: **blocked** (no claims workflow)
- Evidence links in admin + claimant views: **blocked** (no claimant/admin claim views)
- Notification traceability per reviewed claim: **blocked** (no claim notification delivery system)

## Recommended next steps

1. Confirm whether SAN-15 was intended for a different repository or deployment.
2. If this issue is intended for `paperclip-dev`, define the missing claim feature surface explicitly:
   - claimant submission endpoint and page
   - claimant status page
   - admin claim review page
   - evidence attachment/storage model for claims
   - notification delivery persistence and UI
3. Once the feature exists in this repo, create an end-to-end QA checklist and automate it with Playwright where possible.

## Notes

- The working tree already had a pre-existing modification to `pnpm-lock.yaml` before this investigation.
- I did not modify that lockfile as part of this report.
