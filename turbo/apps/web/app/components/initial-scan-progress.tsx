"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@uspark/ui";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

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

  // Show todos if available
  if (progress.todos && progress.todos.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Scanning {projectName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {progress.todos.map((todo, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                {todo.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : todo.status === "in_progress" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {todo.status === "in_progress"
                      ? todo.activeForm
                      : todo.content}
                  </p>
                  <div className="mt-1">
                    <Badge
                      variant={
                        todo.status === "completed"
                          ? "default"
                          : todo.status === "in_progress"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {todo.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
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
