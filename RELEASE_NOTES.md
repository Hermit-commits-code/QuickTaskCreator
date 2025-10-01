# Release Notes

---

## v0.5.0 (2025-10-01)

**New:**

- Daily digest of open tasks: Automatic summary sent to the configured Slack channel every morning at 9am.
- `/setdigestchannel` command: Set the Slack channel for daily digest delivery.

**Improvements:**

- Documentation updated for daily digest and channel configuration.

**Improvements:**

- Error handling: All commands now provide clear, actionable error messages to users and log errors for debugging.

**Upcoming:**

- Admin controls

---

## v0.4.1 (2025-10-01)

**New:**

- Block Kit interactive buttons (Complete, Edit, Delete) now appear on every task message in Slack. Users can manage tasks directly from the message with a single click.

**Improvements:**

- Button actions are available for both `/task` command and "Create Task" shortcut.
- Documentation updated to reflect button usage.

**Upcoming:**

- Daily digest of open tasks

---

## v0.3.0 (2025-10-01)

**New:**

- Assign tasks to users via @mention in `/task` and `/task-edit` (backend parsing and storage)

**Improvements:**

- SQLite storage implemented
- Slack Bolt integration complete
- `/task`, `/tasks`, `/task-edit`, `/task-complete`, `/task-delete` commands working
- Documentation updated

**Upcoming:**

- Message shortcut: "Create Task"
- Interactive buttons for task management
- Daily digest of open tasks

---

## v0.2.0 (2025-10-01)

**New:**

- SQLite storage implemented
- Slack Bolt integration complete
- `/task`, `/tasks`, `/task-edit`, `/task-complete`, `/task-delete` commands working
- Documentation updated

**Upcoming:**

- Assign tasks to users via @mention
- Message shortcut: "Create Task"
- Interactive buttons for task management
- Daily digest of open tasks
