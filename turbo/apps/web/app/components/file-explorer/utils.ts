import { type FileItem } from "./types";

export function buildFileTree(files: Array<{ path: string; type: 'file' | 'directory'; size?: number }>): FileItem[] {
  const fileMap = new Map<string, FileItem>();
  const result: FileItem[] = [];

  // Sort files to ensure directories come first
  const sortedFiles = files.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const file of sortedFiles) {
    const parts = file.path.split('/').filter(Boolean);
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!fileMap.has(currentPath)) {
        const isLastPart = i === parts.length - 1;
        const item: FileItem = {
          path: currentPath,
          type: isLastPart ? file.type : 'directory',
          size: isLastPart ? file.size : undefined,
          children: []
        };
        
        fileMap.set(currentPath, item);
        
        if (parentPath) {
          const parent = fileMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(item);
          }
        } else {
          result.push(item);
        }
      }
    }
  }

  // Sort children recursively
  const sortChildren = (items: FileItem[]) => {
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      // Get file names for comparison
      const aName = a.path.split('/').pop() || a.path;
      const bName = b.path.split('/').pop() || b.path;
      return aName.localeCompare(bName);
    });
    
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    });
  };

  sortChildren(result);
  return result;
}