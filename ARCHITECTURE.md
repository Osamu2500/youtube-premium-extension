# 3-Layer Architecture System

This project follows a **3-layer architecture** that separates concerns for maximum reliability:

## Architecture Overview

### Layer 1: Directive (What to do)
- **Location**: `directives/`
- **Format**: Markdown SOPs
- **Purpose**: Define goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions that guide the AI orchestrator

### Layer 2: Orchestration (Decision making)
- **Who**: The AI assistant
- **Purpose**: Intelligent routing between directives and execution
- Reads directives, calls execution tools in the right order, handles errors, asks for clarification
- Updates directives with learnings

### Layer 3: Execution (Doing the work)
- **Location**: `execution/`
- **Format**: Deterministic Python scripts
- **Purpose**: Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast

## Directory Structure

```
directives/         # SOPs in Markdown (the instruction set)
execution/          # Python scripts (the deterministic tools)
tmp/                # Temporary/intermediate files (never commit, always regenerated)
.env                # Environment variables and API keys (in .gitignore)
.env.example        # Template for environment variables
```

## Getting Started

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```
   Then fill in your actual API keys

2. **Create a new directive**:
   - Copy `directives/example_directive.md`
   - Fill in the goal, inputs, tools, outputs, process, and edge cases

3. **Create an execution script**:
   - Copy `execution/example_script.py`
   - Implement your deterministic logic

4. **Ask the AI to execute**:
   - The AI will read your directive and call the appropriate execution scripts

## Operating Principles

### 1. Check for tools first
Before creating a script, check `execution/` per your directive.
Only create new scripts if none exist.

### 2. Self-anneal when things break
- Read error message and stack trace
- Fix the script and test it again
- Update the directive with what you learned

### 3. Update directives as you learn
Directives are living documents. When you discover API constraints, better approaches, or common errors — update the directive.

## File Organization

- **Deliverables**: Google Sheets, Google Slides, or other cloud-based outputs
- **Intermediates**: Temporary files in `tmp/` (can be deleted and regenerated)

## Why This Works

If the AI does everything itself, errors compound:
- 90% accuracy per step = 59% success over 5 steps

The solution is to push complexity into deterministic code, so the AI focuses on decision-making.

---

For more details, see [gemini.md](gemini.md).
