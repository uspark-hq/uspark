import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminalHome } from "../TerminalHome";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock Clerk authentication
vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}));

// Mock react-console-emulator
vi.mock("react-console-emulator", () => ({
  default: ({
    welcomeMessage,
    commands,
    promptLabel,
  }: {
    welcomeMessage: string;
    commands: Record<string, { description: string; fn: () => string | void }>;
    promptLabel: string;
  }) => (
    <div data-testid="terminal">
      <div data-testid="welcome-message">{welcomeMessage}</div>
      <div data-testid="prompt-label">{promptLabel}</div>
      <div data-testid="commands">
        {Object.entries(commands).map(([name, cmd]) => (
          <button
            key={name}
            data-testid={`command-${name}`}
            onClick={() => {
              const result = cmd.fn();
              if (result) {
                console.log(result);
              }
            }}
          >
            {name}: {cmd.description}
          </button>
        ))}
      </div>
    </div>
  ),
}));

describe("TerminalHome", () => {
  const mockPush = vi.fn();
  const mockOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
    // Mock window.open
    global.window.open = mockOpen;
    // Default to not signed in
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isSignedIn: false,
    });
  });

  it("renders terminal with welcome message", () => {
    render(<TerminalHome />);

    const welcomeMessage = screen.getByTestId("welcome-message");
    expect(welcomeMessage.textContent).toContain("Welcome to uSpark");
    expect(welcomeMessage.textContent).toContain(
      "The Manager for ALL AI Coding Tools",
    );
  });

  it("displays visitor prompt label when not signed in", () => {
    render(<TerminalHome />);

    const promptLabel = screen.getByTestId("prompt-label");
    expect(promptLabel.textContent).toBe("visitor@uspark:~$");
  });

  it("displays user prompt label when signed in", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isSignedIn: true,
    });

    render(<TerminalHome />);

    const promptLabel = screen.getByTestId("prompt-label");
    expect(promptLabel.textContent).toBe("user@uspark:~$");
  });

  it("shows available commands in welcome message", () => {
    render(<TerminalHome />);

    const welcomeMessage = screen.getByTestId("welcome-message");
    expect(welcomeMessage.textContent).toContain("about");
    expect(welcomeMessage.textContent).toContain("login");
    expect(welcomeMessage.textContent).toContain("signup");
    expect(welcomeMessage.textContent).toContain("github");
  });

  it("has about command with correct description", () => {
    render(<TerminalHome />);

    const aboutCommand = screen.getByTestId("command-about");
    expect(aboutCommand.textContent).toContain("Learn about uSpark");
  });

  it("login command navigates to sign-in page when not signed in", () => {
    render(<TerminalHome />);

    const loginCommand = screen.getByTestId("command-login");
    expect(loginCommand.textContent).toContain("Sign in to your account");

    loginCommand.click();
    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });

  it("login command navigates to projects page when already signed in", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isSignedIn: true,
    });

    render(<TerminalHome />);

    const loginCommand = screen.getByTestId("command-login");
    loginCommand.click();

    expect(mockPush).toHaveBeenCalledWith("/projects");
  });

  it("has signup command that navigates to sign-up page", () => {
    render(<TerminalHome />);

    const signupCommand = screen.getByTestId("command-signup");
    expect(signupCommand.textContent).toContain("Join the waitlist");

    signupCommand.click();
    expect(mockPush).toHaveBeenCalledWith("/sign-up");
  });

  it("has github command that opens repository in new tab", () => {
    render(<TerminalHome />);

    const githubCommand = screen.getByTestId("command-github");
    expect(githubCommand.textContent).toContain("View our GitHub repository");

    githubCommand.click();
    expect(mockOpen).toHaveBeenCalledWith(
      "https://github.com/uspark-hq/uspark",
      "_blank",
    );
  });

  it("about command returns correct information", () => {
    render(<TerminalHome />);

    const consoleSpy = vi.spyOn(console, "log");
    const aboutCommand = screen.getByTestId("command-about");

    aboutCommand.click();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("uSpark - The Manager for ALL AI Coding Tools"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Project Intelligence"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Task Orchestration"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Progress Tracking"),
    );
  });
});
