# Quick Task Creator Roadmap

## Current Features

- `/task` command for task creation
- `/tasks` to list open tasks
- `/task-edit`, `/task-complete`, `/task-delete` for task management
- SQLite storage
- Slack Bolt integration
- Assign tasks to users in the channel (via @mention in `/task` or `/task-edit`)

## Upcoming Features

- Message shortcut: "Create Task" from any Slack message (Complete)
- Interactive buttons for Complete, Edit, Delete (Complete)
- Configurable task channel (via `/setdigestchannel` command)
- Daily digest of open tasks (Complete)
- Improved formatting with Slack Block Kit (Complete)
- Robust error handling (Complete)
- Admin controls

## Assigning Tasks to Users

- **Implemented:**
  - When a user is @mentioned in the `/task` or `/task-edit` command, their Slack user ID is parsed and stored in the `assigned_user` field in the database.
  - The app displays the assigned user in the task message (e.g., `Assigned to: @hermit`).
  - Future: Add interactive assignment via buttons or dropdowns.

**Status:**

- Block Kit interactive buttons (Complete, Edit, Delete) are now live and appear on all task messages for direct management in Slack.
- Message shortcut and improved formatting are complete.
- Daily digest of open tasks is implemented and sent to the configured channel at 9am daily. Channel can be set with `/setdigestchannel`.
- Robust error handling is implemented: all commands provide clear, actionable error messages and log errors for debugging.
- Backend parsing and display of assigned users is live.
