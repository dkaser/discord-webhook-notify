/**
 * Unit tests for the action's main functionality, src/main.js
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { beforeEach, afterEach, jest } from "@jest/globals";

// Mocks should be declared before the module being tested is imported.

// Mock @actions/core setup, which is a little odd
import * as coreMock from "../__fixtures__/actions/core.js"; // import mock "edits"
jest.unstable_mockModule("@actions/core", () => coreMock); // apply them in jest
const core = await import("@actions/core"); // dynamic import actual

// Mock discord.js setup
// This time it's just a custom mock class so we can avoid
// using jest.unstable_mockModule()
import { MockWebhookClient } from "../__fixtures__/discord.js";

import * as defaults from "../src/defaults.js";

// The module being tested should be imported last, dynamically.
// This ensures that the modules mocks are used in place their imports.
const { run, getDebugTestUrl } = await import("../src/main.js");

const regexCorrectWebhookUrl =
  "https://discord.com/api/webhooks/999999999999999999" +
  "/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

describe("main.js", () => {
  beforeEach(() => { });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("is loaded and has a run() function", () => {
    expect(run).toBeDefined();
    expect(run).toBeInstanceOf(Function);
  });

  it("is loaded and has a function called getDebugTestUrl", () => {
    expect(getDebugTestUrl).toBeInstanceOf(Function);
  });

  function testGetDebugTestUrlHelper() {
    let url;
    try {
      url = getDebugTestUrl();
    } catch (e) {
      return e.code + ": Test URL doesn't exist but that's OK.";
    }
    return url;
  }

  it("getDebugTestUrl can be called", () => {
    const result = testGetDebugTestUrlHelper();
    expect(result).toMatch(/^ENOENT|http/);
    console.log("Test URL: " + result)
  });

  describe("run", () => {
    beforeEach(() => {
    });
    afterEach(() => {
      // jest.clearAllMocks();
    });

    async function testUseTestURLHelper(whc) {
      let status = "OK";
      try {
        await run(whc);
      } catch (e) {
        status = e.code;
      }
      return status;
    }

    it("recognizes webhookUrl == 'useTestURL'", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: "useTestURL",
          text: "content"
        }[input];
      });
      let whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      let result;
      const twuh = async () => {
        result = await testUseTestURLHelper(whc);
      };
      expect(twuh).not.toThrow();
      result = await testUseTestURLHelper(whc);
      expect(result).toMatch(/^ENOINT|OK/);
    });

    it("generates the right error when webhookUrl is empty", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: "",
          flags: "SuppressNotifications",
          username: "Silent Bob",
          avatarUrl: "http://my.foot",
          text: "Some text."
        }[input];
      });
      const whc = new MockWebhookClient({ webhookUrl: "" });
      await run(whc);
      expect(core.warning).toHaveBeenCalled();
      expect(core.warning.mock.lastCall[0]).toMatch(
        /webhookUrl was not provided/gi
      );
      //resolvers[0]("test0 done");
    });

    it("generates the right error when webhookUrl is undefined", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          flags: "SuppressNotifications",
          username: "Silent Bob",
          avatarUrl: "http://my.foot",
          text: "Some text."
        }[input];
      });
      const whc = new MockWebhookClient({ webhookUrl: "" });
      expect(async () => {
        await run(whc);
      }).not.toThrow();
      expect(core.warning).toHaveBeenCalled();
      expect(core.warning.mock.lastCall[0]).toMatch(
        /webhookUrl was not provided/gi
      );
      expect(whc.send_called).toBe(false);
      //resolvers[1]("test1 done");
    });

    it("works with typical inputs and all valid flags", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: regexCorrectWebhookUrl,
          flags: "SuppressNotifications SuppressEmbeds IsComponentsV2",
          username: "Silent Bob",
          avatarUrl: "http://my.foot",
          text: "Some text.",
          severity: "error",
          description: "This is a description"
        }[input];
      });
      let whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);
      expect(whc.send_called).toBe(true);
      expect(core.warning).not.toHaveBeenCalled();
      expect(core.notice).not.toHaveBeenCalled();
      const msg = whc.send_arg;
      expect(msg).toBeDefined();
      expect(msg["content"]).toMatch(/\w+/);
      expect(msg["username"]).toMatch(/\w{2,}/);
      //resolvers[2]("test2 done");
    });

    it("catches webhook send errors and logs a message", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: regexCorrectWebhookUrl,
          username: "Silent Bob",
          avatarUrl: "http://my.foot",
          text: "Some text."
        }[input];
      });
      let whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      whc.send = function () {
        throw new Error();
      }
      await run(whc)
      expect(core.notice).toHaveBeenCalled();
    });

    it("ignores nonexistant flags and doesn't error", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: regexCorrectWebhookUrl,
          flags: "NonExistantFlag",
          text: "Some text."
        }[input];
      });
      let whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      let err = false;
      try {
        await run(whc);
      } catch {
        err = true;
      }
      expect(err).toBe(false);
      expect(whc.send_called).toBe(true);

    })

    it("leaves the message text out if it is empty but there is an embed", async () => {
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: regexCorrectWebhookUrl,
          severity: "info",
          description: "this is some info"
        }[input];
      });
      let whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });

      await run(whc);
      expect(whc.send_called).toBe(true);
      expect(whc.send_arg.text).not.toBeDefined();
      expect(whc.send_arg.embeds).toBeDefined();
      expect(whc.send_arg.embeds[0].data.title).toMatch("Informational");
      expect(whc.send_arg.embeds[0].data.description).toMatch("this is some info");
    });

    it("works after delay if executed with no delay in between two calls", async () => {
      // console.log(await Promise.all(promises));
      core.getInput.mockImplementation((input) => {
        return {
          webhookUrl: regexCorrectWebhookUrl,
          text: "foo",
          username: "bar"
        }[input];
      });
      let whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });

      const start_time = Date.now();
      await run(whc);
      expect(Date.now()).toBeGreaterThanOrEqual(start_time);
      await run(whc);
      const duration = Date.now() - start_time;
      expect(duration).toBeGreaterThanOrEqual(defaults.holddownTime);
    }, 10000);

    test.todo("works with each individual optional input set");
    test.todo("works with all inputs set");
    test.todo("uses the configured holddownTime delay if set");
    test.todo("honors processing options");

  });

  describe("fields processing", () => {
    test("should warn and truncate when more than 25 fields are provided", async () => {
      const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({})
      };

      // Create 30 fields to test the limit
      const manyFields = Array.from({ length: 30 }, (_, i) => ({
        name: `Field ${i}`,
        value: `Value ${i}`,
        inline: false
      }));

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(manyFields);
        return "";
      });

      await run(mockWebhookClient);

      expect(core.warning).toHaveBeenCalledWith("Discord only supports up to 25 fields. Extra fields ignored.");
    });

    test("should throw error when field name is not a string", async () => {
      const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({})
      };

      const invalidFields = [
        { name: 123, value: "valid value" }
      ];

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(invalidFields);
        return "";
      });

      await run(mockWebhookClient);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("field name or value is not a string")
      );
    });

    test("should throw error when field value is not a string", async () => {
      const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({})
      };

      const invalidFields = [
        { name: "valid name", value: 456 }
      ];

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(invalidFields);
        return "";
      });

      await run(mockWebhookClient);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("field name or value is not a string")
      );
    });

    test("should handle invalid JSON in fields input", async () => {
      const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({})
      };

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return "invalid json{";
        return "";
      });

      await run(mockWebhookClient);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("The fields input is not valid JSON")
      );
    });

    test("should handle non-array fields input", async () => {
      const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({})
      };

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify({ not: "an array" });
        return "";
      });

      await run(mockWebhookClient);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("not an array")
      );
    });

    test("should handle fields input with missing name or value properties", async () => {
      const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({})
      };

      const invalidFields = [
        { name: "valid name" }, // missing value
        { value: "valid value" } // missing name
      ];

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(invalidFields);
        return "";
      });

      await run(mockWebhookClient);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("field name or value is not a string")
      );
    });
  });
});
