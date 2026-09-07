#!/bin/bash
# Phase 4 Integration Test Suite - Safe Execution Script
# IMPORTANT: This script does NOT report global success until ALL tests (automated + manual) are verified
# Manual tests must be executed separately and recorded in PHASE_4_INTEGRATION_TEST_RESULTS.md

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters - AUTOMATED ONLY
AUTOMATED_PASSED=0
AUTOMATED_FAILED=0
AUTOMATED_TOTAL=0

# CRITICAL: Expected automated test count (must not change without explicit intent)
EXPECTED_AUTOMATED_COUNT=17
ACTUAL_AUTOMATED_COUNT=0

# API Base URL
API="http://localhost:3000/api"

# Results file
RESULTS_FILE="PHASE_4_INTEGRATION_TEST_RESULTS.md"

# Log file for detailed output
LOG_FILE="phase4-test-execution.log"

# Initialize log file
cat > "$LOG_FILE" << 'EOF'
# Phase 4 Integration Test Execution Log

## Test Start
EOF

# Initialize results file (placeholder)
cat > "$RESULTS_FILE" << 'EOF'
# Phase 4 Integration Test Results - IN PROGRESS

⏳ Tests are currently being executed. This file will be updated with final results.

EOF

# Helper function to run a test
run_test() {
    local test_id=$1
    local test_name=$2
    local method=$3
    local endpoint=$4
    local token=$5
    local data=$6
    local expected_status=$7

    ((AUTOMATED_TOTAL++))

    echo -e "\n${YELLOW}[AUTOMATED TEST] $test_id: $test_name${NC}"
    echo "  Endpoint: $method $endpoint"

    if [ -z "$token" ]; then
        # No auth
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API$endpoint" \
            -H "Content-Type: application/json" \
            ${data:+-d "$data"} 2>&1)
    else
        # With auth
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            ${data:+-d "$data"} 2>&1)
    fi

    # Parse response
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    # Log the full response
    echo "Test $test_id:" >> "$LOG_FILE"
    echo "  HTTP Code: $http_code" >> "$LOG_FILE"
    echo "  Response: $body" >> "$LOG_FILE"

    # Check result
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        echo "  Response: ${body:0:100}..." | head -1
        ((AUTOMATED_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $http_code, expected $expected_status)"
        echo "  Response: ${body:0:100}..." | head -1
        ((AUTOMATED_FAILED++))
        return 1
    fi
}

# ============================================================================
# VERIFICATION & SETUP
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 4 Integration Test Suite - Automated Tests Only${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}IMPORTANT:${NC}"
echo "- This script runs AUTOMATED tests only (S1-S6, C1-C4, C9-C11, A1, A6)"
echo "- MANUAL tests must be executed separately (C5-C8, A2-A5, C12, A7-A8)"
echo "- Final results require BOTH automated AND manual tests to be recorded"
echo "- Phase 5 cannot start until ALL 28 tests pass"

echo -e "\n${YELLOW}Prerequisites Check:${NC}"

# Verify tokens
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌ ERROR: ADMIN_TOKEN not set${NC}"
    echo "Export tokens: export ADMIN_TOKEN='...'"
    exit 1
fi

if [ -z "$C1_TOKEN" ]; then
    echo -e "${RED}❌ ERROR: C1_TOKEN not set${NC}"
    echo "Export tokens: export C1_TOKEN='...'"
    exit 1
fi

if [ -z "$C2_TOKEN" ]; then
    echo -e "${RED}❌ ERROR: C2_TOKEN not set${NC}"
    echo "Export tokens: export C2_TOKEN='...'"
    exit 1
fi

echo -e "${GREEN}✅ Auth tokens present${NC}"

# Check if server is running
echo -n "Checking server connectivity... "
if curl -s http://localhost:3000/api/health > /dev/null 2>&1 || curl -s -I http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server running${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Server may not be responding${NC}"
    echo "Start with: npm run dev"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ============================================================================
# AUTOMATED SECURITY TESTS (S1-S6)
# ============================================================================
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  AUTOMATED SECURITY TESTS (S1-S6)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

run_test "S1" "Unauthorized Access Denied" "GET" "/user/bank-destinations" "" "" "401"
run_test "S2" "Customer Cannot Access Admin" "GET" "/admin/gbp-withdrawals" "$C1_TOKEN" "" "403"
run_test "S3" "Admin Authorization (CRITICAL)" "GET" "/admin/gbp-withdrawals" "$ADMIN_TOKEN" "" "200"
run_test "S4" "RLS Cross-User Isolation" "GET" "/user/bank-destinations" "$C1_TOKEN" "" "200"

# S5: User ID override protection
data='{"account_holder_name":"Test","iban":"GB89CBKG12345678901234","country_code":"GB","user_id":"malicious-user-id"}'
run_test "S5" "User ID Override Protection (CRITICAL)" "POST" "/user/bank-destinations" "$C1_TOKEN" "$data" "201"

# S6: IBAN masking
echo -e "\n${YELLOW}[AUTOMATED TEST] S6: IBAN Masking${NC}"
response=$(curl -s -X GET "$API/user/bank-destinations" \
    -H "Authorization: Bearer $C1_TOKEN" 2>&1)
if echo "$response" | grep -q "masked_iban"; then
    echo -e "${GREEN}✅ PASS${NC} (masked_iban found)"
    ((AUTOMATED_PASSED++))
    ((AUTOMATED_TOTAL++))
else
    echo -e "${RED}❌ FAIL${NC} (masked_iban not in response)"
    ((AUTOMATED_FAILED++))
    ((AUTOMATED_TOTAL++))
fi

# ============================================================================
# AUTOMATED CUSTOMER TESTS (C1-C4, C9-C11)
# ============================================================================
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  AUTOMATED CUSTOMER TESTS (C1-C4, C9-C11)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

# C1: Add destination
data='{"account_holder_name":"Test User","iban":"ES9121000418450200051332","country_code":"ES"}'
run_test "C1" "Add Valid Bank Destination" "POST" "/user/bank-destinations" "$C1_TOKEN" "$data" "201"

# C2: Reject invalid IBAN
data='{"account_holder_name":"Bad","iban":"INVALID123","country_code":"GB"}'
run_test "C2" "Reject Invalid IBAN" "POST" "/user/bank-destinations" "$C1_TOKEN" "$data" "400"

# C3: Reject unsupported country
data='{"account_holder_name":"US Bank","iban":"US1234567890","country_code":"US"}'
run_test "C3" "Reject Unsupported Country" "POST" "/user/bank-destinations" "$C1_TOKEN" "$data" "400"

# C4: List destinations
run_test "C4" "List Bank Destinations" "GET" "/user/bank-destinations" "$C1_TOKEN" "" "200"

# C9: Insufficient balance
data='{"amount_gbp":99999,"destination_id":"33333333-3333-3333-3333-333333333333"}'
run_test "C9" "Reject Insufficient Balance" "POST" "/user/gbp-withdrawal" "$C1_TOKEN" "$data" "400"

# C10: Invalid amount
data='{"amount_gbp":-100,"destination_id":"33333333-3333-3333-3333-333333333333"}'
run_test "C10" "Reject Invalid Amount" "POST" "/user/gbp-withdrawal" "$C1_TOKEN" "$data" "400"

# C11: Withdrawal history
run_test "C11" "View Withdrawal History" "GET" "/user/gbp-withdrawal/history" "$C1_TOKEN" "" "200"

# ============================================================================
# AUTOMATED ADMIN TESTS (A1, A6)
# ============================================================================
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  AUTOMATED ADMIN TESTS (A1, A6)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

run_test "A1" "List Withdrawals (Admin)" "GET" "/admin/gbp-withdrawals?status=pending" "$ADMIN_TOKEN" "" "200"
run_test "A6" "List Deposits (Admin)" "GET" "/admin/gbp-deposits?status=pending_review" "$ADMIN_TOKEN" "" "200"

# ============================================================================
# VERIFY TEST COVERAGE - CRITICAL SAFETY CHECK
# ============================================================================
ACTUAL_AUTOMATED_COUNT=$AUTOMATED_TOTAL

echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}CRITICAL: Verifying automated test coverage${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

echo "Expected automated tests: $EXPECTED_AUTOMATED_COUNT"
echo "Actual automated tests:   $ACTUAL_AUTOMATED_COUNT"

if [ $ACTUAL_AUTOMATED_COUNT -ne $EXPECTED_AUTOMATED_COUNT ]; then
    echo -e "\n${RED}❌ COVERAGE ERROR${NC}"
    echo "Test count mismatch detected!"
    echo "Expected: $EXPECTED_AUTOMATED_COUNT automated tests"
    echo "Actual:   $ACTUAL_AUTOMATED_COUNT automated tests"
    echo ""
    echo "This could indicate:"
    echo "  - Tests were accidentally removed"
    echo "  - Tests were added without updating EXPECTED_AUTOMATED_COUNT"
    echo "  - Test logic was modified"
    echo ""
    echo "Do NOT proceed. Review changes before continuing."
    exit 1
else
    echo -e "${GREEN}✅ PASS${NC} - Test coverage verified ($ACTUAL_AUTOMATED_COUNT/$EXPECTED_AUTOMATED_COUNT)"
fi

# ============================================================================
# SUMMARY - AUTOMATED ONLY
# ============================================================================
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  AUTOMATED TEST RESULTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Automated Tests Summary:${NC}"
echo "  Total Automated Tests: $AUTOMATED_TOTAL (Expected: $EXPECTED_AUTOMATED_COUNT) ✅"
echo -e "  Passed: ${GREEN}$AUTOMATED_PASSED${NC}"
echo -e "  Failed: ${RED}$AUTOMATED_FAILED${NC}"

if [ $AUTOMATED_TOTAL -gt 0 ]; then
    RATE=$((AUTOMATED_PASSED * 100 / AUTOMATED_TOTAL))
    echo "  Pass Rate: $RATE%"
fi

# ============================================================================
# MANUAL TESTS SECTION
# ============================================================================
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}  MANUAL TESTS REQUIRED (Must execute separately)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

MANUAL_TESTS=(
    "C5 - Update Unverified Destination"
    "C6 - Prevent Verified Modification (CRITICAL PATH)"
    "C7 - Delete Destination"
    "C8 - Create GBP Withdrawal"
    "C12 - Concurrent Withdrawal Safety (CRITICAL)"
    "A2 - Approve Withdrawal"
    "A3 - Reject Withdrawal"
    "A4 - Mark Payout Failed"
    "A5 - Prevent Double Restore"
    "A7 - Credit Deposit"
    "A8 - Deposit Idempotency (CRITICAL)"
)

echo -e "\n${YELLOW}Manual tests to execute:${NC}"
for test in "${MANUAL_TESTS[@]}"; do
    echo "  ⏳ $test"
done

echo -e "\n${YELLOW}Instructions:${NC}"
echo "1. Follow PHASE_4_TESTS_EXECUTE_NOW.md 'Step 6: Manual Tests' section"
echo "2. Execute each manual test in sequence"
echo "3. Record results in PHASE_4_INTEGRATION_TEST_RESULTS.md"
echo "4. Critical tests (marked above) MUST all pass"

# ============================================================================
# FINAL STATUS - CANNOT PASS WITHOUT MANUAL TESTS
# ============================================================================
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  PHASE 4 TEST STATUS - INCOMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${RED}⚠️  CANNOT PROCEED TO PHASE 5 YET${NC}"
echo ""
echo "Current Status:"
echo -e "  Automated Tests: ${GREEN}$AUTOMATED_PASSED/$AUTOMATED_TOTAL passed${NC}"
echo -e "  Manual Tests:    ${RED}0/11 pending${NC}"
echo ""
echo "Critical Tests Status:"
echo "  S3 (Admin Auth):        $([[ $AUTOMATED_PASSED -ge 3 ]] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}") Automated PASS (verify in manual testing)"
echo "  S5 (User ID Protection): $([[ $AUTOMATED_PASSED -ge 5 ]] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}") Automated PASS (verify in manual testing)"
echo "  C12 (Concurrent):        ${RED}❌${NC} MANUAL - Not yet executed"
echo "  A8 (Idempotency):        ${RED}❌${NC} MANUAL - Not yet executed"
echo ""
echo "Next Steps:"
echo "  1. Execute manual tests (Step 6 in PHASE_4_TESTS_EXECUTE_NOW.md)"
echo "  2. Record all 28 test results in PHASE_4_INTEGRATION_TEST_RESULTS.md"
echo "  3. Ensure ALL critical tests (S3, S5, C12, A8) show ✅ PASS"
echo "  4. Confirm 28/28 overall pass rate"
echo ""
echo -e "${YELLOW}Phase 5 Authorization Rule:${NC}"
echo -e "${RED}Phase 5 is BLOCKED until:${NC}"
echo "  ✅ All 28 tests passing (automated + manual)"
echo "  ✅ S3 = PASS (admin auth uses database role)"
echo "  ✅ S5 = PASS (user_id override protection)"
echo "  ✅ C12 = PASS (concurrent withdrawal safety)"
echo "  ✅ A8 = PASS (deposit idempotency)"
echo "  ✅ Evidence recorded in results file"

# ============================================================================
# LOG SUMMARY
# ============================================================================
echo -e "\n${YELLOW}Execution Details:${NC}"
echo "  Full log: $LOG_FILE"
echo "  Results template: $RESULTS_FILE"
echo "  Execution timestamp: $(date)" >> "$LOG_FILE"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Exit with failure status if any automated tests failed
if [ $AUTOMATED_FAILED -gt 0 ]; then
    echo -e "\n${RED}⚠️  Some automated tests failed - review and fix before manual tests${NC}"
    exit 1
fi

exit 0
