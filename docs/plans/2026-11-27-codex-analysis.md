# Codex desktop log analysis

Goal: preview logs and hand an editable analysis prompt to the local Codex desktop app.

Architecture: a standalone browser/CommonJS module prepares the prompt and launch URL. The existing content script opens a modal preview, using selected log text or currently rendered log rows. No server or API key is required. Existing queries are not modified.

Alternatives: direct deep link for short prompts; clipboard plus deep link for long prompts; a native bridge would add installation and maintenance overhead and is out of scope.

Implementation steps:
1. Add failing tests for prompt construction, empty logs, length limits, Unicode URL encoding, and clipboard fallback.
2. Implement codex-analysis.js and a modal preview with editable prompt, optional local project path, copy fallback, and explicit desktop launch.
3. Wire content.js, manifest.json, demo and package allowlist; document both languages.
4. Run node --test tests/*.test.cjs, syntax checks and python3 package.py. Separately report desktop and real Grafana verification.

Data boundary: only selected log text or currently rendered rows; no hidden logs, automatic queries, or background uploads. Preview explains this limit. Logs are untrusted evidence, not instructions. Do not persist prompts. Project roots and overrides are stored locally only. Long prompts retain the full preview in the launch URL and copy a backup; oversized input is visibly truncated in the preview.
