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

// The module being tested should be imported last, dynamically.
// This ensures that the modules mocks are used in place their imports.
const { run } = await import("../src/main.js");

const regexCorrectWebhookUrl =
  "https://discord.com/api/webhooks/999999999999999999" +
  "/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

describe("main.js", () => {
  beforeEach(() => { });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("is loaded and has a await run() function", () => {
    expect(run).toBeDefined();
    expect(run).toBeInstanceOf(Function);
  });

  describe("run", () => {
    beforeEach(() => {
    });
    afterEach(() => {
      // jest.clearAllMocks();
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
      expect(core.setFailed).toHaveBeenCalled();
      expect(core.setFailed.mock.lastCall[0]).toMatch(
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
      expect(core.setFailed).toHaveBeenCalled();
      expect(core.setFailed.mock.lastCall[0]).toMatch(
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
      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);
      expect(whc.send_called).toBe(true);
      expect(core.warning).not.toHaveBeenCalled();
      expect(core.notice).not.toHaveBeenCalled();
      const msg = whc.send_arg;
      expect(msg).toBeDefined();
      expect(msg.content).toMatch(/\w+/);
      expect(msg.username).toMatch(/\w{2,}/);
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
      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      whc.send = () => {
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
      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
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
          title: "Informational",
          description: "this is some info"
        }[input];
      });
      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });

      await run(whc);
      expect(whc.send_called).toBe(true);
      expect(whc.send_arg.text).not.toBeDefined();
      expect(whc.send_arg.embeds).toBeDefined();
      expect(whc.send_arg.embeds[0].data.title).toMatch("Informational");
      expect(whc.send_arg.embeds[0].data.description).toMatch("this is some info");
    });

    test.todo("works with each individual optional input set");
    test.todo("works with all inputs set");
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
      const invalidFields = [
        { name: "valid name", value: 456 }
      ];

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return "https://discord.com/api/webhooks/123/token";
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(invalidFields);
        return "";
      });

      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("field name or value is not a string")
      );
    });

    test("should handle invalid JSON in fields input", async () => {

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return regexCorrectWebhookUrl;
        if (name === "severity") return "info";
        if (name === "fields") return "invalid json{";
        return "";
      });

      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("The fields input is not valid JSON")
      );
    });

    test("should handle non-array fields input", async () => {

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return regexCorrectWebhookUrl;
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify({ not: "an array" });
        return "";
      });

      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("not an array")
      );
    });

    test("should handle fields input with missing name or value properties", async () => {
      const invalidFields = [
        { name: "valid name" }, // missing value
        { value: "valid value" } // missing name
      ];

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return regexCorrectWebhookUrl;
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(invalidFields);
        return "";
      });

      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("field name or value is not a string")
      );
    });

    test("should set field.inline to false if not true", async () => {
      const fieldsInput = [
        { name: "Field 1", value: "Value 1" }, // no inline property
        { name: "Field 2", value: "Value 2", inline: "not-boolean" }, // not true
        { name: "Field 3", value: "Value 3", inline: false }, // already false
        { name: "Field 4", value: "Value 4", inline: true } // should remain true
      ];

      core.getInput.mockImplementation((name) => {
        if (name === "webhookUrl") return regexCorrectWebhookUrl;
        if (name === "severity") return "info";
        if (name === "fields") return JSON.stringify(fieldsInput);
        return "";
      });

      const whc = new MockWebhookClient({ webhookUrl: regexCorrectWebhookUrl });
      await run(whc);

      // The fields are passed to EmbedBuilder.addFields, which expects inline to be boolean
      // We can check what was sent to the mock webhook client
      const sentMsg = whc.send_arg;
      expect(sentMsg).toBeDefined();
      expect(sentMsg.embeds).toBeDefined();
      const embed = sentMsg.embeds[0];
      const sentFields = embed.data.fields;

      expect(sentFields[0].inline).toBe(false);
      expect(sentFields[1].inline).toBe(false);
      expect(sentFields[2].inline).toBe(false);
      expect(sentFields[3].inline).toBe(true);
    });
  });
});
