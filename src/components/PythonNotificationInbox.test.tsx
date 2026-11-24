import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PythonNotificationInbox } from "./PythonNotificationInbox";

afterEach(cleanup);

function createMockClient() {
  return {
    getOwnNotifications: vi.fn().mockResolvedValue([]),
    getOwnUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
    getNotificationManagers: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    snoozeOwnNotification: vi.fn().mockResolvedValue(undefined),
    escalateOwnNotification: vi.fn().mockResolvedValue(undefined),
  };
}

describe("PythonNotificationInbox", () => {
  it("renders initial loading state before data resolves", () => {
    const client = {
      getOwnNotifications: vi.fn().mockReturnValue(new Promise(() => {})),
      getOwnUnreadCount: vi.fn().mockReturnValue(new Promise(() => {})),
      getNotificationManagers: vi.fn().mockReturnValue(new Promise(() => {})),
      markNotificationRead: vi.fn(),
      snoozeOwnNotification: vi.fn(),
      escalateOwnNotification: vi.fn(),
    };

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Your notifications" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unread count unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Loading inbox…")).toBeInTheDocument();
  });

  it("renders empty state when there are no notifications", async () => {
    const client = createMockClient();

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    await waitFor(() => {
      expect(screen.getByText("No current notifications.")).toBeInTheDocument();
      expect(screen.getByText("0 unread")).toBeInTheDocument();
    });

    expect(client.getOwnNotifications).toHaveBeenCalledWith("test-tenant");
    expect(client.getOwnUnreadCount).toHaveBeenCalledTimes(1);
    expect(client.getNotificationManagers).toHaveBeenCalledTimes(1);
  });

  it("renders notification list with unread items and action buttons", async () => {
    const client = createMockClient();
    const mockNotifications = [
      {
        id: "note-1",
        message: "Low stock alert for SKU-101",
        status: "UNREAD",
        createdAt: "2026-03-01T10:00:00Z",
      },
      {
        id: "note-2",
        message: "Order dispatched successfully",
        status: "READ",
        createdAt: "2026-03-01T09:00:00Z",
      },
    ];

    client.getOwnNotifications.mockResolvedValue(mockNotifications);
    client.getOwnUnreadCount.mockResolvedValue({ unread_count: 1 });

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Low stock alert for SKU-101"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Order dispatched successfully"),
      ).toBeInTheDocument();
      expect(screen.getByText("1 unread")).toBeInTheDocument();
    });

    // Unread item has Mark Read and Snooze buttons
    expect(
      screen.getByRole("button", { name: "Mark note-1 read" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Snooze note-1 for one hour" }),
    ).toBeInTheDocument();

    // Read item does not display actions
    expect(
      screen.queryByRole("button", { name: "Mark note-2 read" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Snooze note-2 for one hour" }),
    ).not.toBeInTheDocument();
  });

  it("marks a notification as read and refreshes inbox", async () => {
    const client = createMockClient();
    client.getOwnNotifications
      .mockResolvedValueOnce([
        {
          id: "note-1",
          message: "Low stock alert",
          status: "UNREAD",
          createdAt: "2026-03-01T10:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "note-1",
          message: "Low stock alert",
          status: "READ",
          createdAt: "2026-03-01T10:00:00Z",
        },
      ]);
    client.getOwnUnreadCount
      .mockResolvedValueOnce({ unread_count: 1 })
      .mockResolvedValueOnce({ unread_count: 0 });

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    const markReadBtn = await screen.findByRole("button", {
      name: "Mark note-1 read",
    });
    fireEvent.click(markReadBtn);

    await waitFor(() => {
      expect(client.markNotificationRead).toHaveBeenCalledWith("note-1");
    });

    await waitFor(() => {
      expect(screen.getByText("0 unread")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Mark note-1 read" }),
      ).not.toBeInTheDocument();
    });
  });

  it("snoozes a notification for one hour and refreshes inbox", async () => {
    const client = createMockClient();
    client.getOwnNotifications
      .mockResolvedValueOnce([
        {
          id: "note-1",
          message: "Low stock alert",
          status: "UNREAD",
          createdAt: "2026-03-01T10:00:00Z",
        },
      ])
      .mockResolvedValueOnce([]);
    client.getOwnUnreadCount
      .mockResolvedValueOnce({ unread_count: 1 })
      .mockResolvedValueOnce({ unread_count: 0 });

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    const snoozeBtn = await screen.findByRole("button", {
      name: "Snooze note-1 for one hour",
    });
    fireEvent.click(snoozeBtn);

    await waitFor(() => {
      expect(client.snoozeOwnNotification).toHaveBeenCalledWith("note-1", 1);
    });

    await waitFor(() => {
      expect(screen.getByText("No current notifications.")).toBeInTheDocument();
      expect(screen.getByText("0 unread")).toBeInTheDocument();
    });
  });

  it("escalates a notification when a manager is selected", async () => {
    const client = createMockClient();
    client.getOwnNotifications.mockResolvedValue([
      {
        id: "note-1",
        message: "Critical error alert",
        status: "UNREAD",
        createdAt: "2026-03-01T10:00:00Z",
      },
    ]);
    client.getNotificationManagers.mockResolvedValue([
      { id: "mgr-1", name: "Alice Manager", role: "Operations Lead" },
      { id: "mgr-2", name: "", role: "Floor Supervisor" },
    ]);
    client.getOwnUnreadCount.mockResolvedValue({ unread_count: 1 });

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    // Escalate button should not appear until manager is selected
    await screen.findByText("Critical error alert");
    expect(
      screen.queryByRole("button", { name: "Escalate note-1" }),
    ).not.toBeInTheDocument();

    // Select manager
    const select = screen.getByLabelText("Escalation manager");
    expect(
      screen.getByRole("option", { name: "Alice Manager" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Floor Supervisor" }),
    ).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "mgr-1" } });

    const escalateBtn = await screen.findByRole("button", {
      name: "Escalate note-1",
    });
    fireEvent.click(escalateBtn);

    await waitFor(() => {
      expect(client.escalateOwnNotification).toHaveBeenCalledWith(
        "note-1",
        "mgr-1",
      );
    });
  });

  it("invokes onOpenReports when View reports button is clicked for execution link", async () => {
    const client = createMockClient();
    const handleOpenReports = vi.fn();
    client.getOwnNotifications.mockResolvedValue([
      {
        id: "note-report",
        message: "Report ready",
        status: "READ",
        createdAt: "2026-03-01T10:00:00Z",
        link: "/reports/executions/job-123",
      },
    ]);

    render(
      <PythonNotificationInbox
        client={client as any}
        tenantId="test-tenant"
        onOpenReports={handleOpenReports}
      />,
    );

    const viewReportsBtn = await screen.findByRole("button", {
      name: "View reports",
    });
    fireEvent.click(viewReportsBtn);

    expect(handleOpenReports).toHaveBeenCalledTimes(1);
  });

  it("manually refreshes inbox when Refresh inbox button is clicked", async () => {
    const client = createMockClient();
    client.getOwnNotifications.mockResolvedValue([]);
    client.getOwnUnreadCount.mockResolvedValue({ unread_count: 0 });

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    await waitFor(() => {
      expect(screen.getByText("No current notifications.")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole("button", { name: "Refresh inbox" });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      // Called on mount + once on manual refresh
      expect(client.getOwnNotifications).toHaveBeenCalledTimes(2);
      expect(client.getOwnUnreadCount).toHaveBeenCalledTimes(2);
    });
  });

  it("displays error alert when fetching fails on load", async () => {
    const client = createMockClient();
    client.getOwnNotifications.mockRejectedValue(
      new Error("Failed to load notifications"),
    );

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to load notifications");
    expect(screen.getByText("Inbox unavailable.")).toBeInTheDocument();
  });

  it("displays error alert when an action fails", async () => {
    const client = createMockClient();
    client.getOwnNotifications.mockResolvedValue([
      {
        id: "note-1",
        message: "Notification alert",
        status: "UNREAD",
        createdAt: "2026-03-01T10:00:00Z",
      },
    ]);
    client.getOwnUnreadCount.mockResolvedValue({ unread_count: 1 });
    client.markNotificationRead.mockRejectedValue(
      new Error("Action unauthorized"),
    );

    render(
      <PythonNotificationInbox client={client as any} tenantId="test-tenant" />,
    );

    const markReadBtn = await screen.findByRole("button", {
      name: "Mark note-1 read",
    });
    fireEvent.click(markReadBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Action unauthorized");
  });
});
