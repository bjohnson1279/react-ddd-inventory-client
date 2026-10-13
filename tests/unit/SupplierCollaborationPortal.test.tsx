import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SupplierCollaborationPortal } from "../../src/components/SupplierCollaborationPortal";
import { useInventory } from "../../src/api/client";

vi.mock("../../src/api/client", () => ({
  useInventory: vi.fn(),
}));

describe("SupplierCollaborationPortal", () => {
  let mockClient: { getASNs: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClient = {
      getASNs: vi.fn(),
    };
    vi.mocked(useInventory).mockReturnValue({ client: mockClient } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders header and empty state when no ASNs are returned", async () => {
    mockClient.getASNs.mockResolvedValue([]);

    render(<SupplierCollaborationPortal tenantId="tenant-123" />);

    expect(screen.getByText("Supplier Portal")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockClient.getASNs).toHaveBeenCalledWith("tenant-123", "supp-123");
    });

    expect(
      screen.getByText("No Advance Shipping Notices (ASNs) found")
    ).toBeInTheDocument();
  });

  it("renders list of ASNs when data is returned", async () => {
    const mockAsns = [
      {
        id: "ASN-001",
        expectedArrivalDate: "2025-05-10T00:00:00Z",
        status: "IN_TRANSIT",
      },
      {
        id: "ASN-002",
        expectedArrivalDate: "2025-05-15T00:00:00Z",
        status: "DELIVERED",
      },
    ];
    mockClient.getASNs.mockResolvedValue(mockAsns);

    render(<SupplierCollaborationPortal tenantId="tenant-123" />);

    await waitFor(() => {
      expect(screen.getByText("ASN #ASN-001")).toBeInTheDocument();
    });

    expect(screen.getByText("ASN #ASN-002")).toBeInTheDocument();
    expect(screen.getByText("IN_TRANSIT")).toBeInTheDocument();
    expect(screen.getByText("DELIVERED")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Expected: ${new Date("2025-05-10T00:00:00Z").toLocaleDateString()}`
      )
    ).toBeInTheDocument();
  });

  it("logs error to console when getASNs fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const apiError = new Error("Failed to fetch ASNs");
    mockClient.getASNs.mockRejectedValue(apiError);

    render(<SupplierCollaborationPortal tenantId="tenant-123" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(apiError);
    });

    expect(
      screen.getByText("No Advance Shipping Notices (ASNs) found")
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("handles Submit ASN button state during submission", async () => {
    mockClient.getASNs.mockResolvedValue([]);

    render(<SupplierCollaborationPortal tenantId="tenant-123" />);

    await waitFor(() => {
      expect(mockClient.getASNs).toHaveBeenCalled();
    });

    vi.useFakeTimers();

    const submitBtn = screen.getByRole("button", { name: /Submit ASN/i });
    expect(submitBtn).toBeEnabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "false");

    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(submitBtn).toBeEnabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "false");

    vi.useRealTimers();
  });
});
