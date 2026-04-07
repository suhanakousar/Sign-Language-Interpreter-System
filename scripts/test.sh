#!/bin/bash
set -e

echo "========================================="
echo "  Sign Language Interpreter - Tests"
echo "========================================="
echo ""

PASS=0
FAIL=0

run_test() {
    local name=$1
    local cmd=$2
    echo "Running: $name"
    if eval "$cmd"; then
        echo "  [PASS] $name"
        ((PASS++))
    else
        echo "  [FAIL] $name"
        ((FAIL++))
    fi
    echo ""
}

# Activate Python venv
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null || true

# Python tests
run_test "NLP Processor Tests" \
    "cd backend/python-services/nlp_processor && python -m pytest test_nlp.py -v"

run_test "Text-to-Sign Tests" \
    "cd backend/python-services/text_to_sign && python -m pytest test_text_to_sign.py -v"

# Node.js tests (if any)
if [ -f "backend/node-api/package.json" ]; then
    run_test "Node.js API Tests" \
        "cd backend/node-api && npm test 2>/dev/null"
fi

# Frontend tests (if any)
if [ -f "frontend/package.json" ]; then
    run_test "Frontend Tests" \
        "cd frontend && npm test 2>/dev/null"
fi

echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="

exit $FAIL
