import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RebalancingMatrixPanel } from "./RebalancingMatrixPanel";

const mockApiData = {
  summary: {
    warehouses: [
      {
        warehouseId: "WH-1",
        region: "North",
        healthStatus: "HEALTHY",
        totalSkus: 150,
        avgDoc: 20,
        surplusCount: 5,
        deficitCount: 2,
      },
    ],
    totalEstimatedShippingCost: 1500,
    skusImproved: 10,
    avgDocImprovement: 5,
  },
  recommendations: [
    {
      sourceWarehouseId: "WH-1",
      destWarehouseId: "WH-2",
      priority: "HIGH",
      sku: "SKU-123",
      quantity: 50,
      estimatedShippingCost: 100,
      destCurrentDoc: 4,
      destProjectedDoc: 14,
      urgencyReason: "Stockout risk",
    },
  ],
  matrix: {
    warehouses: ["WH-1", "WH-2"],
    rows: [
      {
        sku: "SKU-123",
        cells: [
          { doc: 45, onHand: 100, velocity: 2 },
          { doc: 4, onHand: 10, velocity: 2.5 },
        ],
      },
    ],
  },
};

describe("RebalancingMatrixPanel", () => {
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      getRebalanceMatrix: vi.fn().mockResolvedValue(mockApiData),
    };

    // Mock window.alert
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeleton and action button busy state then successfully displays matrix data", async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApi.getRebalanceMatrix.mockReturnValueOnce(pendingPromise);

    const { container } = render(<RebalancingMatrixPanel api={mockApi} />);

    expect(screen.getByText("Rebalancing Matrix")).toBeInTheDocument();
    const actionButton = screen.getByRole("button", { name: "Calculating..." });
    expect(actionButton).toBeDisabled();
    expect(actionButton).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".ai-skeleton")).toBeInTheDocument();

    resolvePromise!(mockApiData);

    await waitFor(() => {
      expect(screen.getAllByText("WH-1").length).toBeGreaterThan(0);
    });

    const activeActionButton = screen.getByRole("button", {
      name: "Calculate Matrix",
    });
    expect(activeActionButton).not.toBeDisabled();
    expect(activeActionButton).toHaveAttribute("aria-busy", "false");
    expect(container.querySelector(".ai-skeleton")).not.toBeInTheDocument();

    // Check Warehouse Health Cards
    expect(screen.getByText("North")).toBeInTheDocument();

    // Check Cost-Benefit Summary
    expect(screen.getByText("Cost-Benefit Summary")).toBeInTheDocument();
    expect(screen.getByText("Total Transfers")).toBeInTheDocument();
    expect(screen.getByText(/\$1500/)).toBeInTheDocument();

    // Check Transfer Recommendations
    expect(screen.getAllByText("SKU-123").length).toBeGreaterThan(0);
    expect(screen.getByText("Stockout risk")).toBeInTheDocument();

    // Check Matrix Grid
    expect(screen.getByText("Matrix Grid (DOC)")).toBeInTheDocument();
  });

  it("handles errors properly and provides a retry mechanism", async () => {
    mockApi.getRebalanceMatrix.mockRejectedValueOnce(
      new Error("Failed to fetch matrix"),
    );

    render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch matrix")).toBeInTheDocument();
    });

    // Dismiss error
    const dismissButton = screen.getByLabelText("Dismiss error");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Failed to fetch matrix"),
      ).not.toBeInTheDocument();
    });

    // Trigger failure again
    mockApi.getRebalanceMatrix.mockRejectedValueOnce(
      new Error("Second failure"),
    );

    // Hit calculate button to retry
    const calcButton = screen.getByText("Calculate Matrix");
    fireEvent.click(calcButton);

    await waitFor(() => {
      expect(screen.getByText("Second failure")).toBeInTheDocument();
    });

    // Hit retry inside alert
    mockApi.getRebalanceMatrix.mockResolvedValueOnce(mockApiData);
    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText("Second failure")).not.toBeInTheDocument();
      expect(screen.getAllByText("WH-1").length).toBeGreaterThan(0);
    });
  });

  it("handles fallback error message when error object lacks a message property", async () => {
    mockApi.getRebalanceMatrix.mockRejectedValueOnce({});

    render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to calculate matrix"),
      ).toBeInTheDocument();
    });
  });

  it("renders warehouse health status variants and fallback defaults", async () => {
    const warehouseVariantData = {
      summary: {
        warehouses: [
          {
            warehouseId: "WH-ATTN",
            healthStatus: "ATTENTION",
            // Missing region, totalSkus, avgDoc, surplusCount, deficitCount
          },
          {
            warehouseId: "WH-CRIT",
            region: "South",
            healthStatus: "CRITICAL",
            totalSkus: 80,
            avgDoc: 6,
            surplusCount: 0,
            deficitCount: 15,
          },
        ],
        totalEstimatedShippingCost: 0,
        skusImproved: 0,
        avgDocImprovement: 0,
      },
      recommendations: [],
      matrix: {
        warehouses: ["WH-ATTN", "WH-CRIT"],
        rows: [],
      },
    };

    mockApi.getRebalanceMatrix.mockResolvedValueOnce(warehouseVariantData);

    render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getAllByText("WH-ATTN").length).toBeGreaterThan(0);
    });

    // WH-ATTN fallbacks
    expect(screen.getByText("Region")).toBeInTheDocument();
    const attentionRing = screen.getByText("!");
    expect(attentionRing).toHaveClass("status-ring attention");

    // WH-CRIT
    expect(screen.getAllByText("WH-CRIT").length).toBeGreaterThan(0);
    expect(screen.getByText("South")).toBeInTheDocument();
    const criticalRing = screen.getByText("×");
    expect(criticalRing).toHaveClass("status-ring critical");

    // Empty recommendations placeholder
    expect(
      screen.getByText("No transfers recommended at this time."),
    ).toBeInTheDocument();
  });

  it("classifies matrix grid cells into deficit, low-deficit, balanced, and surplus correctly", async () => {
    const matrixClassificationData = {
      summary: {
        warehouses: [],
      },
      recommendations: [],
      matrix: {
        warehouses: ["WH-A", "WH-B", "WH-C", "WH-D"],
        rows: [
          {
            sku: "SKU-THRESHOLDS",
            cells: [
              { doc: 5, onHand: 10, velocity: 2 }, // < 7 -> deficit
              { doc: 10, onHand: 20, velocity: 2 }, // < 14 -> low-deficit
              { doc: 25, onHand: 50, velocity: 2 }, // balanced
              { doc: 50, onHand: 100, velocity: 2 }, // > 42 -> surplus
            ],
          },
        ],
      },
    };

    mockApi.getRebalanceMatrix.mockResolvedValueOnce(matrixClassificationData);

    const { container } = render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText("SKU-THRESHOLDS")).toBeInTheDocument();
    });

    const cells = container.querySelectorAll(".matrix-cell");
    expect(cells).toHaveLength(4);

    expect(cells[0]).toHaveClass("matrix-cell deficit");
    expect(cells[0]).toHaveTextContent("5d");
    expect(cells[0]).toHaveTextContent("deficit");
    expect(cells[0]).toHaveAttribute("title", "On Hand: 10 | Velocity: 2");

    expect(cells[1]).toHaveClass("matrix-cell low-deficit");
    expect(cells[1]).toHaveTextContent("10d");
    expect(cells[1]).toHaveTextContent("low deficit");

    expect(cells[2]).toHaveClass("matrix-cell balanced");
    expect(cells[2]).toHaveTextContent("25d");
    expect(cells[2]).toHaveTextContent("balanced");

    expect(cells[3]).toHaveClass("matrix-cell surplus");
    expect(cells[3]).toHaveTextContent("50d");
    expect(cells[3]).toHaveTextContent("surplus");
  });

  it("triggers an alert when executing a transfer and handles default recommendation attributes", async () => {
    const dataWithDefaultRecProps = {
      summary: {},
      recommendations: [
        {
          sourceWarehouseId: "WH-SRC",
          destWarehouseId: "WH-DST",
          // priority not defined -> defaults to "medium" / "MEDIUM"
          sku: "SKU-DEF",
          quantity: 20,
          estimatedShippingCost: 40,
          destCurrentDoc: 8,
          destProjectedDoc: 16,
          // urgencyReason undefined
        },
      ],
      matrix: { warehouses: [], rows: [] },
    };

    mockApi.getRebalanceMatrix.mockResolvedValueOnce(dataWithDefaultRecProps);

    render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText("SKU-DEF")).toBeInTheDocument();
    });

    const executeButton = screen.getByRole("button", {
      name: "Execute Transfer for SKU-DEF",
    });
    fireEvent.click(executeButton);

    expect(window.alert).toHaveBeenCalledWith("Executing transfer for SKU-DEF");
  });
});
