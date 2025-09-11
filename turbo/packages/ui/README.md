# @uspark/ui

UI component library built with shadcn/ui for the USpark monorepo.

## Installation

This package is already configured in the monorepo. No additional installation needed.

## Usage

### Import components in your app:

```typescript
// Import individual components
import { Button, Card } from "@uspark/ui";

// Or import from specific paths
import { Button } from "@uspark/ui/components/button";
import { cn } from "@uspark/ui/lib/utils";
```

### Import styles in your app's root layout or main CSS:

```css
/* In your app's global CSS file */
@import "@uspark/ui/styles/globals.css";
```

## Adding New Components

From the `packages/ui` directory:

```bash
npx shadcn@latest add [component-name]
```

Available components can be found at: https://ui.shadcn.com/docs/components/

## Structure

```
packages/ui/
├── src/
│   ├── components/ui/    # shadcn components
│   ├── lib/              # Utilities (cn function)
│   ├── hooks/            # Shared hooks
│   └── styles/           # Global CSS with Tailwind
├── components.json       # shadcn configuration
└── tailwind.config.ts    # Tailwind configuration
```

## Development

```bash
# Type checking
pnpm check-types

# Linting
pnpm lint
```
