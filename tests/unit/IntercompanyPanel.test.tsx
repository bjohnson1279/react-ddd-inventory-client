import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IntercompanyPanel } from "../../src/panels/IntercompanyPanel";
import { useInventory } from "../../src/api/client";

vi.mock("../../src/api/client", () => ({
  useInventory: vi.fn(),
}));

const mockEntities = [
  { id: "entity-1", name: "US Subsidiary", baseCurrency: "USD" },
  { id: "entity-2", name: "UK Subsidiary", baseCurrency: "GBP" },
];

const mockTransfers = [
  {
    id: "transfer-1",
    fromEntityId: "entity-1",
    toEntityId: "entity-2",
    sku: "SKU-001",
    quantity: 10,
    status: "COMPLETED",
    createdAt: "2025-01-01T00:00:00Z",
  },
];

describe("IntercompanyPanel", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getLegalEntities: vi.fn().mockResolvedValue(mockEntities),
      getIntercompanyTransfers: vi.fn().mockResolvedValue(mockTransfers),
      createLegalEntity: vi.fn().mockResolvedValue({ id: "entity-3" }),
      executeIntercompanyTransfer: vi
        .fn()
        .mockResolvedValue({ id: "transfer-2" }),
    };

    vi.mocked(useInventory).mockReturnValue({ client: mockClient } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders panel and fetches legal entities and transfers on mount", async () => {
    render(<IntercompanyPanel tenantId="tenant-test" />);

    expect(screen.getByText("Legal Entities")).toBeInTheDocument();
    expect(screen.getByText("Intercompany Transfer")).toBeInTheDocument();
    expect(screen.getByText("Transfer History")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockClient.getLegalEntities).toHaveBeenCalledWith("tenant-test");
      expect(mockClient.getIntercompanyTransfers).toHaveBeenCalledWith(
        "tenant-test",
      );
    });

    expect(screen.getAllByText('US Subsidiary').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UK Subsidiary').length).toBeGreaterThan(0);
    expect(screen.getByText("SKU-001 (x10)")).toBeInTheDocument();
  });

  it("successfully creates a legal entity and resets inputs", async () => {
    const user = userEvent.setup();
    render(<IntercompanyPanel tenantId="tenant-test" />);

    await waitFor(() => expect(mockClient.getLegalEntities).toHaveBeenCalled());

    const nameInput = screen.getByLabelText("Entity Name");
    const currencyInput = screen.getByLabelText("Base Currency");
    const taxInput = screen.getByLabelText("Tax Identifier");
    const submitBtn = screen.getByRole("button", {
      name: /Create Legal Entity/i,
    });

    await user.clear(nameInput);
    await user.type(nameInput, "EU Subsidiary");
    await user.clear(currencyInput);
    await user.type(currencyInput, "EUR");
    await user.clear(taxInput);
    await user.type(taxInput, "TAX-999");

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.createLegalEntity).toHaveBeenCalledWith(
        "tenant-test",
        "EU Subsidiary",
        "EUR",
        "TAX-999",
      );
      expect(mockClient.getLegalEntities).toHaveBeenCalledTimes(2);
    });

    expect(nameInput).toHaveValue("");
    expect(taxInput).toHaveValue("");
  });

  it("logs error when createLegalEntity fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const createError = new Error("Failed to create legal entity");
    mockClient.createLegalEntity.mockRejectedValueOnce(createError);

    const user = userEvent.setup();
    render(<IntercompanyPanel tenantId="tenant-test" />);

    await waitFor(() => expect(mockClient.getLegalEntities).toHaveBeenCalled());

    const nameInput = screen.getByLabelText("Entity Name");
    const submitBtn = screen.getByRole("button", {
      name: /Create Legal Entity/i,
    });

    await user.type(nameInput, "Failing Entity");

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.createLegalEntity).toHaveBeenCalledWith(
        "tenant-test",
        "Failing Entity",
        "USD",
        "",
      );
      expect(consoleSpy).toHaveBeenCalledWith(createError);
    });

    consoleSpy.mockRestore();
  });

  it("logs error when loadData fails on mount", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const loadError = new Error("Network error on load");
    mockClient.getLegalEntities.mockRejectedValueOnce(loadError);

    render(<IntercompanyPanel tenantId="tenant-test" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(loadError);
    });

    consoleSpy.mockRestore();
  });

  it("successfully executes an intercompany transfer", async () => {
    const user = userEvent.setup();
    render(<IntercompanyPanel tenantId="tenant-test" />);

    await waitFor(() => expect(mockClient.getLegalEntities).toHaveBeenCalled());

    const fromSelect = screen.getByLabelText("From Entity");
    const toSelect = screen.getByLabelText("To Entity");
    const skuInput = screen.getByLabelText("SKU");
    const quantityInput = screen.getByLabelText("Quantity");
    const unitCostInput = screen.getByLabelText("Unit Cost ($)");
    const markupInput = screen.getByLabelText("Markup %");
    const dutyInput = screen.getByLabelText("Duty ($)");
    const executeBtn = screen.getByRole("button", {
      name: /Execute Transfer/i,
    });

    await user.selectOptions(fromSelect, "entity-1");
    await user.selectOptions(toSelect, "entity-2");
    await user.clear(skuInput);
    await user.type(skuInput, "SKU-002");
    await user.clear(quantityInput);
    await user.type(quantityInput, "5");
    await user.clear(unitCostInput);
    await user.type(unitCostInput, "20");
    await user.clear(markupInput);
    await user.type(markupInput, "10");
    await user.clear(dutyInput);
    await user.type(dutyInput, "2");

    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(mockClient.executeIntercompanyTransfer).toHaveBeenCalledWith({
        tenantId: "tenant-test",
        fromEntityId: "entity-1",
        toEntityId: "entity-2",
        sku: "SKU-002",
        quantity: 5,
        unitCostCents: 2000,
        markupPercentage: 10,
        dutyCents: 200,
      });
      expect(mockClient.getIntercompanyTransfers).toHaveBeenCalledTimes(2);
    });
  });

  it("logs error when executeIntercompanyTransfer fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const transferError = new Error("Transfer execution failed");
    mockClient.executeIntercompanyTransfer.mockRejectedValueOnce(transferError);

    const user = userEvent.setup();
    render(<IntercompanyPanel tenantId="tenant-test" />);

    await waitFor(() => expect(mockClient.getLegalEntities).toHaveBeenCalled());

    const fromSelect = screen.getByLabelText("From Entity");
    const toSelect = screen.getByLabelText("To Entity");
    const skuInput = screen.getByLabelText("SKU");
    const executeBtn = screen.getByRole("button", {
      name: /Execute Transfer/i,
    });

    await user.selectOptions(fromSelect, "entity-1");
    await user.selectOptions(toSelect, "entity-2");
    await user.type(skuInput, "SKU-FAIL");

    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(transferError);
    });

    consoleSpy.mockRestore();
  });

  it("renders empty table message when no transfers exist", async () => {
    mockClient.getIntercompanyTransfers.mockResolvedValueOnce([]);

    render(<IntercompanyPanel tenantId="tenant-test" />);

    await waitFor(() => {
      expect(screen.getByText("No transfers found.")).toBeInTheDocument();
    });
  });
});
