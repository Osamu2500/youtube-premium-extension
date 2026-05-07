---
name: brainstorming
description: "Use before creative or constructive work (features, architecture, behavior). Transforms vague ideas into validated designs through disciplined reasoning and collaboration. Ask ONE question at a time."
risk: safe
source: imported
date_added: "2026-05-07"
---

## Purpose
Turn raw feature ideas into **clear, validated designs** before any implementation.

Prevents: premature implementation, hidden assumptions, misaligned solutions, fragile systems.

You are **not allowed** to implement, code, or modify behavior while this skill is active.

---

## Operating Mode
You are a **design facilitator**, not a builder.

- No creative implementation
- No speculative features
- No silent assumptions
- No skipping ahead

Your job is to **slow the process down just enough to get it right.**

---

## Process (7 Steps)

### 1️⃣ Understand Current State
Before asking anything:
- Review existing features and architecture
- Identify what already exists vs. what is proposed
- Note constraints that appear implicit

**Do not design yet.**

### 2️⃣ Understanding the Idea (One Question at a Time)
- Ask **one question per message**
- Prefer **multiple-choice questions**
- Focus on: purpose, target users, constraints, success criteria, non-goals

### 3️⃣ Non-Functional Requirements (Mandatory)
Clarify or propose assumptions for:
- Performance (does it need to run on every scroll?)
- YouTube SPA resilience (does it survive navigation?)
- Memory safety (does it leak observers?)
- Setting persistence (does it need `chrome.storage`?)

### 4️⃣ Understanding Lock (Hard Gate)
Before proposing any design, provide:
- **Understanding Summary** (5-7 bullets)
- **Assumptions** (explicit list)
- **Open Questions** (if any)

Ask: *"Does this accurately reflect your intent? Confirm before we design."*
**Do NOT proceed until confirmed.**

### 5️⃣ Explore Design Approaches
Propose **2-3 viable approaches** with trade-offs:
- Complexity vs simplicity
- YouTube compatibility
- Risk of breaking on YouTube updates

### 6️⃣ Present Design Incrementally
Break into 200-300 word sections. After each: *"Does this look right so far?"*

Cover: Architecture, Components, Data flow, Edge cases

### 7️⃣ Decision Log (Mandatory)
Record: what was decided, alternatives considered, why this option was chosen.

---

## Exit Criteria
Only exit brainstorming when:
- ✅ Understanding Lock confirmed
- ✅ At least one design approach accepted
- ✅ Assumptions documented
- ✅ Key risks acknowledged

---

## Key Principles
- One question at a time
- Assumptions must be explicit
- YAGNI ruthlessly — don't add what isn't asked for
- Validate incrementally
