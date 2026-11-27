# Selection Exclusion Implementation Plan

**Goal:** Add a selection toolbar action that appends one literal exclusion and immediately searches.

**Architecture:** Extend the existing keyword append helper with an optional exclusion flag. Reuse the editor-copy, lossless conversion and submission guards; add a third toolbar button. Preserve all existing filters, scope, time, other queries and Loki pipeline stages.

**Tech Stack:** Plain JavaScript, Chrome/Edge MV3, Node test runner.

## Steps
1. Add failing compiler and selection action tests for literal exclusions, reserved words, punctuation, OR groups and invalid inputs.
2. Implement the optional flag and toolbar action using existing submission behavior.
3. Verify simple/advanced modes with grep and Loki, including scope preservation and failure handling.
4. Update bilingual instructions, run the full test suite and package locally. Report local verification separately from live Grafana testing.

## Behavior
The toolbar shows Add to search, Replace search and Exclude search. Exclude retains existing terms and appends `NOT "selected phrase"`. It executes immediately, matching the existing toolbar actions. Unsupported advanced queries retain their draft and report an error. No release or browser update is part of this change until requested.
