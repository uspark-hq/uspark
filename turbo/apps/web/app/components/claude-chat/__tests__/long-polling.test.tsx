import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSessionPolling } from "../use-session-polling";

describe("Long Polling with Versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useSessionPolling", () => {
    it("should use long polling with version tracking", async () => {
      const mockProjectId = "test-project";
      const mockSessionId = "sess_test123";

      // Mock initial fetch response (regular turns endpoint)
      const initialTurns = {
        turns: [
          {
            id: "turn_1",
            userPrompt: "Hello",
            status: "completed",
            version: 1,
            blockCount: 2,
          },
        ],
      };

      // Mock turn detail response
      const turnDetail = {
        blocks: [
          { id: "block_1", type: "content", content: { text: "Hi!" }, sequenceNumber: 0 },
          { id: "block_2", type: "content", content: { text: "How are you?" }, sequenceNumber: 1 },
        ],
      };

      // Mock long poll response with update
      const updateResponse = {
        version: 2,
        hasMore: false,
        session: {
          id: mockSessionId,
          version: 2,
          updatedAt: new Date().toISOString(),
        },
        turns: [
          {
            id: "turn_2",
            userPrompt: "New message",
            status: "in_progress",
            version: 2,
            blockCount: 1,
            blocks: [
              { id: "block_3", type: "thinking", content: { text: "Processing..." }, sequenceNumber: 0 },
            ],
          },
        ],
      };

      // Mock fetch
      let fetchCallCount = 0;
      global.fetch = vi.fn(async (url: string) => {
        fetchCallCount++;

        if (url.includes("/turns") && !url.includes("/turn_")) {
          // Initial turns list
          return {
            ok: true,
            json: async () => initialTurns,
          } as Response;
        }

        if (url.includes("/turns/turn_1")) {
          // Turn detail
          return {
            ok: true,
            json: async () => turnDetail,
          } as Response;
        }

        if (url.includes("/updates")) {
          // Long polling endpoint
          if (fetchCallCount <= 3) {
            // First call returns 204 (no updates)
            return {
              ok: true,
              status: 204,
              headers: {
                get: (header: string) => header === "X-Session-Version" ? "1" : null,
              },
            } as Response;
          } else {
            // Second call returns update
            return {
              ok: true,
              status: 200,
              json: async () => updateResponse,
            } as Response;
          }
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const { result } = renderHook(() =>
        useSessionPolling(mockProjectId, mockSessionId),
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.turns).toHaveLength(1);
      });

      // Verify initial state
      expect(result.current.version).toBe(1);
      expect(result.current.turns[0].id).toBe("turn_1");

      // Wait for long poll to receive update
      await waitFor(() => {
        expect(result.current.turns).toHaveLength(2);
      }, { timeout: 5000 });

      // Verify updated state
      expect(result.current.version).toBe(2);
      expect(result.current.turns[1].id).toBe("turn_2");
      expect(result.current.turns[1].status).toBe("in_progress");
      expect(result.current.hasActiveTurns).toBe(true);
    });

    it("should handle 204 No Content responses correctly", async () => {
      const mockProjectId = "test-project";
      const mockSessionId = "sess_test456";

      const initialTurns = {
        turns: [],
      };

      global.fetch = vi.fn(async (url: string) => {
        if (url.includes("/turns") && !url.includes("/turn_")) {
          return {
            ok: true,
            json: async () => initialTurns,
          } as Response;
        }

        if (url.includes("/updates")) {
          // Always return 204 (no updates)
          return {
            ok: true,
            status: 204,
            headers: {
              get: (header: string) => header === "X-Session-Version" ? "0" : null,
            },
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const { result } = renderHook(() =>
        useSessionPolling(mockProjectId, mockSessionId),
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      // Verify state remains empty
      expect(result.current.turns).toHaveLength(0);
      expect(result.current.version).toBe(0);
      expect(result.current.hasActiveTurns).toBe(false);
    });

    it("should merge turns correctly when receiving updates", async () => {
      const mockProjectId = "test-project";
      const mockSessionId = "sess_test789";

      const { result } = renderHook(() =>
        useSessionPolling(mockProjectId, mockSessionId),
      );

      // Manually set initial state
      act(() => {
        result.current.turns = [
          {
            id: "turn_1",
            userPrompt: "First",
            status: "completed",
            version: 1,
            blockCount: 1,
            startedAt: null,
            completedAt: null,
            blocks: [],
          },
        ];
      });

      // Mock refetch with updates
      global.fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          version: 3,
          hasMore: false,
          session: {
            id: mockSessionId,
            version: 3,
            updatedAt: new Date().toISOString(),
          },
          turns: [
            {
              id: "turn_1",
              userPrompt: "First",
              status: "completed",
              version: 2,
              blockCount: 2,
              blocks: [
                { id: "block_1", type: "content", content: {}, sequenceNumber: 0 },
                { id: "block_2", type: "content", content: {}, sequenceNumber: 1 },
              ],
            },
            {
              id: "turn_2",
              userPrompt: "Second",
              status: "in_progress",
              version: 3,
              blockCount: 0,
              blocks: [],
            },
          ],
        }),
      } as Response));

      await act(async () => {
        await result.current.refetch();
      });

      // Verify merged state
      expect(result.current.turns).toHaveLength(2);
      expect(result.current.turns[0].blockCount).toBe(2);
      expect(result.current.turns[1].id).toBe("turn_2");
      expect(result.current.version).toBe(3);
    });
  });
});