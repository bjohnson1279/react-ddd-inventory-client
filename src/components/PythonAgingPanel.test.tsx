import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { PythonAgingPanel } from "./PythonAgingPanel";

afterEach(cleanup);

describe("PythonAgingPanel", () => {
  const createMockClient = () => ({
    generateAgingReport: vi.fn(),
  });

  it("renders loading state initially while report is unresolved", () => {
    const client = createMockClient();
    client.generateAgingReport.mockReturnValue(new Promise(() => {}));

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    expect(
      screen.getByRole("heading", { name: "Stock aging" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading stock aging…",
    );
  });

  it("renders aging report table when data is successfully returned", async () => {
    const client = createMockClient();
    const mockReport = {
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: true,
      rows: [
        {
          sku: "SKU-001",
          locationId: "LOC-A",
          baseUnit: "kg",
          age0To30: 10,
          age31To60: 20,
          age61To90: 30,
          ageOver90: 40,
          unknownAgeQuantity: 5,
        },
      ],
    };
    client.generateAgingReport.mockResolvedValue(mockReport);

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText("SKU-001")).toBeInTheDocument();
    });

    expect(screen.getByText("LOC-A / kg")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(
      screen.getByText(/Remaining quantities by recorded age/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `Generated: ${new Date(mockReport.generatedAt).toLocaleString()}`,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Some layer quantities need review."),
    ).not.toBeInTheDocument();
  });

  it("renders layer review warning when complete is false", async () => {
    const client = createMockClient();
    client.generateAgingReport.mockResolvedValue({
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: false,
      rows: [
        {
          sku: "SKU-INCOMPLETE",
          locationId: "LOC-B",
          baseUnit: "box",
          age0To30: 5,
          age31To60: 0,
          age61To90: 0,
          ageOver90: 0,
          unknownAgeQuantity: 2,
        },
      ],
    });

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    expect(
      await screen.findByText("Some layer quantities need review."),
    ).toBeInTheDocument();
  });

  it('falls back to "units" when baseUnit is not provided', async () => {
    const client = createMockClient();
    client.generateAgingReport.mockResolvedValue({
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: true,
      rows: [
        {
          sku: "SKU-NO-UNIT",
          locationId: "BIN-12",
          baseUnit: "",
          age0To30: 1,
          age31To60: 2,
          age61To90: 3,
          ageOver90: 4,
          unknownAgeQuantity: 0,
        },
      ],
    });

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    expect(await screen.findByText("BIN-12 / units")).toBeInTheDocument();
  });

  it("renders empty table notice when report rows are empty", async () => {
    const client = createMockClient();
    client.generateAgingReport.mockResolvedValue({
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: true,
      rows: [],
    });

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    expect(
      await screen.findByText("No recorded stock to age."),
    ).toBeInTheDocument();
  });

  it("displays truncation notice when rows exceed 100", async () => {
    const client = createMockClient();
    const rows = Array.from({ length: 105 }, (_, i) => ({
      sku: `SKU-${i}`,
      locationId: `LOC-${i}`,
      baseUnit: "ea",
      age0To30: i,
      age31To60: 0,
      age61To90: 0,
      ageOver90: 0,
      unknownAgeQuantity: 0,
    }));

    client.generateAgingReport.mockResolvedValue({
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: true,
      rows,
    });

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    expect(
      await screen.findByText(
        "Showing the first 100 rows. Export the full aging report in Reports.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("SKU-0")).toBeInTheDocument();
    expect(screen.getByText("SKU-99")).toBeInTheDocument();
    expect(screen.queryByText("SKU-100")).not.toBeInTheDocument();
  });

  it("handles error when client.generateAgingReport rejects", async () => {
    const client = createMockClient();
    client.generateAgingReport.mockRejectedValue(
      new Error("Aging service failure"),
    );

    render(<PythonAgingPanel client={client as any} tenantId="test-tenant" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Aging service failure");
    expect(screen.getByText("Aging data unavailable.")).toBeInTheDocument();
  });

  it("does not update state if component unmounts before request resolves", async () => {
    const client = createMockClient();
    let resolvePromise: (value: any) => void;
    client.generateAgingReport.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { unmount } = render(
      <PythonAgingPanel client={client as any} tenantId="test-tenant" />,
    );

    unmount();

    // Resolving after unmount should be safely ignored via cancellation flag
    resolvePromise!({
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: true,
      rows: [],
    });

    // No errors thrown, component unmounted cleanly
  });

  it("re-fetches aging report when tenantId or sessionKey changes", async () => {
    const client = createMockClient();
    client.generateAgingReport.mockResolvedValue({
      generatedAt: "2026-03-30T12:00:00.000Z",
      complete: true,
      rows: [],
    });

    const { rerender } = render(
      <PythonAgingPanel
        client={client as any}
        tenantId="tenant-1"
        sessionKey="session-1"
      />,
    );

    await waitFor(() => {
      expect(client.generateAgingReport).toHaveBeenCalledWith("tenant-1");
    });

    rerender(
      <PythonAgingPanel
        client={client as any}
        tenantId="tenant-2"
        sessionKey="session-1"
      />,
    );

    await waitFor(() => {
      expect(client.generateAgingReport).toHaveBeenCalledWith("tenant-2");
    });

    rerender(
      <PythonAgingPanel
        client={client as any}
        tenantId="tenant-2"
        sessionKey="session-2"
      />,
    );

    await waitFor(() => {
      expect(client.generateAgingReport).toHaveBeenCalledTimes(3);
    });
  });
});
