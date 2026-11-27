# Codex project root matching implementation plan

Goal: use one locally configured project root plus the exact app label, with per-app overrides taking priority.

Architecture: pure selector parsing and path resolution in codex-analysis.js. Store the root and individual app overrides in chrome.storage.local only, with explicit save/reset controls in the analysis preview. Use the selected query's parsed selector, not the log text or edited prompt. No filesystem scanning or existence guarantee. No publishing.

Steps:
1. Add failing tests for exact app parsing, ambiguous or regex selectors, path traversal rejection, Windows/POSIX joining, and override priority.
2. Implement helpers and UI with asynchronous config loading, explicit persistence, clear actions, and errors that do not prevent manual use.
3. Pass the selector from content.js and update both READMEs.
4. Run the complete Node regression suite, syntax and packaging checks.
5. Back up the installed local extension, replace packaged files, reload Chrome, and verify root persistence and derived paths using fictional demo logs. Do not send to Codex.
