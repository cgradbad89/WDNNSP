import { describe, expect, it } from "vitest";
import {
  CURRENT_PERSISTENCE_VERSION,
  createPersistedEnvelope,
  unwrapPersistedEnvelope,
} from "@/lib/persistence/schema";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

describe("persistence schema", () => {
  it("wraps data in the current persistence envelope", () => {
    expect(createPersistedEnvelope(["wallet"])).toEqual({
      version: CURRENT_PERSISTENCE_VERSION,
      data: ["wallet"],
    });
  });

  it("unwraps valid current-version data", () => {
    expect(
      unwrapPersistedEnvelope(
        { version: CURRENT_PERSISTENCE_VERSION, data: ["search"] },
        isStringArray,
      ),
    ).toEqual(["search"]);
  });

  it("rejects unsupported versions", () => {
    expect(
      unwrapPersistedEnvelope({ version: 0, data: ["old"] }, isStringArray),
    ).toBeUndefined();
  });

  it("rejects malformed envelopes without throwing", () => {
    expect(unwrapPersistedEnvelope(["not-envelope"], isStringArray)).toBeUndefined();
    expect(
      unwrapPersistedEnvelope({ version: CURRENT_PERSISTENCE_VERSION }, isStringArray),
    ).toBeUndefined();
  });

  it("rejects current-version data that fails validation", () => {
    expect(
      unwrapPersistedEnvelope(
        { version: CURRENT_PERSISTENCE_VERSION, data: [123] },
        isStringArray,
      ),
    ).toBeUndefined();
  });
});
