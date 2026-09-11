#!/bin/bash
# Agent Hardening Kit 全局扩展加载脚本
# 用法: ./load-extensions.sh [profile]
#   profile: minimal | standard | full | database

set -e

PROFILE=${1:-standard}

case "$PROFILE" in
  minimal)
    EXTENSIONS=(
      "pi-memory.ts"
      "pi-no-delete-db.ts"
    )
    ;;
  database)
    EXTENSIONS=(
      "pi-memory.ts"
      "pi-no-delete-db.ts"
      "pi-milvus-knowledge.ts"
    )
    ;;
  standard)
    EXTENSIONS=(
      "pi-security-constraints.ts"
      "pi-stability-constraints.ts"
      "pi-delivery-constraints.ts"
      "pi-memory.ts"
      "pi-no-delete-db.ts"
    )
    ;;
  full)
    EXTENSIONS=(
      "pi-security-constraints.ts"
      "pi-stability-constraints.ts"
      "pi-delivery-constraints.ts"
      "pi-ai-bug-scanner.ts"
      "pi-git-snapshot.ts"
      "pi-drift-prevention.ts"
      "pi-temperature-control.ts"
      "pi-core-file-protection.ts"
      "pi-context-monitor.ts"
      "pi-review-gate.ts"
      "pi-memory.ts"
      "pi-auto-memory.ts"
      "pi-long-session.ts"
      "pi-milvus-knowledge.ts"
      "pi-no-delete-db.ts"
    )
    ;;
  *)
    echo "Unknown profile: $PROFILE"
    echo "Usage: $0 [minimal|standard|full|database]"
    exit 1
    ;;
esac

# 构建命令
CMD="pi"
for ext in "${EXTENSIONS[@]}"; do
  CMD="$CMD -e ~/.pi/agent/extensions/$ext"
done

echo "Loading profile: $PROFILE"
echo "Extensions: ${#EXTENSIONS[@]}"
echo "Command:"
echo "$CMD"
echo ""
echo "Starting Pi..."

eval "$CMD"