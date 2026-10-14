import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PredictiveScheduling } from "../../src/components/Workforce/PredictiveScheduling";

describe("PredictiveScheduling Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders initial state correctly before generating a schedule", () => {
    render(<PredictiveScheduling />);

    expect(
      screen.getByRole("heading", {
        name: "Predictive Labor Scheduling",
        level: 1,
      }),
    ).toBeInTheDocument();

    const generateButton = screen.getByRole("button", {
      name: "Generate AI Schedule",
    });
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).not.toBeDisabled();
    expect(generateButton).toHaveAttribute("aria-busy", "false");

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

  it("shows generating loading state when schedule generation is triggered", () => {
    render(<PredictiveScheduling />);

    const generateButton = screen.getByRole("button", {
      name: "Generate AI Schedule",
    });

    act(() => {
      fireEvent.click(generateButton);
    });

    const loadingButton = screen.getByRole("button", {
      name: "Analyzing Demand...",
    });
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("aria-busy", "true");

    expect(
      screen.queryByText("No schedules generated for the upcoming period."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Suggested Shift Assignments"),
    ).not.toBeInTheDocument();
  });

  it("renders suggested shift schedule after generation completes", () => {
    render(<PredictiveScheduling />);

    const generateButton = screen.getByRole("button", {
      name: "Generate AI Schedule",
    });

    act(() => {
      fireEvent.click(generateButton);
    });

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(
      screen.getByRole("heading", {
        name: "Suggested Shift Assignments",
        level: 2,
      }),
    ).toBeInTheDocument();

    const restoredButton = screen.getByRole("button", {
      name: "Generate AI Schedule",
    });
    expect(restoredButton).toBeInTheDocument();
    expect(restoredButton).not.toBeDisabled();
    expect(restoredButton).toHaveAttribute("aria-busy", "false");

    // Headers
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByText("Zone")).toBeInTheDocument();
    expect(screen.getByText("Shift Start")).toBeInTheDocument();
    expect(screen.getByText("Shift End")).toBeInTheDocument();
    expect(screen.getByText("Target Picks")).toBeInTheDocument();

    // Row Data
    expect(screen.getByText("Sarah J.")).toBeInTheDocument();
    const zoneAElements = screen.getAllByText("Zone A");
    expect(zoneAElements).toHaveLength(2);
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

    expect(
      screen.getByRole("button", { name: "Approve & Publish Schedule" }),
    ).toBeInTheDocument();
  });
});
