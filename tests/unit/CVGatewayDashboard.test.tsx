import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CVGatewayDashboard from "../../src/components/CVGatewayDashboard";

describe("CVGatewayDashboard", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders initial state correctly", () => {
    render(<CVGatewayDashboard />);
    expect(
      screen.getByText("Computer Vision Receiving Gateway"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Upload Package Image")).toBeInTheDocument();
  });

  it("includes Authorization header in handleAnalyze when auth_token exists", async () => {
    localStorage.setItem("auth_token", "test_secret_token_123");

    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        data: {
          analyzeInboundImage: {
            id: "SCAN_001",
            status: "PENDING",
            dimensions: { length: 10, width: 20, height: 30 },
            ocrText: "PKG-99",
            anomalyScore: 0.05,
            hasDamage: false,
          },
        },
      }),
    });
    globalThis.fetch = mockFetch;

    render(<CVGatewayDashboard />);

    const fileInput = screen.getByLabelText("Upload Package Image");
    const dummyFile = new File(["dummy content"], "test.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    const analyzeBtn = await screen.findByRole("button", {
      name: "Run CV Analysis",
    });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test_secret_token_123",
          },
        }),
      );
    });

    expect(await screen.findByText("Scan ID:")).toBeInTheDocument();
    expect(screen.getByText("SCAN_001")).toBeInTheDocument();
  });

  it("includes Authorization header in handleApprove when auth_token exists", async () => {
    localStorage.setItem("auth_token", "test_secret_token_456");
    vi.spyOn(window, "alert").mockImplementation(() => {});

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                analyzeInboundImage: {
                  id: "SCAN_002",
                  status: "PENDING",
                  dimensions: { length: 15, width: 25, height: 35 },
                  ocrText: "PKG-100",
                  anomalyScore: 0.01,
                  hasDamage: false,
                },
              },
            }),
        });
      } else {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                approveInboundScan: {
                  id: "SCAN_002",
                  status: "APPROVED",
                },
              },
            }),
        });
      }
    });
    globalThis.fetch = mockFetch;

    render(<CVGatewayDashboard />);

    const fileInput = screen.getByLabelText("Upload Package Image");
    const dummyFile = new File(["dummy content"], "test2.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    const analyzeBtn = await screen.findByRole("button", {
      name: "Run CV Analysis",
    });
    fireEvent.click(analyzeBtn);

    const approveBtn = await screen.findByRole("button", {
      name: "Approve Received Stock",
    });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test_secret_token_456",
          },
        }),
      );
    });
  });
});
