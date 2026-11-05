import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleManagementPanel } from "./RoleManagementPanel";

const mockClient = {
  getRoles: vi.fn(),
  getPermissions: vi.fn(),
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  updateRolePermissions: vi.fn(),
};

vi.mock("../api/client", () => ({
  useInventory: () => ({
    client: mockClient,
  }),
}));

describe("RoleManagementPanel", () => {
  const samplePermissions = [
    { id: "p1", resource: "user", action: "edit_role" },
    { id: "p2", resource: "user", action: "view_role" },
    { id: "p3", resource: "inventory", action: "read_stock" },
    { id: "p4", resource: "inventory", action: "write_stock" },
  ];

  const sampleRoles = [
    {
      id: "r1",
      name: "Admin",
      description: "System administrator with high privileges",
      isCustom: false,
      permissions: [
        { id: "p1", resource: "user", action: "edit_role" },
        { id: "p2", resource: "user", action: "view_role" },
        { id: "p3", resource: "inventory", action: "read_stock" },
        { id: "p4", resource: "inventory", action: "write_stock" },
      ],
    },
    {
      id: "r2",
      name: "Warehouse Picker",
      description: "Custom warehouse worker role",
      isCustom: true,
      permissions: [{ id: "p3", resource: "inventory", action: "read_stock" }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getRoles.mockResolvedValue(sampleRoles);
    mockClient.getPermissions.mockResolvedValue(samplePermissions);
    mockClient.createRole.mockResolvedValue({});
    mockClient.deleteRole.mockResolvedValue({});
    mockClient.updateRolePermissions.mockResolvedValue({});
  });

  it("renders loading spinner initially and displays roles and permissions when resolved", async () => {
    let resolveRoles: (value: any) => void = () => {};
    mockClient.getRoles.mockReturnValue(
      new Promise((res) => {
        resolveRoles = res;
      }),
    );

    const { container } = render(<RoleManagementPanel />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();

    resolveRoles(sampleRoles);

    await waitFor(() => {
      expect(screen.getByText("RBAC & Permission Engine")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Warehouse Picker")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });
  });

  it("shows empty state message when no roles are returned", async () => {
    mockClient.getRoles.mockResolvedValue([]);
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /No roles found. Ensure your backend is running and seeded./i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders "+X more" badge when role permissions exceed 3', async () => {
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("renders error alert on initial load failure and allows dismissing it", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockClient.getRoles.mockRejectedValue(
      new Error("Network error loading roles"),
    );

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Network error loading roles",
      );
    });

    const dismissBtn = screen.getByRole("button", { name: /dismiss error/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("handles fallback error message if error object lacks message property", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockClient.getRoles.mockRejectedValue({});

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to load RBAC data",
      );
    });

    consoleSpy.mockRestore();
  });

  it("opens and closes the create role form when clicking Cancel", async () => {
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /\+ Create Role/i });
    fireEvent.click(createBtn);

    expect(screen.getByText("Create New Custom Role")).toBeInTheDocument();
    expect(screen.getByLabelText(/Role Name \*/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(
      screen.queryByText("Create New Custom Role"),
    ).not.toBeInTheDocument();
  });

  it("creates a new custom role with selected permissions", async () => {
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Create Role/i }));

    const roleNameInput = screen.getByLabelText(/Role Name \*/i);
    const roleDescInput = screen.getByLabelText(/Description/i);

    fireEvent.change(roleNameInput, { target: { value: "Supervisor" } });
    fireEvent.change(roleDescInput, {
      target: { value: "Floor shift supervisor" },
    });

    // Toggle permissions
    const editRoleCheckbox = screen.getByLabelText("edit_role");
    const readStockCheckbox = screen.getByLabelText("read_stock");

    fireEvent.click(editRoleCheckbox);
    fireEvent.click(readStockCheckbox);

    // Toggle again to verify unchecking works
    fireEvent.click(readStockCheckbox);
    fireEvent.click(readStockCheckbox);

    const submitBtn = screen.getByRole("button", { name: /Save New Role/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.createRole).toHaveBeenCalledWith(
        "TENANT-1",
        "Supervisor",
        "Floor shift supervisor",
        ["p1", "p3"],
      );
    });

    // Verify form resets and closes
    await waitFor(() => {
      expect(
        screen.queryByText("Create New Custom Role"),
      ).not.toBeInTheDocument();
    });
  });

  it("prevents role creation if role name is empty or only whitespace", async () => {
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Create Role/i }));

    const form = screen
      .getByRole("button", { name: /Save New Role/i })
      .closest("form")!;
    const roleNameInput = screen.getByLabelText(/Role Name \*/i);

    fireEvent.change(roleNameInput, { target: { value: "   " } });
    fireEvent.submit(form);

    expect(mockClient.createRole).not.toHaveBeenCalled();
  });

  it("surfaces error when role creation fails", async () => {
    mockClient.createRole.mockRejectedValue(
      new Error("Role name already exists"),
    );

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Create Role/i }));

    const roleNameInput = screen.getByLabelText(/Role Name \*/i);
    fireEvent.change(roleNameInput, { target: { value: "Duplicate Role" } });

    fireEvent.click(screen.getByRole("button", { name: /Save New Role/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Role name already exists",
      );
    });
  });

  it("opens edit permissions form, toggles permissions, and saves changes", async () => {
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", {
      name: /Edit role Warehouse Picker/i,
    });
    fireEvent.click(editBtn);

    expect(
      screen.getByText("Edit Permissions: Warehouse Picker"),
    ).toBeInTheDocument();

    // Warehouse Picker starts with p3 (read_stock) checked
    const readStockCheckbox = screen.getByLabelText(
      "read_stock",
    ) as HTMLInputElement;
    expect(readStockCheckbox.checked).toBe(true);

    const writeStockCheckbox = screen.getByLabelText(
      "write_stock",
    ) as HTMLInputElement;
    expect(writeStockCheckbox.checked).toBe(false);

    // Toggle permissions
    fireEvent.click(writeStockCheckbox);
    fireEvent.click(readStockCheckbox); // uncheck read_stock

    const submitBtn = screen.getByRole("button", {
      name: /Update Permissions/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.updateRolePermissions).toHaveBeenCalledWith("r2", [
        "p4",
      ]);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Edit Permissions: Warehouse Picker"),
      ).not.toBeInTheDocument();
    });
  });

  it("allows canceling permission editing without updating", async () => {
    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Edit role Warehouse Picker/i }),
    );
    expect(
      screen.getByText("Edit Permissions: Warehouse Picker"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByText("Edit Permissions: Warehouse Picker"),
    ).not.toBeInTheDocument();
    expect(mockClient.updateRolePermissions).not.toHaveBeenCalled();
  });

  it("surfaces error when updating permissions fails", async () => {
    mockClient.updateRolePermissions.mockRejectedValue(
      new Error("Permission update rejected by server"),
    );

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Warehouse Picker")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Edit role Warehouse Picker/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Update Permissions/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Permission update rejected by server",
      );
    });
  });

  it("only displays delete button for custom roles and deletes role upon confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Warehouse Picker")).toBeInTheDocument();
    });

    // Admin is a system role (isCustom: false) -> no delete button
    expect(
      screen.queryByRole("button", { name: /Delete role Admin/i }),
    ).not.toBeInTheDocument();

    // Warehouse Picker is custom (isCustom: true) -> delete button exists
    const deleteBtn = screen.getByRole("button", {
      name: /Delete role Warehouse Picker/i,
    });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      "Are you sure you want to delete this role?",
    );
    await waitFor(() => {
      expect(mockClient.deleteRole).toHaveBeenCalledWith("r2");
    });

    confirmSpy.mockRestore();
  });

  it("does not delete role when confirmation is canceled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Warehouse Picker")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", {
      name: /Delete role Warehouse Picker/i,
    });
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      "Are you sure you want to delete this role?",
    );
    expect(mockClient.deleteRole).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("surfaces error when deleting role fails", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockClient.deleteRole.mockRejectedValue(
      new Error("Cannot delete role in use"),
    );

    render(<RoleManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Warehouse Picker")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Delete role Warehouse Picker/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Cannot delete role in use",
      );
    });

    confirmSpy.mockRestore();
  });
});
