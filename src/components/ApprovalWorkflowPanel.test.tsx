import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApprovalWorkflowPanel } from "./ApprovalWorkflowPanel";

describe("ApprovalWorkflowPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with mocked API and handles step details", async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue([
        {
          id: "wf_1",
          triggerEvent: "PO_CREATED",
          isActive: true,
          steps: [{ roleId: "manager", minApprovals: 1, timeoutHours: 24 }],
        },
      ]),
      toggleApprovalWorkflow: vi.fn().mockResolvedValue({}),
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);

    await waitFor(() => {
      expect(
        screen.getByText("Approval Workflow Configuration"),
      ).toBeInTheDocument();
      expect(screen.getByText("PO_CREATED")).toBeInTheDocument();
      expect(screen.getByText(/Role:/)).toBeInTheDocument();
      expect(screen.getByText("manager")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Active" }),
      ).toBeInTheDocument();
    });
  });

  it("renders empty workflows placeholder when no workflows exist", async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue([]),
      toggleApprovalWorkflow: vi.fn().mockResolvedValue({}),
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);

    await waitFor(() => {
      expect(
        screen.getByText("No approval workflows configured yet."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create New Workflow" }),
      ).toBeInTheDocument();
    });
  });

  it('renders "No steps configured." when workflow steps array is empty', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue([
        {
          id: "wf_empty_steps",
          triggerEvent: "INVENTORY_WRITEOFF",
          isActive: false,
          steps: [],
        },
      ]),
      toggleApprovalWorkflow: vi.fn().mockResolvedValue({}),
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText("INVENTORY_WRITEOFF")).toBeInTheDocument();
      expect(screen.getByText("No steps configured.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Inactive" }),
      ).toBeInTheDocument();
    });
  });

  it("handles API fetch failure and displays dismissible error message", async () => {
    const mockApi = {
      getApprovalWorkflows: vi
        .fn()
        .mockRejectedValue(new Error("Network error loading workflows")),
      toggleApprovalWorkflow: vi.fn(),
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Network error loading workflows"),
      ).toBeInTheDocument();
    });

    const dismissBtn = screen.getByRole("button", { name: /dismiss error/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("handles toggle failure through API and displays error", async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue([
        {
          id: "wf_1",
          triggerEvent: "PO_CREATED",
          isActive: true,
          steps: [],
        },
      ]),
      toggleApprovalWorkflow: vi
        .fn()
        .mockRejectedValue(new Error("Failed to update status")),
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);

    const toggleBtn = await screen.findByRole("button", { name: "Active" });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Failed to update status")).toBeInTheDocument();
    });
  });

  it("successfully toggles workflow via API and refreshes workflows", async () => {
    let activeState = true;
    const getWorkflowsMock = vi.fn().mockImplementation(async () => [
      {
        id: "wf_1",
        triggerEvent: "PO_CREATED",
        isActive: activeState,
        steps: [],
      },
    ]);
    const toggleMock = vi.fn().mockImplementation(async (id: string) => {
      activeState = !activeState;
      return {};
    });

    const mockApi = {
      getApprovalWorkflows: getWorkflowsMock,
      toggleApprovalWorkflow: toggleMock,
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);

    const toggleBtn = await screen.findByRole("button", { name: "Active" });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(toggleMock).toHaveBeenCalledWith("wf_1");
      expect(getWorkflowsMock).toHaveBeenCalledTimes(2);
      expect(
        screen.getByRole("button", { name: "Inactive" }),
      ).toBeInTheDocument();
    });
  });

  it("fetches workflows via fallback window.fetch with auth token when api prop is omitted", async () => {
    localStorage.setItem("auth_token", "test-jwt-token");

    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation((input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr === "/api/approval/workflows") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  id: "wf_fallback",
                  triggerEvent: "STOCK_TRANSFER",
                  isActive: false,
                  steps: [
                    { roleId: "director", minApprovals: 2, timeoutHours: 48 },
                  ],
                },
              ],
            }),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
      });

    render(<ApprovalWorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText("STOCK_TRANSFER")).toBeInTheDocument();
      expect(screen.getByText("director")).toBeInTheDocument();
      expect(screen.getByText(/Requires: 2 approval\(s\)/)).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/approval/workflows", {
      headers: {
        Authorization: "Bearer test-jwt-token",
      },
    });
  });

  it("toggles workflow via fallback window.fetch with auth token", async () => {
    localStorage.setItem("auth_token", "test-jwt-token-2");

    let isActive = false;
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        if (urlStr === "/api/approval/workflows") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  id: "wf_toggle_test",
                  triggerEvent: "PRICE_OVERRIDE",
                  isActive,
                  steps: [],
                },
              ],
            }),
          } as Response);
        }
        if (
          urlStr ===
          `/api/approval/workflows/${encodeURIComponent("wf_toggle_test")}/toggle`
        ) {
          isActive = true;
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
      });

    render(<ApprovalWorkflowPanel />);

    const toggleBtn = await screen.findByRole("button", { name: "Inactive" });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Active" }),
      ).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/approval/workflows/wf_toggle_test/toggle",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-jwt-token-2",
        },
      },
    );
  });

  it("handles toggle failure via fallback window.fetch", async () => {
    vi.spyOn(window, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const urlStr = String(input);
      if (urlStr === "/api/approval/workflows") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "wf_toggle_err",
                triggerEvent: "EXPENSE_CLAIM",
                isActive: false,
                steps: [],
              },
            ],
          }),
        } as Response);
      }
      if (urlStr.includes("/toggle")) {
        return Promise.reject(new Error("Network failure during toggle"));
      }
      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    render(<ApprovalWorkflowPanel />);

    const toggleBtn = await screen.findByRole("button", { name: "Inactive" });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Network failure during toggle"),
      ).toBeInTheDocument();
    });
  });

  it("handles fetch failure via fallback window.fetch without token", async () => {
    vi.spyOn(window, "fetch").mockRejectedValue(
      new Error("Server unavailable"),
    );

    render(<ApprovalWorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Server unavailable")).toBeInTheDocument();
    });
  });
});
