import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LogisticsErpPanel } from "../../src/components/LogisticsErpPanel";

describe("LogisticsErpPanel", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  const mockApi = {
    calculateShippingRates: vi.fn(),
    generateShippingLabel: vi.fn(),
    syncERPJournal: vi.fn(),
  };

  it("renders default rates tab", () => {
    render(<LogisticsErpPanel api={mockApi} />);
    expect(
      screen.getByText("Enterprise Logistics & ERP Integrations"),
    ).toBeInTheDocument();
    expect(screen.getByText("Carrier Quote Request")).toBeInTheDocument();
    expect(screen.getByText("Rate Breakdown Quote")).toBeInTheDocument();
  });

  it("switches to label tab", () => {
    render(<LogisticsErpPanel api={mockApi} />);
    const labelBtn = screen.getByText("🏷️ Label Generator");
    fireEvent.click(labelBtn);
    expect(screen.getByText("Label Generator Parameters")).toBeInTheDocument();
    expect(
      screen.getByText("Generated Shipping Artifacts"),
    ).toBeInTheDocument();
  });

  it("switches to erp tab", () => {
    render(<LogisticsErpPanel api={mockApi} />);
    const erpBtn = screen.getByText("📊 ERP Sync");
    fireEvent.click(erpBtn);
    expect(screen.getByText("ERP Accounting Sync Input")).toBeInTheDocument();
    expect(screen.getByText("ERP Sync Confirmation")).toBeInTheDocument();
  });

  describe("Carrier Rates calculation", () => {
    it("calculates rates successfully with custom api", async () => {
      mockApi.calculateShippingRates.mockResolvedValueOnce({
        carrier: "FEDEX",
        serviceLevel: "FEDEX_EXPRESS_SAVER",
        estimatedDeliveryDays: 3,
        baseRateCents: 2500,
        fuelSurchargeCents: 350,
        totalRateCents: 2850,
        currency: "USD",
      });

      render(<LogisticsErpPanel api={mockApi} />);

      const calcBtn = screen.getByRole("button", {
        name: "Calculate Shipping Rate",
      });
      fireEvent.click(calcBtn);

      await waitFor(() => {
        expect(mockApi.calculateShippingRates).toHaveBeenCalledWith({
          carrier: "FEDEX",
          originPostalCode: "10001",
          destinationPostalCode: "90210",
          weightKg: 4.5,
          serviceLevel: "FEDEX_EXPRESS_SAVER",
        });
      });

      expect(screen.getByText("3 Business Days")).toBeInTheDocument();
      expect(screen.getByText("$25.00")).toBeInTheDocument();
      expect(screen.getByText("$3.50")).toBeInTheDocument();
      expect(screen.getByText("$28.50 USD")).toBeInTheDocument();
    });

    it("calculates rates successfully via REST fallback fetch with auth token", async () => {
      localStorage.setItem("auth_token", "sample-token-123");
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          carrier: "UPS",
          serviceLevel: "UPS_GROUND",
          estimatedDeliveryDays: 2,
          baseRateCents: 1500,
          fuelSurchargeCents: 200,
          totalRateCents: 1700,
          currency: "USD",
        }),
      });
      global.fetch = mockFetch;

      render(<LogisticsErpPanel />);

      const calcBtn = screen.getByRole("button", {
        name: "Calculate Shipping Rate",
      });
      fireEvent.click(calcBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/shipping/quote",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer sample-token-123",
              "Content-Type": "application/json",
            }),
          }),
        );
      });

      expect(screen.getByText("2 Business Days")).toBeInTheDocument();
      expect(screen.getByText("$17.00 USD")).toBeInTheDocument();
    });

    it("handles rate calculation errors and dismisses error alert", async () => {
      mockApi.calculateShippingRates.mockRejectedValueOnce(
        new Error("Carrier service unavailable"),
      );

      render(<LogisticsErpPanel api={mockApi} />);

      const calcBtn = screen.getByRole("button", {
        name: "Calculate Shipping Rate",
      });
      fireEvent.click(calcBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Carrier service unavailable/),
        ).toBeInTheDocument();
      });

      const dismissBtn = screen.getByRole("button", {
        name: "Dismiss error",
      });
      fireEvent.click(dismissBtn);

      expect(
        screen.queryByText(/Carrier service unavailable/),
      ).not.toBeInTheDocument();
    });

    it("handles REST fallback failure response with error payload", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid postal code" }),
      });
      global.fetch = mockFetch;

      render(<LogisticsErpPanel />);

      const calcBtn = screen.getByRole("button", {
        name: "Calculate Shipping Rate",
      });
      fireEvent.click(calcBtn);

      await waitFor(() => {
        expect(screen.getByText(/Invalid postal code/)).toBeInTheDocument();
      });
    });
  });

  describe("Label Generator", () => {
    it("generates label with custom api including ZPL, PDF, and safe BOL link", async () => {
      mockApi.generateShippingLabel.mockResolvedValueOnce({
        trackingNumber: "1Z9999999999999999",
        zplString: "^XA^FO50,50^ADN,36,20^FDTest Label^FS^XZ",
        pdfBase64: "JVBERi0xLjQKJ...",
        bolUrl: "https://carriers.example.com/bol/12345.pdf",
      });

      render(<LogisticsErpPanel api={mockApi} />);
      fireEvent.click(screen.getByText("🏷️ Label Generator"));

      const generateBtn = screen.getByRole("button", {
        name: "Generate Thermal / PDF Label",
      });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(mockApi.generateShippingLabel).toHaveBeenCalledWith({
          carrier: "UPS",
          recipientName: "Jane Doe",
          shippingAddress: "123 Enterprise Way, Suite 400, Austin, TX 78701",
          weightKg: 2.5,
          format: "BOTH",
        });
      });

      expect(screen.getByText("1Z9999999999999999")).toBeInTheDocument();
      expect(screen.getByText(/\^XA\^FO50,50/)).toBeInTheDocument();
      expect(screen.getByText(/JVBERi0xLjQKJ/)).toBeInTheDocument();

      const downloadLink = screen.getByText("Download LTL BOL PDF");
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute(
        "href",
        "https://carriers.example.com/bol/12345.pdf",
      );
    });

    it("safeguards against unsafe bolUrl protocols", async () => {
      mockApi.generateShippingLabel.mockResolvedValueOnce({
        trackingNumber: "TRACK-UNSAFE",
        bolUrl: "javascript:alert('xss')",
      });

      render(<LogisticsErpPanel api={mockApi} />);
      fireEvent.click(screen.getByText("🏷️ Label Generator"));

      fireEvent.click(
        screen.getByRole("button", { name: "Generate Thermal / PDF Label" }),
      );

      await waitFor(() => {
        expect(screen.getByText("TRACK-UNSAFE")).toBeInTheDocument();
      });

      const downloadLink = screen.getByText("Download LTL BOL PDF");
      expect(downloadLink).toHaveAttribute("href", "about:blank");
    });

    it("generates label via REST fallback when api is not supplied", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trackingNumber: "FEDEX-REST-999",
          zplString: "^XA^XZ",
        }),
      });
      global.fetch = mockFetch;

      render(<LogisticsErpPanel />);
      fireEvent.click(screen.getByText("🏷️ Label Generator"));

      fireEvent.click(
        screen.getByRole("button", { name: "Generate Thermal / PDF Label" }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/shipping/label",
          expect.objectContaining({
            method: "POST",
          }),
        );
      });

      expect(screen.getByText("FEDEX-REST-999")).toBeInTheDocument();
    });

    it("displays error when label generation fails", async () => {
      mockApi.generateShippingLabel.mockRejectedValueOnce(
        new Error("Address validation failed"),
      );

      render(<LogisticsErpPanel api={mockApi} />);
      fireEvent.click(screen.getByText("🏷️ Label Generator"));

      fireEvent.click(
        screen.getByRole("button", { name: "Generate Thermal / PDF Label" }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Address validation failed/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("ERP Sync", () => {
    it("posts journal entry to ERP successfully via custom api", async () => {
      mockApi.syncERPJournal.mockResolvedValueOnce({
        provider: "QUICKBOOKS",
        externalJournalId: "QBO-JOURNAL-777",
        postedAmountCents: 45000,
        message: "Journal entry posted successfully to QuickBooks Online.",
      });

      render(<LogisticsErpPanel api={mockApi} />);
      fireEvent.click(screen.getByText("📊 ERP Sync"));

      const postBtn = screen.getByRole("button", {
        name: "Post Journal Entry to ERP",
      });
      fireEvent.click(postBtn);

      await waitFor(() => {
        expect(mockApi.syncERPJournal).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: "QUICKBOOKS",
            memo: "Inventory dispatch revenue posting",
            lines: [
              {
                accountCode: "1200",
                description: "Inventory dispatch revenue posting",
                amountCents: 45000,
                postingType: "DEBIT",
              },
            ],
          }),
        );
      });

      expect(screen.getByText("✓ SUCCESSFUL SYNC")).toBeInTheDocument();
      expect(screen.getByText("QBO-JOURNAL-777")).toBeInTheDocument();
      expect(screen.getByText("$450.00")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Journal entry posted successfully to QuickBooks Online.",
        ),
      ).toBeInTheDocument();
    });

    it("posts journal entry via REST fallback fetch when api is not supplied", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: "NETSUITE",
          externalJournalId: "NS-JE-888",
          postedAmountCents: 45000,
          message: "NetSuite SuiteTalk Journal Created",
        }),
      });
      global.fetch = mockFetch;

      render(<LogisticsErpPanel />);
      fireEvent.click(screen.getByText("📊 ERP Sync"));

      fireEvent.click(
        screen.getByRole("button", { name: "Post Journal Entry to ERP" }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/erp/sync",
          expect.objectContaining({
            method: "POST",
          }),
        );
      });

      expect(screen.getByText("NS-JE-888")).toBeInTheDocument();
      expect(
        screen.getByText("NetSuite SuiteTalk Journal Created"),
      ).toBeInTheDocument();
    });

    it("handles ERP sync failure gracefully", async () => {
      mockApi.syncERPJournal.mockRejectedValueOnce(
        new Error("ERP authentication failed: Invalid token"),
      );

      render(<LogisticsErpPanel api={mockApi} />);
      fireEvent.click(screen.getByText("📊 ERP Sync"));

      fireEvent.click(
        screen.getByRole("button", { name: "Post Journal Entry to ERP" }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/ERP authentication failed: Invalid token/),
        ).toBeInTheDocument();
      });
    });
  });
});
