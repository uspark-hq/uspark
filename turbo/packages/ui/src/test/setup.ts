import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// Make React available globally for all tests
globalThis.React = React;

// Make vitest utilities available globally
globalThis.vi = vi;
