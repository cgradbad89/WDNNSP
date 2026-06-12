import { describe, expect, it } from "vitest";
import { mapFirebaseUser } from "@/lib/auth/types";

describe("auth types", () => {
  it("maps Firebase user fields into the app-safe auth user shape", () => {
    expect(
      mapFirebaseUser({
        uid: "user-1",
        email: "john@example.com",
        displayName: "John",
        photoURL: "https://example.com/avatar.png",
      }),
    ).toEqual({
      uid: "user-1",
      email: "john@example.com",
      displayName: "John",
      photoURL: "https://example.com/avatar.png",
    });
  });
});
