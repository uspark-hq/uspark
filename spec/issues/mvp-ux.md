# UI/UX Issues and Implementation Plan

## Executive Summary

**Overall Assessment: 5.5/10**

**Total Issues Found: 35**
- Critical: 2
- High: 8
- Medium: 18
- Low: 7

### Key Findings

1. **CRITICAL: Severe Design System Inconsistency** - Settings pages use inline styles instead of Tailwind/shadcn/ui, violating the project's design system entirely
2. **CRITICAL: Navigation Component Violates Design System** - Global navigation uses inline styles instead of Tailwind classes
3. **HIGH: Accessibility Violations** - Multiple missing semantic elements, inconsistent heading hierarchy, and focus management issues
4. **HIGH: Missing Error Boundaries** - No error handling UI at page level for unexpected failures
5. **MEDIUM: Inconsistent Component Patterns** - Mix of native browser dialogs (confirm/alert) with shadcn/ui dialogs

### Strengths

- Projects page is well-implemented with good UX patterns
- Excellent use of shadcn/ui components where applied
- Good loading states and skeleton implementations
- Error handling is present (though could be improved)
- Clear visual hierarchy and layout

### Critical Weaknesses

- Settings pages completely abandon the design system (CRITICAL)
- Navigation component violates design system (CRITICAL)
- Multiple accessibility violations (HIGH)
- Inconsistent component patterns across the application (HIGH)
- Lack of proper theme support in some areas (MEDIUM)

### Systemic Issues

The application shows a clear split in code quality:
- **Modern, well-architected**: Projects page, repo selector, UI components
- **Legacy, inline-styled**: All settings pages, navigation component

This suggests settings were built separately or earlier and never refactored to match the current design system.

---

## Implementation Plan

### Phase 1: Critical Design System Violations

#### 1.1 Fix Navigation Component
**File:** `turbo/apps/web/app/components/navigation.tsx:10-40`

**Current Issues:**
- Uses inline styles instead of Tailwind utilities
- Hardcoded colors that don't respect theme tokens
- Missing user profile/sign out functionality
- No logo or home link
- No responsive mobile menu

**Implementation:**
- Replace all inline styles with Tailwind utilities
- Add UserButton from Clerk for sign out
- Add logo/home link
- Implement responsive mobile menu with hamburger
- Use design system color tokens (primary, muted-foreground, etc.)

**Recommended Code:**
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { Button } from "@uspark/ui";
import { cn } from "@uspark/ui/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/projects", label: "Projects" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold font-mono">
          <span className="text-primary">u</span>
          <span>Spark</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href || pathname.startsWith(link.href)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 md:w-9 md:h-9"
              }
            }}
          />

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="flex flex-col space-y-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === link.href || pathname.startsWith(link.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
```

---

#### 1.2 Fix Project Card Delete Button Accessibility
**File:** `turbo/apps/web/app/projects/page.tsx:293-303`

**Current Issues:**
- Delete button uses `opacity-0 group-hover:opacity-100`, making it invisible until hover
- Fails on touch devices (no hover state)
- Fails on keyboard navigation (button invisible)
- Screen readers don't know what will be deleted
- Violates WCAG 2.1 SC 2.1.1 (Keyboard)

**Implementation:**
- Always show button on mobile devices
- Add keyboard focus state
- Add proper ARIA label

**Recommended Code:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 sm:opacity-100"
  onClick={(e) => {
    e.stopPropagation();
    setProjectToDelete(project);
  }}
  aria-label={`Delete ${project.name}`}
>
  <Trash2 className="h-4 w-4 text-destructive" />
</Button>
```

---

#### 1.3 Replace Native confirm() Dialogs with AlertDialog

**Files:**
- `turbo/apps/web/app/settings/github/github-connection.tsx:49`
- `turbo/apps/web/app/settings/shares/page.tsx:42`
- `turbo/apps/web/app/settings/claude-token/page.tsx:82`

**Current Issues:**
- Native `confirm()` dialogs block the entire browser
- Cannot be styled or customized
- Look different across browsers and OSes
- Interrupt screen readers
- Inconsistent with the shadcn/ui AlertDialog used in projects page

**Implementation:**
Replace all instances of `confirm()` with shadcn/ui AlertDialog component.

**Example for GitHub Disconnect:**
```tsx
const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
const [disconnecting, setDisconnecting] = useState(false);

const handleDisconnect = async () => {
  setDisconnecting(true);
  try {
    const response = await fetch("/api/github/disconnect", {
      method: "POST",
    });

    if (response.ok) {
      setInstallation(null);
      router.refresh();
    } else {
      setError("Failed to disconnect GitHub account");
    }
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Network error"
    );
  } finally {
    setDisconnecting(false);
    setShowDisconnectDialog(false);
  }
};

// In render:
<>
  <Button onClick={() => setShowDisconnectDialog(true)} variant="destructive">
    Disconnect
  </Button>

  <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Disconnect GitHub Account</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to disconnect your GitHub account?
          You will lose access to repository synchronization features.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="bg-destructive hover:bg-destructive/90"
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</>
```

Apply similar pattern to shares page and claude token page.

---

### Phase 2: Accessibility Fixes

#### 2.1 Fix Homepage Semantic HTML
**Files:** `turbo/apps/web/app/page.tsx`, `turbo/apps/web/app/components/TerminalHome.tsx`

**Current Issues:**
- Uses `<div>` for main content instead of semantic `<main>` landmark
- Header logo uses `<div>` instead of `<h1>`
- No skip link for keyboard navigation
- Terminal interface lacks ARIA labels
- Uses CSS modules instead of Tailwind (inconsistent)

**Implementation:**

**For page.tsx:**
```tsx
export default function Home() {
  return (
    <>
      <a
        href="#terminal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to terminal
      </a>
      <div className="min-h-screen w-full overflow-hidden bg-[#0a0a0a] pt-[60px] md:pt-[50px]">
        <header className="fixed top-0 left-0 right-0 bg-[rgba(10,10,10,0.95)] backdrop-blur-[20px] border-b border-[rgba(0,255,0,0.2)] z-100 transition-all duration-300">
          <div className="max-w-[1200px] mx-auto px-8 md:px-4 h-[60px] md:h-[50px] flex items-center justify-between">
            <h1 className="text-2xl md:text-lg font-black flex gap-[0.1em] font-mono">
              <span className="text-[#00ff00]">u</span>
              <span className="text-white">Spark</span>
            </h1>
          </div>
        </header>

        <main id="terminal-main">
          <TerminalHome />
        </main>
      </div>
    </>
  );
}
```

**For TerminalHome.tsx:**
Add ARIA labels to terminal:
```tsx
<div
  className={styles.terminalContainer}
  role="region"
  aria-label="Interactive terminal - Type commands to navigate uSpark"
>
  <Terminal
    // ... existing props
  />
</div>
```

---

#### 2.2 Fix Heading Hierarchy
**File:** `turbo/apps/web/app/projects/page.tsx`

**Current Issues:**
- Empty state uses `<h3>` without `<h2>` level (skips hierarchy)
- Project cards use `<div>` in CardTitle instead of semantic headings
- Violates WCAG 2.1 SC 1.3.1 (Info and Relationships)

**Implementation:**

**In empty state (line 323):**
```tsx
<h2 className="mb-2 text-2xl font-semibold">No projects yet</h2>
```

**For project cards:**
Override CardTitle to use h2 or use custom heading:
```tsx
<h2 className="text-xl font-semibold leading-none tracking-tight">
  {project.name}
</h2>
```

---

### Phase 3: Settings Pages Refactor

**CRITICAL PRIORITY:** All settings pages completely abandon the design system and use inline styles exclusively. This creates massive technical debt and maintenance burden.

#### 3.1 Refactor Settings Landing Page
**File:** `turbo/apps/web/app/settings/page.tsx:8-44`

**Current State:**
Uses extensive inline styles with hardcoded colors (`#666`, `#e1e4e8`, etc.)

**Refactored Version:**
```tsx
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@uspark/ui";
import { Navigation } from "../components/navigation";

export default function SettingsPage() {
  const settingsLinks = [
    {
      href: "/settings/github",
      title: "GitHub Integration",
      description: "Connect your GitHub account to sync projects with repositories",
    },
    {
      href: "/settings/shares",
      title: "Shared Links",
      description: "Manage shared project links and permissions",
    },
    {
      href: "/settings/claude-token",
      title: "Claude OAuth Token",
      description: "Configure your Claude OAuth token for E2B execution",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-4">
          {settingsLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="transition-all hover:shadow-md cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-xl">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

#### 3.2 Refactor GitHub Settings Page
**File:** `turbo/apps/web/app/settings/github/page.tsx`

**Current Issues:**
- Extensive inline styles throughout
- Hardcoded colors that ignore theme tokens
- No dark mode support

**Key Changes Needed:**
- Replace all inline styles with Tailwind utilities
- Use shadcn/ui Card components
- Use design system spacing (space-y-4, gap-6, etc.)
- Use semantic colors (muted-foreground, border, etc.)

---

#### 3.3 Refactor GitHub Connection Component
**File:** `turbo/apps/web/app/settings/github/github-connection.tsx:79-296`

**Current Issues:**
- 200+ lines of inline styles
- Hardcoded colors throughout
- Native confirm() dialog (addressed in Phase 1.3)
- Missing loading state for disconnect action
- console.error calls violate project guidelines

**Key Changes Needed:**
- Convert all inline styles to Tailwind
- Add loading state for disconnect (see Phase 1.3)
- Remove console.error calls (let errors propagate)
- Use shadcn/ui Badge, Button, Card components

---

#### 3.4 Refactor Shares Settings Page
**File:** `turbo/apps/web/app/settings/shares/page.tsx:84-302`

**Current Issues:**
- Extensive inline styles throughout
- Native confirm() dialog
- Missing Navigation component
- No success feedback for copy action
- console.error calls

**Key Changes Needed:**
- Add Navigation component at top
- Replace inline styles with Tailwind
- Add toast notifications for copy actions:
```tsx
import { useToast } from "@uspark/ui";

const { toast } = useToast();

const handleCopyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
  } catch (error) {
    toast({
      title: "Copy failed",
      description: "Could not copy link to clipboard",
      variant: "destructive",
    });
  }
};
```
- Replace native confirm() with AlertDialog (Phase 1.3)

---

#### 3.5 Refactor Claude Token Settings Page
**File:** `turbo/apps/web/app/settings/claude-token/page.tsx:127-346`

**Current Issues:**
- Extensive inline styles throughout
- Native confirm() dialog
- No real-time validation feedback
- console.error calls

**Key Changes Needed:**
- Replace inline styles with Tailwind
- Add real-time validation:
```tsx
const [tokenError, setTokenError] = useState<string | null>(null);

const validateToken = (token: string) => {
  if (!token) return "Token is required";
  if (token.length < 30) return "Token must be at least 30 characters";
  if (!token.startsWith("sk-ant-")) return "Invalid token format";
  return null;
};

// In onChange:
onChange={(e) => {
  const value = e.target.value;
  setNewToken(value);
  if (value) {
    setTokenError(validateToken(value));
  } else {
    setTokenError(null);
  }
}}

// After input:
{tokenError && (
  <p className="text-sm text-destructive mt-1">{tokenError}</p>
)}
```

---

### Phase 4: UX Improvements

#### 4.1 Add Error Retry Mechanisms
**File:** `turbo/apps/web/app/projects/page.tsx:261-266`

**Current Issue:**
Error message shows but no way to retry loading projects without refreshing the page.

**Implementation:**
```tsx
const loadProjects = useCallback(async () => {
  setLoading(true);
  setError(undefined);
  try {
    const response = await fetch("/api/projects");
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    const data: ListProjectsResponse = await response.json();
    setProjects(data.projects || []);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to load projects",
    );
  } finally {
    setLoading(false);
  }
}, []);

// In error UI:
{error && (
  <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-destructive">Error Loading Projects</p>
        <p className="text-sm text-destructive/80 mt-1">{error}</p>
      </div>
      <Button onClick={loadProjects} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  </div>
)}
```

---

#### 4.2 Add Loading State for Project Navigation
**File:** `turbo/apps/web/app/projects/page.tsx:57-62`

**Current Issue:**
Subdomain navigation uses `window.location.href` which causes full page reload with no loading indicator.

**Implementation:**
```tsx
const [navigating, setNavigating] = useState<string | null>(null);

const navigateToProject = (projectId: string) => {
  setNavigating(projectId);
  const currentUrl = new URL(window.location.href);
  const newUrl =
    currentUrl.origin.replace("www.", "app.") + `/projects/${projectId}`;
  window.location.href = newUrl;
};

// In Card:
<Card
  key={project.id}
  className="group cursor-pointer transition-all hover:shadow-lg relative"
  onClick={() => navigateToProject(project.id)}
>
  {navigating === project.id && (
    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Opening project...</span>
      </div>
    </div>
  )}
  {/* rest of card */}
</Card>
```

---

#### 4.3 Replace Native Select with shadcn/ui Select
**File:** `turbo/apps/web/app/components/github-repo-selector.tsx:157-173`

**Current Issue:**
Uses native HTML `<select>` instead of shadcn/ui Select component.

**Implementation:**
```tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@uspark/ui";

// In render:
<Select
  value={selectedRepo?.fullName || ""}
  onValueChange={handleRepoChange}
>
  <SelectTrigger>
    <SelectValue placeholder="Select a repository (optional)" />
  </SelectTrigger>
  <SelectContent>
    {Object.entries(groupedRepos).map(([owner, repos]) => (
      <SelectGroup key={owner}>
        <SelectLabel>{owner}</SelectLabel>
        {repos.map((repo) => (
          <SelectItem key={repo.id} value={repo.fullName}>
            {repo.name} {repo.private && <Lock className="h-3 w-3 ml-1 inline-block" aria-label="Private repository" />}
          </SelectItem>
        ))}
      </SelectGroup>
    ))}
  </SelectContent>
</Select>
```

---

#### 4.4 Additional UX Improvements

**4.4.1 Fix Empty State Link to Use Next.js Link**
**File:** `turbo/apps/web/app/components/github-repo-selector.tsx:142-148`

Replace `<a>` with `Link`:
```tsx
import Link from "next/link";

<Link
  href="/settings/github"
  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
>
  Configure GitHub Settings
  <ExternalLink className="h-3 w-3" />
</Link>
```

**4.4.2 Add Form Submit Handler for Create Project Dialog**
**File:** `turbo/apps/web/app/projects/page.tsx:356-360`

Wrap in proper form element:
```tsx
<form onSubmit={(e) => {
  e.preventDefault();
  if (!creating && newProjectName.trim()) {
    handleCreateProject();
  }
}}>
  <DialogHeader>
    {/* ... */}
  </DialogHeader>
  <div className="grid gap-4 py-4">
    {/* inputs */}
  </div>
  <DialogFooter>
    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
      Cancel
    </Button>
    <Button type="submit" disabled={!newProjectName.trim() || creating}>
      {creating ? "Creating..." : "Create Project"}
    </Button>
  </DialogFooter>
</form>
```

**4.4.3 Improve Project Color System**
**File:** `turbo/apps/web/app/projects/page.tsx:182-194`

Add dark mode support:
```tsx
const getProjectColor = (projectId: string) => {
  const colors = [
    "bg-blue-600 dark:bg-blue-500",
    "bg-purple-600 dark:bg-purple-500",
    "bg-green-600 dark:bg-green-500",
    "bg-orange-600 dark:bg-orange-500",
    "bg-pink-600 dark:bg-pink-500",
    "bg-teal-600 dark:bg-teal-500",
  ];
  const hash = projectId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};
```

**4.4.4 Add Breadcrumbs to Settings Pages**

Create breadcrumb component:
```tsx
import { ChevronRight } from "lucide-react";
import Link from "next/link";

function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

Use in settings pages:
```tsx
<Breadcrumbs
  items={[
    { label: "Settings", href: "/settings" },
    { label: "GitHub Integration" }
  ]}
/>
```

---

## Additional Issues and Recommendations

### Low Priority Issues

#### Date Formatting Inconsistency
**Files:** Projects page, Shares page, Claude token page

Create shared date formatting utility:
```tsx
// In packages/utils/src/date-format.ts
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;

  return date.toLocaleDateString();
}
```

#### Remove Defensive console.error Calls
**Files:** Multiple settings files

Per project guidelines "Avoid Defensive Programming", remove console.error calls and let errors propagate naturally.

#### Truncate Long Repository Names
**File:** `turbo/apps/web/app/projects/page.tsx:306-314`

Add truncation with tooltip:
```tsx
{project.source_repo_url && (
  <CardContent>
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className="text-xs truncate max-w-full"
        title={project.source_repo_url}
      >
        <Github className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="truncate">{project.source_repo_url}</span>
      </Badge>
    </div>
  </CardContent>
)}
```

#### Replace Emoji Icons with Lucide Icons
**Files:** Settings pages, repo selector

Replace emojis with proper icon components for better accessibility:
```tsx
// Instead of: <div style={{ fontSize: "48px" }}>🔗</div>
<div className="mb-4 flex justify-center">
  <div className="rounded-full bg-muted p-4">
    <Link2 className="h-8 w-8 text-muted-foreground" />
  </div>
</div>
```

---

## Cross-Cutting Concerns

### Design System Consistency

**Critical Issue:** Settings pages and navigation component completely abandon Tailwind/shadcn/ui in favor of inline styles.

**Impact:**
- Maintenance burden (changes require editing inline styles across multiple files)
- Inconsistency (settings look different from rest of app)
- Technical debt (violates project's stated architecture)
- Theme switching won't work properly

**Solution:** Phase 3 addresses this systematically by refactoring all settings pages.

---

### Accessibility Compliance

**WCAG 2.1 Level A Violations (Must Fix):**
1. Missing semantic HTML landmarks and headings
2. Inconsistent heading hierarchy
3. Missing ARIA labels on interactive elements
4. Missing skip links
5. Hover-only interactions without keyboard/touch alternatives

**WCAG 2.1 Level AA Violations (Should Fix):**
1. Color contrast issues with hardcoded colors
2. Focus indicators missing in inline-styled elements

**Recommendations:**
- Conduct full accessibility audit with automated tools (axe, WAVE)
- Test with actual screen readers (NVDA, JAWS, VoiceOver)
- Implement keyboard navigation testing in E2E tests
- Add aria-live regions for dynamic content updates

---

### Error Handling Patterns

**Current Issues:**
1. No error boundaries at page level
2. Inconsistent error display patterns
3. Many errors lack retry mechanisms
4. console.error usage violates project guidelines

**Recommendations:**
1. Add error boundaries to layout components
2. Create standardized error display component
3. Add retry functionality to all error states
4. Remove defensive console.error calls

---

### Component Pattern Inconsistencies

**Issues:**
1. Mix of native browser dialogs (`confirm()`) and shadcn/ui dialogs
2. Mix of native `<select>` and shadcn/ui Select
3. Mix of CSS modules, inline styles, and Tailwind
4. Mix of `<a>` tags and Next.js `Link` components

**Recommendations:**
1. Standardize on shadcn/ui AlertDialog for all confirmations
2. Use shadcn/ui Select for all dropdowns
3. Use Tailwind exclusively (remove CSS modules and inline styles)
4. Use Next.js Link for all internal navigation

---

## Success Criteria

✅ All inline styles replaced with Tailwind utilities
✅ Consistent use of shadcn/ui components throughout
✅ WCAG 2.1 Level A compliance achieved
✅ Proper semantic HTML across all pages
✅ No native browser dialogs (confirm/alert)
✅ Keyboard and touch accessibility on all interactive elements
✅ Consistent error handling patterns
✅ Proper loading states for all async operations
✅ Theme support (dark mode) works across entire application
✅ All settings pages match design system of projects page

---

## Implementation Priority

### Immediate (Phase 1 + 2)
Focus on critical design system violations and accessibility issues:
1. Fix Navigation component
2. Fix project delete button accessibility
3. Replace native confirm() dialogs
4. Fix homepage semantic HTML
5. Fix heading hierarchy

These changes provide immediate value by:
- Ensuring accessibility compliance
- Establishing consistent design patterns
- Creating foundation for remaining work

### Next (Phase 3)
Systematic refactor of all settings pages:
1. Settings landing page
2. GitHub settings
3. Shares settings
4. Claude token settings

This is the largest effort but essential for long-term maintainability.

### Finally (Phase 4)
Polish and UX improvements:
1. Error retry mechanisms
2. Loading state improvements
3. Component standardization
4. Date formatting consistency

---

## Notes

- This document represents a comprehensive audit conducted via code analysis
- All file references include line numbers for easy navigation
- Code examples are provided for all recommended changes
- Priority is based on impact to user experience and system maintainability
- Settings refactor (Phase 3) is critical despite being later in sequence - it can be started in parallel with Phase 1-2

---

## Document History

- **2025-10-14**: Initial comprehensive UI/UX review completed
- **Reviewer**: UI/UX Expert Agent
- **Scope**: Homepage, Projects, Settings, Navigation, GitHub integration components
