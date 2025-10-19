"use client";

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

interface ActiveTodosDisplayProps {
  todos: TodoItem[];
}

export function ActiveTodosDisplay({ todos }: ActiveTodosDisplayProps) {
  if (!todos || todos.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "12px",
        backgroundColor: "rgba(147, 51, 234, 0.03)",
        border: "1px solid rgba(147, 51, 234, 0.15)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: "500",
          color: "#9333ea",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span>📋</span>
        <span>Progress Tracker</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {todos.map((todo, index) => {
          const isCompleted = todo.status === "completed";
          const isInProgress = todo.status === "in_progress";
          const isPending = todo.status === "pending";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "6px 8px",
                borderRadius: "4px",
                backgroundColor: isCompleted
                  ? "rgba(34, 197, 94, 0.05)"
                  : isInProgress
                    ? "rgba(59, 130, 246, 0.05)"
                    : "rgba(156, 163, 175, 0.03)",
                opacity: isCompleted ? 0.7 : 1,
              }}
            >
              {/* Status Icon */}
              <div
                style={{
                  marginTop: "1px",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {isCompleted && <span style={{ color: "#22c55e" }}>✓</span>}
                {isInProgress && (
                  <span
                    className="spinner"
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      border: "2px solid rgba(59, 130, 246, 0.2)",
                      borderTopColor: "#3b82f6",
                      borderRadius: "50%",
                    }}
                  />
                )}
                {isPending && (
                  <span style={{ color: "rgba(156, 163, 175, 0.5)" }}>○</span>
                )}
              </div>

              {/* Todo Text */}
              <div
                style={{
                  flex: 1,
                  fontSize: "13px",
                  color: isCompleted
                    ? "rgba(156, 163, 175, 0.7)"
                    : "var(--foreground)",
                  textDecoration: isCompleted ? "line-through" : "none",
                }}
              >
                {isInProgress ? todo.activeForm : todo.content}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
