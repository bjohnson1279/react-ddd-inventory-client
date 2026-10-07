import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { ConformanceDashboardPanel } from "../../src/components/ConformanceDashboardPanel";

describe("ConformanceDashboardPanel", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock performance.now for latency calculations
    const performanceMock = vi.spyOn(performance, "now");
    let callCount = 0;
    performanceMock.mockImplementation(() => {
      callCount++;
      return callCount * 10;
    });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders initial state correctly", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Cross-Backend Conformance")).toBeInTheDocument();
    expect(screen.getByText("Live Backend Health")).toBeInTheDocument();

    // Check parity section
    expect(screen.getByText("Conformance Test Parity")).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();

    // Check API comparison section
    expect(screen.getByText("API Response Comparison")).toBeInTheDocument();
  });

  it("fetches health data on mount", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "http://localhost:4000") {
        return Promise.resolve({ ok: true });
      } else if (url === "http://localhost:5000") {
        return Promise.resolve({ ok: true });
      } else {
        return Promise.reject(new Error("Failed to fetch"));
      }
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    // Since we're using fake timers and fetch is mocked as a resolved promise,
    // we just need to flush promises.
    await act(async () => {
      await Promise.resolve(); // wait for use effect promise
      await Promise.resolve(); // wait for fetch promise
      await Promise.resolve(); // wait for state update
    });

    // It should have completed the fetch and updated state
    expect(screen.getAllByText("🟢 Online").length).toBe(2);
    expect(screen.getAllByText("🔴 Offline").length).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("polls for health data based on interval", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    // Wait for the initial mount fetch to complete
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    fetchMock.mockClear();

    // Select 5s polling interval
    const selects = screen.getAllByRole("combobox");
    const select = selects[0]; // first combobox is polling interval

    await act(async () => {
      fireEvent.change(select, { target: { value: "5" } });
    });

    // When the polling interval changes, the useEffect is triggered again.
    // This will immediately call checkHealth() again and set up the interval.
    // We need to wait for this immediate fetch to resolve.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The immediate fetch within the new useEffect call means 4 fetches happen.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    fetchMock.mockClear();

    // Advance 5 seconds (5000ms) to trigger the first interval execution
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    fetchMock.mockClear();

    // Turn polling off (0)
    await act(async () => {
      fireEvent.change(select, { target: { value: "0" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    fetchMock.mockClear();

    // Advance another 5 seconds and verify no new fetches occur
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("displays loading spinner and aria-busy when refreshing health data", async () => {
    const resolvers: Array<(value: any) => void> = [];
    fetchMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
    });

    const refreshButton = document.querySelector("button.btn-secondary")!;
    expect(refreshButton).toHaveAttribute("aria-busy", "true");
    expect(refreshButton.querySelector(".spinner")).toBeInTheDocument();

    // Resolve all pending health check requests
    await act(async () => {
      resolvers.forEach((res) => res({ ok: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(refreshButton).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("displays loading spinner and aria-busy during API comparison", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const compareButton = screen.getByRole("button", {
      name: "Compare Across Backends",
    });

    const compareResolvers: Array<(value: any) => void> = [];
    fetchMock.mockImplementation(() => {
      return new Promise((resolve) => {
        compareResolvers.push(resolve);
      });
    });

    await act(async () => {
      fireEvent.click(compareButton);
      await Promise.resolve();
    });

    expect(compareButton).toHaveAttribute("aria-busy", "true");
    expect(compareButton.querySelector(".spinner")).toBeInTheDocument();

    await act(async () => {
      compareResolvers.forEach((res) =>
        res({ ok: true, json: () => Promise.resolve({ success: true }) }),
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compareButton).toHaveAttribute("aria-busy", "false");
    expect(
      screen.getByRole("button", { name: "Compare Across Backends" }),
    ).toBeInTheDocument();
  });

  it("handles health check failure when all endpoints reject", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getAllByText("🔴 Offline")).toHaveLength(4);
  });

  it("performs API response comparison for compliance operation", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("graphql")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { complianceLedger: [] } }),
        });
      } else if (url.includes("/api/compliance/ledger")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ledger: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fetchMock.mockClear();

    const compareButton = screen.getByRole("button", {
      name: "Compare Across Backends",
    });
    const selects = screen.getAllByRole("combobox");
    const compareSelect = selects[1];

    await act(async () => {
      fireEvent.change(compareSelect, { target: { value: "compliance" } });
    });

    await act(async () => {
      fireEvent.click(compareButton);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/complianceLedger/)).toBeInTheDocument();
    expect(screen.getAllByText(/ledger/).length).toBeGreaterThan(0);

    const graphqlCall = fetchMock.mock.calls.find(
      (c) => c[0] === "http://localhost:4000/graphql",
    );
    expect(JSON.parse(graphqlCall[1].body)).toEqual({
      query: "query { complianceLedger { id status } }",
    });

    const restCall = fetchMock.mock.calls.find(
      (c) => c[0] === "http://localhost:5000/api/compliance/ledger",
    );
    expect(restCall[1].headers).toEqual({
      "Content-Type": "application/json",
      "tenant-id": "test-tenant",
    });
  });

  it("handles network exceptions during comparison fetch", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("4000")) {
        return Promise.reject(new Error("Connection Refused"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      });
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const compareButton = screen.getByRole("button", {
      name: "Compare Across Backends",
    });

    await act(async () => {
      fireEvent.click(compareButton);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/Connection Refused/)).toBeInTheDocument();
  });

  it("performs API response comparison", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("graphql")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { inventoryItems: [] } }),
        });
      } else if (url.includes("5000")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        });
      } else if (url.includes("8000") || url.includes("8001")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Not found" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fetchMock.mockClear();

    const compareButton = screen.getByRole("button", {
      name: "Compare Across Backends",
    });

    // Use select to pick an operation
    const selects = screen.getAllByRole("combobox");
    const compareSelect = selects[1];

    await act(async () => {
      fireEvent.change(compareSelect, { target: { value: "inventory" } });
    });

    await act(async () => {
      fireEvent.click(compareButton);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Check responses are rendered
    expect(screen.getByText(/inventoryItems/)).toBeInTheDocument();
    expect(screen.getByText(/items/)).toBeInTheDocument();
    expect(screen.getAllByText(/Failed/)).toHaveLength(2); // Expect PHP and Python failures

    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Check headers passed
    const graphqlCall = fetchMock.mock.calls.find(
      (c) => c[0] === "http://localhost:4000/graphql",
    );
    expect(graphqlCall[1].headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(graphqlCall[1].body)).toEqual({
      query: "query { inventoryItems { id sku quantity } }",
    });

    const restCall = fetchMock.mock.calls.find(
      (c) => c[0] === "http://localhost:5000/api/inventory",
    );
    expect(restCall[1].headers).toEqual({
      "Content-Type": "application/json",
      "tenant-id": "test-tenant",
    });
  });
});
