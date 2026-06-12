import { describe, expect, it } from "vitest";
import { buildUserProfilePayload } from "@/lib/firebase/userProfile";

describe("firebase user profile", () => {
  it("includes createdAt for new profile documents", () => {
    expect(
      buildUserProfilePayload({
        createdAt: "created-timestamp",
        updatedAt: "updated-timestamp",
        user: {
          uid: "user-1",
          email: "john@example.com",
          displayName: "John",
          photoURL: null,
        },
      }),
    ).toEqual({
      uid: "user-1",
      email: "john@example.com",
      displayName: "John",
      photoURL: null,
      createdAt: "created-timestamp",
      updatedAt: "updated-timestamp",
    });
  });

  it("omits createdAt when updating an existing profile document", () => {
    expect(
      buildUserProfilePayload({
        updatedAt: "updated-timestamp",
        user: {
          uid: "user-1",
          email: null,
          displayName: null,
          photoURL: null,
        },
      }),
    ).toEqual({
      uid: "user-1",
      email: null,
      displayName: null,
      photoURL: null,
      updatedAt: "updated-timestamp",
    });
  });
});
