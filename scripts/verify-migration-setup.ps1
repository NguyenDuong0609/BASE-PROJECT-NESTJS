# Migration Setup Verification Script (PowerShell)
# This script verifies that the TypeORM migration infrastructure is properly configured

Write-Host "🔍 Verifying TypeORM Migration Infrastructure Setup..." -ForegroundColor Cyan
Write-Host ""

$checksPassed = 0
$checksTotal = 0

# Function to check file existence
function Test-FileExists {
    param([string]$Path)
    $script:checksTotal++
    if (Test-Path $Path -PathType Leaf) {
        Write-Host "✓ File exists: $Path" -ForegroundColor Green
        $script:checksPassed++
        return $true
    }
    else {
        Write-Host "✗ File missing: $Path" -ForegroundColor Red
        return $false
    }
}

# Function to check directory existence
function Test-DirectoryExists {
    param([string]$Path)
    $script:checksTotal++
    if (Test-Path $Path -PathType Container) {
        Write-Host "✓ Directory exists: $Path" -ForegroundColor Green
        $script:checksPassed++
        return $true
    }
    else {
        Write-Host "✗ Directory missing: $Path" -ForegroundColor Red
        return $false
    }
}

# Function to check package.json script
function Test-NpmScript {
    param([string]$ScriptName)
    $script:checksTotal++
    $packageJson = Get-Content "package.json" -Raw
    if ($packageJson -match "`"$ScriptName`":") {
        Write-Host "✓ npm script exists: $ScriptName" -ForegroundColor Green
        $script:checksPassed++
        return $true
    } else {
        Write-Host "✗ npm script missing: $ScriptName" -ForegroundColor Red
        return $false
    }
}

Write-Host "📁 Checking directory structure..." -ForegroundColor Yellow
Test-DirectoryExists "src\database"
Test-DirectoryExists "src\database\migrations"
Test-DirectoryExists "docs"
Write-Host ""

Write-Host "📄 Checking configuration files..." -ForegroundColor Yellow
Test-FileExists "src\database\data-source.ts"
Test-FileExists ".env.example"
Test-FileExists "package.json"
Write-Host ""

Write-Host "📝 Checking migration files..." -ForegroundColor Yellow
Test-FileExists "src\database\migrations\1700000000000-InitialSchema.ts"
Test-FileExists "src\database\migrations\README.md"
Test-FileExists "src\database\migrations\TEMPLATE.ts.example"
Test-FileExists "src\database\migrations\IMPLEMENTATION_SUMMARY.md"
Write-Host ""

Write-Host "📚 Checking documentation..." -ForegroundColor Yellow
Test-FileExists "docs\DATABASE_SETUP.md"
Test-FileExists "MIGRATION_QUICK_START.md"
Write-Host ""

Write-Host "🔧 Checking npm scripts in package.json..." -ForegroundColor Yellow
Test-NpmScript "migration:generate"
Test-NpmScript "migration:run"
Test-NpmScript "migration:revert"
Test-NpmScript "migration:show"
Write-Host ""

Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw

$checksTotal++
if ($packageJson -match "`"typeorm`":") {
    Write-Host "✓ TypeORM installed" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host "✗ TypeORM not found in package.json" -ForegroundColor Red
}

$checksTotal++
if ($packageJson -match "`"@nestjs/typeorm`":") {
    Write-Host "✓ @nestjs/typeorm installed" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host "✗ @nestjs/typeorm not found in package.json" -ForegroundColor Red
}

$checksTotal++
if ($packageJson -match "`"pg`":") {
    Write-Host "✓ PostgreSQL driver (pg) installed" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host "✗ PostgreSQL driver not found in package.json" -ForegroundColor Red
}
Write-Host ""

Write-Host "🔍 Checking data-source.ts configuration..." -ForegroundColor Yellow
$dataSource = Get-Content "src\database\data-source.ts" -Raw

$checksTotal++
if ($dataSource -match "migrations:.*migrations.*\.ts") {
    Write-Host "✓ Migrations path configured" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host "✗ Migrations path not configured" -ForegroundColor Red
}

$checksTotal++
if ($dataSource -match "migrationsTableName") {
    Write-Host "✓ Migrations table name configured" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host "✗ Migrations table name not configured" -ForegroundColor Red
}

$checksTotal++
if ($dataSource -match "entities:.*entity") {
    Write-Host "✓ Entities path configured" -ForegroundColor Green
    $checksPassed++
} else {
    Write-Host "✗ Entities path not configured" -ForegroundColor Red
}
Write-Host ""

Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "Checks passed: $checksPassed / $checksTotal"
Write-Host ""

if ($checksPassed -eq $checksTotal) {
    Write-Host "✅ All checks passed! Migration infrastructure is properly configured." -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Ensure database is running: npm run docker:dev"
    Write-Host "   2. Run migrations: npm run migration:run"
    Write-Host "   3. Check migration status: npm run migration:show"
    Write-Host ""
    Write-Host "📖 Documentation:" -ForegroundColor Cyan
    Write-Host "   - Quick start: MIGRATION_QUICK_START.md"
    Write-Host "   - Detailed guide: docs\DATABASE_SETUP.md"
    Write-Host "   - Migration guide: src\database\migrations\README.md"
    exit 0
} else {
    Write-Host "❌ Some checks failed. Please review the output above." -ForegroundColor Red
    exit 1
}
