CLAUDE_DIR ?= $(HOME)/.claude/projects
GIT_REPO   ?=
GIT_AUTHOR ?= @me
GIT_LIMIT  ?= 100
PORT       ?= 4173

GIT_HISTORY_FLAGS = $(if $(GIT_REPO),--repo $(GIT_REPO),--author $(GIT_AUTHOR)) --limit $(GIT_LIMIT)

.DEFAULT_GOAL := help

.PHONY: all import-claude import-git sample-prompts evaluate test \
        evaluate-claude evaluate-codex evaluate-prompting \
        coach-claude coach-codex \
        serve clean help

## Runs everything that stays local: history imports, prompt sampling, evaluate, tests.
## Nothing that sends data externally runs here — those are separate targets below.
all: import-claude import-git sample-prompts evaluate test
	@echo ""
	@echo "Done. 'make serve' to preview, or for coaching (these send data externally, run separately by design):"
	@echo "  make evaluate-claude      # derived metrics only"
	@echo "  make evaluate-codex       # derived metrics only"
	@echo "  make evaluate-prompting   # sends your sampled prompt text"
	@echo "  make coach-claude         # evaluate-claude + evaluate-prompting together"
	@echo "  make coach-codex          # evaluate-codex + evaluate-prompting together"

import-claude:
	npm run import:claude-history -- --input-dir $(CLAUDE_DIR)

import-git:
	npm run import:git-history -- $(GIT_HISTORY_FLAGS)

sample-prompts:
	npm run sample-prompts -- --input-dir $(CLAUDE_DIR)

evaluate:
	npm run evaluate

test:
	npm test

## Sends derived data only, requires Claude CLI signed in.
evaluate-claude:
	npm run evaluate:claude -- --allow-external-analysis

## Sends derived data only, requires Codex CLI.
evaluate-codex:
	npm run evaluate:codex -- --allow-external-analysis

## Sends your own sampled prompt text (not just derived data) to Claude CLI.
evaluate-prompting: sample-prompts
	npm run evaluate:prompting -- --allow-prompt-analysis

## Claude coaching report + prompting-technique feedback, in one command.
coach-claude: evaluate-claude evaluate-prompting

## Codex coaching report + prompting-technique feedback, in one command.
## Prompting feedback still goes through Claude CLI either way — Codex isn't wired
## up for that call — so this target uses both CLIs.
coach-codex: evaluate-codex evaluate-prompting

serve:
	python3 -m http.server $(PORT)

## Removes generated, git-ignored data files. Never touches data/sample-events.json.
clean:
	rm -f data/claude-history-summary.json data/git-history-summary.json \
	      data/prompt-sample.json data/prompting-feedback.json \
	      data/claude-evaluation.json data/codex-evaluation.json

help:
	@echo "Usage: make <target> [VAR=value ...]"
	@echo ""
	@echo "Targets:"
	@echo "  all               import-claude + import-git + sample-prompts + evaluate + test (local only)"
	@echo "  import-claude     import Claude Code history from CLAUDE_DIR"
	@echo "  import-git        import merged PRs (GIT_REPO, or GIT_AUTHOR across every repo you can see)"
	@echo "  sample-prompts    sample your own prompts locally, no network"
	@echo "  evaluate          build data/profile.json from whatever's imported"
	@echo "  test              run the test suite"
	@echo "  evaluate-claude   coaching report via Claude CLI (derived data only)"
	@echo "  evaluate-codex    coaching report via Codex CLI (derived data only)"
	@echo "  evaluate-prompting  prompting-technique feedback (sends raw prompt text)"
	@echo "  coach-claude      evaluate-claude + evaluate-prompting together"
	@echo "  coach-codex       evaluate-codex + evaluate-prompting together (still uses Claude CLI for the prompting part)"
	@echo "  serve             preview the dashboard on PORT (default 4173)"
	@echo "  clean             delete generated data/ files (not data/sample-events.json)"
	@echo ""
	@echo "Variables (override with VAR=value):"
	@echo "  CLAUDE_DIR=$(CLAUDE_DIR)"
	@echo "  GIT_REPO=$(GIT_REPO)  (empty = use GIT_AUTHOR instead)"
	@echo "  GIT_AUTHOR=$(GIT_AUTHOR)"
	@echo "  GIT_LIMIT=$(GIT_LIMIT)"
	@echo "  PORT=$(PORT)"
