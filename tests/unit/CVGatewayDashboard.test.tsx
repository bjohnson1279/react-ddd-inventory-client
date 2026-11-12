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

  it("handles GraphQL error response in handleAnalyze and alerts the error message", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        errors: [{ message: "Invalid image format provided" }],
      }),
    });
    globalThis.fetch = mockFetch;

    render(<CVGatewayDashboard />);

    const fileInput = screen.getByLabelText("Upload Package Image");
    const dummyFile = new File(["dummy content"], "bad-image.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    const analyzeBtn = await screen.findByRole("button", {
      name: "Run CV Analysis",
    });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Error: Invalid image format provided",
      );
    });

    expect(analyzeBtn).not.toBeDisabled();
    expect(analyzeBtn).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText("Analysis Results")).not.toBeInTheDocument();
  });

  it("handles network rejection in handleAnalyze and resets loading state", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection failed"));
    globalThis.fetch = mockFetch;

    render(<CVGatewayDashboard />);

    const fileInput = screen.getByLabelText("Upload Package Image");
    const dummyFile = new File(["dummy content"], "network-fail.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    const analyzeBtn = await screen.findByRole("button", {
      name: "Run CV Analysis",
    });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Error: Network connection failed",
      );
    });

    expect(analyzeBtn).not.toBeDisabled();
    expect(analyzeBtn).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText("Analysis Results")).not.toBeInTheDocument();
  });

  it("handles GraphQL error response in handleApprove and alerts the error message", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                analyzeInboundImage: {
                  id: "SCAN_ERR_1",
                  status: "PENDING",
                  dimensions: { length: 12, width: 22, height: 32 },
                  ocrText: "PKG-ERR",
                  anomalyScore: 0.1,
                  hasDamage: false,
                },
              },
            }),
        });
      } else {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              errors: [{ message: "Scan approval failed: item locked" }],
            }),
        });
      }
    });
    globalThis.fetch = mockFetch;

    render(<CVGatewayDashboard />);

    const fileInput = screen.getByLabelText("Upload Package Image");
    const dummyFile = new File(["dummy content"], "test-approve-err.png", {
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
      expect(alertSpy).toHaveBeenCalledWith(
        "Error: Scan approval failed: item locked",
      );
    });

    expect(approveBtn).not.toBeDisabled();
    expect(approveBtn).toHaveAttribute("aria-busy", "false");
  });

  it("handles network rejection in handleApprove and resets approving state", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                analyzeInboundImage: {
                  id: "SCAN_ERR_2",
                  status: "PENDING",
                  dimensions: { length: 12, width: 22, height: 32 },
                  ocrText: "PKG-NET-ERR",
                  anomalyScore: 0.1,
                  hasDamage: false,
                },
              },
            }),
        });
      } else {
        return Promise.reject(new Error("Approve network timeout"));
      }
    });
    globalThis.fetch = mockFetch;

    render(<CVGatewayDashboard />);

    const fileInput = screen.getByLabelText("Upload Package Image");
    const dummyFile = new File(["dummy content"], "test-approve-timeout.png", {
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
      expect(alertSpy).toHaveBeenCalledWith(
        "Error: Approve network timeout",
      );
    });

    expect(approveBtn).not.toBeDisabled();
    expect(approveBtn).toHaveAttribute("aria-busy", "false");
  });
});
