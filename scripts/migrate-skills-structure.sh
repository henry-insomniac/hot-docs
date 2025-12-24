#!/bin/bash
# migrate-skills-structure.sh
# Reorganizes skills from category-based to independent directory structure

set -e

skills_dir=".claude/skills"
cd "$(dirname "$0")/.."

echo "Starting skills directory restructuring..."
echo "================================================"

# Create temporary directory to avoid conflicts
temp_dir=".claude/skills_new"
mkdir -p "$temp_dir"

# Migrate all skills
for category in planning management development quality documentation tools versioning; do
  if [ -d "$skills_dir/$category" ]; then
    echo ""
    echo "Processing category: $category"
    echo "--------------------------------"

    for skill_file in "$skills_dir/$category"/*.md; do
      if [ -f "$skill_file" ]; then
        skill_name=$(basename "$skill_file" .md)

        # Create new skill directory structure
        mkdir -p "$temp_dir/$skill_name/examples"
        mkdir -p "$temp_dir/$skill_name/templates"

        # Move file and rename to SKILL.md
        cp "$skill_file" "$temp_dir/$skill_name/SKILL.md"

        echo "  ✓ Migrated $skill_name"
      fi
    done
  fi
done

echo ""
echo "================================================"
echo "Migration complete! New structure in: $temp_dir"
echo ""
echo "Next steps:"
echo "1. Review the new structure in $temp_dir"
echo "2. Backup old structure if needed"
echo "3. Replace old structure with new one"
echo "4. Update config.json"
