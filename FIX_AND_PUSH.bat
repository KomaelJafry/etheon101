@echo off
echo 🔧 Fixing package.json and pushing to GitHub...
cd /d "C:\Users\Komael Jafry\Desktop\Komael\Etheon\etheon"

echo 📍 Working directory: %cd%

REM Remove git lock file if it exists
if exist ".git\index.lock" (
    echo 🔐 Removing git lock file...
    del ".git\index.lock"
    echo ✅ Lock file removed
)

REM Stage the files
echo 📦 Staging package.json and package-lock.json...
git add package.json package-lock.json
if errorlevel 1 (
    echo ❌ Failed to stage files
    exit /b 1
)
echo ✅ Files staged

REM Show what will be committed
echo 📋 Files to commit:
git diff --cached --name-only

REM Commit the changes
echo 💾 Committing changes...
git commit -m "Fix: Add missing @supabase/auth-helpers-nextjs dependency

The application code was importing createClientComponentClient from
@supabase/auth-helpers-nextjs, but this package was missing from
package.json. This caused Vercel build to fail with module-not-found errors.

Changes:
- Added @supabase/auth-helpers-nextjs@^0.8.7 to dependencies
- Updated @testing-library/react to ^15.0.0 for React 19 compatibility
- Used --legacy-peer-deps for npm install due to testing-library constraints

Vercel build should now succeed on next deployment.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

if errorlevel 1 (
    echo ❌ Failed to commit
    exit /b 1
)
echo ✅ Changes committed

REM Push to GitHub
echo 🚀 Pushing to GitHub (batch-3-implementation)...
git push origin batch-3-implementation
if errorlevel 1 (
    echo ❌ Failed to push
    exit /b 1
)
echo ✅ Pushed to GitHub

REM Show git status
echo 📊 Current git status:
git status

echo.
echo ✨ All done!
echo.
echo Next steps:
echo 1. Check GitHub for the new commit
echo 2. Visit Vercel dashboard and redeploy batch-3-implementation branch
echo 3. Monitor the build progress
echo.
pause
