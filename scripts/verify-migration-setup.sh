#!/bin/bash

# Migration Setup Verification Script
# This script verifies that the TypeORM migration infrastructure is properly configured

echo "🔍 Verifying TypeORM Migration Infrastructure Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
checks_passed=0
checks_total=0

# Function to check file existence
check_file() {
    checks_total=$((checks_total + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        return 1
    fi
}

# Function to check directory existence
check_directory() {
    checks_total=$((checks_total + 1))
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        return 1
    fi
}

# Function to check package.json script
check_script() {
    checks_total=$((checks_total + 1))
    if grep -q "\"$1\":" package.json; then
        echo -e "${GREEN}✓${NC} npm script exists: $1"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "${RED}✗${NC} npm script missing: $1"
        return 1
    fi
}

echo "📁 Checking directory structure..."
check_directory "src/database"
check_directory "src/database/migrations"
check_directory "docs"
echo ""

echo "📄 Checking configuration files..."
check_file "src/database/data-source.ts"
check_file ".env.example"
check_file "package.json"
echo ""

echo "📝 Checking migration files..."
check_file "src/database/migrations/1700000000000-InitialSchema.ts"
check_file "src/database/migrations/README.md"
check_file "src/database/migrations/TEMPLATE.ts.example"
check_file "src/database/migrations/IMPLEMENTATION_SUMMARY.md"
echo ""

echo "📚 Checking documentation..."
check_file "docs/DATABASE_SETUP.md"
check_file "MIGRATION_QUICK_START.md"
echo ""

echo "🔧 Checking npm scripts in package.json..."
check_script "migration:generate"
check_script "migration:run"
check_script "migration:revert"
check_script "migration:show"
echo ""

echo "📦 Checking dependencies..."
checks_total=$((checks_total + 1))
if grep -q "\"typeorm\":" package.json; then
    echo -e "${GREEN}✓${NC} TypeORM installed"
    checks_passed=$((checks_passed + 1))
else
    echo -e "${RED}✗${NC} TypeORM not found in package.json"
fi

checks_total=$((checks_total + 1))
if grep -q "\"@nestjs/typeorm\":" package.json; then
    echo -e "${GREEN}✓${NC} @nestjs/typeorm installed"
    checks_passed=$((checks_passed + 1))
else
    echo -e "${RED}✗${NC} @nestjs/typeorm not found in package.json"
fi

checks_total=$((checks_total + 1))
if grep -q "\"pg\":" package.json; then
    echo -e "${GREEN}✓${NC} PostgreSQL driver (pg) installed"
    checks_passed=$((checks_passed + 1))
else
    echo -e "${RED}✗${NC} PostgreSQL driver not found in package.json"
fi
echo ""

echo "🔍 Checking data-source.ts configuration..."
checks_total=$((checks_total + 1))
if grep -q "migrations:.*migrations.*\\.ts" src/database/data-source.ts; then
    echo -e "${GREEN}✓${NC} Migrations path configured"
    checks_passed=$((checks_passed + 1))
else
    echo -e "${RED}✗${NC} Migrations path not configured"
fi

checks_total=$((checks_total + 1))
if grep -q "migrationsTableName" src/database/data-source.ts; then
    echo -e "${GREEN}✓${NC} Migrations table name configured"
    checks_passed=$((checks_passed + 1))
else
    echo -e "${RED}✗${NC} Migrations table name not configured"
fi

checks_total=$((checks_total + 1))
if grep -q "entities:.*entity" src/database/data-source.ts; then
    echo -e "${GREEN}✓${NC} Entities path configured"
    checks_passed=$((checks_passed + 1))
else
    echo -e "${RED}✗${NC} Entities path not configured"
fi
echo ""

echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checks passed: $checks_passed / $checks_total"

if [ $checks_passed -eq $checks_total ]; then
    echo -e "${GREEN}✅ All checks passed! Migration infrastructure is properly configured.${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Ensure database is running: npm run docker:dev"
    echo "   2. Run migrations: npm run migration:run"
    echo "   3. Check migration status: npm run migration:show"
    echo ""
    echo "📖 Documentation:"
    echo "   - Quick start: MIGRATION_QUICK_START.md"
    echo "   - Detailed guide: docs/DATABASE_SETUP.md"
    echo "   - Migration guide: src/database/migrations/README.md"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
    exit 1
fi
