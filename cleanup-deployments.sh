#!/bin/bash

# Script to clean up GitHub deployments, keeping only production environments
# Usage: ./cleanup-deployments.sh [--dry-run]

set -e

REPO="uspark-hq/uspark"
DRY_RUN=false

if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No deployments will be deleted"
fi

echo "📊 Fetching all deployments from $REPO..."

# Get all deployments (paginated)
ALL_DEPLOYMENTS=$(gh api repos/$REPO/deployments --paginate | jq -s 'add')

# Count total deployments
TOTAL=$(echo "$ALL_DEPLOYMENTS" | jq 'length')
echo "📦 Found $TOTAL total deployments"

# Filter non-production deployments
NON_PROD_DEPLOYMENTS=$(echo "$ALL_DEPLOYMENTS" | jq '[.[] | select(.environment != "production" and .environment != "web/production")]')
NON_PROD_COUNT=$(echo "$NON_PROD_DEPLOYMENTS" | jq 'length')

echo "🎯 Found $NON_PROD_COUNT non-production deployments to delete"

# Show environment breakdown
echo ""
echo "📋 Environment breakdown:"
echo "$ALL_DEPLOYMENTS" | jq -r '.[].environment' | sort | uniq -c | sort -rn

if [ "$NON_PROD_COUNT" -eq 0 ]; then
    echo "✅ No non-production deployments to delete"
    exit 0
fi

echo ""
if [ "$DRY_RUN" = true ]; then
    echo "🔍 Deployments that would be deleted:"
    echo "$NON_PROD_DEPLOYMENTS" | jq -r '.[] | "\(.id) - \(.environment) - \(.created_at)"' | head -20
    REMAINING=$((NON_PROD_COUNT - 20))
    if [ "$REMAINING" -gt 0 ]; then
        echo "... and $REMAINING more"
    fi
else
    read -p "⚠️  Are you sure you want to delete $NON_PROD_COUNT non-production deployments? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled"
        exit 1
    fi

    echo "🗑️  Deleting non-production deployments..."

    # Delete deployments one by one with progress
    DELETED=0
    echo "$NON_PROD_DEPLOYMENTS" | jq -r '.[].id' | while read -r DEPLOYMENT_ID; do
        # First, set the deployment status to inactive
        gh api repos/$REPO/deployments/$DEPLOYMENT_ID/statuses \
            --method POST \
            -f state="inactive" \
            -f description="Deactivating for cleanup" 2>/dev/null || true

        # Then delete the deployment
        if gh api repos/$REPO/deployments/$DEPLOYMENT_ID --method DELETE 2>/dev/null; then
            DELETED=$((DELETED + 1))
            echo -ne "\r🗑️  Deleted $DELETED/$NON_PROD_COUNT deployments..."
        else
            echo ""
            echo "⚠️  Failed to delete deployment $DEPLOYMENT_ID (might be active)"
        fi
    done

    echo ""
    echo "✅ Cleanup complete! Deleted $DELETED deployments"
fi

# Show final stats
echo ""
echo "📊 Final deployment count:"
gh api repos/$REPO/deployments | jq 'length' | xargs -I {} echo "  Total remaining: {}"