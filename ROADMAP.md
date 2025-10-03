# Quick Task Creator Roadmap

---

## ✅ Completed Features

- Modal-based task creation, editing, completion, and deletion
- Bulk task actions (multi-select, batch complete/delete)
- Task categories, tags, priorities
- Customizable notification channels and workspace-wide settings
- Daily digest and reminders
- Admin controls (add/remove/list admins)
- Activity logs and audit trails (`/auditlog` command)
- SQLite backend and Slack Bolt integration
- Professional error handling and user feedback
- Mobile UX improvements
- In-app help and usage hints for all commands
- In-app support command (`/help` or `/support`)
- Easy Slack app install and onboarding
- Usage analytics (track active workspaces, users, tasks)
  - Analytics now track command usage, active workspaces, and users. Privacy disclaimer included in onboarding. Contact support to opt out.

---

## 🚧 Upcoming Features & Improvements

### Free Tier (Core)

✅ Accessibility enhancements

### Premium Tier (Advanced/Business)

- Advanced reporting and analytics
- Admin dashboard for user/task management
- Task comments or threaded discussions
- Export/import tasks (CSV, JSON)
- Integration with external tools (Google Calendar, Trello, etc.)
- API endpoints for external automation
- Enhanced onboarding and workspace management

### SaaS Requirements

- Multi-tenant support: Each Slack workspace is isolated, with its own data and settings
- User authentication and account management (web dashboard, login, password reset)
- Subscription/payment integration (Stripe, Paddle, etc.)
- Usage limits and feature tiers (free vs. premium)
- Hosted infrastructure (cloud server, database, secure endpoints)
- Automated onboarding and workspace provisioning
- Secure data storage and privacy controls
- Web dashboard for account management and analytics

---

## 🚀 Go-To-Market Checklist

- Positioning: Slack-first, frictionless, modal-based task management
- Free tier: Core features (see above)
- Paid tier: Premium features (audit logs, analytics, integrations)
- Pricing: Simple monthly per-workspace or per-user
- Slack App Directory listing
- Website with demo, features, pricing, and support
- Targeted outreach to Slack communities, agencies, startups
- Stripe/Paddle integration for payments

---

## Assigning Tasks to Users

- When a user is @mentioned in the `/task` or `/task-edit` command, their Slack user ID is parsed and stored in the `assigned_user` field in the database.
- The app displays the assigned user in the task message (e.g., `Assigned to: @hermit`).
- Future: Add interactive assignment via buttons or dropdowns.

---

## Personal Admin Dashboard Mini Roadmap

- Build a private admin dashboard for internal analytics and monitoring
  - View active workspaces and users
  - Track command usage and engagement
  - Spot issues or unusual activity
  - Extend with reporting or export features as needed

---
