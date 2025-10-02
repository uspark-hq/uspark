import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatInterface } from "../chat-interface";

// Mock the useSessionPolling hook
vi.mock("../use-session-polling", () => ({
  useSessionPolling: vi.fn(() => ({
    turns: [],
    isPolling: false,
    refetch: vi.fn(),
  })),
}));

// Note: Using MSW for HTTP mocking instead of global fetch mock

describe("ChatInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the chat interface", async () => {
    render(<ChatInterface projectId="project-1" />);

    // Should render the textarea for input
    expect(screen.getByPlaceholderText(/ask claude/i)).toBeInTheDocument();

    // Should render the send button
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("displays turns when they exist", async () => {
    // First, we need to update MSW handler to return an existing session
    // We'll use dynamic imports to modify the mock
    const { useSessionPolling } = await import("../use-session-polling");

    // Mock useSessionPolling to return turns after session is selected
    vi.mocked(useSessionPolling).mockImplementation((projectId, sessionId) => {
      if (sessionId) {
        return {
          turns: [
            {
              id: "turn-1",
              userPrompt: "Hello Claude",
              status: "completed",
              blocks: [
                {
                  id: "block-1",
                  type: "content",
                  content: { text: "Hello! How can I help you?" },
                  sequenceNumber: 0,
                },
              ],
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              errorMessage: null,
            },
          ],
          isPolling: false,
          refetch: vi.fn(),
          hasActiveTurns: false,
        };
      }
      return {
        turns: [],
        isPolling: false,
        refetch: vi.fn(),
        hasActiveTurns: false,
      };
    });

    render(<ChatInterface projectId="project-1" />);

    // Create a new session first
    const sessionSelector = await screen.findByText(/no session selected/i);
    fireEvent.click(sessionSelector);

    const newSessionButton = await screen.findByText(/new session/i);
    fireEvent.click(newSessionButton);

    // Wait for session to be created and turns to appear
    await waitFor(() => {
      expect(
        screen.getByText("Hello! How can I help you?"),
      ).toBeInTheDocument();
    });

    // Should display the turn structure (user and Claude sections)
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Claude")).toBeInTheDocument();
  });

  it("handles message input and form submission", async () => {
    render(<ChatInterface projectId="project-1" />);

    const textarea = screen.getByPlaceholderText(/ask claude/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Initially disabled (no session)
    expect(sendButton).toBeDisabled();
    expect(textarea).toBeDisabled();

    // Click the New Session button in the dropdown
    const sessionSelector = await screen.findByText(/no session selected/i);
    fireEvent.click(sessionSelector);

    const newSessionButton = await screen.findByText(/new session/i);
    fireEvent.click(newSessionButton);

    // Wait for session to be created
    await waitFor(() => {
      expect(textarea).not.toBeDisabled();
    });

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });
    expect(textarea).toHaveValue("Test message");

    // Button should be enabled with message
    expect(sendButton).not.toBeDisabled();

    // Clear the input
    fireEvent.change(textarea, { target: { value: "" } });

    // Send button should be disabled for empty input
    expect(sendButton).toBeDisabled();
  });

  it("handles Enter key for sending messages", async () => {
    render(<ChatInterface projectId="project-1" />);

    const textarea = screen.getByPlaceholderText(/ask claude/i);

    // Create a session first
    const sessionSelector = await screen.findByText(/no session selected/i);
    fireEvent.click(sessionSelector);

    const newSessionButton = await screen.findByText(/new session/i);
    fireEvent.click(newSessionButton);

    // Wait for session to be initialized
    await waitFor(() => {
      expect(textarea).not.toBeDisabled();
    });

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });

    // Press Enter (without Shift)
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    // Input should be cleared after sending
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });
});
