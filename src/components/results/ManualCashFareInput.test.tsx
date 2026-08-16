// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManualCashFareInput } from "@/components/results/ManualCashFareInput";

describe("ManualCashFareInput", () => {
  it("accepts a positive fare, labels it manual, and supports clearing", () => {
    const onSave = vi.fn();
    const onClear = vi.fn();

    render(<ManualCashFareInput onClear={onClear} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Cash fare in USD"), {
      target: { value: "3200" },
    });
    fireEvent.change(screen.getByLabelText("Source or note (optional)"), {
      target: { value: "Google Flights" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this fare" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amountUsd: 3200,
        note: "Google Flights",
        source: "manual",
      }),
    );
    expect(onSave.mock.calls[0][0]).toMatchObject({
      amountUsd: 3200,
      source: "manual",
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear manual fare" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it.each(["", "0", "-4", "not-a-number"])(
    "rejects invalid fare %s",
    (value) => {
      const onSave = vi.fn();
      render(<ManualCashFareInput onClear={vi.fn()} onSave={onSave} />);

      fireEvent.change(screen.getByLabelText("Cash fare in USD"), {
        target: { value },
      });
      fireEvent.click(screen.getByRole("button", { name: "Use this fare" }));

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    },
  );
});
