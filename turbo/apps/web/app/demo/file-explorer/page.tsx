"use client";

import { useState, useEffect } from "react";
import { YjsFileExplorer } from "../../components/file-explorer";
import * as Y from "yjs";

function createDemoYjsDocument(): Uint8Array {
  const ydoc = new Y.Doc();
  const filesMap = ydoc.getMap("files");
  const blobsMap = ydoc.getMap("blobs");

  // Add demo files to the YJS document
  const demoFiles = [
    {
      path: "src/index.ts",
      content: "console.log('Hello World');",
      size: 26
    },
    {
      path: "src/components/Button.tsx", 
      content: "export function Button() { return <button>Click me</button>; }",
      size: 60
    },
    {
      path: "src/components/Modal.tsx",
      content: "export function Modal() { return <div>Modal content</div>; }",
      size: 58
    },
    {
      path: "src/utils/helpers.ts",
      content: "export function formatDate(date: Date) { return date.toISOString(); }",
      size: 68
    },
    {
      path: "package.json",
      content: JSON.stringify({
        name: "demo-project",
        version: "1.0.0",
        dependencies: {
          "react": "^18.0.0",
          "typescript": "^5.0.0"
        }
      }, null, 2),
      size: 150
    },
    {
      path: "README.md",
      content: "# Demo Project\n\nThis is a demo project showing YJS file system integration.",
      size: 79
    },
    {
      path: "tsconfig.json",
      content: JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ES2022",
          strict: true
        }
      }, null, 2),
      size: 95
    }
  ];

  const now = Date.now();

  demoFiles.forEach((file, index) => {
    // Create a simple hash from file content
    const hash = `hash_${btoa(file.path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}`;
    
    // Add file metadata to files map
    filesMap.set(file.path, {
      hash,
      mtime: now - (index * 60000) // Different modification times
    });
    
    // Add blob info to blobs map
    blobsMap.set(hash, {
      size: file.size
    });
  });

  // Return the serialized YJS document
  return Y.encodeStateAsUpdate(ydoc);
}

export default function FileExplorerDemo() {
  const [demoProjectId] = useState("demo-project-123");
  const [selectedFile, setSelectedFile] = useState<string>();
  const [mockApiReady, setMockApiReady] = useState(false);

  useEffect(() => {
    // Mock the API endpoint for demo purposes
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      
      if (url.includes(`/api/projects/${demoProjectId}`)) {
        // Return demo YJS document
        const demoData = createDemoYjsDocument();
        return new Response(demoData.buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Version': '1'
          }
        });
      }
      
      // For other requests, use original fetch
      return originalFetch(input, init);
    };
    
    setMockApiReady(true);
    
    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [demoProjectId]);

  if (!mockApiReady) {
    return <div>Setting up demo...</div>;
  }

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700',
          marginBottom: '8px',
          color: 'var(--foreground)' 
        }}>
          YJS File Explorer Demo
        </h1>
        <p style={{ 
          fontSize: '16px',
          color: 'rgba(156, 163, 175, 0.8)',
          marginBottom: '20px'
        }}>
          This demo shows how the file explorer component parses file structures from YJS documents.
        </p>
        
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '6px',
          fontSize: '14px',
          color: 'var(--foreground)'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>
            🔧 How it works:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
            <li>YJS document contains two maps: <code>files</code> (metadata) and <code>blobs</code> (size info)</li>
            <li>File paths are keys in the <code>files</code> map with hash and modification time values</li>
            <li>The component automatically builds a tree structure from flat file paths</li>
            <li>Real projects would have content stored in separate blob storage</li>
          </ul>
        </div>
      </header>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: 'var(--foreground)' 
          }}>
            File Explorer
          </h2>
          <div style={{ 
            border: '2px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <YjsFileExplorer
              projectId={demoProjectId}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
              showMetadata={true}
            />
          </div>
        </div>
        
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: 'var(--foreground)' 
          }}>
            File Details
          </h2>
          <div style={{
            border: '1px solid rgba(156, 163, 175, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: 'var(--background)',
            minHeight: '200px'
          }}>
            {selectedFile ? (
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  marginBottom: '12px',
                  color: 'var(--foreground)'
                }}>
                  📄 {selectedFile}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(156, 163, 175, 0.8)' }}>
                  <div>Path: <code>{selectedFile}</code></div>
                  <div style={{ marginTop: '8px' }}>
                    Click on files in the explorer to see their details here.
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11px', fontStyle: 'italic' }}>
                    In a real application, this would show file content, modification time, 
                    and other metadata from the YJS document.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                color: 'rgba(156, 163, 175, 0.6)',
                fontSize: '14px',
                paddingTop: '60px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                Select a file from the explorer to view details
              </div>
            )}
          </div>
          
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'rgba(156, 163, 175, 0.05)',
            border: '1px solid rgba(156, 163, 175, 0.1)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'rgba(156, 163, 175, 0.8)'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
              💡 Features demonstrated:
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.4' }}>
              <li>Tree structure from flat file paths</li>
              <li>File type icons based on extensions</li>
              <li>Folder expand/collapse functionality</li>
              <li>File selection and highlighting</li>
              <li>Metadata display (file count, total size)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}