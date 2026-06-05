# GitHub Setup Guide

This guide will help you upload the FactoryLens project to a new GitHub repository.

## Steps to Upload to Your New Repository

### 1. Create a New GitHub Repository

1. Go to GitHub: https://github.com/new
2. Enter a repository name (e.g., `factorylens`)
3. Choose visibility (Public or Private - recommended: Private for internal use)
4. **Do NOT** initialize the repository with README, .gitignore, or license
5. Click "Create repository"

### 2. Update Git Remote

Currently, the Git remote is pointing to the original template repository. You need to change it to your new repository.

Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` with your actual values:

```bash

# Remove the old remote
git remote remove origin

# Add your new remote (SSH - recommended)
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# OR use HTTPS if you prefer
# git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
```

### 3. Verify Remote Configuration

```bash
git remote -v
```

You should see your new repository URL listed.

### 4. Review and Commit Changes

Review the changes made to disconnect from the template:

```bash
# Check status
git status

# Add all changes
git add .

# Commit the changes
git commit -m "Prepare FactoryLens for new repository - remove template references"
```

### 5. Push to Your New Repository

```bash
# Push to the main branch
git push -u origin master

# Or if your default branch is 'main'
# git branch -M main
# git push -u origin main
```

## What Was Cleaned Up

The following template-related files and references were removed:

### Deleted Files
- ✅ `release-notes.md` - Template release history
- ✅ `copier.yml` - Copier template configuration
- ✅ `.copier/` directory - Copier answers and scripts
- ✅ `hooks/` directory - Copier post-generation hooks
- ✅ `.github/FUNDING.yml` - Template author funding info
- ✅ `.github/ISSUE_TEMPLATE/config.yml` - Template issue configuration
- ✅ `.github/ISSUE_TEMPLATE/privileged.yml` - Template-specific issue template
- ✅ `.github/DISCUSSION_TEMPLATE/` - Template discussion templates
- ✅ `.github/labeler.yml` - Template labeler configuration

### Deleted Workflows
- ✅ `.github/workflows/latest-changes.yml` - Template changelog automation
- ✅ `.github/workflows/issue-manager.yml` - Template issue management
- ✅ `.github/workflows/add-to-project.yml` - Template project automation
- ✅ `.github/workflows/detect-conflicts.yml` - Template conflict detection
- ✅ `.github/workflows/labeler.yml` - Template auto-labeling

### Updated Files
- ✅ `README.md` - Completely rewritten for FactoryLens
- ✅ `backend/app/core/db.py` - Removed template repository link
- ✅ `SECURITY.md` - Updated to be organization-specific
- ✅ `deployment.md` - Removed template-specific references

### Remaining Workflows (Useful for FactoryLens)
- ✅ `deploy-production.yml` - Production deployment workflow
- ✅ `deploy-staging.yml` - Staging deployment workflow
- ✅ `playwright.yml` - Frontend E2E tests
- ✅ `pre-commit.yml` - Code quality checks
- ✅ `smokeshow.yml` - Code coverage reports
- ✅ `test-backend.yml` - Backend tests
- ✅ `test-docker-compose.yml` - Integration tests

## Next Steps

After pushing to GitHub:

1. **Configure GitHub Secrets** (for CI/CD):
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `SECRET_KEY`
     - `FIRST_SUPERUSER_PASSWORD`
     - `POSTGRES_PASSWORD`
     - `SMOKESHOW_AUTH_KEY` (optional - for code coverage)

2. **Update Deployment Workflows** (if using):
   - Edit `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-staging.yml`
   - Update the `runs-on` labels to match your self-hosted runners
   - Or configure GitHub-hosted runners if not using self-hosted

3. **Configure Branch Protection** (recommended):
   - Go to Settings → Branches → Add rule
   - Protect your main branch (master/main)
   - Require pull request reviews
   - Require status checks to pass

4. **Add Collaborators**:
   - Go to Settings → Collaborators
   - Invite team members who need access

## Troubleshooting

### Permission Denied (SSH)

If you get a permission denied error with SSH, you may need to add your SSH key to GitHub:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy the public key
cat ~/.ssh/id_ed25519.pub
```

Then add the key to GitHub: Settings → SSH and GPG keys → New SSH key

### Using HTTPS Instead

If you prefer HTTPS over SSH, use:

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
```

You may be prompted for your GitHub username and password (or personal access token).

---

**Your FactoryLens project is now ready to be pushed to your new GitHub repository! 🚀**
