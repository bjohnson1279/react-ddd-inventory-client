import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { YieldManagementDashboard } from "../../src/components/Pricing/YieldManagementDashboard";

describe("YieldManagementDashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders initial dashboard state correctly", () => {
    render(<YieldManagementDashboard />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Yield Management & Dynamic Pricing",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Maximize capital recovery on aging stock via FEFO markdown automation.",
      ),
    ).toBeInTheDocument();

    // Check liquidation rules table
    expect(screen.getByText("Active Liquidation Rules")).toBeInTheDocument();
    expect(screen.getByText("<= 30")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
    expect(screen.getByText("<= 15")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("<= 5")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();

    // Check default active / inactive statuses
    const activeStatuses = screen.getAllByText("Active");
    expect(activeStatuses).toHaveLength(2);
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    // Check empty markdown event log message
    expect(
      screen.getByText("No markdowns have been executed recently."),
    ).toBeInTheDocument();

    // Check optimization button
    const optButton = screen.getByRole("button", { name: "Run Optimization" });
    expect(optButton).toBeInTheDocument();
    expect(optButton).not.toBeDisabled();
    expect(optButton).toHaveAttribute("aria-busy", "false");
  });

  it("executes yield optimization and displays loading state and resulting markdown events", () => {
    render(<YieldManagementDashboard />);

    const optButton = screen.getByRole("button", { name: "Run Optimization" });

    // Trigger yield optimization
    fireEvent.click(optButton);

    // Verify loading state
    expect(optButton).toHaveTextContent("Optimizing Yield...");
    expect(optButton).toBeDisabled();
    expect(optButton).toHaveAttribute("aria-busy", "true");

    // Advance timers by 1500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Verify loading state is cleared
    expect(optButton).toHaveTextContent("Run Optimization");
    expect(optButton).not.toBeDisabled();
    expect(optButton).toHaveAttribute("aria-busy", "false");

    // Verify markdown event log is updated
    expect(
      screen.queryByText("No markdowns have been executed recently."),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Variant var_88x")).toBeInTheDocument();
    expect(
      screen.getByText(
        "FEFO Proximity: 28 days until expiration (Rule: 15% off)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("$12.75")).toBeInTheDocument();

    expect(screen.getByText("Variant var_99y")).toBeInTheDocument();
    expect(
      screen.getByText(
        "FEFO Proximity: 12 days until expiration (Rule: 30% off)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.getByText("$14.00")).toBeInTheDocument();
  });
});
