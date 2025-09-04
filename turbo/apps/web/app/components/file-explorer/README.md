# File Explorer Component

A tree-view file browser React component with support for YJS document parsing, folder expansion/collapse, file type icons, and file selection.

## Features

- ✅ **YJS Integration** - Parses file structures from YJS documents
- ✅ Tree structure rendering
- ✅ Folder expand/collapse functionality
- ✅ File type icons based on extensions
- ✅ Click events for file selection
- ✅ TypeScript support with full type definitions
- ✅ Responsive design with hover effects
- ✅ File metadata display (size, modification time)

## Components

### YjsFileExplorer (Recommended)

Automatically fetches and parses YJS documents from your project API:

```tsx
import { YjsFileExplorer } from "./components/file-explorer";

function ProjectPage() {
  const [selectedFile, setSelectedFile] = useState<string>();

  return (
    <YjsFileExplorer
      projectId="your-project-id"
      onFileSelect={setSelectedFile}
      selectedFile={selectedFile}
      showMetadata={true}
    />
  );
}
```

### FileExplorer (Lower-level)

For manual file tree data:

```tsx
import { FileExplorer, parseYjsFileSystem } from "./components/file-explorer";

// Parse YJS document manually
const yjsData = await fetch(`/api/projects/${projectId}`).then((r) =>
  r.arrayBuffer(),
);
const { files } = parseYjsFileSystem(new Uint8Array(yjsData));

function App() {
  const [selectedFile, setSelectedFile] = useState<string>();

  return (
    <FileExplorer
      files={files}
      onFileSelect={setSelectedFile}
      selectedFile={selectedFile}
    />
  );
}
```

## API

### FileExplorer Props

```typescript
interface FileExplorerProps {
  files: FileItem[]; // Tree structure data
  onFileSelect?: (filePath: string) => void; // File selection callback
  selectedFile?: string; // Currently selected file path
  className?: string; // Additional CSS classes
}
```

### Data Types

```typescript
interface FileItem {
  path: string; // File/folder path
  type: "file" | "directory"; // Type of item
  size?: number; // File size (optional)
  children?: FileItem[]; // Child items for directories
}
```

### Utilities

- `buildFileTree(flatFiles)` - Converts flat file list to tree structure
- `FileIcon` - Displays appropriate icon based on file extension

## File Type Icons

The component automatically displays different icons for:

- 📁 Directories
- 🔷 TypeScript files (.ts, .tsx)
- 📄 JavaScript files (.js, .jsx)
- 📋 JSON files
- 📝 Markdown files
- 🎨 CSS files
- 🌐 HTML files
- 🖼️ Images (png, jpg, svg, etc.)
- And many more...

## Testing

The component includes comprehensive tests covering:

- Basic rendering
- Empty state handling
- File selection events
- Folder expand/collapse
- File highlighting
- Tree building utilities

Run tests with:

```bash
pnpm test app/components/file-explorer
```
