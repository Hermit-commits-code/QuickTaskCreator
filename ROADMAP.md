# Quick Task Creator Roadmap

## Current Features

- `/task` command for task creation
- `/tasks` to list open tasks
- `/task-edit`, `/task-complete`, `/task-delete` for task management
- SQLite storage
- Slack Bolt integration
- Assign tasks to users in the channel (via @mention in `/task` or `/task-edit`)

## Upcoming Features

### Free Tier (Core)

**MVP Critical:**

- Bulk task actions (multi-select, batch complete/delete)
- Task categories, tags, or priorities
- Customizable notification channels
- Workspace-wide settings (reminder times, digest frequency)

**Future Iterations:**

- User notification preferences (mute, digest only, etc.)
- Improved mobile UX for modals
- Accessibility enhancements

### Premium Tier (Advanced/Business)

- Advanced reporting and analytics
- Activity logs and audit trails
- Admin dashboard for user/task management
- Task comments or threaded discussions
- Export/import tasks (CSV, JSON)
- Integration with external tools (Google Calendar, Trello, etc.)
- API endpoints for external automation
- Enhanced onboarding and workspace management

## Assigning Tasks to Users

- When a user is @mentioned in the `/task` or `/task-edit` command, their Slack user ID is parsed and stored in the `assigned_user` field in the database.
- The app displays the assigned user in the task message (e.g., `Assigned to: @hermit`).
- Future: Add interactive assignment via buttons or dropdowns.

**Status:**

Improve /addadmin to support both Slack mention and @username input (completed)
Task reminders and notifications (completed)

- **Implemented:**
