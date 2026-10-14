import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SupplierCollaborationPortal } from "../../src/components/SupplierCollaborationPortal";
import { InventoryClientContext } from "../../src/api/client";

describe("SupplierCollaborationPortal", () => {
  const mockClient = {
    getASNs: vi.fn(),
  };

  const renderComponent = (tenantId = "tenant-test") => {
    return render(
      <InventoryClientContext.Provider
        value={{
          client: mockClient as any,
          backendType: "express",
          setBackendType: vi.fn(),
        }}
      >
        <SupplierCollaborationPortal tenantId={tenantId} />
      </InventoryClientContext.Provider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches and displays ASNs on mount", async () => {
    const mockAsns = [
      {
        id: "ASN-101",
        expectedArrivalDate: "2025-06-01T00:00:00.000Z",
        status: "SHIPPED",
      },
      {
        id: "ASN-102",
        expectedArrivalDate: "2025-06-05T00:00:00.000Z",
        status: "PENDING",
      },
    ];
    mockClient.getASNs.mockResolvedValueOnce(mockAsns);

    renderComponent("tenant-456");

    expect(screen.getByText("Supplier Portal")).toBeInTheDocument();
    expect(mockClient.getASNs).toHaveBeenCalledWith("tenant-456", "supp-123");

    expect(await screen.findByText("ASN #ASN-101")).toBeInTheDocument();
    expect(screen.getByText("ASN #ASN-102")).toBeInTheDocument();
    expect(screen.getByText("SHIPPED")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("renders empty state when no ASNs are returned", async () => {
    mockClient.getASNs.mockResolvedValueOnce([]);

    renderComponent("tenant-empty");

    expect(
      await screen.findByText("No Advance Shipping Notices (ASNs) found"),
    ).toBeInTheDocument();
  });

  it("handles API errors gracefully when fetching ASNs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Network failure");
    mockClient.getASNs.mockRejectedValueOnce(error);

    renderComponent("tenant-error");

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    consoleSpy.mockRestore();
  });

  it("handles Submit ASN button loading state and timer completion", async () => {
    vi.useFakeTimers();
    mockClient.getASNs.mockResolvedValueOnce([]);

    renderComponent("tenant-timer");

    await act(async () => {
      await Promise.resolve();
    });

    const submitBtn = screen.getByRole("button", { name: /Submit ASN/i });
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "false");

    act(() => {
      fireEvent.click(submitBtn);
    });

    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Submit ASN")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "false");
    expect(screen.getByText("Submit ASN")).toBeInTheDocument();
  });
});
