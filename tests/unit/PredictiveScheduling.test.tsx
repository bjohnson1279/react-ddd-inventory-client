import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PredictiveScheduling } from "../../src/components/Workforce/PredictiveScheduling";

describe("PredictiveScheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders initial state correctly", () => {
    render(<PredictiveScheduling />);

    expect(screen.getByText("Predictive Labor Scheduling")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate AI Schedule" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No schedules generated for the upcoming period."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Click "Generate AI Schedule" to let the sidecar analyze demand forecasts and suggest shifts.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Suggested Shift Assignments"),
    ).not.toBeInTheDocument();
  });

  it("handles schedule generation loading and rendered results", () => {
    render(<PredictiveScheduling />);

    const generateBtn = screen.getByRole("button", {
      name: "Generate AI Schedule",
    });

    fireEvent.click(generateBtn);

    // Assert loading state
    expect(screen.getByText("Analyzing Demand...")).toBeInTheDocument();
    const loadingBtn = screen.getByRole("button", {
      name: "Analyzing Demand...",
    });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute("aria-busy", "true");

    // Empty state should no longer be rendered while loading
    expect(
      screen.queryByText("No schedules generated for the upcoming period."),
    ).not.toBeInTheDocument();

    // Fast-forward timers to complete simulation
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Assert completed state
    expect(
      screen.getByRole("button", { name: "Generate AI Schedule" }),
    ).not.toBeDisabled();
    expect(screen.getByText("Suggested Shift Assignments")).toBeInTheDocument();

    // Table column headers
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByText("Zone")).toBeInTheDocument();
    expect(screen.getByText("Shift Start")).toBeInTheDocument();
    expect(screen.getByText("Shift End")).toBeInTheDocument();
    expect(screen.getByText("Target Picks")).toBeInTheDocument();

    // Shift row details
    expect(screen.getByText("Sarah J.")).toBeInTheDocument();
    expect(screen.getAllByText("Zone A")).toHaveLength(2);
    expect(screen.getByText("08:00 AM")).toBeInTheDocument();
    expect(screen.getByText("04:00 PM")).toBeInTheDocument();
    expect(screen.getByText("1100")).toBeInTheDocument();

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Zone B")).toBeInTheDocument();
    expect(screen.getByText("09:00 AM")).toBeInTheDocument();
    expect(screen.getByText("05:00 PM")).toBeInTheDocument();
    expect(screen.getByText("950")).toBeInTheDocument();

    expect(screen.getByText("Mike T.")).toBeInTheDocument();
    expect(screen.getByText("12:00 PM")).toBeInTheDocument();
    expect(screen.getByText("08:00 PM")).toBeInTheDocument();
    expect(screen.getByText("800")).toBeInTheDocument();

    // Action button
    expect(
      screen.getByRole("button", { name: "Approve & Publish Schedule" }),
    ).toBeInTheDocument();
  });
});
