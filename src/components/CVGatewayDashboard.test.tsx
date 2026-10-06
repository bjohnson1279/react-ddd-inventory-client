import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CVGatewayDashboard from "./CVGatewayDashboard";

describe("CVGatewayDashboard Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  it("includes Authorization header in handleAnalyze fetch request when auth_token is set", async () => {
    localStorage.setItem("auth_token", "test_secret_token_123");

    (globalThis.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        data: {
          analyzeInboundImage: {
            id: "scan_1",
            dimensions: { length: 10, width: 20, height: 30 },
            ocrText: "Sample OCR",
            anomalyScore: 0.05,
            hasDamage: false,
            status: "PENDING",
          },
        },
      }),
    });

    render(<CVGatewayDashboard />);

    const file = new File(["fake-image"], "test.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/Upload Package Image/i);

    fireEvent.change(fileInput, { target: { files: [file] } });

    const analyzeButton = await screen.findByRole("button", {
      name: /Run CV Analysis/i,
    });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test_secret_token_123",
          }),
        }),
      );
    });
  });

  it("includes Authorization header in handleApprove fetch request when auth_token is set", async () => {
    localStorage.setItem("auth_token", "test_secret_token_456");

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            analyzeInboundImage: {
              id: "scan_2",
              dimensions: { length: 10, width: 20, height: 30 },
              ocrText: "Sample OCR",
              anomalyScore: 0.0,
              hasDamage: false,
              status: "PENDING",
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            approveInboundScan: {
              id: "scan_2",
              status: "APPROVED",
            },
          },
        }),
      });

    render(<CVGatewayDashboard />);

    const file = new File(["fake-image"], "test.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/Upload Package Image/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    const analyzeButton = await screen.findByRole("button", {
      name: /Run CV Analysis/i,
    });
    fireEvent.click(analyzeButton);

    const approveButton = await screen.findByRole("button", {
      name: /Approve Received Stock/i,
    });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test_secret_token_456",
          }),
        }),
      );
    });
  });
});
