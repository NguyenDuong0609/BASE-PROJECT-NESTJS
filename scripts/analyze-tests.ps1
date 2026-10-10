# ══════════════════════════════════════════════════════════════
#              Test Analysis & Fix Script
# ══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          TEST INFRASTRUCTURE ANALYSIS                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Count test files
$allTests = Get-ChildItem -Path "src" -Filter "*.spec.ts" -Recurse
$e2eTests = Get-ChildItem -Path "test" -Filter "*.e2e-spec.ts" -Recurse -ErrorAction SilentlyContinue

Write-Host "📊 Test File Statistics:" -ForegroundColor Yellow
Write-Host "  Unit/Integration tests: $($allTests.Count)" -ForegroundColor White
Write-Host "  E2E tests: $($e2eTests.Count)" -ForegroundColor White
Write-Host "  Total: $($allTests.Count + $e2eTests.Count)" -ForegroundColor Cyan
Write-Host ""

# Analyze by module
Write-Host "📁 Tests by Module:" -ForegroundColor Yellow
$byModule = $allTests | Group-Object { 
    if ($_.DirectoryName -match '\\modules\\([^\\]+)') { 
        $Matches[1] 
    } elseif ($_.DirectoryName -match '\\(repositories|interceptors|middlewares)\\') {
        $Matches[1]
    } else { 
        'Core' 
    }
} | Sort-Object Count -Descending

foreach ($group in $byModule) {
    $icon = if ($group.Count -ge 3) { "✅" } elseif ($group.Count -ge 1) { "⚠️" } else { "❌" }
    Write-Host "  $icon $($group.Name): $($group.Count) test files" -ForegroundColor White
}

Write-Host ""
Write-Host "🔍 Checking for common issues..." -ForegroundColor Yellow

# Check if all test files have imports from @test-utils
$missingImports = @()
foreach ($test in $allTests | Select-Object -First 20) {
    $content = Get-Content $test.FullName -Raw
    if ($content -notmatch '@test-utils') {
        $missingImports += $test.Name
    }
}

if ($missingImports.Count -gt 0) {
    Write-Host "  ⚠️  $($missingImports.Count) test files don't import @test-utils" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ All checked tests import @test-utils" -ForegroundColor Green
}

# Check for implementation files
Write-Host ""
Write-Host "📦 Implementation Status:" -ForegroundColor Yellow

$implementations = @{
    'AuthService' = 'src\modules\auth\auth.service.ts'
    'UsersService' = 'src\modules\users\users.service.ts'
    'CheckinService' = 'src\modules\checkin\checkin.service.ts'
    'CommentsService' = 'src\modules\comments\comments.service.ts'
    'MediaService' = 'src\modules\media\media.service.ts'
    'QueueService' = 'src\modules\queue\queue.service.ts'
}

$implCount = 0
foreach ($impl in $implementations.GetEnumerator()) {
    if (Test-Path $impl.Value) {
        Write-Host "  ✓ $($impl.Key)" -ForegroundColor Green
        $implCount++
    } else {
        Write-Host "  ✗ $($impl.Key) (MISSING)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary: $implCount/$($implementations.Count) services implemented" -ForegroundColor Cyan

# Generate recommendations
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║             RECOMMENDATIONS                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if ($implCount -eq $implementations.Count) {
    Write-Host "✅ All services implemented - tests can run!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. npm run test" -ForegroundColor White
    Write-Host "  2. npm run test:cov" -ForegroundColor White
    Write-Host "  3. Fix failing tests" -ForegroundColor White
} else {
    Write-Host "⚠️  Some services not implemented yet" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Tests for implemented services can run now." -ForegroundColor White
    Write-Host "Tests for missing services will be skipped." -ForegroundColor White
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Analysis complete - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
