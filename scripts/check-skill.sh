#!/usr/bin/env bash
#
# Regression check for the linear-workflow skill.
#
# Guards against two classes of defect (see Linear W1N-13):
#   1. Unknown / invalid Linear workflow state-type literals. The historical
#      bug was the typo `tried` instead of the valid `triage`. Any literal that
#      is not a known Linear WorkflowStateType (or an intentional semantic
#      alias) is rejected.
#   2. Broken internal paths referenced by AGENTS.md and the skill docs.
#
# Exits non-zero on the first failing guard.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_DIR="$REPO_ROOT/linear-workflow"
AGENTS="$REPO_ROOT/AGENTS.md"
DIST="$REPO_ROOT/dist/linear-workflow.skill"

ok()  { printf '  ok: %s\n' "$1"; }
bad() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

# Valid Linear GraphQL WorkflowStateType enum values (backtick-wrapped for exact
# comparison), plus the semantic aliases the skill defines intentionally (review
# is a semantic state, not a Linear type). Single-quoted so backticks stay literal.
VALID_TYPES='`backlog` `unstarted` `started` `completed` `canceled` `triage` `review`'
# Lowercase single-word backtick tokens that are not state types but are legit.
NON_STATE_WORDS='`type`'

echo "== Linear state-type literals =="

# 1a. Regression guard: the historical invalid literal must never reappear.
if grep -rEq "\btried\b" "$SKILL_DIR"; then
  bad "invalid state-type literal 'tried' found in $SKILL_DIR (use 'triage')"
fi
ok "no invalid 'tried' literal in skill source"

# 1b. The correct type must be recognized.
grep -rEq "\btriage\b" "$SKILL_DIR" || bad "valid state type 'triage' is not referenced in $SKILL_DIR"
ok "valid 'triage' state type is recognized"

# 1c. Generic allowlist: every backtick-quoted lowercase single-word token that
#     looks like a state type must be a known valid type (or an allowed word).
unknown=0
while IFS= read -r tok; do
  [ -z "$tok" ] && continue
  # Compare the full backtick-quoted token against the allowlist. A case pattern
  # treats backticks literally (no command substitution), unlike double quotes.
  case " $VALID_TYPES $NON_STATE_WORDS " in
    *" $tok "*) continue ;;
    *) printf '  unknown state-type literal: %s\n' "$tok" >&2; unknown=1 ;;
  esac
done < <(grep -rhoE '`[a-z]+`' "$SKILL_DIR" 2>/dev/null || true | sort -u)
[ "$unknown" -eq 0 ] || bad "unknown state-type literal(s) detected (see above)"
ok "all backtick-quoted lowercase state-type literals are valid"

echo "== Internal paths =="

# 2a. AGENTS.md must reference the repository source path, which must exist.
grep -Eq '`linear-workflow/`' "$AGENTS" || bad "AGENTS.md does not reference the repository source path 'linear-workflow/'"
[ -d "$REPO_ROOT/linear-workflow" ] || bad "source directory linear-workflow/ does not exist"
ok "AGENTS.md references existing source path linear-workflow/"

# 2b. Any host install path referenced by AGENTS.md must be documented as an
#     installation target and must exist.
if grep -Eq '`\.forge/skills/linear-workflow/`' "$AGENTS"; then
  grep -Eqi 'install' "$AGENTS" || bad "AGENTS.md references .forge install path but does not document it as an installation target"
  [ -d "$REPO_ROOT/.forge/skills/linear-workflow" ] || bad ".forge/skills/linear-workflow/ referenced but missing"
  ok ".forge install path exists and is documented as installation target"
fi

echo "== Relative Markdown links =="

# 2c. Relative .md links inside the skill must resolve to real files.
while IFS= read -r link; do
  [ -f "$SKILL_DIR/$link" ] || bad "broken relative link in SKILL.md: $link (expected $SKILL_DIR/$link)"
done < <(grep -oE '\]\(([^)]+\.md)\)' "$SKILL_DIR/SKILL.md" 2>/dev/null | sed -E 's/.*\(([^)]+)\)/\1/' || true)
ok "relative Markdown links in SKILL.md resolve"

echo "== Packaged artifact (if present) =="

# 2d. The packaged artifact must match the corrected source.
if [ -f "$DIST" ]; then
  if command -v unzip >/dev/null 2>&1; then
    content="$(unzip -p "$DIST" linear-workflow/SKILL.md linear-workflow/mark-done.md 2>/dev/null || true)"
    echo "$content" | grep -Eq "\btried\b" && bad "packaged artifact $DIST still contains invalid 'tried'"
    echo "$content" | grep -Eq "\btriage\b" || bad "packaged artifact $DIST does not contain 'triage'"
    ok "packaged artifact contains no 'tried' and recognizes 'triage'"
  else
    ok "unzip unavailable; skipped dist check"
  fi
else
  ok "no packaged artifact to verify"
fi

echo "== All regression checks passed =="
