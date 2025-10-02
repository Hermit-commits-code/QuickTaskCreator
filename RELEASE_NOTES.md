## v1.4.0 (2025-10-02)

**New:**

- Task categories, tags, and priority fields added to all tasks.
- Modals for task creation/editing now support category, tags, and priority selection.
- `/tasks` list displays all new fields for each task.

**Improvements:**

- Enhanced organization and filtering for task management.

---

## v1.3.0 (2025-10-02)

**New:**

- Bulk task actions: Multi-select modal for batch complete/delete from `/tasks` list.
- Permissions: Admins can batch complete/delete any open task; regular users can only modify their own.
- Error handling: Clear feedback for each task in batch actions, including permission errors and missing tasks.

**Improvements:**

- Streamlined workflow for managing multiple tasks at once.

---

## v1.2.0 (2025-10-02)

**New:**

- Auto-admin logic: If no admins exist, the first user to run `/add-admin` is automatically made an admin. This enables solo users to self-admin without manual setup.

**Improvements:**

- `/listadmins` handler refactored for professional error handling. No more double ack errors; code is future-proof and robust.

---

## v1.1.0 (2025-10-02)

**New:**

- `/listadmins` command now opens a modal listing all current admins in your workspace.
- Documentation updated to reflect modal-based admin management workflows.

---

## v1.0.0 (2025-10-02)

**Major Release: Modal-Based Task Management**

- All task actions (create, complete, edit, delete) now use professional Block Kit modals for error-free workflows.
- Task picker modals for completion, deletion, and editing: select tasks from a dropdown, no manual IDs required.
- Interactive buttons (Complete, Edit, Delete) on every task message, wired to open the correct modal.
- Context-aware modals: only relevant tasks shown, admin permissions respected.
- Documentation fully updated for modal workflows and picker logic.
- Version bumped to 1.0.0 for production readiness.

**Improvements:**

- Robust error handling and user feedback throughout all workflows.
- SQLite storage and Slack Bolt integration stable.

**Next:**

- Advanced reporting, audit logs, and customizable notification channels.

**New:**

- Automatic reminders for tasks with due dates and assigned users.
- Reminders sent 24 hours before and on the day a task is due.
- Interactive Slack buttons to snooze reminders (1 hour, 1 day) or reschedule (via `/task-edit`).

**Improvements:**

- Reminder status and next notification time tracked in the database.

# Release Notes

---

## v0.5.1 (2025-10-01)

**Improvements:**

- `/addadmin` command now accepts both Slack mention format (`<@U12345678>`) and plain `@username` input. The app automatically resolves usernames to user IDs using the Slack API for a smoother experience.
- Usage hint updated for clarity.

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
