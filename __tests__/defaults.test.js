/**
 * Unit tests for defaults.js
 */
import { jest } from "@jest/globals";
import * as core from "../__fixtures__/actions/core.js";

jest.unstable_mockModule("@actions/core", () => core);

const defaults = await import("../src/defaults");

describe("defaults.js", () => {
  beforeEach(() => { });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("contains colors", () => {
    expect(defaults.colors).toBeDefined();
  });

  it("contains longSeverity", () => {
    expect(defaults.longSeverity).toBeDefined();
  });
});
