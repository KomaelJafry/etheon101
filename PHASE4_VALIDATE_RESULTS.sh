#!/bin/bash

##############################################################################
# Phase 4 Results Validation - EVIDENCE VERIFICATION
# Purpose: Validate that all results are from actual runtime execution
# Prerequisites: Run PHASE4_RUN_TESTS.sh first
# Usage: bash PHASE4_VALIDATE_RESULTS.sh EVIDENCE_DIR REPORT_FILE
# Exit Code: 0 = all validation passes, 1 = validation failed
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EVIDENCE_DIR="${1:-.}"
REPORT_FILE="${2:-./PHASE_4_RUNTIME_INTEGRATION_TEST_RESULTS.md}"

VALIDATION_PASSED=0
VALIDATION_FAILED=0

# Helper functions
check_file_exists() {
    local name=$1
    local path=$2

    if [ -f "$path" ]; then
        echo -e "${GREEN}✓${NC} $name exists"
        ((VALIDATION_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name NOT FOUND: $path"
        ((VALIDATION_FAILED++))
        return 1
    fi
}

check_file_not_empty() {
    local name=$1
    local path=$2

    if [ -f "$path" ] && [ -s "$path" ]; then
        echo -e "${GREEN}✓${NC} $name is not empty"
        ((VALIDATION_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name is empty or missing: $path"
        ((VALIDATION_FAILED++))
        return 1
    fi
}

check_file_contains() {
    local name=$1
    local path=$2
    local pattern=$3

    if [ -f "$path" ] && grep -q "$pattern" "$path" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name contains '$pattern'"
        ((VALIDATION_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name missing pattern '$pattern': $path"
        ((VALIDATION_FAILED++))
        return 1
    fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 4 Runtime Results Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Evidence Directory: $EVIDENCE_DIR"
echo "Report File: $REPORT_FILE"
echo ""

echo -e "${BLUE}1. REPORT FILE VALIDATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_exists "Final report" "$REPORT_FILE" || true

echo ""
echo -e "${BLUE}2. EVIDENCE FILES FOR AUTOMATED TESTS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_not_empty "Automated tests log" "$EVIDENCE_DIR/automated-tests.log" || true

echo ""
echo -e "${BLUE}3. C12 CONCURRENCY TEST EVIDENCE${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_exists "C12 starting balance" "$EVIDENCE_DIR/c12-starting-balance.txt" || true
check_file_not_empty "C12 starting balance" "$EVIDENCE_DIR/c12-starting-balance.txt" || true

check_file_exists "C12 request 1" "$EVIDENCE_DIR/c12-request1.txt" || true
check_file_not_empty "C12 request 1" "$EVIDENCE_DIR/c12-request1.txt" || true
check_file_contains "C12 request 1" "$EVIDENCE_DIR/c12-request1.txt" "HTTP_STATUS" || true

check_file_exists "C12 request 2" "$EVIDENCE_DIR/c12-request2.txt" || true
check_file_not_empty "C12 request 2" "$EVIDENCE_DIR/c12-request2.txt" || true
check_file_contains "C12 request 2" "$EVIDENCE_DIR/c12-request2.txt" "HTTP_STATUS" || true

check_file_exists "C12 final balance" "$EVIDENCE_DIR/c12-final-balance.txt" || true
check_file_not_empty "C12 final balance" "$EVIDENCE_DIR/c12-final-balance.txt" || true

check_file_exists "C12 withdrawal records" "$EVIDENCE_DIR/c12-withdrawal-records.txt" || true
check_file_not_empty "C12 withdrawal records" "$EVIDENCE_DIR/c12-withdrawal-records.txt" || true

echo ""
echo -e "${BLUE}4. CRITICAL SECURITY TEST EVIDENCE${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_exists "S3 admin role verification" "$EVIDENCE_DIR/s3-admin-role-verification.txt" || true
check_file_not_empty "S3 admin role verification" "$EVIDENCE_DIR/s3-admin-role-verification.txt" || true

check_file_exists "S5 user ID protection verification" "$EVIDENCE_DIR/s5-user-id-protection-verification.txt" || true
check_file_not_empty "S5 user ID protection verification" "$EVIDENCE_DIR/s5-user-id-protection-verification.txt" || true

echo ""
echo -e "${BLUE}5. A8 IDEMPOTENCY TEST EVIDENCE${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_exists "A8 starting balance" "$EVIDENCE_DIR/a8-starting-balance.txt" || true
check_file_not_empty "A8 starting balance" "$EVIDENCE_DIR/a8-starting-balance.txt" || true

check_file_exists "A8 credit request 1" "$EVIDENCE_DIR/a8-credit1.txt" || true
check_file_not_empty "A8 credit request 1" "$EVIDENCE_DIR/a8-credit1.txt" || true
check_file_contains "A8 credit request 1" "$EVIDENCE_DIR/a8-credit1.txt" "HTTP_STATUS" || true

check_file_exists "A8 credit request 2 (replay)" "$EVIDENCE_DIR/a8-credit2.txt" || true
check_file_not_empty "A8 credit request 2 (replay)" "$EVIDENCE_DIR/a8-credit2.txt" || true
check_file_contains "A8 credit request 2 (replay)" "$EVIDENCE_DIR/a8-credit2.txt" "HTTP_STATUS" || true

check_file_exists "A8 transaction count" "$EVIDENCE_DIR/a8-transaction-count.txt" || true
check_file_not_empty "A8 transaction count" "$EVIDENCE_DIR/a8-transaction-count.txt" || true

check_file_exists "A8 transactions added" "$EVIDENCE_DIR/a8-transactions-added.txt" || true
check_file_not_empty "A8 transactions added" "$EVIDENCE_DIR/a8-transactions-added.txt" || true

check_file_exists "A8 final balance" "$EVIDENCE_DIR/a8-final-balance.txt" || true
check_file_not_empty "A8 final balance" "$EVIDENCE_DIR/a8-final-balance.txt" || true

echo ""
echo -e "${BLUE}6. EXECUTION METADATA${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_exists "Execution timestamp" "$EVIDENCE_DIR/execution-timestamp.txt" || true
check_file_not_empty "Execution timestamp" "$EVIDENCE_DIR/execution-timestamp.txt" || true

check_file_exists "Git commit hash" "$EVIDENCE_DIR/git-commit.txt" || true
check_file_not_empty "Git commit hash" "$EVIDENCE_DIR/git-commit.txt" || true

check_file_exists "Migrations deployed" "$EVIDENCE_DIR/migrations-deployed.txt" || true
check_file_not_empty "Migrations deployed" "$EVIDENCE_DIR/migrations-deployed.txt" || true

check_file_exists "Critical gate status" "$EVIDENCE_DIR/critical-gate-status.txt" || true
check_file_not_empty "Critical gate status" "$EVIDENCE_DIR/critical-gate-status.txt" || true

echo ""
echo -e "${BLUE}7. SERVER AND BUILD EVIDENCE${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

check_file_exists "Dev server log" "$EVIDENCE_DIR/dev-server.log" || true
check_file_contains "Dev server log" "$EVIDENCE_DIR/dev-server.log" "ready\|listening\|running" || true

echo ""
echo -e "${BLUE}8. REPORT CONTENT VALIDATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

if [ -f "$REPORT_FILE" ]; then
    check_file_contains "Report has runtime status" "$REPORT_FILE" "RUNTIME EXECUTION COMPLETED" || true
    check_file_contains "Report has execution metadata" "$REPORT_FILE" "Execution Timestamp\|Git Commit\|Deployment Status" || true
    check_file_contains "Report has 28 tests" "$REPORT_FILE" "28/28\|28 executed" || true
    check_file_contains "Report has C12 section" "$REPORT_FILE" "C12" || true
    check_file_contains "Report has A8 section" "$REPORT_FILE" "A8" || true
    check_file_contains "Report has S3 verification" "$REPORT_FILE" "S3.*Admin" || true
    check_file_contains "Report has S5 verification" "$REPORT_FILE" "S5.*User.*ID" || true
    check_file_contains "Report links to evidence" "$REPORT_FILE" "$EVIDENCE_DIR" || true
    check_file_contains "Report has critical tests" "$REPORT_FILE" "Critical\|S3\|S5\|C12\|A8" || true

    # Check for simulated results (anti-pattern)
    if grep -q "SIMULATED\|ESTIMATED\|INFERRED" "$REPORT_FILE" 2>/dev/null; then
        echo -e "${RED}✗${NC} Report contains simulated or estimated results (not allowed)"
        ((VALIDATION_FAILED++))
    else
        echo -e "${GREEN}✓${NC} Report contains only actual runtime results (no simulated data)"
        ((VALIDATION_PASSED++))
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VALIDATION RESULTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo ""
echo "Validations Passed:  ${GREEN}$VALIDATION_PASSED${NC}"
echo "Validations Failed:  ${RED}$VALIDATION_FAILED${NC}"

echo ""
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "Evidence is complete and ready for submission."
    echo ""
    echo "Submit to Claude:"
    echo "  1. $REPORT_FILE"
    echo "  2. Evidence directory: $EVIDENCE_DIR"
    echo ""
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo ""
    echo "Missing or invalid evidence files:"
    echo "  - Check that PHASE4_RUN_TESTS.sh completed without errors"
    echo "  - Verify all evidence files exist in: $EVIDENCE_DIR"
    echo "  - Ensure HTTP status codes are captured in request files"
    echo ""
    exit 1
fi
