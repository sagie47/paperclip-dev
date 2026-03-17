---
title: Control-Plane Commands
summary: SSH/headless control-plane commands for operators and agents
---

Client-side commands for managing issues, agents, approvals, and more in SSH/headless environments.

## SSH Auth & Identity

```sh
# Store operator token in context profile
pnpm paperclipai auth login --token <operator-token> --api-base http://127.0.0.1:3100 --use

# Verify active board identity/session
pnpm paperclipai auth whoami
```

## Issue Commands

```sh
# List issues
pnpm paperclipai issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm paperclipai issue get <issue-id-or-identifier>

# Create issue
pnpm paperclipai issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm paperclipai issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm paperclipai issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm paperclipai issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm paperclipai issue release <issue-id>
# Labels / docs / linked approvals
pnpm paperclipai issue labels --company-id <company-id>
pnpm paperclipai issue docs <issue-id>
pnpm paperclipai issue approvals <issue-id>

```

## Company Commands

```sh
pnpm paperclipai company list
pnpm paperclipai company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm paperclipai company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm paperclipai company import \
  --from https://github.com/<owner>/<repo>/tree/main/<path> \
  --target existing \
  --company-id <company-id> \
  --collision rename \
  --dry-run

# Apply import
pnpm paperclipai company import \
  --from ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm paperclipai agent list
pnpm paperclipai agent get <agent-id>

# Hire / update
pnpm paperclipai agent hire --company-id <company-id> --name "Agent" --role "Engineer" --adapter codex_local
pnpm paperclipai agent update <agent-id> [--status active] [--reports-to <manager-id>]

# Agent keys / runs
pnpm paperclipai agent keys <agent-id>
pnpm paperclipai agent runs <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm paperclipai approval list [--status pending]

# Get approval
pnpm paperclipai approval get <approval-id>

# Create approval
pnpm paperclipai approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm paperclipai approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm paperclipai approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm paperclipai approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm paperclipai approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm paperclipai approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm paperclipai activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm paperclipai dashboard get
```

## Heartbeat

```sh
pnpm paperclipai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```


## Access (Invites & Join Requests)

```sh
pnpm paperclipai access invite --company-id <company-id> [--allowed-join-types both]
pnpm paperclipai access revoke-invite <invite-id>
pnpm paperclipai access join-requests --company-id <company-id> [--status pending_approval]
pnpm paperclipai access approve-join --company-id <company-id> <join-request-id>
pnpm paperclipai access reject-join --company-id <company-id> <join-request-id>
```

## Goals & Projects

```sh
pnpm paperclipai goal list --company-id <company-id>
pnpm paperclipai goal create --company-id <company-id> --title "..."
pnpm paperclipai project list --company-id <company-id>
pnpm paperclipai project create --company-id <company-id> --name "..."
```

## Secrets & Costs

```sh
pnpm paperclipai secret providers --company-id <company-id>
pnpm paperclipai secret list --company-id <company-id>
pnpm paperclipai secret create --company-id <company-id> --name OPENAI_API_KEY --value "$OPENAI_API_KEY"

pnpm paperclipai cost summary --company-id <company-id>
pnpm paperclipai cost budgets --company-id <company-id>
pnpm paperclipai cost set-company-budget --company-id <company-id> --budget-monthly-cents 500000
pnpm paperclipai cost set-agent-budget <agent-id> --budget-monthly-cents 200000
```
