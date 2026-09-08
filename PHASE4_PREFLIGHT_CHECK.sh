#!/bin/bash

##############################################################################
# Phase 4 Runtime Test - PREFLIGHT CHECK SCRIPT
# Purpose: Validate all prerequisites before test execution
# Usage: bash PHASE4_PREFLIGHT_CHECK.sh
# Exit Code: 0 = all checks pass, proceed to PHASE4_RUN_TESTS.sh
#            1 = check failed, fix issue and re-run
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 4 Runtime Test - PREFLIGHT CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

CHECKS_PASSED=0
CHECKS_FAILED=0
CRITICAL_FAILED=0

# Helper function for checks
check_command() {
    local name=$1
    local command=$2
    local critical=${3:-false}

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        ((CHECKS_FAILED++))
        if [ "$critical" = "true" ]; then
            ((CRITICAL_FAILED++))
        fi
        return 1
    fi
}

check_file() {
    local name=$1
    local path=$2

    if [ -f "$path" ]; then
        echo -e "${GREEN}✓${NC} $name"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name - NOT FOUND: $path"
        ((CHECKS_FAILED++))
        ((CRITICAL_FAILED++))
        return 1
    fi
}

check_env_var() {
    local var_name=$1
    local critical=${2:-false}

    local var_value="${!var_name}"
    if [ -n "$var_value" ]; then
        # Show first 40 chars and ellipsis if longer
        local display="${var_value:0:40}"
        if [ ${#var_value} -gt 40 ]; then
            display="${display}..."
        fi
        echo -e "${GREEN}✓${NC} $var_name = $display"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $var_name - NOT SET"
        ((CHECKS_FAILED++))
        if [ "$critical" = "true" ]; then
            ((CRITICAL_FAILED++))
        fi
        return 1
    fi
}

echo ""
echo -e "${BLUE}1. ENVIRONMENT VARIABLES${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_env_var "DATABASE_URL" "true"
check_env_var "NEXT_PUBLIC_SUPABASE_URL" "true"
check_env_var "SUPABASE_SERVICE_ROLE_KEY" "true"

echo ""
echo -e "${BLUE}2. REQUIRED TOOLS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_command "Node.js (v18+)" "node --version && node -v | grep -E 'v(1[8-9]|[2-9][0-9])'" "true"
check_command "npm" "npm --version" "true"
check_command "curl" "which curl" "true"
check_command "jq (JSON parser)" "which jq" "true"
check_command "psql (PostgreSQL client)" "which psql" "true"
check_command "Supabase CLI" "supabase --version" "true"

echo ""
echo -e "${BLUE}3. PROJECT FILES${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file "package.json" "package.json" || true
check_file "Migration 007 (schema)" "supabase/migrations/007_batch3_schema.sql" || true
check_file "Migration 008 (notifications)" "supabase/migrations/008_batch3_notifications.sql" || true
check_file "Migration 009 (RPCs)" "supabase/migrations/009_batch3_rpcs.sql" || true
check_file "Test script" "run-phase4-tests.sh" || true

echo ""
echo -e "${BLUE}4. DATABASE CONNECTIVITY${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

# Test psql connection
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL connection (psql)"
    ((CHECKS_PASSED++))

    # Get database info
    DB_NAME=$(psql "$DATABASE_URL" -t -c "SELECT current_database();")
    echo -e "  Database: $DB_NAME"
else
    echo -e "${RED}✗${NC} PostgreSQL connection (psql)"
    echo -e "  Command: psql \$DATABASE_URL -c \"SELECT 1;\""
    echo -e "  Error: Cannot connect to database"
    ((CHECKS_FAILED++))
    ((CRITICAL_FAILED++))
fi

echo ""
echo -e "${BLUE}5. MIGRATION STATUS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

# Check if migrations are deployed
if psql "$DATABASE_URL" -t -c "SELECT version FROM schema_migrations WHERE version LIKE '007%' LIMIT 1;" 2>/dev/null | grep -q "007"; then
    echo -e "${GREEN}✓${NC} Migration 007 deployed"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Migration 007 NOT deployed (will deploy when tests run)"
    ((CHECKS_FAILED++))
fi

if psql "$DATABASE_URL" -t -c "SELECT version FROM schema_migrations WHERE version LIKE '008%' LIMIT 1;" 2>/dev/null | grep -q "008"; then
    echo -e "${GREEN}✓${NC} Migration 008 deployed"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Migration 008 NOT deployed (will deploy when tests run)"
    ((CHECKS_FAILED++))
fi

if psql "$DATABASE_URL" -t -c "SELECT version FROM schema_migrations WHERE version LIKE '009%' LIMIT 1;" 2>/dev/null | grep -q "009"; then
    echo -e "${GREEN}✓${NC} Migration 009 deployed"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Migration 009 NOT deployed (will deploy when tests run)"
    ((CHECKS_FAILED++))
fi

echo ""
echo -e "${BLUE}6. DEVELOPMENT SERVER STARTUP${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

# Check if port 3000 is available
if ! lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Port 3000 available"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Port 3000 in use (will be killed when tests start)"
    ((CHECKS_FAILED++))
fi

# Check if npm dependencies are installed
if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
    echo -e "${GREEN}✓${NC} npm dependencies installed"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  npm dependencies may need installing"
    echo -e "  Run: npm install"
    ((CHECKS_FAILED++))
fi

echo ""
echo -e "${BLUE}7. SUPABASE CONNECTIVITY${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

# Verify Supabase URL format
if [[ "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://.*\.supabase\.co ]]; then
    echo -e "${GREEN}✓${NC} Supabase URL valid format"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗${NC} Supabase URL invalid format"
    ((CHECKS_FAILED++))
    ((CRITICAL_FAILED++))
fi

# Test Supabase API connectivity (REST)
if timeout 5 curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?select=count&limit=1" 2>/dev/null | grep -q "count\|error\|[]" ; then
    echo -e "${GREEN}✓${NC} Supabase API accessible"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Supabase API not responding (may be network issue)"
    ((CHECKS_FAILED++))
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PREFLIGHT CHECK RESULTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo ""
echo "Checks Passed:  ${GREEN}$CHECKS_PASSED${NC}"
echo "Checks Failed:  ${RED}$CHECKS_FAILED${NC}"
echo "Critical Issues: ${RED}$CRITICAL_FAILED${NC}"

echo ""
if [ $CRITICAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ PREFLIGHT CHECK PASSED${NC}"
    echo ""
    echo "All critical prerequisites verified. Ready to run tests."
    echo ""
    echo "Next command:"
    echo "  bash PHASE4_RUN_TESTS.sh"
    echo ""
    exit 0
else
    echo -e "${RED}❌ PREFLIGHT CHECK FAILED${NC}"
    echo ""
    echo "Critical issues found:"
    echo "  1. Verify DATABASE_URL is set correctly"
    echo "  2. Verify NEXT_PUBLIC_SUPABASE_URL is correct"
    echo "  3. Verify SUPABASE_SERVICE_ROLE_KEY is valid"
    echo "  4. Check PostgreSQL connectivity"
    echo "  5. Verify Node.js and npm are installed"
    echo ""
    echo "After fixing issues, run this script again:"
    echo "  bash PHASE4_PREFLIGHT_CHECK.sh"
    echo ""
    exit 1
fi
