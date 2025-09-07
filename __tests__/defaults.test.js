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

  it("contains lockfile name", () => {
    expect(defaults.lockfileName).toBeDefined();
  });

  it("contains holddownTime", () => {
    expect(defaults.holddownTime).toBeDefined();
    expect(defaults.holddownTime).toBeGreaterThan(1000);
  });
});
