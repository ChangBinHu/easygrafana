# EasyGrafana 1.14.0

[简体中文](README.md) | **English**

A Chrome / Edge extension that automatically detects Grafana Explore and lets you switch between simple and advanced log queries.

This is the English documentation. The extension interface currently uses Chinese labels.

## Analyze logs with the local Codex desktop app

Use **分析重点** to describe what to investigate, such as timeout causes, retries, or the error timeline. Opening or copying includes this focus together with the currently edited log context. Leave it blank for the default analysis. The focus is not persisted.

Click **用 Codex 分析** in the query bar. Selected log text takes priority; otherwise the extension collects currently rendered log rows. Review, redact, and edit the analysis prompt, page query, and time range before opening Codex. Unrendered virtualized rows are excluded. Input beyond 100,000 characters is explicitly marked as truncated.

Click **打开 Codex** to open the installed desktop app. Short prompts are prefilled in a new conversation. Long prompts also retain the entire preview in the launch URL for automatic prefill, with a clipboard backup. Check the Codex composer before sending. If your desktop version does not prefill, paste the backup with ⌘V / Ctrl+V. Exceeding the extension’s conservative encoded URL budget produces an explicit error rather than silently dropping context. A fallback link appears if launching throws or the page still has focus after a short delay; browsers cannot reliably confirm that an external app opened. Expand **项目目录配置** to save a local project root. A unique exact `app="name"` label resolves to root/name. Edit the path and click **记住此 app 的指定路径** to save a per-app override; **恢复根目录匹配** removes it. Overrides take priority. Regex, multiple apps, or unrecognized selectors require a manual path. Paths are stored only in local extension storage, without cloud sync or filesystem existence checks. Logs are not saved. Nothing is submitted automatically; sending in Codex shares the content with the selected model. Your browser may ask to open an external application.

If launching or prefilling is unsupported, use **复制分析内容** and paste manually in Codex. This feature does not change or execute Grafana queries. The page query may differ from displayed results if edits have not been run.

## Install in three steps

No developer tools or terminal commands required.

1. **Download and extract**: [Download EasyGrafana.zip](https://github.com/ChangBinHu/easygrafana/releases/latest/download/EasyGrafana.zip). Extract it into a permanent folder named `EasyGrafana`.
2. **Open the extensions page**: Enter `chrome://extensions` in the address bar (`edge://extensions` for Edge) and turn on **Developer mode**.
3. **Select the folder**: Click **Load unpacked**, select the `EasyGrafana` folder containing `manifest.json`, then refresh your Grafana page.

Keep the installation folder after loading the extension. Disable any older copy first to avoid running two copies. If the browser asks for site access, allow it on the Grafana sites where you want to use the extension.

**Updating**: Download and extract the latest files, replace the files in your original installation folder, click **⟳ Reload** on the EasyGrafana card in the extensions page, then refresh Grafana.

## Automatic activation

EasyGrafana appears automatically on **supported Grafana Explore log pages** on any domain. You do not need to click the extension icon or configure a domain. It does not steal input focus. Subpaths such as `/grafana/explore` are supported.

It stays hidden on ordinary pages and follows navigation within single-page applications. The query bar integrates with the original editor location and follows the light or dark theme. Press **Alt + Shift + S** to focus it.

When a plain query text box can be uniquely identified, EasyGrafana replaces it in place, synchronizes input to Grafana, and supports the native Run Query action. For complex editors such as Monaco, or when identical expressions make the target ambiguous, it keeps the native editor and adds a bar above the query area. Use that bar's search button to run the query through the URL. If no query editing area is found, the bar stays hidden.

Select the data source and query scope in Grafana before your first search. The extension does not guess an environment or generate an unrestricted query.

## Simple mode

```text
request123 ProcessRequest NOT debug
"request failed" NOT "debug mode"
```

| Input | Meaning |
| --- | --- |
| `request123 NOT debug` | Include request123; exclude debug |
| `request123 NOT (11 22)` | Include request123; exclude both 11 and 22 |
| `NOT （11 22）` | Full-width parentheses also exclude both terms |
| `NOT ("debug mode" timeout)` | Exclude a phrase and a word |
| `"NOT"` | Search for the literal word NOT |

NOT is case-insensitive. Exclusion groups cannot be nested, and parentheses must be balanced. Quote literal parentheses and the word NOT with double quotes.

Space-separated terms use AND semantics. `NOT` excludes terms, and double quotes group a phrase. Press **Enter** to search. Submitting empty input clears the simple keyword filters.

The syntax is selected automatically:

| Data source | Filter for `request123 NOT debug` |
| --- | --- |
| grep-based logs | `grep request123 \| grep -v debug` |
| Loki | `\|= "request123" != "debug"` |

Query scope, organization, time range, data source, other queries, and other panes are preserved. Complex Loki pipelines are retained with an explicit notice. Loki uses literal substring filters; the grep dialect follows the platform's grep semantics.

## OR matching

- `11 OR 22`: Match either term. More than two alternatives and lowercase `or` are supported.
- `request123 (11 OR 22) NOT debug`: Match request123 and either 11 or 22, excluding debug.
- `("request failed" OR timeout)`: Combine phrases and individual words.
- `(11 OR 22) (33 OR 44)`: Both OR groups must match.
- Full-width parentheses, such as `（11 OR 22）`, are supported. Parentheses and OR operators remain visible in the input.

Use parentheses when combining OR with other conditions. `request123 11 OR 22` prompts you to add a group rather than guessing precedence. Nested Boolean expressions and `NOT (11 OR 22)` are not supported. Use `NOT (11 22)` to exclude both terms. Write `"OR"` to search for the literal word.

The grep dialect compiles OR groups to `grep -E`; Loki uses `|~` regex filters. Regex metacharacters in each alternative are escaped for literal matching. Generated OR queries can round-trip between simple and advanced modes. See the [Loki log query documentation](https://grafana.com/docs/loki/latest/query/log_queries/).

## Inline keyword highlighting

Keywords are highlighted directly inside the simple input, without a duplicate row underneath. Included terms are blue and excluded terms are orange. Quoted phrases are highlighted as a single unit; parentheses and OR/NOT operators retain their original text.

Native cursor movement, selection, copy/paste, and undo remain available. Highlighting does not insert characters or change spaces and follows horizontal scrolling. Incomplete syntax keeps the original text and pauses highlighting while validation messages remain available.

## Recent searches

Click **▾** beside the simple input to see saved complete searches, filtered as you type. Most recently used entries come first; ties are sorted by usage count in descending order. Click an entry or use **↑ / ↓** and **Enter** to insert it, then press **Enter** again to search. **Esc** closes the list. Selecting an entry does not run it.

Valid simple queries are recorded when submitted through the extension's search button or a supported native Run Query action. Counts represent submissions, not successful server responses. Unsubmitted drafts, empty input, invalid syntax, and raw advanced queries are not recorded.

History is stored only in the current browser's extension local storage, isolated by site and data source dialect. Up to 100 entries are retained, with a maximum of 2,000 characters each; the dropdown shows up to 12. History survives page refreshes and browser restarts but does not sync between devices. The dropdown can clear history for the current site and dialect.

## Advanced mode

Click **高级模式** (Advanced mode) to edit raw search conditions, such as the grep expression `grep request123 | grep -v debug` or Loki's `|= "error" | json`. Environment selectors stay in Grafana's original controls and are reused when submitting. Clearing the conditions preserves the environment scope. Loki aggregation expressions whose environment prefix cannot be separated are kept intact. **Enter** inserts a newline; **Ctrl + Enter** or **⌘ + Enter** on Mac runs the query. You can also click the execute button.

Switching modes preserves unsubmitted input. An advanced query that cannot be converted without loss remains in advanced mode with an explanation. Complex existing queries open in advanced mode by default.

Expand **查询预览与说明** (Query preview and explanation) to select and copy the complete expression. On pages with multiple queries, select the target to edit; each has its own in-page draft. Unsubmitted drafts do not survive refreshing or closing the page.

## Compatibility and limits

- Standard `/explore` and `/.../explore` routes on any HTTP or HTTPS domain.
- Legacy left/right arrays, left/right objects, and newer panes state (`schemaVersion: 1`).
- Automatic recognition of standard Loki and supported grep-based data sources.
- Dashboard-embedded queries, other data source dialects such as SQL / Elasticsearch / Prometheus, unknown state versions, and nonstandard routes are not supported for simple-mode rewriting. Ambiguous detection does not trigger speculative changes.
- If type metadata is missing and Loki cannot be distinguished from another data source, use the native query editor. Provide a sample through the requirements document to help extend compatibility.
- Compatibility with every Grafana version is not guaranteed. Plain textarea structure has been checked on a real grep-based log page; replacement, synchronization, themes, and button interactions have been verified on a local demo. Actual log results after reloading the extension still require validation on the target site.

Later releases add advanced-mode fallback for other sources with a supported string `expr` field; see 1.7.1 below.

## Privacy and permissions

The extension uses HTTP/HTTPS content scripts and the `storage` permission. It does not request `cookies`, `tabs`, or background network permissions. The background worker handles local search history and counts in `chrome.storage.local`. The extension does not scrape logs, read credentials, or upload content. On unrelated sites, it checks only the URL; page markers and query structures are inspected only after an Explore route matches. Searches update the current Grafana URL and may appear in browser history, just like native Grafana searches.

## Requirements and feedback

See [EasyGrafana-需求说明.md](EasyGrafana-需求说明.md) (Chinese) for requirements R01–R15, acceptance scenarios, and templates for issues and feature requests. For example:

> R08: After editing in advanced mode and switching back to simple mode, I expected …, but observed ….

## Local development and verification

This repository is the development source. Clone it to any local directory.

Load the repository root as an unpacked extension. After saving changes, reload the extension and refresh Grafana. Old desktop copies are not updated automatically. Loading from a different directory may create separate extension local storage; previous search history is not migrated automatically.

Run from the repository root with Node.js and Python 3 installed:

```sh
node --test tests/*.test.cjs
node dev-server.cjs
# Open http://127.0.0.1:4178/explore
python3 package.py
```

The package is written to `dist/EasyGrafana.zip`. The demo switches between grep-based logs / Loki, old / new URL formats, and ordinary pages. It uses the same runtime code without connecting to a real data source.

References: [Grafana Explore URLs](https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/) and [Loki LogQL](https://grafana.com/docs/loki/latest/query/log_queries/).

## 1.6.2: Syntax suggestions

Focusing or typing in the simple input, or clicking **▾**, shows saved searches and syntax examples. Examples cover included keywords, double-quoted phrases, single NOT exclusions, `NOT (word1 word2)` groups, and `(word1 OR word2)` alternatives.

Syntax items include Chinese explanations. Clicking one appends a template and selects its example terms for replacement; selecting a saved search replaces the entire input. Neither runs a query. Use arrow keys to select, Enter to insert, and Esc to close. With no candidate selected, Enter still searches. Suggestions appear even without history. They cover existing simple syntax only, do not fetch a dictionary from the log service, and do not restore the old `-debug` syntax.

## 1.7.0: View selected JSON

On a recognized Grafana Explore page, select a complete JSON object or array and release the mouse to open a formatted viewer. Objects and arrays wrapped in JSON strings are supported. Long numeric IDs, original number notation, and field order are preserved. Copy JSON or close the viewer with its button or Esc. Processing is local; selected content is neither uploaded nor saved.

Ordinary text, incomplete JSON, and whole log lines containing prefixes or suffixes do not trigger the viewer; select only the JSON. Selections inside inputs or editors are ignored. Limits are 200,000 characters and 100 nesting levels. Selections inside iframes are not supported. Total match counting was not released because its server-side counting semantics still required verification.

## 1.7.1: Grep-based logs and generic advanced mode

Fixed recognition of grep-based data sources in legacy Explore links containing only `expr`, without a domain allowlist. Supported grep-based sources and Loki support simple mode.

Other data sources with a string `expr` field in a supported Explore URL receive an advanced-mode entry point. Their expressions and other query fields are preserved; grep or LogQL is not applied automatically, and simple mode is unavailable. Unknown syntax with an inseparable environment prefix displays the complete original expression.

A recognizable query editing area is still required. Not all Grafana versions, custom plugins, pages without URL query state, non-`expr` fields, or dashboard editors can be replaced. JSON selection viewing is available on recognized Explore pages.

## 1.7.2: Escaped JSON fragments

Supports escaped JSON objects or arrays without surrounding double quotes, such as `{\"a\":1}`, with up to four decoding layers. Already-valid JSON takes priority. Escaped content inside fields and long-number precision are preserved. Incomplete JSON is not repaired, and log prefixes or suffixes are not removed; the selection must cover a complete object or array.

## 1.8.0: Copy page logs

The **复制页面日志** (Copy page logs) button copies visible log bodies currently rendered in the page DOM, in page order. Duplicate logs and body line breaks are preserved. Charts, query conditions, timestamp columns, labels, row action buttons, and expanded field tables are excluded. A success message reports the number copied. Empty results leave the clipboard untouched. If the Clipboard API fails, a browser copy fallback is attempted; an error is shown if both fail.

This does not copy the entire time range. Unrendered virtual-scroll rows, unloaded results, and hidden collapsed records are excluded. Supported selectors include `logs-row__message` and the `log-row-message` test marker. Unrecognized custom markup produces a no-log-body message instead of copying the entire page. The limit is 10 million characters per operation.

## 1.8.1: Regional grep-based logs simple mode

Added regional grep-based logs names/types to grep-based logs dialect recognition, fixing regional environment links with only `expr` being treated as unknown syntax. Simple mode supports included terms, NOT, and OR; advanced mode shows only search conditions. Original cluster combinations, namespace, timestamp, time range, and data source are preserved.

## 1.9.0: Dialect detection and remembered overrides

Detection no longer relies solely on data source display names. Declared Loki / grep-based logs types take priority. When type metadata is absent, detection examines grep and LogQL filter/parser syntax in the full expression, plus separate `queryText`/`value` fields; known names are a final hint. Explicitly declared other data source types are not automatically reinterpreted as log dialects. Complex queries remain in advanced mode.

The **查询语法** (Query syntax) selector offers automatic detection, grep-based logs, and Loki (LogQL). Manual choices override automatic detection and are stored by site origin, `orgId`, and data source UID/type (name for legacy links). Choices persist after refresh. Selecting automatic detection clears the saved override. Renaming a legacy source without a UID may require selecting the dialect again for ambiguous empty queries.

Switching preserves the current draft and does not execute a query. Other unsubmitted drafts for the same source are marked for rereading to avoid applying the wrong dialect. Storage failures indicate that the choice applies now but was not saved. This feature adds no server requests or permissions and does not imply support for every custom Grafana editor.

## 1.10.0: Remove individual keywords

An × button above each keyword removes that term and updates the draft without searching. Phrases are removed as a unit; duplicate terms are removed by position. Removing NOT conditions leaves no dangling operator. An OR group reduced to one term becomes a regular included term. Removing the final term clears keyword filters while preserving the environment. Buttons are keyboard-focusable and have accessible names identifying their terms. Incomplete or invalid syntax does not generate removal buttons.

## 1.10.1: Show removal buttons on demand

Restored the 34px single-line input; removal buttons no longer occupy a separate row. All × buttons are hidden by default. Clicking a highlighted keyword shows only its button at the upper right and closes the syntax dropdown. Clicking another term changes the target. Clicking empty space or outside, typing, or deleting hides the button. Removal semantics are unchanged from 1.10.0.

## 1.11.0: Add selected text to a search

- Select text in Grafana Explore logs to show **＋ 加入搜索** (Add to search). Clicking it appends to the selected query, preserves existing keywords, environment, and time range, and immediately runs the search.
- Text containing spaces is treated as one keyword. NOT / OR are literal text, not operators. With multiple queries, the current EasyGrafana target is used.
- Simple mode appends directly. Advanced mode appends only when conversion is lossless and remains in advanced mode; otherwise, it explains why and preserves the expression. Invalid drafts and unsupported characters do not overwrite the query.
- Complete JSON still opens the JSON viewer first. Selections in editors are ignored. Only a single line of up to 2,000 characters is supported, with surrounding whitespace trimmed.
- Clicking empty space, pressing Esc, or clearing the selection closes the button. It follows the selection while scrolling and closes when the selection leaves the viewport. Reload the extension and refresh Grafana after updating.

## 1.11.1: Recent-search ordering

Most recently used entries come first; ties use descending frequency. History still retains up to 100 entries and displays up to 12. Existing entries follow the new order without clearing history. Submitting a query updates its timestamp and count; choosing a dropdown entry does not.

## 1.11.2: Selection event compatibility

Listens for mouseup in the capture phase so log components that stop event bubbling do not prevent the Add to search button from appearing. Reload the extension and refresh open Grafana pages after updating.

## 1.11.3: Keep the selection button visible

Real pages sometimes trigger a scroll event immediately after text selection, which previously closed the button. Scrolling now repositions it; it closes only when the selection leaves the viewport.

## 1.11.4: Search immediately after adding a keyword

Clicking **＋ 加入搜索** appends the complete keyword and immediately executes the query, preserving the environment, time range, and other query conditions, and updating usage history. Selecting text alone does not search; invalid queries are not executed.

## 1.12.0: Replace search with selected text

Selecting text shows both **＋ 加入搜索** (Add to search) and **替换搜索** (Replace search):

- **Add to search** keeps existing keywords, appends the selection, and immediately runs the query.
- **Replace search** clears all keyword conditions in the selected query, including exclusions, then searches immediately using the selection as one literal keyword. For example, `oldId NOT debug` becomes `newId`.

Both actions preserve the environment, time range, and other queries, as well as subsequent Loki parsing/filtering stages. Advanced queries must support lossless conversion; otherwise the original draft is kept and an error is shown. Reload the extension and refresh Grafana after updating.

## 1.12.1: Automatic literal matching for special characters

Simple-mode keywords containing regex punctuation use `grep -F` for fixed-string matching, or `grep -F -v` for exclusions. For example, `"messageNum: 100 not in [3, 14]"` matches the original text instead of treating the brackets as a character class. Typing, Add to search, and Replace search share this behavior; numbers still match exactly. OR and Loki retain their existing literal matching behavior.

Existing grep patterns with special characters and no `-F` remain in advanced mode to preserve regex semantics. To search them literally, clear the advanced search conditions, switch to simple mode, and enter the text again. Custom grep data sources must support `-F`.

## 1.13.0: Exclude selected text from search

Select text and click **排除搜索** (Exclude from search) to keep existing keywords, append one literal exclusion, and run the query immediately. For example, selecting `debug message` while searching for `request123` produces `request123 NOT "debug message"`. Exclusions can also be added to an empty search.

Special characters retain literal matching: grep uses `-F -v`, while Loki uses `!=`. Environment, time range, other queries, and subsequent Loki pipeline stages are preserved. Advanced queries that cannot be converted losslessly retain their original draft and display an error. Reload the extension and refresh Grafana after updating.

## 1.14.0: Analyze logs with Codex

- Add a Codex analysis entry point using selected log text or currently rendered rows, with the page query and time range.
- Review, edit, and redact context before opening the desktop app. Add an optional analysis focus above the action buttons. Nothing is sent automatically.
- Configure a local project root and match an exact app label, with locally stored per-app path overrides.
- Prefill long prompts through the launch URL, keep a clipboard backup, and offer a fallback link when launching cannot be confirmed. Only rendered logs are collected; input beyond 100,000 characters is visibly marked as truncated in the preview.
- Local desktop checks confirmed start/end markers for short, medium, and approximately 60,000-character logs, plus the focus and log boundaries passed through the installed extension. Check prefill results on other browsers, operating systems, and desktop versions.
- All 95 automated tests pass, covering query scope preservation, simple/advanced modes, grep/Loki, and Codex context transfer.
