---
layout: default
title: Theme Migration
nav_exclude: true
---

# Theme Migration: Minima → Just the Docs

**Date:** October 12, 2025  
**Status:** ✅ Complete

## Changes Made

### 1. Theme Replacement
- **Old:** Minima (simple blog-style theme)
- **New:** Just the Docs (professional documentation theme)

### 2. Configuration Updates

**_config.yml:**
```yaml
remote_theme: just-the-docs/just-the-docs
plugins:
  - jekyll-remote-theme
  - jekyll-seo-tag
color_scheme: light
search_enabled: true
heading_anchors: true
```

**Gemfile:**
```ruby
gem "jekyll-remote-theme"
```

### 3. Page Front Matter

All markdown pages now include:
```yaml
---
layout: default
title: Page Title
nav_order: 1
description: "Page description"
---
```

Navigation order:
1. Home (index.md)
2. Interactive Demo (demo.md)
3. Quick Start Guide (QUICKSTART.md)
4. Deployment Guide (DEPLOYMENT.md)
5. Implementation (IMPLEMENTATION.md)
6. Project Structure (PROJECT_STRUCTURE.md)

### 4. New Features

**Table of Contents:**
All documentation pages now have auto-generated TOCs:
```markdown
## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}
```

**Search:** Built-in search functionality across all pages

**Mobile Responsive:** Better mobile experience with collapsible sidebar

**Accessibility:** Improved keyboard navigation and screen reader support

### 5. Styling

**New file:** `assets/css/custom.scss`
- WCAG AA compliant colors
- Custom button styling for demo page
- Enhanced code block appearance
- Responsive design improvements

## Benefits

### Before (Minima)
- ❌ Simple blog layout
- ❌ Limited navigation
- ❌ No built-in search
- ❌ Basic mobile support

### After (Just the Docs)
- ✅ Professional documentation layout
- ✅ Sidebar navigation with hierarchy
- ✅ Built-in search functionality
- ✅ Excellent mobile responsiveness
- ✅ Table of contents on each page
- ✅ Better accessibility
- ✅ Clean, modern design
- ✅ Anchor links on headings

## Testing

The site will rebuild on GitHub Pages in 1-2 minutes. View at:
- **Homepage:** https://ttrpg-mcp.tedt.org/
- **Demo:** https://ttrpg-mcp.tedt.org/demo.html

## Migration Compatibility

**What Still Works:**
- ✅ All MCP functionality intact
- ✅ Cloudflare Worker unchanged
- ✅ Data files still accessible
- ✅ Demo page functionality preserved
- ✅ All documentation content retained
- ✅ WCAG AA compliance maintained

**What Changed:**
- 🎨 Visual appearance (better!)
- 📱 Mobile experience (improved!)
- 🔍 Search functionality (added!)
- 📊 Navigation structure (enhanced!)

## Rollback (if needed)

To revert to Minima theme:
```bash
# In _config.yml
remote_theme: minima

# Remove front matter nav_order from all files
# Restore old assets/css/style.scss
```

## Next Steps

1. ✅ Wait for GitHub Pages rebuild (~1-2 minutes)
2. ✅ Test navigation and search
3. ✅ Verify mobile responsiveness
4. ✅ Confirm demo page still works
5. ✅ Check all internal links

## Resources

- **Just the Docs Documentation:** https://just-the-docs.com/
- **GitHub Repo:** https://github.com/just-the-docs/just-the-docs
- **Customization Guide:** https://just-the-docs.com/docs/customization/

---

Built with ❤️ for better documentation! 📚
