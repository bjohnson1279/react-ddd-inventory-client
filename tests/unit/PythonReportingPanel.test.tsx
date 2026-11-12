import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PythonReportingPanel } from "../../src/components/PythonReportingPanel";
import type { PythonRESTAdapter } from "../../src/api/python";

function createMockClient() {
  return {
    getReportDefinitions: vi.fn().mockResolvedValue([
      { id: "rep-stock", name: "Stock Summary", type: "STOCK" },
      { id: "rep-val", name: "Valuation Audit", type: "INVENTORY_VALUATION" },
    ]),
    getReportExecutions: vi.fn().mockResolvedValue([
      {
        id: "job-1",
        name: "Stock Run 1",
        status: "QUEUED",
        complete: true,
        version: 1,
      },
      {
        id: "job-2",
        name: "Stock Run 2",
        status: "FAILED",
        complete: false,
        error: "DB timeout",
        version: 2,
      },
      {
        id: "job-3",
        name: "Stock Run 3",
        status: "COMPLETED",
        format: "csv",
        complete: true,
        version: 3,
      },
    ]),
    getReportSchedules: vi.fn().mockResolvedValue([
      {
        id: "sched-1",
        cronExpression: "0 8 * * *",
        active: true,
        nextRunAt: "2026-04-01T08:00:00Z",
        version: 1,
        error: "",
      },
      {
        id: "sched-2",
        cronExpression: "0 12 * * *",
        active: false,
        nextRunAt: null,
        version: 1,
        error: "",
      },
    ]),
    getRetailAlerts: vi.fn().mockResolvedValue([
      {
        id: "alt-1",
        kind: "LOW_STOCK",
        episode: 1,
        facts: { sku: "SKU-LOW", locationId: "LOC-A" },
      },
    ]),
    getRetailAlertConfig: vi.fn().mockResolvedValue({
      lowStock: false,
      expiry: true,
      expiryDays: 14,
      version: 5,
    }),
    reportCommand: vi.fn().mockResolvedValue({ executionId: "job-new" }),
    processReportExecution: vi.fn().mockResolvedValue({ status: "COMPLETED" }),
    downloadReportExecution: vi
      .fn()
      .mockResolvedValue(
        new Blob(["col1,col2\nval1,val2"], { type: "text/csv" }),
      ),
    // Notification inbox mocks needed by embedded child
    getOwnNotifications: vi.fn().mockResolvedValue([]),
    getOwnUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
    getNotificationManagers: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    snoozeOwnNotification: vi.fn().mockResolvedValue(undefined),
    escalateOwnNotification: vi.fn().mockResolvedValue({}),
  } as unknown as PythonRESTAdapter;
}

describe("PythonReportingPanel", () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders loading state initially while fetching reporting data", async () => {
    (mockClient.getRetailAlertConfig as any).mockReturnValue(
      new Promise(() => {}),
    );
    (mockClient.getOwnNotifications as any).mockReturnValue(
      new Promise(() => {}),
    );
    (mockClient.getOwnUnreadCount as any).mockReturnValue(
      new Promise(() => {}),
    );
    (mockClient.getNotificationManagers as any).mockReturnValue(
      new Promise(() => {}),
    );

    render(
      <PythonReportingPanel
        client={mockClient}
        tenantId="tenant-test"
        role="admin"
      />,
    );

    expect(screen.getByText("Loading reporting data…")).toBeInTheDocument();
  });

  it("renders reporting data and components successfully when data loads", async () => {
    render(
      <PythonReportingPanel
        client={mockClient}
        tenantId="tenant-test"
        role="admin"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Reports and retail alerts")).toBeInTheDocument();
    });

    expect(screen.getByText("Stock Summary")).toBeInTheDocument();
    expect(screen.getByText("Valuation Audit")).toBeInTheDocument();
    expect(screen.getByText("Stock Run 1")).toBeInTheDocument();
    expect(screen.getByText("Stock Run 2")).toBeInTheDocument();
    expect(screen.getByText("Stock Run 3")).toBeInTheDocument();
    expect(
      screen.getByText("0 8 * * * UTC — Next run: 2026-04-01T08:00:00Z"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("LOW_STOCK: SKU-LOW at LOC-A, episode 1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Low stock: Disabled\. Expiry: Enabled \(14 days\)\./),
    ).toBeInTheDocument();
  });

  it("renders empty states when definitions, executions, and alerts are empty", async () => {
    (mockClient.getReportDefinitions as any).mockResolvedValue([]);
    (mockClient.getReportExecutions as any).mockResolvedValue([]);
    (mockClient.getReportSchedules as any).mockResolvedValue([]);
    (mockClient.getRetailAlerts as any).mockResolvedValue([]);

    render(
      <PythonReportingPanel
        client={mockClient}
        tenantId="tenant-test"
        role="admin"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "No report definitions. Create a stock or financial report above.",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("No executions recorded.")).toBeInTheDocument();
    expect(
      screen.getByText("No active retail alert conditions."),
    ).toBeInTheDocument();
  });

  it("displays error message and fallback state when initial fetch fails", async () => {
    (mockClient.getReportDefinitions as any).mockRejectedValue(
      new Error("Backend connection refused"),
    );

    render(
      <PythonReportingPanel
        client={mockClient}
        tenantId="tenant-test"
        role="admin"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Backend connection refused",
      );
    });
    expect(screen.getByText("Reporting data unavailable.")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "No report definitions. Create a stock or financial report above.",
      ),
    ).not.toBeInTheDocument();
  });

  describe("Role-based access control", () => {
    it("hides reports section and execution history for warehouse operators and suppliers", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="warehouse_operator"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText("Reports and retail alerts"),
        ).toBeInTheDocument();
      });

      // Reports and jobs should not be rendered
      expect(screen.queryByLabelText("Report name")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Export format")).not.toBeInTheDocument();
      expect(screen.queryByText("Stock Summary")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Report execution history"),
      ).not.toBeInTheDocument();

      // Alerts section should still be available
      expect(screen.getByText("Retail alert monitoring")).toBeInTheDocument();
      expect(
        screen.getByText("LOW_STOCK: SKU-LOW at LOC-A, episode 1"),
      ).toBeInTheDocument();
    });

    it("allows accountant to manage reports including financial statements but restricts alert config", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="accountant"
        />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Report name")).toBeInTheDocument();
      });

      // Financial options should be present in type selector
      const typeSelect = screen.getByLabelText("Report type");
      expect(typeSelect).toContainHTML("Trial balance");
      expect(typeSelect).toContainHTML("Income statement");
      expect(typeSelect).toContainHTML("Balance sheet");

      // Alert monitoring management form should not be rendered for accountant
      expect(
        screen.queryByRole("button", { name: "Save alert monitoring" }),
      ).not.toBeInTheDocument();
    });

    it("omits financial report options from dropdown for warehouse manager role", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="viewer"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText("Reports and retail alerts"),
        ).toBeInTheDocument();
      });

      expect(screen.queryByLabelText("Report name")).not.toBeInTheDocument();
    });
  });

  describe("Report creation form", () => {
    it("creates a standard stock report with SKU and location filters", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Report name")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText("Report name"), {
        target: { value: "Weekly Stock" },
      });
      fireEvent.change(screen.getByLabelText("Report type"), {
        target: { value: "STOCK" },
      });
      fireEvent.change(screen.getByLabelText("SKU filter (optional)"), {
        target: { value: "SKU-100" },
      });
      fireEvent.change(screen.getByLabelText("Location filter (optional)"), {
        target: { value: "LOC-MAIN" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create report" }));

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports",
          expect.objectContaining({
            name: "Weekly Stock",
            type: "STOCK",
            filters: { sku: "SKU-100", locationId: "LOC-MAIN" },
            tenantId: "tenant-test",
            mutationId: expect.any(String),
            reason: "Reviewed reporting/alert command",
          }),
        );
      });

      expect(
        screen.getByText(
          "Report queued. Its export becomes available after generation.",
        ),
      ).toBeInTheDocument();
    });

    it("creates a MOVEMENTS report with date range filters", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="manager"
        />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Report name")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText("Report name"), {
        target: { value: "Q1 Movements" },
      });
      fireEvent.change(screen.getByLabelText("Report type"), {
        target: { value: "MOVEMENTS" },
      });

      // Movements displays fromDate and toDate
      expect(
        screen.getByLabelText("From UTC date (optional)"),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Through UTC date (optional)"),
      ).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("From UTC date (optional)"), {
        target: { value: "2026-01-01" },
      });
      fireEvent.change(screen.getByLabelText("Through UTC date (optional)"), {
        target: { value: "2026-03-31" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create report" }));

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports",
          expect.objectContaining({
            name: "Q1 Movements",
            type: "MOVEMENTS",
            filters: { fromDate: "2026-01-01", toDate: "2026-03-31" },
            tenantId: "tenant-test",
          }),
        );
      });
    });

    it("creates a financial TRIAL_BALANCE report with asOf date filter", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="accountant"
        />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Report name")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText("Report name"), {
        target: { value: "Year-End Trial Balance" },
      });
      fireEvent.change(screen.getByLabelText("Report type"), {
        target: { value: "TRIAL_BALANCE" },
      });

      // SKU and location should be hidden for financial reports
      expect(
        screen.queryByLabelText("SKU filter (optional)"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Location filter (optional)"),
      ).not.toBeInTheDocument();

      // As of date should appear
      expect(
        screen.getByLabelText("As of UTC date (optional)"),
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("As of UTC date (optional)"), {
        target: { value: "2026-12-31" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create report" }));

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports",
          expect.objectContaining({
            name: "Year-End Trial Balance",
            type: "TRIAL_BALANCE",
            filters: { asOf: "2026-12-31" },
            tenantId: "tenant-test",
          }),
        );
      });
    });
  });

  describe("Report queuing, scheduling, and job operations", () => {
    it("queues report execution with the selected format", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Queue Stock Summary" }),
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText("Export format"), {
        target: { value: "csv" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Queue Stock Summary" }),
      );

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports/rep-stock/execute",
          expect.objectContaining({
            format: "csv",
            tenantId: "tenant-test",
          }),
        );
      });
    });

    it("schedules report execution with custom cron expression", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Schedule Stock Summary" }),
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Schedule in UTC/), {
        target: { value: "30 6 * * 1-5" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Schedule Stock Summary" }),
      );

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports/rep-stock/schedule",
          expect.objectContaining({
            cronExpression: "30 6 * * 1-5",
            format: "json",
            deliveryMethod: "INTERNAL",
            tenantId: "tenant-test",
          }),
        );
      });
    });

    it("processes queued job execution when Generate button is clicked", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Generate job-1" }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Generate job-1" }));

      await waitFor(() => {
        expect(mockClient.processReportExecution).toHaveBeenCalledWith("job-1");
      });

      expect(screen.getByText("Report completed.")).toBeInTheDocument();
    });

    it("retries failed job execution with expectedVersion", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retry job-2" }),
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Data needs review/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Retry job-2" }));

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports/executions/job-2/retry",
          expect.objectContaining({
            expectedVersion: 2,
            tenantId: "tenant-test",
          }),
        );
      });
    });

    it("downloads completed job execution artifact via blob object URL", async () => {
      const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      const mockRevokeObjectURL = vi.fn();
      window.URL.createObjectURL = mockCreateObjectURL;
      window.URL.revokeObjectURL = mockRevokeObjectURL;

      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});

      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Download job-3" }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Download job-3" }));

      await waitFor(() => {
        expect(mockClient.downloadReportExecution).toHaveBeenCalledWith(
          "job-3",
        );
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

      clickSpy.mockRestore();
    });

    it("displays error when downloading report execution fails", async () => {
      (mockClient.downloadReportExecution as any).mockRejectedValueOnce(
        new Error("Export expired"),
      );

      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Download job-3" }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Download job-3" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Export expired");
      });
    });
  });

  describe("Schedule management", () => {
    it("pauses an active schedule and enables a paused schedule", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Pause schedule sched-1" }),
        ).toBeInTheDocument();
      });

      // Pause sched-1
      fireEvent.click(
        screen.getByRole("button", { name: "Pause schedule sched-1" }),
      );

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports/schedules/sched-1/active",
          expect.objectContaining({
            active: false,
            expectedVersion: 1,
            tenantId: "tenant-test",
          }),
        );
      });

      // Enable sched-2
      const enableButton = screen.getByRole("button", {
        name: "Enable schedule sched-2",
      });
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/reports/schedules/sched-2/active",
          expect.objectContaining({
            active: true,
            expectedVersion: 1,
            tenantId: "tenant-test",
          }),
        );
      });
    });
  });

  describe("Retail alert monitoring & configuration", () => {
    it("updates alert monitoring rules and saves configuration", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Save alert monitoring" }),
        ).toBeInTheDocument();
      });

      const lowStockCheckbox = screen.getByLabelText("Monitor low stock");
      const expiryCheckbox = screen.getByLabelText("Monitor expiring lots");
      const daysInput = screen.getByLabelText("Days before expiry");

      expect(lowStockCheckbox).not.toBeChecked();
      expect(expiryCheckbox).toBeChecked();
      expect(daysInput).toHaveValue(14);

      fireEvent.click(lowStockCheckbox);
      fireEvent.change(daysInput, { target: { value: "21" } });

      fireEvent.click(
        screen.getByRole("button", { name: "Save alert monitoring" }),
      );

      await waitFor(() => {
        expect(mockClient.reportCommand).toHaveBeenCalledWith(
          "/alerts/config",
          expect.objectContaining({
            lowStock: true,
            expiry: true,
            expiryDays: 21,
            expectedVersion: 5,
            tenantId: "tenant-test",
          }),
        );
      });
    });
  });

  describe("Manual refresh and error handling", () => {
    it("refreshes report and alert data when clicking refresh button", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Refresh reports and alerts" }),
        ).toBeInTheDocument();
      });

      expect(mockClient.getReportDefinitions).toHaveBeenCalledTimes(1);

      fireEvent.click(
        screen.getByRole("button", { name: "Refresh reports and alerts" }),
      );

      await waitFor(() => {
        expect(mockClient.getReportDefinitions).toHaveBeenCalledTimes(2);
      });
    });

    it("surfaces refresh failure in alert when refresh fails", async () => {
      render(
        <PythonReportingPanel
          client={mockClient}
          tenantId="tenant-test"
          role="admin"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Refresh reports and alerts" }),
        ).toBeInTheDocument();
      });

      (mockClient.getReportDefinitions as any).mockRejectedValueOnce(
        new Error("Gateway timeout"),
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Refresh reports and alerts" }),
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Gateway timeout");
      });
    });
  });
});
