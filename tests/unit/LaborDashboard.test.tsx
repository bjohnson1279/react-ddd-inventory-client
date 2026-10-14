import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LaborDashboard } from "../../src/components/Workforce/LaborDashboard";

describe("LaborDashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading state initially", () => {
    render(<LaborDashboard />);
    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
  });

  it("renders dashboard metrics and zone leaderboard after loading finishes", () => {
    render(<LaborDashboard />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(
      screen.queryByText("Loading your dashboard..."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "My Labor Dashboard" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Picks per Hour")).toBeInTheDocument();
    expect(screen.getAllByText("124").length).toBeGreaterThan(0);
    expect(screen.getByText("Accuracy Score")).toBeInTheDocument();
    expect(screen.getAllByText("99.8%").length).toBeGreaterThan(0);
    expect(screen.getByText("Distance Walked")).toBeInTheDocument();
    expect(screen.getByText("4.2 km")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Zone Leaderboard (Top Pickers)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah J.")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Mike T.")).toBeInTheDocument();
  });
});
