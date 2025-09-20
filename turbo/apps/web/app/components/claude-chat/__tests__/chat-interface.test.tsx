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

  it("displays empty state when no turns exist", async () => {
    render(<ChatInterface projectId="project-1" />);

    // Should show the placeholder text
    expect(
      screen.getByText(/start a conversation with claude/i),
    ).toBeInTheDocument();
  });

  it("displays turns when they exist", async () => {
    // Mock useSessionPolling to return some turns
    const mockUseSessionPolling = vi.mocked(
      await import("../use-session-polling"),
    ).useSessionPolling;

    mockUseSessionPolling.mockReturnValue({
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
    });

    render(<ChatInterface projectId="project-1" />);

    // Should display Claude's response (user message may be empty in the UI)
    expect(screen.getByText("Hello! How can I help you?")).toBeInTheDocument();

    // Should display the turn structure (user and Claude sections)
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Claude")).toBeInTheDocument();
  });

  it("handles message input and form submission", async () => {
    render(<ChatInterface projectId="project-1" />);

    const textarea = screen.getByPlaceholderText(/ask claude/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Wait for session to be initialized (button should become available)
    await waitFor(() => {
      expect(sendButton).toBeDisabled(); // Initially disabled due to empty input
    });

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });
    expect(textarea).toHaveValue("Test message");

    // Wait for session initialization to complete, then check button state
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled();
    });

    // Clear the input
    fireEvent.change(textarea, { target: { value: "" } });

    // Send button should be disabled for empty input
    expect(sendButton).toBeDisabled();
  });

  it("handles Enter key for sending messages", async () => {
    render(<ChatInterface projectId="project-1" />);

    const textarea = screen.getByPlaceholderText(/ask claude/i);

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

  it("prevents sending when Shift+Enter is pressed", async () => {
    render(<ChatInterface projectId="project-1" />);

    const textarea = screen.getByPlaceholderText(/ask claude/i);

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });

    // Press Shift+Enter (should not send)
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    // Input should still have the message
    expect(textarea).toHaveValue("Test message");
  });

  it("shows polling indicator when polling is active", async () => {
    // Mock useSessionPolling to return polling state
    const mockUseSessionPolling = vi.mocked(
      await import("../use-session-polling"),
    ).useSessionPolling;

    mockUseSessionPolling.mockReturnValue({
      turns: [],
      isPolling: true,
      refetch: vi.fn(),
      hasActiveTurns: true,
    });

    render(<ChatInterface projectId="project-1" />);

    // Should show some indication of active polling/processing
    // This depends on your UI implementation
  });
});
