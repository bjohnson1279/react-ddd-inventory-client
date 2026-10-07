import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiUsageDashboardPanel } from "../../src/panels/ApiUsageDashboardPanel";
import { useInventory } from "../../src/api/client";

vi.mock("../../src/api/client", () => ({
  useInventory: vi.fn(),
}));

describe("ApiUsageDashboardPanel", () => {
  const mockGetApiUsageMetrics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useInventory as any).mockReturnValue({
      client: {
        getApiUsageMetrics: mockGetApiUsageMetrics,
      },
    });
  });

  it("renders empty state correctly when no metrics are returned", async () => {
    mockGetApiUsageMetrics.mockResolvedValue([]);

    render(<ApiUsageDashboardPanel tenantId="tenant-123" />);

    expect(mockGetApiUsageMetrics).toHaveBeenCalledWith("tenant-123");

    await waitFor(() => {
      expect(screen.getByText("No metrics available.")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Total API Calls").previousElementSibling,
    ).toHaveTextContent("0");
    expect(
      screen.getByText("Total Errors").previousElementSibling,
    ).toHaveTextContent("0");
    expect(
      screen.getByText("Avg Latency").previousElementSibling,
    ).toHaveTextContent("0 ms");
  });

  it("renders metrics data correctly when metrics are returned", async () => {
    const mockMetrics = [
      {
        date: "2023-10-24",
        endpoint: "/api/v1/inventory",
        calls: 100,
        errors: 2,
        averageLatencyMs: 45,
      },
      {
        date: "2023-10-25",
        endpoint: "/api/v1/orders",
        calls: 200,
        errors: 0,
        averageLatencyMs: 30,
      },
    ];

    mockGetApiUsageMetrics.mockResolvedValue(mockMetrics);

    render(<ApiUsageDashboardPanel tenantId="tenant-123" />);

    await waitFor(() => {
      expect(screen.getByText("/api/v1/inventory")).toBeInTheDocument();
    });

    expect(screen.getByText("2023-10-24")).toBeInTheDocument();
    expect(screen.getByText("/api/v1/orders")).toBeInTheDocument();
    expect(screen.getByText("2023-10-25")).toBeInTheDocument();

    // Total calls = 100 + 200 = 300
    expect(
      screen.getByText("Total API Calls").previousElementSibling,
    ).toHaveTextContent("300");
    // Total errors = 2 + 0 = 2
    expect(
      screen.getByText("Total Errors").previousElementSibling,
    ).toHaveTextContent("2");
    // Avg latency = (100 * 45 + 200 * 30) / 300 = (4500 + 6000) / 300 = 10500 / 300 = 35.0
    expect(
      screen.getByText("Avg Latency").previousElementSibling,
    ).toHaveTextContent("35.0 ms");
  });

  it("handles error when getApiUsageMetrics fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("API Failure");
    mockGetApiUsageMetrics.mockRejectedValue(error);

    render(<ApiUsageDashboardPanel tenantId="tenant-123" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    expect(screen.getByText("No metrics available.")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
