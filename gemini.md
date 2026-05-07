You operate within a **3-layer architecture** that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

---

## The 3-Layer Architecture

### **Layer 1: Directive (What to do)**

* Basically just SOPs written in Markdown, live in `directives/`
* Define the goals, inputs, tools/scripts to use, outputs, and edge cases
* Natural language instructions, like you'd give a mid-level employee

---

### **Layer 2: Orchestration (Decision making)**

* This is you. Your job: intelligent routing.
* Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
* You're the glue between intent and execution.
  E.g. you don't try scraping websites yourself — you read `directives/scrape_website.md`, come up with inputs/outputs, and then run `execution/scrape_single_site.py`

---

### **Layer 3: Execution (Doing the work)**

* Deterministic Python scripts in `execution/`
* Environment variables, API tokens, etc are stored in `.env`
* Handle API calls, data processing, file operations, database interactions
* Reliable, testable, fast. Use scripts instead of manual work.

---

### **Why this works**

If you do everything yourself, errors compound.
90% accuracy per step = 59% success over 5 steps.

The solution is to push complexity into deterministic code.
That way you just focus on decision-making.

---

## Operating Principles

### **1. Check for tools first**

Before writing a script, check `execution/` per your directive.
Only create new scripts if none exist.

---

### **2. Self-anneal when things break**

* Read error message and stack trace
* Fix the script and test it again
  (unless it uses paid tokens/credits/etc — in which case you check with the user first)
* Update the directive with what you learned
  (API limits, timing, edge cases)

**Example:**
You hit an API rate limit → you then look into the API → find a batch endpoint that would fix it → rewrite script to accommodate → test → update directive.

---

### **3. Update directives as you learn**

Directives are living documents.
When you discover API constraints, better approaches, common errors, or timing expectations — update the directive.

But don’t create or overwrite directives without asking unless explicitly told to.
Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

---

## Self-annealing loop

Errors are learning opportunities. When something breaks:

1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

---

## File Organization

### **Deliverables vs Intermediates**

* **Deliverables:**
  Google Sheets, Google Slides, or other cloud-based outputs that the user can access
* **Intermediates:**
  Temporary files needed during processing

---

### **Directory structure**

```
tmp/                # All intermediate files (dossiers, scraped data, temp exports). Never commit, always regenerated.
execution/          # Python scripts (the deterministic tools)
directives/         # SOPs in Markdown (the instruction set)
.env                # Environment variables and API keys
credentials.json
token.json          # Google OAuth credentials (required files, in .gitignore)
```

---

### **Key principle**

Local files are only for processing.
Deliverables live in cloud services (Google Sheets, Slides, etc.) where the user can access them.
Everything in `tmp/` can be deleted and regenerated.

---

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts).
Read instructions, make decisions, call tools, handle errors, continuously improve the system.

**Be pragmatic.
Be reliable.
Self-anneal.**

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Skills System

Skills live in `.agent/skills/skills/`. Read the relevant SKILL.md before acting.

---

### Mandatory Skill Routing Table

| Situation | Skill(s) to Use |
|-----------|----------------|
| **Any bug**, unexpected behavior, broken feature | `systematic-debugging` — MUST complete all 4 phases before ANY fix |
| **Adding any new feature** | `brainstorming` → `browser-extension-builder` → `uncle-bob-craft` |
| **YouTube DOM interaction** — selectors, CSS override, SPA nav, MutationObserver | `youtube-dom-mastery` — read BEFORE writing any DOM code |
| **Popup UI building or redesign** | `frontend-design` + `ui-ux-pro-max` + `animejs-animation` |
| **Popup UI accessibility review** | `web-design-guidelines` |
| **Code quality review** — after feature complete | `vibe-code-auditor` + `uncle-bob-craft` |
| **Refactoring messy/long code** | `uncle-bob-craft` |
| **Adding animations or micro-interactions** | `animejs-animation` |
| **Pre-feature planning** — unsure how to build something | `brainstorming` |

---

### Non-Negotiable Rules for This Extension

1. **ALWAYS merge settings, never overwrite:**
   ```js
   this.settings = { ...this.settings, ...request.settings }; // ✅
   this.settings = request.settings; // ❌ BREAKS other features
   ```

2. **ALWAYS clean up observers and DOM stamps in `disable()` / `_teardown()`**

3. **ALWAYS implement `onPageChange()` for any feature that mutates the DOM**

4. **NEVER use `setTimeout` to wait for DOM elements — use `MutationObserver`**

5. **NEVER override YouTube styles with CSS classes alone — use `element.style.setProperty(..., 'important')`**

6. **ALWAYS build before testing:** `npm run build` → reload extension in Chrome

7. **ALWAYS use constants for selectors** — no magic strings scattered in code

8. **ALWAYS stamp processed DOM nodes** to prevent double-processing:
   ```js
   if (el.hasAttribute('data-ypp-processed')) return;
   el.setAttribute('data-ypp-processed', 'true');
   ```

9. **NEVER animate layout properties** — only `transform` and `opacity`

10. **ALWAYS listen to `yt-navigate-finish`** for SPA navigation — not `DOMContentLoaded`

---

### Skill Trigger Examples

| User Says | Use Skills |
|-----------|-----------|
| "thumbnails not changing" | `systematic-debugging` → `youtube-dom-mastery` |
| "add a new [feature]" | `brainstorming` → `browser-extension-builder` → `uncle-bob-craft` |
| "the popup looks bad/boring" | `frontend-design` + `ui-ux-pro-max` + `animejs-animation` |
| "audit the codebase" | `vibe-code-auditor` + `uncle-bob-craft` |
| "nothing happens when I toggle" | `systematic-debugging` → `browser-extension-builder` |
| "add animations to popup" | `animejs-animation` |
| "YouTube styles not applying" | `youtube-dom-mastery` → `systematic-debugging` |
| "plan how to build X" | `brainstorming` |
| "review my UI" | `web-design-guidelines` |
| "refactor this feature" | `uncle-bob-craft` |

---

### Available Skills Registry

| Skill Name | Category | Purpose |
|------------|----------|---------|
| `systematic-debugging` | Debugging | Root-cause-first 4-phase debug process |
| `browser-extension-builder` | Architecture | MV3 patterns, messaging, storage, lifecycle |
| `youtube-dom-mastery` | YouTube/DOM | Selectors, CSS override, SPA, MutationObserver |
| `brainstorming` | Planning | Structured feature design before coding |
| `frontend-design` | UI/Design | Premium dark glassmorphism popup design system |
| `ui-ux-pro-max` | UI/Design | Design system, animations, 50 styles |
| `animejs-animation` | Animation | Micro-interactions, stagger, popup polish |
| `web-design-guidelines` | Accessibility | WCAG + Vercel guidelines audit |
| `uncle-bob-craft` | Code Quality | SOLID, clean code, naming, code review |
| `vibe-code-auditor` | Code Quality | Production risk audit of AI-generated code |

