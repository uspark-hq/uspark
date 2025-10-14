---
description: Comprehensive UI/UX review with screenshots and actionable improvement recommendations
---

Conduct a comprehensive UI/UX review of the uSpark web application. Follow this structured workflow:

## Phase 1: Capture Visual State with E2E UI Tester

Use the @agent-e2e-ui-tester to capture screenshots of key pages:

1. **Start development server** (if not already running)
2. **Generate screenshots** for the following pages:
   - Homepage (`/`)
   - Projects list page (`/projects`)
   - Settings page (`/settings`)
   - Sign-in page (accessible without auth)

For each page:
- Navigate to the page (with authentication when needed)
- Wait for page to fully load
- Capture full-page screenshot
- Save to `test-results/ui-review-[page-name].png`

## Phase 2: Conduct Expert UI/UX Review

Use the @agent-ui-ux-reviewer to analyze the captured screenshots and source code:

### Review Scope

**Pages to review**:
1. **Homepage** (`/`)
   - File: `turbo/apps/web/app/page.tsx`
   - Component: `turbo/apps/web/app/components/TerminalHome.tsx`
   - Focus: Terminal interaction, branding, first impression

2. **Projects List** (`/projects`)
   - File: `turbo/apps/web/app/projects/page.tsx`
   - Components: `turbo/apps/web/app/components/navigation.tsx`, `turbo/apps/web/app/components/github-repo-selector.tsx`
   - Focus: Card layout, empty state, create dialog, navigation

3. **Settings Pages** (`/settings/*`)
   - Files: `turbo/apps/web/app/settings/page.tsx`, `turbo/apps/web/app/settings/*/page.tsx`
   - Focus: Navigation tabs, form layouts, settings organization

4. **Navigation Component** (Global)
   - File: `turbo/apps/web/app/components/navigation.tsx`
   - Focus: Consistency, authentication state, responsive behavior

### Review Focus Areas

Prioritize these aspects based on the project's tech stack:

#### 1. Design System Consistency
- **shadcn/ui components**: Verify proper usage without excessive customization
- **Tailwind tokens**: Check consistent spacing (4, 8, 16, 24, 32), colors, border radius
- **Component patterns**: Ensure reusable patterns across pages
- **Dark mode**: Verify proper theme token usage

#### 2. User Experience
- **Loading states**: Skeleton loading for async data (projects list)
- **Empty states**: Clear guidance when no data (empty projects list)
- **Error handling**: User-friendly error messages
- **Form feedback**: Validation messages, submit states
- **Navigation**: Clear page hierarchy, active states

#### 3. Accessibility (WCAG 2.1 AA)
- **Semantic HTML**: Proper heading hierarchy, landmark regions
- **Form labels**: All inputs have associated labels
- **Color contrast**: Minimum 4.5:1 for text, 3:1 for UI elements
- **Keyboard navigation**: Proper focus indicators, logical tab order
- **ARIA attributes**: Appropriate usage in dialogs and interactive elements

#### 4. Responsive Design
- **Mobile layout**: Optimize for mobile, not just scale down
- **Touch targets**: Minimum 44×44px for interactive elements
- **Navigation**: Mobile menu implementation
- **Content reflow**: Graceful adaptation at breakpoints

#### 5. Visual Design
- **Typography**: Clear hierarchy, readability
- **Spacing**: Consistent whitespace, visual breathing room
- **Alignment**: Grid-based layout, visual order
- **Color usage**: Purposeful, accessible color choices
- **Visual hierarchy**: Guide user attention to important elements

### Analysis Requirements

For each page reviewed:

1. **Read the screenshot** to understand the visual design
2. **Read the source code** to understand implementation
3. **Check related components** for reusability and patterns
4. **Identify issues** categorized by severity (Critical, High, Medium, Low)
5. **Provide specific recommendations** with code examples
6. **Reference file locations** using `file_path:line_number` format

### Special Considerations

**Project-specific patterns to check**:
- Terminal interface UX (homepage)
- Project card design consistency
- GitHub integration UI (repo selector)
- Clerk authentication UI integration
- Dialog patterns (create project, delete confirmation)
- Navigation consistency across pages

**Common issue areas**:
- Custom styles overriding shadcn/ui defaults
- Inconsistent spacing between components
- Missing loading states for async operations
- Inadequate error handling UI
- Mobile responsive issues

## Phase 3: Generate Comprehensive Report

Create a detailed report with the following structure:

### Executive Summary
- Total pages reviewed
- Issues found by severity
- Key findings (top 3-5 most impactful issues)
- Overall assessment

### Per-Page Analysis
For each page:
- Screenshot reference
- Strengths (what works well)
- Issues found (with file references and code examples)
- Specific recommendations

### Cross-Cutting Concerns
- Design system consistency
- Accessibility compliance
- Responsive design assessment
- Component reusability

### Prioritized Action Items

**Must Fix (Critical/High)**:
- Issues that significantly impact UX or accessibility
- Blocking problems for core user flows
- Severe design inconsistencies

**Should Fix (Medium)**:
- Notable UX improvements
- Design polish
- Minor accessibility enhancements

**Nice to Have (Low)**:
- Refinements and optimizations
- Edge case handling
- Code quality improvements

### Implementation Guidance
For each prioritized issue:
- Specific file locations
- Code examples for fixes
- Estimated effort (hours)
- Dependencies or blockers

## Output Format

Provide the complete review as a well-structured markdown document that can be:
1. Read immediately for actionable insights
2. Saved as a reference document
3. Used to create implementation tasks
4. Shared with the team for discussion

## Success Criteria

The review should:
- ✅ Cover all specified pages with screenshots
- ✅ Identify concrete, actionable issues
- ✅ Provide specific file references and line numbers
- ✅ Include code examples for recommended fixes
- ✅ Prioritize issues by impact and effort
- ✅ Reference design principles and standards
- ✅ Be constructive and educational in tone
- ✅ Consider both user impact and development effort

Begin the review process now, starting with Phase 1 (screenshot capture).
