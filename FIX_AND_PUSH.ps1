# PowerShell script to fix git lock and commit package.json changes
# Run this from PowerShell in the etheon directory

Write-Host "🔧 Fixing package.json and pushing to GitHub..." -ForegroundColor Green

# Navigate to etheon directory
$EtheonDir = "C:\Users\Komael Jafry\Desktop\Komael\Etheon\etheon"
Set-Location $EtheonDir

Write-Host "📍 Working directory: $(Get-Location)" -ForegroundColor Cyan

# Remove git lock file if it exists
$LockFile = ".git\index.lock"
if (Test-Path $LockFile) {
    Write-Host "🔐 Removing git lock file..." -ForegroundColor Yellow
    Remove-Item $LockFile -Force
    Write-Host "✅ Lock file removed" -ForegroundColor Green
}

# Stage the package.json and package-lock.json
Write-Host "📦 Staging package.json and package-lock.json..." -ForegroundColor Yellow
git add package.json package-lock.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stage files" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files staged" -ForegroundColor Green

# Show what will be committed
Write-Host "📋 Files to commit:" -ForegroundColor Cyan
git diff --cached --name-only

# Commit the changes
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
$CommitMessage = @"
Fix: Add missing @supabase/auth-helpers-nextjs dependency

The application code was importing createClientComponentClient from
@supabase/auth-helpers-nextjs, but this package was missing from
package.json. This caused Vercel build to fail with module-not-found errors.

Changes:
- Added @supabase/auth-helpers-nextjs@^0.8.7 to dependencies
- Updated @testing-library/react to ^15.0.0 for React 19 compatibility
- Used --legacy-peer-deps for npm install due to testing-library constraints

Vercel build should now succeed on next deployment.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
"@

git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to commit" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Changes committed" -ForegroundColor Green

# Push to GitHub
Write-Host "🚀 Pushing to GitHub (batch-3-implementation)..." -ForegroundColor Yellow
git push origin batch-3-implementation
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Pushed to GitHub" -ForegroundColor Green

# Show git status
Write-Host "📊 Current git status:" -ForegroundColor Cyan
git status

Write-Host "`n✨ All done! Next steps:" -ForegroundColor Green
Write-Host "1. Check GitHub for the new commit" -ForegroundColor Cyan
Write-Host "2. Visit Vercel dashboard and redeploy batch-3-implementation branch" -ForegroundColor Cyan
Write-Host "3. Monitor the build progress" -ForegroundColor Cyan
