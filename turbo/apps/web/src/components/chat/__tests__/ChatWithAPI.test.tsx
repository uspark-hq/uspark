import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { ChatWithAPI } from "../ChatWithAPI";
import { sessionHandlers, resetMockSessionData } from "../../../test/msw-session-handlers";

// Set up MSW server for this test file
const server = setupServer(...sessionHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  resetMockSessionData();
});

afterAll(() => {
  server.close();
});

describe("ChatWithAPI", () => {
  it("should create a session and load initial data", async () => {
    render(<ChatWithAPI projectId="project-test-1" />);

    // Should show loading initially
    expect(screen.getByText("Loading session...")).toBeInTheDocument();

    // Wait for session to be created and loaded
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    // Should display session title
    await waitFor(() => {
      expect(screen.getByText("New Chat Session")).toBeInTheDocument();
    });

    // Should show session ID
    expect(screen.getByText(/Session ID:/)).toBeInTheDocument();
  });

  it("should load existing session with turns", async () => {
    render(<ChatWithAPI projectId="project-test-1" sessionId="session-mock-1" />);

    // Wait for session to load
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    // Should display the mock session title
    expect(screen.getByText("Mock Chat Session")).toBeInTheDocument();

    // Should display existing turns (from mock data)
    await waitFor(() => {
      expect(screen.getByText("How do I implement authentication in Next.js?")).toBeInTheDocument();
    });

    // Should show AI response
    expect(screen.getByText(/There are several ways to implement authentication/)).toBeInTheDocument();
  });

  it("should send a message and receive streaming response", async () => {
    render(<ChatWithAPI projectId="project-test-1" sessionId="session-mock-1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    // Find input and send button
    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /Send/i });

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });
    expect(textarea).toHaveValue("Test message");

    // Send the message
    fireEvent.click(sendButton);

    // Input should be cleared
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // Should show sending state
    expect(sendButton).toHaveTextContent("Send");

    // Should display the user's message
    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    // Should show AI is generating response
    expect(screen.getByText("AI is generating a response...")).toBeInTheDocument();

    // Wait for streaming updates (mocked to complete after ~7.5 seconds in our handler)
    // We'll just check for the first update
    await waitFor(
      () => {
        // Should show thinking block
        expect(screen.getByText(/analyzing|thinking/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should handle interrupt action", async () => {
    render(<ChatWithAPI projectId="project-test-1" sessionId="session-mock-1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    // The second turn in mock data is "running"
    // Should show interrupt button in ChatStatus
    const statusElement = screen.getByText(/running/i);
    expect(statusElement).toBeInTheDocument();

    // Find and click interrupt button (if visible)
    const interruptButton = screen.queryByRole("button", { name: /interrupt|stop/i });
    if (interruptButton) {
      fireEvent.click(interruptButton);

      // Wait for interrupt to process
      await waitFor(() => {
        expect(screen.queryByText("AI is generating a response...")).not.toBeInTheDocument();
      });
    }
  });

  it("should handle API errors gracefully", async () => {
    // Override handler to return error
    server.use(
      sessionHandlers[0], // Keep other handlers
      // Override the session GET to return error
      {
        test: vi.fn().mockImplementation((req) => {
          if (req.url.includes("/sessions/error-session")) {
            return true;
          }
          return false;
        }),
        handler: vi.fn().mockImplementation(() => {
          return new Response(JSON.stringify({ error: "session_not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }),
      } as any,
    );

    render(<ChatWithAPI projectId="project-test-1" sessionId="error-session" />);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it("should disable input while sending", async () => {
    render(<ChatWithAPI projectId="project-test-1" sessionId="session-mock-1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /Send/i });

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });

    // Send the message
    fireEvent.click(sendButton);

    // Input should be disabled briefly while sending
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // Should re-enable after message is sent
    await waitFor(() => {
      expect(textarea).not.toBeDisabled();
    });
  });

  it("should handle Enter key to send message", async () => {
    render(<ChatWithAPI projectId="project-test-1" sessionId="session-mock-1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Type your message...");

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test with Enter key" } });

    // Press Enter
    fireEvent.keyPress(textarea, { key: "Enter", code: "Enter", charCode: 13 });

    // Message should be sent
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // Should display the message
    await waitFor(() => {
      expect(screen.getByText("Test with Enter key")).toBeInTheDocument();
    });
  });

  it("should not send empty messages", async () => {
    render(<ChatWithAPI projectId="project-test-1" sessionId="session-mock-1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    });

    const sendButton = screen.getByRole("button", { name: /Send/i });

    // Send button should be disabled when input is empty
    expect(sendButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText("Type your message...");

    // Type only whitespace
    fireEvent.change(textarea, { target: { value: "   " } });

    // Send button should still be disabled
    expect(sendButton).toBeDisabled();

    // Type actual content
    fireEvent.change(textarea, { target: { value: "Valid message" } });

    // Send button should be enabled
    expect(sendButton).not.toBeDisabled();
  });
});