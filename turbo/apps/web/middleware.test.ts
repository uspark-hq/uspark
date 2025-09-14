import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import middleware from "./middleware";

// Mock Clerk middleware functions
const mockProtect = vi.fn();
const mockAuth = {
  protect: mockProtect,
};

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: vi.fn((handler) => {
    return (request: NextRequest) => {
      return handler(mockAuth, request);
    };
  }),
  createRouteMatcher: vi.fn((routes: string[]) => {
    return (request: NextRequest) => {
      const pathname = new URL(request.url).pathname;
      return routes.some((route) => {
        // Simple pattern matching for tests
        const pattern = route.replace(/\(\.\*\)/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(pathname);
      });
    };
  }),
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("public routes", () => {
    it("should not protect the homepage", async () => {
      const request = new NextRequest("http://localhost:3000/");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect sign-in pages", async () => {
      const request = new NextRequest("http://localhost:3000/sign-in");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect sign-up pages", async () => {
      const request = new NextRequest("http://localhost:3000/sign-up");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect share API endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/share/abc123");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect CLI auth device endpoint", async () => {
      const request = new NextRequest("http://localhost:3000/api/cli/auth/device");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect CLI auth token endpoint", async () => {
      const request = new NextRequest("http://localhost:3000/api/cli/auth/token");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect CLI auth pages", async () => {
      const request = new NextRequest("http://localhost:3000/cli-auth");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });

    it("should not protect CLI auth success page", async () => {
      const request = new NextRequest("http://localhost:3000/cli-auth/success");
      await middleware(request);
      expect(mockProtect).not.toHaveBeenCalled();
    });
  });

  describe("protected routes", () => {
    it("should protect settings pages", async () => {
      const request = new NextRequest("http://localhost:3000/settings");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect settings subpages", async () => {
      const request = new NextRequest("http://localhost:3000/settings/tokens");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect projects pages", async () => {
      const request = new NextRequest("http://localhost:3000/projects");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect API projects endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect API project-specific endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects/123/sessions");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect Claude API endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/claude/sessions");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect GitHub API endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/github/installations");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect shares management endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/shares");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should protect CLI auth generate-token endpoint", async () => {
      const request = new NextRequest("http://localhost:3000/api/cli/auth/generate-token");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });
  });

  describe("auth behavior", () => {
    it("should call auth.protect() when route is not public", async () => {
      mockProtect.mockResolvedValue(undefined);
      const request = new NextRequest("http://localhost:3000/settings");
      await middleware(request);
      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    it("should handle auth.protect() errors gracefully", async () => {
      mockProtect.mockRejectedValue(new Error("Unauthorized"));
      const request = new NextRequest("http://localhost:3000/settings");
      await expect(middleware(request)).rejects.toThrow("Unauthorized");
    });
  });
});