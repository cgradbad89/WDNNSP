// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AwardVerificationControls } from "@/components/results/AwardVerificationControls";

describe("AwardVerificationControls", () => {
  it("saves manual verification status, points, fees, and note", () => {
    const onSave = vi.fn();

    render(
      <AwardVerificationControls
        awardOptionId="award-1"
        onClear={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Verification status"), {
      target: { value: "manually_verified" },
    });
    fireEvent.change(screen.getByLabelText("Verified points (optional)"), {
      target: { value: "85000" },
    });
    fireEvent.change(
      screen.getByLabelText("Verified taxes/fees in USD (optional)"),
      { target: { value: "97.50" } },
    );
    fireEvent.change(screen.getByLabelText("Source or note (optional)"), {
      target: { value: "United.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save verification" }).closest("form")!,
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        awardOptionId: "award-1",
        status: "manually_verified",
        verifiedPointsRequired: 85000,
        verifiedTaxesAndFeesUsd: 97.5,
        note: "United.com",
      }),
    );
  });

  it("rejects invalid points and fees", () => {
    const onSave = vi.fn();

    render(
      <AwardVerificationControls
        awardOptionId="award-2"
        onClear={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Verified points (optional)"), {
      target: { value: "0" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save verification" }).closest("form")!,
    );

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("greater than zero");
  });

  it("supports no longer available and clearing the record", () => {
    const onSave = vi.fn();
    const onClear = vi.fn();

    render(
      <AwardVerificationControls
        awardOptionId="award-3"
        onClear={onClear}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Verification status"), {
      target: { value: "no_longer_available" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save verification" }).closest("form")!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear verification" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: "no_longer_available" }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
