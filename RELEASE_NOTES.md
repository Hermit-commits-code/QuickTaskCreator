# Release Notes

---

## v1.11.0 (2025-10-03)

**Enterprise-Ready Features:**

- New bug report modal with structured fields: Title, Steps to Reproduce, Expected Behavior, Actual Behavior, Environment, Additional Context/Screenshots.
- Bug reports are logged to the database and automatically create GitHub issues for triage and tracking.
- All feedback and bug reports are now reliably stored and actionable.
- Multi-tenant workspace isolation: all data is partitioned by workspace for privacy and compliance.
- Privacy and security controls: sensitive data is encrypted at rest and in transit; privacy policy and data deletion available on request.
- Automated onboarding and workspace provisioning for new Slack installs.
- Hosted infrastructure ready for cloud deployment (Render, Railway, etc.).
- README and documentation updated for v1.11.0, SaaS roadmap, and privacy/security.

**Improvements:**

- Professional error handling for feedback and bug report workflows.
- Enhanced onboarding and support flows for enterprise and public Slack App Directory launch.

---

## v1.10.1 (2025-10-02)

**Accessibility Enhancements:**

- All modals now include descriptive labels and placeholders for screen readers.
- Section headers with accessibility instructions.
- `hint` fields for extra guidance.
- Tab navigation support for all input/select blocks.
- Consistent, readable text and clear instructions.

These improvements ensure Quick Task Creator is usable by everyone, including those using assistive technologies.

---

## v1.10.0 (2025-10-02)

**Improvements:**

- All modals (task creation, editing, batch actions, completion, deletion) redesigned for mobile usability.
- Short, clear labels and placeholders for mobile screens.
- Section dividers for clarity and context.
- Only essential fields required; others optional.
- Concise block order for easier navigation and thumb reach.
- Larger touch targets and minimal scrolling.
- Fully tested on Slack mobile app for accessibility and usability.

These changes ensure a professional, frictionless experience for mobile users across all workflows.

---

## v1.9.0 (2025-10-02)

**New:**

- User notification preferences: `/notifyprefs` command opens a modal for users to mute notifications, receive only digests, or customize reminder times.
- Preferences are stored in the database and respected by all notification logic.
- Critical admin alerts cannot be muted if required by workspace policy; admins can override for compliance.

**Improvements:**

- More control and flexibility for users to manage notification fatigue and workflow.

---

## v1.8.0 (2025-10-02)

**New:**

- Enhanced reporting and analytics: `/report` command now shows workspace stats (total, completed, open, overdue, completion rate, recent activity, by category, priority, user).
- Results displayed in Slack message with summary, breakdowns, and professional enhancements.

**Improvements:**

- More actionable insights for workspace management and team productivity.

---

## v1.7.0 (2025-10-02)

**New:**

- Activity logs & audit trails: All major actions are now logged for auditing.
- Admins can view logs with `/auditlog`.

**Improvements:**

- Full traceability for all task, admin, and config actions.

---

## v1.5.0 (2025-10-02)

**New:**

- Workspace notification and schedule settings: `/setconfig` command opens a modal to set digest channel, digest time, and reminder time.
- Settings are stored in the database and used for all notifications and digests.

**Improvements:**

- Flexible configuration for workspace admins.

---

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
