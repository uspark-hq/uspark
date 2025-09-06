/**
 * Demo page for testing chat components
 * This file demonstrates all the different states and scenarios
 * for the chat interface components.
 */

import React, { useState } from "react";
import { SessionDisplay } from "./SessionDisplay";
import { ChatStatus } from "./ChatStatus";
import {
  mockTurns,
  mockSession,
  getMockTurnsWithVariableBlocks,
} from "./mockData";
import type { TurnWithBlocks } from "./types";

export function ChatComponentsDemo() {
  const [scenario, setScenario] = useState<
    "default" | "running" | "failed" | "mixed"
  >("default");
  const [currentTurn, setCurrentTurn] = useState<TurnWithBlocks | undefined>();

  const getScenarioTurns = (): TurnWithBlocks[] => {
    switch (scenario) {
      case "running": {
        const runningTurn = mockTurns[2] || mockTurns[0];
        return [
          ...mockTurns.slice(0, 2),
          {
            ...runningTurn,
            status: "running" as const,
          } as TurnWithBlocks,
        ];
      }
      case "failed":
        return mockTurns.map((t) => ({
          ...t,
          status: "failed" as const,
        }));
      case "mixed":
        return getMockTurnsWithVariableBlocks(8);
      default:
        return mockTurns;
    }
  };

  const turns = getScenarioTurns();
  const activeTurn = currentTurn || turns.find((t) => t.status === "running");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Chat Components Demo</h1>

        {/* Scenario Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Test Scenarios</h2>
          <div className="flex gap-2">
            {(["default", "running", "failed", "mixed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setScenario(s);
                  setCurrentTurn(undefined);
                }}
                className={`px-4 py-2 rounded ${
                  scenario === s
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {scenario === "default" &&
              "Shows a typical conversation with various block types"}
            {scenario === "running" &&
              "Shows a conversation with an active running turn"}
            {scenario === "failed" && "Shows all turns in failed state"}
            {scenario === "mixed" &&
              "Shows a dynamic mix of different states and block counts"}
          </p>
        </div>

        {/* Chat Status Component */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">ChatStatus Component</h2>
          <ChatStatus
            currentTurn={activeTurn}
            sessionId={mockSession.id}
            onInterrupt={() => {
              console.log("Interrupt clicked!");
              if (activeTurn) {
                const updatedTurn = {
                  ...activeTurn,
                  status: "failed" as const,
                };
                setCurrentTurn(updatedTurn);
              }
            }}
          />
        </div>

        {/* Session Display Component */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">
            SessionDisplay Component
          </h2>
          <div
            className="border rounded-lg"
            style={{ maxHeight: "600px", overflow: "auto" }}
          >
            <SessionDisplay
              turns={turns}
              currentTurnId={activeTurn?.id}
              onTurnClick={(turnId) => {
                console.log(`Turn clicked: ${turnId}`);
                const turn = turns.find((t) => t.id === turnId);
                setCurrentTurn(turn);
              }}
            />
          </div>
        </div>

        {/* Component Features */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Component Features</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Real-time status updates with elapsed time counter</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Expandable/collapsible turns and blocks</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                Different block types: thinking, content, tool_use, tool_result
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                Status indicators for pending, running, completed, and failed
                states
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Interrupt functionality for running turns</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Duration display for completed turns</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Click handling for turn selection</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Responsive design with Tailwind CSS</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
