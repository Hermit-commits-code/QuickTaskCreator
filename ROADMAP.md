# Quick Task Creator Roadmap

## ✅ Current Features (Completed & Pushed)

- [x] `/task` command for task creation
- [x] `/tasks` to list open tasks
- [x] `/task-edit`, `/task-complete`, `/task-delete` for task management
- [x] SQLite storage
- [x] Slack Bolt integration
- [x] Assign tasks to users in the channel (via @mention in `/task` or `/task-edit`)
- [x] Bulk task actions (multi-select, batch complete/delete)
- [x] Task categories, tags, or priorities
- [x] Customizable notification channels
- [x] Workspace-wide settings (reminder times, digest frequency)
- [x] Daily digest and reminders
- [x] Admin controls (add/remove/list admins)
- [x] Activity logs and audit trails (`/auditlog` command)

## 🚧 Upcoming Features & Improvements

### Free Tier (Core)

- [x] Bulk task actions (multi-select, batch complete/delete)
- [x] Task categories, tags, or priorities
- [x] Customizable notification channels
- [x] Workspace-wide settings (reminder times, digest frequency)
- [x] User notification preferences (mute, digest only, etc.)
- [x] Improved mobile UX for modals
- [ ] Accessibility enhancements

### Premium Tier (Advanced/Business)

- [ ] Advanced reporting and analytics
- [x] Activity logs and audit trails
- [ ] Admin dashboard for user/task management
- [ ] Task comments or threaded discussions
- [ ] Export/import tasks (CSV, JSON)
- [ ] Integration with external tools (Google Calendar, Trello, etc.)
- [ ] API endpoints for external automation
- [ ] Enhanced onboarding and workspace management

### SaaS Requirements

- [ ] Multi-tenant support: Each Slack workspace is isolated, with its own data and settings
- [ ] User authentication and account management (web dashboard, login, password reset)
- [ ] Subscription/payment integration (Stripe, Paddle, etc.)
- [ ] Usage limits and feature tiers (free vs. premium)
- [ ] Hosted infrastructure (cloud server, database, secure endpoints)
- [ ] Automated onboarding and workspace provisioning
- [ ] Secure data storage and privacy controls
- [ ] Web dashboard for account management and analytics

---

## 🚀 Go-To-Market Checklist (Slack-Centric SaaS)

- [x] Positioning: Slack-first, frictionless, modal-based task management
- [x] Free tier: Core features (see above)
- [x] Paid tier: Premium features (audit logs, analytics, integrations)
- [ ] Pricing: Simple monthly per-workspace or per-user
- [ ] Easy Slack app install and onboarding
- [ ] In-app help and usage hints for all commands
- [ ] Slack App Directory listing
- [ ] Website with demo, features, pricing, and support
- [ ] Targeted outreach to Slack communities, agencies, startups
- [ ] Stripe/Paddle integration for payments
- [ ] Usage analytics (track active workspaces, users, tasks)
- [ ] In-app support command (`/help` or `/support`)
- [ ] Feedback loop for feature requests and bug reports
- [ ] Automated onboarding emails/messages
- [ ] Feature updates/tips sent via Slack

---

## Assigning Tasks to Users

- When a user is @mentioned in the `/task` or `/task-edit` command, their Slack user ID is parsed and stored in the `assigned_user` field in the database.
- The app displays the assigned user in the task message (e.g., `Assigned to: @hermit`).
- Future: Add interactive assignment via buttons or dropdowns.

## ✅ Implemented Features (Summary)

- Modal-based task creation, editing, completion, and deletion
- Bulk task actions (multi-select, batch complete/delete)
- Task categories, tags, priorities
- Customizable notification channels and workspace-wide settings
- Daily digest and reminders
- Admin controls (add/remove/list admins)
- Activity logs and audit trails
- SQLite backend and Slack Bolt integration
- Professional error handling and user feedback
- Up-to-date documentation and release notes

---

## Next Steps

- Continue building premium features (reporting/analytics, integrations, dashboard)
- Complete SaaS infrastructure (multi-tenant, billing, web dashboard)
- Polish onboarding, help, and support flows
- Prepare for Slack App Directory listing and commercial launch

---
