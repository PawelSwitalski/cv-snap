import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import {
  HostFrameSchema,
  MAX_INBOUND_MESSAGE_BYTES,
  MAX_OUTBOUND_MESSAGE_BYTES,
  NativeRequestSchema,
  nativeResponseSchema,
  parseNativeRequest,
  RESPONSE_DATA_SCHEMAS,
  type NativeRequest,
} from "./protocol.js";
import { z } from "zod";

const validRequests: NativeRequest[] = [
  { type: "health", requestId: "r1" },
  { type: "extractPdfText", requestId: "r2", pdfBase64: "JVBERi0x" },
  { type: "createProfile", requestId: "r3", model: "claude-sonnet-5-5", cvText: "Jan Testowy" },
  {
    type: "parseRequirements",
    requestId: "r4",
    model: "claude-haiku-5-5",
    adText: "Senior Frontend Developer",
    url: null,
  },
  {
    type: "tailor",
    requestId: "r5",
    model: "claude-opus-5-5",
    profile: loadFixture("profile") as never,
    requirements: loadFixture("requirements") as never,
    outputLanguage: "pl",
    validatorFeedback: null,
  },
  { type: "cancel", requestId: "r5" },
];

describe("parseNativeRequest", () => {
  it.each(validRequests.map((request) => [request.type, request] as const))(
    "accepts a valid %s request",
    (_type, request) => {
      const result = parseNativeRequest(request);

      expect(result).toEqual({ ok: true, data: request });
    },
  );

  it("rejects an unknown message type with INVALID_MESSAGE", () => {
    const result = parseNativeRequest({ type: "deleteEverything", requestId: "r1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_MESSAGE");
  });

  it("rejects a request without requestId with a readable message", () => {
    const result = parseNativeRequest({ type: "health" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("requestId");
  });

  it.each([null, "health", 42, [], {}])("rejects non-request input %j", (input) => {
    expect(parseNativeRequest(input).ok).toBe(false);
  });

  it("rejects a model that is not selectable", () => {
    const result = parseNativeRequest({
      type: "createProfile",
      requestId: "r1",
      model: "gpt-9",
      cvText: "x",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an over-long requestId", () => {
    expect(parseNativeRequest({ type: "health", requestId: "x".repeat(65) }).ok).toBe(false);
  });
});

describe("HostFrameSchema", () => {
  it("parses progress frames and rejects unknown steps", () => {
    expect(
      HostFrameSchema.safeParse({ type: "progress", requestId: "r1", step: "tailoring" }).success,
    ).toBe(true);
    expect(
      HostFrameSchema.safeParse({ type: "progress", requestId: "r1", step: "dancing" }).success,
    ).toBe(false);
  });

  it("parses success and error response frames", () => {
    const success = { type: "response", requestId: "r1", response: { ok: true, data: { a: 1 } } };
    const failure = {
      type: "response",
      requestId: "r1",
      response: { ok: false, error: { code: "CANCELLED", message: "Cancelled" } },
    };

    expect(HostFrameSchema.safeParse(success).success).toBe(true);
    expect(HostFrameSchema.safeParse(failure).success).toBe(true);
  });

  it("rejects an error response with an unknown error code", () => {
    const frame = {
      type: "response",
      requestId: "r1",
      response: { ok: false, error: { code: "OOPS", message: "x" } },
    };

    expect(HostFrameSchema.safeParse(frame).success).toBe(false);
  });
});

describe("nativeResponseSchema", () => {
  it("checks the data shape of a success response", () => {
    const schema = nativeResponseSchema(z.object({ text: z.string() }));

    expect(schema.safeParse({ ok: true, data: { text: "hi" } }).success).toBe(true);
    expect(schema.safeParse({ ok: true, data: { text: 1 } }).success).toBe(false);
  });
});

describe("RESPONSE_DATA_SCHEMAS", () => {
  it("defines reply data for every request type except cancel", () => {
    const requestTypes = NativeRequestSchema.options.map((option) => option.shape.type.value);

    expect(Object.keys(RESPONSE_DATA_SCHEMAS).sort()).toEqual(
      requestTypes.filter((type) => type !== "cancel").sort(),
    );
  });

  it("validates fixtures as reply data", () => {
    expect(
      RESPONSE_DATA_SCHEMAS.parseRequirements.safeParse(loadFixture("requirements")).success,
    ).toBe(true);
    expect(RESPONSE_DATA_SCHEMAS.tailor.safeParse(loadFixture("plan")).success).toBe(true);
  });
});

describe("size limits", () => {
  it("match Chrome native-messaging limits", () => {
    expect(MAX_INBOUND_MESSAGE_BYTES).toBe(64 * 1024 * 1024);
    expect(MAX_OUTBOUND_MESSAGE_BYTES).toBe(1024 * 1024);
  });
});
