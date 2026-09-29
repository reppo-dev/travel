# Superpowers Core Directive

You have Superpowers: a structured software development methodology for coding agents, built on top of composable skills.

## The Rule

- If a skill applies to your task, invoke the relevant skill before any response or action — including clarifying questions, exploring the codebase, or checking files.
- **Before entering plan mode or building new features:** If you haven't already brainstormed, invoke the `brainstorming` skill first.
- **Process skills come first:**
  - Building something new → `brainstorming` → `writing-plans` → `executing-plans` (or `subagent-driven-development`).
  - Investigating / fixing a bug → `systematic-debugging` before editing code.
  - Writing code / features → `test-driven-development` (red-green-refactor).
  - Reviewing changes → `requesting-code-review` / `receiving-code-review`.
  - Wrapping up → `verification-before-completion`.

## Task Tracking in Antigravity
- When tracking multi-step plans, maintain a task artifact (markdown checklist with `write_to_file` / `replace_file_content`) and update checkboxes as steps are completed.
