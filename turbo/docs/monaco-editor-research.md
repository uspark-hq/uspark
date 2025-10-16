# Monaco Editor Research

## Overview

Research findings for integrating Monaco Editor into the workspace project file viewer.

## Current State

The project currently uses a simple `<pre>` tag for displaying file content at `apps/workspace/src/views/project/file-content.tsx:26-29` with no code editing capabilities.

## Monaco Editor Activity & Popularity

### GitHub Statistics

- **Stars**: 43,173
- **Contributors**: 250+
- **Last commit**: Active (4 hours ago as of research date)
- **Growth**: Averaging +11.4 stars per day over the past year

### NPM Statistics

- **Core Package**: `monaco-editor` v0.54.0
  - Weekly downloads: 1,945,511
  - Used by 2,316 projects

- **React Wrapper**: `@monaco-editor/react`
  - Weekly downloads: 380,000+
  - Actively maintained with React 19 support

## Advantages

### Powerful Features

- VS Code same editor core
- Built-in IntelliSense
- Syntax highlighting and code folding
- Real-time error detection
- Rich theme system
- Multi-language support

### Performance

- Virtual scrolling
- Efficient rendering
- Handles large codebases well

### React Integration

`@monaco-editor/react` provides easy integration without complex webpack configuration.

## Challenges

### Bundle Size

- **Main concern**: 4-5 MB minified (~15MB uncompressed)
- Significantly impacts initial load time

### Optimization Strategies

1. Use MonacoWebpackPlugin to load only needed languages
2. Implement code splitting and dynamic imports
3. Include only required features
4. May require Vite-specific configuration

## Alternatives

### CodeMirror

- **Lightweight**: Much smaller bundle size
- **Modular**: ES6 modules with lazy loading support
- **Downloads**: 20,809 weekly (less than Monaco)
- **Best for**: Read-only snippets and simpler use cases

## Integration Approach for ccstate Architecture

### Vanilla JavaScript Integration

Monaco can be integrated without React hooks, suitable for the ccstate pattern:

```typescript
// signals/project/monaco.ts
import { command, computed, state } from "ccstate";
import type * as Monaco from "monaco-editor";

const monacoEditor$ = state<Monaco.editor.IStandaloneCodeEditor | null>(null);
const editorContainer$ = state<HTMLElement | null>(null);

export const setEditorContainer$ = command(
  async ({ get, set }, container: HTMLElement | null, signal: AbortSignal) => {
    set(editorContainer$, container);
    if (container) {
      const monaco = await import("monaco-editor");
      const editor = monaco.editor.create(container, {
        value: "",
        language: "typescript",
        theme: "vs-dark",
        automaticLayout: true,
      });
      set(monacoEditor$, editor);
    }
  },
);
```

### Key Points

- State managed in signals layer (ccstate)
- Lazy initialization when container is available
- No React hooks needed
- Automatic cleanup through signal lifecycle

## Recommendations

### For Full-Featured Editor

Use Monaco if you need:

- Professional code editing experience
- IntelliSense and advanced features
- Active maintenance and ecosystem

### For Code Display Only

Consider alternatives:

- **CodeMirror** (read-only mode): Balanced features and size
- **Prism.js/highlight.js**: Ultra-lightweight syntax highlighting only
- **Current approach**: Keep `<pre>` + custom styling for minimal footprint

## Next Steps

1. **Define requirements**: Determine if editing functionality is needed
2. **Bundle size analysis**: Assess if 4-5MB is acceptable for the use case
3. **Vite configuration**: Research proper Vite setup for Monaco (if proceeding)
4. **Consider phased approach**: Start with syntax highlighting, add Monaco later if needed

## Technical Blockers

### Vite Integration

- Monaco's package.json doesn't specify proper ESM entry points
- Requires special Vite configuration or plugin
- Dynamic imports in tests require proper mocking setup
- May need `vite-plugin-monaco-editor` for proper bundling

## References

- [Monaco Editor GitHub](https://github.com/microsoft/monaco-editor)
- [Monaco Editor npm](https://www.npmjs.com/package/monaco-editor)
- [@monaco-editor/react](https://www.npmjs.com/package/@monaco-editor/react)
- [Best React Code Editors Comparison](https://blog.logrocket.com/best-code-editor-components-react/)
