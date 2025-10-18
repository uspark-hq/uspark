"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@uspark/ui";
import { Loader2 } from "lucide-react";

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

interface InitialScanProgressProps {
  progress: {
    todos?: TodoItem[];
    lastBlock?: {
      type: string;
      content: unknown;
    };
  } | null;
  projectName: string;
}

export function InitialScanProgress({
  progress,
  projectName,
}: InitialScanProgressProps) {
  if (!progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Initializing scan for {projectName}...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Show todos if available - only show in_progress tasks
  if (progress.todos && progress.todos.length > 0) {
    const inProgressTodos = progress.todos.filter(
      (todo) => todo.status === "in_progress",
    );
    const totalTodos = progress.todos.length;

    // If no in_progress tasks, show a generic scanning message
    if (inProgressTodos.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Scanning {projectName}...
            </CardTitle>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Scanning {projectName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inProgressTodos.map((todo, index) => {
              // Find the actual index of this task in the full todos array
              // We know progress.todos exists here because we're inside the if block
              const actualIndex = progress.todos!.findIndex(
                (t) => t.content === todo.content && t.status === todo.status,
              );
              const currentTaskNumber = actualIndex + 1;

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      [{currentTaskNumber}/{totalTodos}] {todo.activeForm}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show last block if no todos
  if (progress.lastBlock) {
    const content = progress.lastBlock.content as { text?: string };
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Scanning {projectName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {content.text || "Processing..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Scanning {projectName}...
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
