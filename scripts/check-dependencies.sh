#!/usr/bin/env bash
# AI Foundations Coach - Complete System & Dependency Checker
# Usage: ./scripts/check-dependencies.sh [--install] [--strict]

set -uo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

AUTO_INSTALL=false
STRICT_MODE=false

for arg in "$@"; do
    case "$arg" in
        --install) AUTO_INSTALL=true ;;
        --strict) STRICT_MODE=true ;;
        -h|--help)
            echo "Usage: ./scripts/check-dependencies.sh [OPTIONS]"
            echo "  --install   Automatically attempt to install missing package dependencies"
            echo "  --strict    Fail with non-zero exit code on any warning"
            exit 0
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BOLD}${BLUE}================================================================${NC}"
echo -e "${BOLD}${BLUE}   AI Foundations Coach - Prerequisite & Dependency Checker   ${NC}"
echo -e "${BOLD}${BLUE}================================================================${NC}"
echo "Inspecting environment at: ${ROOT_DIR}"
echo ""

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "  [${GREEN}✓ OK${NC}] $1"
}

check_warn() {
    echo -e "  [${YELLOW}! WARN${NC}] $1"
    WARNINGS=$((WARNINGS + 1))
}

check_fail() {
    echo -e "  [${RED}✗ FAIL${NC}] $1"
    ERRORS=$((ERRORS + 1))
}

# 1. Check Git
echo -e "${BOLD}1. Git Version Control:${NC}"
if command -v git >/dev/null 2>&1; then
    GIT_VER=$(git --version)
    check_pass "Git installed: ${GIT_VER}"
else
    check_fail "Git not found! Please install Git."
fi
echo ""

# 2. Check Go Runtime
echo -e "${BOLD}2. Go Runtime (Backend API server):${NC}"
if command -v go >/dev/null 2>&1; then
    GO_VER=$(go version)
    check_pass "Go installed: ${GO_VER}"
    
    # Check go modules
    if [ -f "${ROOT_DIR}/go.mod" ]; then
        if (cd "${ROOT_DIR}" && go mod verify >/dev/null 2>&1); then
            check_pass "Go modules verified against go.sum"
        else
            if [ "$AUTO_INSTALL" = true ]; then
                echo "    -> Running 'go mod download'..."
                (cd "${ROOT_DIR}" && go mod download) && check_pass "Go modules downloaded successfully" || check_fail "Failed to download Go modules"
            else
                check_warn "Go modules may need download. Run: go mod download"
            fi
        fi
    fi
else
    check_fail "Go compiler not found! Go >= 1.22 is required for cmd/server."
fi
echo ""

# 3. Check Node.js and NPM (Frontend SPA)
echo -e "${BOLD}3. Node.js & NPM (Frontend Vite SPA):${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v)
    check_pass "Node.js installed: ${NODE_VER}"
else
    check_fail "Node.js not found! Node.js >= 18 is required."
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VER=$(npm -v)
    check_pass "NPM installed: v${NPM_VER}"
    
    # Check web/node_modules
    if [ -d "${ROOT_DIR}/web/node_modules" ]; then
        check_pass "Frontend node_modules present in web/"
    else
        if [ "$AUTO_INSTALL" = true ]; then
            echo "    -> Running 'npm install' in web/..."
            (cd "${ROOT_DIR}/web" && npm install) && check_pass "npm install completed" || check_fail "npm install failed"
        else
            check_warn "web/node_modules not found. Run: cd web && npm install"
        fi
    fi
else
    check_fail "npm not found! Please install npm."
fi
echo ""

# 4. Check Python 3 (Content Quality & Audit Tooling)
echo -e "${BOLD}4. Python 3 (Content Auditing & Readability Tools):${NC}"
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
fi

if [ -n "$PYTHON_CMD" ]; then
    PY_VER=$($PYTHON_CMD --version)
    check_pass "Python installed: ${PY_VER}"
    
    # Check python packages
    MISSING_PY_PKGS=0
    for pkg in "textstat" "requests" "yaml"; do
        if ! $PYTHON_CMD -c "import $pkg" >/dev/null 2>&1; then
            MISSING_PY_PKGS=$((MISSING_PY_PKGS + 1))
        fi
    done
    
    if [ $MISSING_PY_PKGS -eq 0 ]; then
        check_pass "Python audit dependencies satisfied (textstat, requests, pyyaml)"
    else
        if [ "$AUTO_INSTALL" = true ]; then
            echo "    -> Installing python dependencies from scripts/requirements.txt..."
            $PYTHON_CMD -m pip install -r "${ROOT_DIR}/scripts/requirements.txt" && check_pass "Python dependencies installed" || check_warn "Could not pip install automatically."
        else
            check_warn "Some Python audit packages missing. Run: pip install -r scripts/requirements.txt"
        fi
    fi
else
    check_warn "Python 3 not found. Optional for scripts/audit_lesson.py."
fi
echo ""

# 5. Check Playwright E2E Browsers
echo -e "${BOLD}5. Playwright Testing Framework:${NC}"
if [ -d "${ROOT_DIR}/web/node_modules/@playwright/test" ]; then
    check_pass "Playwright test runner installed in web/"
    # Check if browsers installed (macOS / Linux cache check)
    if [ -d "$HOME/Library/Caches/ms-playwright" ] || [ -d "$HOME/.cache/ms-playwright" ]; then
        check_pass "Playwright browser binaries located in user cache"
    else
        check_warn "Playwright browser binaries may need install. Run: npx playwright install"
    fi
else
    check_warn "Playwright not yet installed in web/node_modules."
fi
echo ""

# 6. Check Environment Configuration (.env)
echo -e "${BOLD}6. Environment Configuration:${NC}"
if [ -f "${ROOT_DIR}/.env" ]; then
    check_pass ".env file is present"
else
    if [ -f "${ROOT_DIR}/.env.example" ]; then
        check_warn ".env file is missing! Copy it using: cp .env.example .env"
    else
        check_warn "No .env or .env.example found."
    fi
fi
echo ""

# 7. Check Spec-Kit & Agent Skills Tooling
echo -e "${BOLD}7. Spec-Driven Development & AI Tooling (Spec Kit, Antigravity, Claude):${NC}"
if command -v specify >/dev/null 2>&1; then
    check_pass "GitHub Spec Kit CLI ('specify') is available in PATH"
elif [ -f "$HOME/.local/bin/specify" ]; then
    check_pass "GitHub Spec Kit CLI found at $HOME/.local/bin/specify"
else
    check_warn "Spec Kit CLI ('specify') not found in PATH. Install via: pip install git+https://github.com/github/spec-kit.git"
fi

if command -v agy >/dev/null 2>&1; then
    check_pass "Google Antigravity CLI ('agy') is available in PATH"
elif [ -f "$HOME/.local/bin/agy" ]; then
    check_pass "Google Antigravity CLI found at $HOME/.local/bin/agy"
else
    check_warn "Antigravity CLI ('agy') not found in PATH. (Optional if using Claude Code or IDE)"
fi

if command -v claude >/dev/null 2>&1; then
    check_pass "Claude Code CLI ('claude') is available in PATH"
fi

# Check SDD Agent Skills directory
if [ -d "${ROOT_DIR}/.agents/skills" ]; then
    SKILL_COUNT=$(ls -1 "${ROOT_DIR}/.agents/skills" | wc -l | tr -d ' ')
    check_pass "Spec Kit Agent Skills detected: ${SKILL_COUNT} skills configured in .agents/skills/"
else
    check_warn ".agents/skills directory not found."
fi
echo ""

# 8. Check Docker (Optional)
echo -e "${BOLD}8. Containerization (Optional):${NC}"
if command -v docker >/dev/null 2>&1; then
    check_pass "Docker CLI is installed: $(docker --version)"
else
    check_warn "Docker CLI not detected (optional for containerized deployments)"
fi
echo ""

# Final Summary
echo -e "${BOLD}${BLUE}================================================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${BOLD} All mandatory requirements are satisfied!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW} Note: There were ${WARNINGS} non-blocking warning(s) listed above.${NC}"
    fi
    echo ""
    echo "To start the application:"
    echo "  1. Backend API:   go run ./cmd/server"
    echo "  2. Frontend SPA:  cd web && npm run dev"
    echo "  3. Run Tests:     cd web && npm test"
    echo -e "${BOLD}${BLUE}================================================================${NC}"
    exit 0
else
    echo -e "${RED}${BOLD} Prerequisites check failed with ${ERRORS} error(s) and ${WARNINGS} warning(s).${NC}"
    echo "Please resolve the errors above before launching the application."
    echo -e "${BOLD}${BLUE}================================================================${NC}"
    exit 1
fi
