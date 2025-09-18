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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ChatInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes session on mount", async () => {
    const mockSessionId = "session-123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: mockSessionId }),
    });

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-1/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Claude Code Session" }),
        },
      );
    });
  });

  it("displays empty state when no turns exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "session-123" }),
    });

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Start a conversation with Claude"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ask Claude to help you with your code/),
      ).toBeInTheDocument();
    });
  });

  it("displays turns when they exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "session-123" }),
    });

    const { useSessionPolling } = await import("../use-session-polling");
    vi.mocked(useSessionPolling).mockReturnValue({
      turns: [
        {
          id: "turn-1",
          user_prompt: "Hello Claude",
          status: "completed",
          started_at: "2024-01-01T00:00:00Z",
          completed_at: "2024-01-01T00:00:05Z",
          blocks: [
            {
              id: "block-1",
              type: "content",
              content: { text: "Hello! How can I help you today?" },
              sequence_number: 0,
            },
          ],
        },
      ],
      isPolling: false,
      refetch: vi.fn(),
    });

    render(<ChatInterface projectId="project-1" />);

    expect(screen.getByText("Hello Claude")).toBeInTheDocument();
    expect(
      screen.getByText("Hello! How can I help you today?"),
    ).toBeInTheDocument();
  });

  it("handles message submission", async () => {
    const mockSessionId = "session-123";
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: mockSessionId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ turn_id: "turn-1" }),
      });

    render(<ChatInterface projectId="project-1" />);

    // Wait for session initialization
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );
    const sendButton = screen.getByText("Send");

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });
    expect(textarea).toHaveValue("Test message");

    // Click send
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-1/sessions/session-123/mock-execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_message: "Test message" }),
        },
      );
    });

    // Message should be cleared
    expect(textarea).toHaveValue("");
  });

  it("handles Enter key for sending messages", async () => {
    const mockSessionId = "session-123";
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: mockSessionId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ turn_id: "turn-1" }),
      });

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-1/sessions/session-123/mock-execute",
        expect.anything(),
      );
    });
  });

  it("prevents sending when Shift+Enter is pressed", async () => {
    const mockSessionId = "session-123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: mockSessionId }),
    });

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    // Should not send the message
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial session call
    });
  });

  it("disables input while submitting", async () => {
    const mockSessionId = "session-123";
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: mockSessionId }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ turn_id: "turn-1" }),
              });
            }, 100);
          }),
      );

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );
    const sendButton = screen.getByText("Send");

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    // Should show "Sending..." and disable inputs
    expect(screen.getByText("Sending...")).toBeInTheDocument();
    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it("handles submission errors gracefully", async () => {
    const mockSessionId = "session-123";
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: mockSessionId }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );
    const sendButton = screen.getByText("Send");

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send message:",
        expect.any(Error),
      );
    });

    // Message should be restored on error
    expect(textarea).toHaveValue("Test message");

    consoleErrorSpy.mockRestore();
  });

  it("shows polling indicator when polling is active", async () => {
    const { useSessionPolling } = await import("../use-session-polling");
    vi.mocked(useSessionPolling).mockReturnValue({
      turns: [],
      isPolling: true,
      refetch: vi.fn(),
    });

    render(<ChatInterface projectId="project-1" />);

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
  });

  it("shows in-progress status for active turns", async () => {
    const { useSessionPolling } = await import("../use-session-polling");
    vi.mocked(useSessionPolling).mockReturnValue({
      turns: [
        {
          id: "turn-1",
          user_prompt: "Hello Claude",
          status: "in_progress",
          started_at: "2024-01-01T00:00:00Z",
          completed_at: null,
          blocks: [],
        },
      ],
      isPolling: true,
      refetch: vi.fn(),
    });

    render(<ChatInterface projectId="project-1" />);

    expect(screen.getByText("Thinking...")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("shows failed status for failed turns", async () => {
    const { useSessionPolling } = await import("../use-session-polling");
    vi.mocked(useSessionPolling).mockReturnValue({
      turns: [
        {
          id: "turn-1",
          user_prompt: "Hello Claude",
          status: "failed",
          started_at: "2024-01-01T00:00:00Z",
          completed_at: "2024-01-01T00:00:05Z",
          blocks: [],
        },
      ],
      isPolling: false,
      refetch: vi.fn(),
    });

    render(<ChatInterface projectId="project-1" />);

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("prevents sending empty messages", async () => {
    const mockSessionId = "session-123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: mockSessionId }),
    });

    render(<ChatInterface projectId="project-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const sendButton = screen.getByText("Send");
    const textarea = screen.getByPlaceholderText(
      "Ask Claude to help with your code...",
    );

    // Try to send empty message
    fireEvent.click(sendButton);

    // Should not make additional fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Try with whitespace only
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(sendButton);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
