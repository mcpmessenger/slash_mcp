#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated via GH_TOKEN env or previous gh auth setup

if ! command -v gh &> /dev/null; then
  echo "GitHub CLI (gh) is required but not installed." >&2
  exit 1
fi

echo "🔖 Creating standard labels..."
create_label() {
  local name=$1 color=$2 desc=$3
  if gh label list | grep -q "^${name}"; then
    echo "Label '${name}' already exists, skipping."
  else
    gh label create "$name" --color "$color" -d "$desc" || true
  fi
}

create_label frontend FF9E1B "Client-side work"
create_label backend 1A7AF4 "Server-side work"
create_label infra 7057ff "DevOps / CI / Docker"
create_label docs 0E8A16 "Documentation"
create_label urgent d93f0b "High priority"
create_label blocked 5319e7 "Needs external input"

# Create project board
board_name="Solo-Dev Board"
if gh project list | grep -q "$board_name"; then
  echo "Project board already exists, skipping creation."
  board_id=$(gh project list --format json | jq -r ".[] | select(.title==\"$board_name\") | .id")
else
  echo "📋 Creating project board..."
  board_id=$(gh project create "$board_name" --format json | jq -r '.id')
  for col in Backlog "Next Up" Doing Review Done; do
    gh project column-create "$board_id" --name "$col"
  done
fi

echo "📝 Creating issue and PR templates..."
mkdir -p .github/ISSUE_TEMPLATE

cat > .github/ISSUE_TEMPLATE/feature.yml <<'EOF'
name: Feature
about: New feature or enhancement
labels: []
body:
  - type: markdown
    attributes:
      value: "### Acceptance criteria"
  - type: textarea
    id: ac
    attributes:
      label: Acceptance criteria
      description: "Bullet list of conditions for done"
EOF

cat > .github/PULL_REQUEST_TEMPLATE.md <<'EOF'
### What
<!-- Describe what this PR does -->

### Why
<!-- Reference the Issue and why it's needed -->

### Checklist
- [ ] Unit tests added/updated
- [ ] Docs updated (if applicable)
EOF

echo "📦 Adding Dependabot configuration..."
mkdir -p .github
cat > .github/dependabot.yml <<'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
EOF

echo "🏗️  Creating default CI workflow..."
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'EOF'
name: CI
on:
  push:
    branches: ["**"]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm test --if-present -- --run
EOF

echo "✅ Bootstrap script finished." 