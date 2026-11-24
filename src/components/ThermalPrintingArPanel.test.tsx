import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThermalPrintingArPanel } from "./ThermalPrintingArPanel";
import React from "react";

describe("ThermalPrintingArPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders initial thermal printing tab correctly", () => {
    render(<ThermalPrintingArPanel />);
    expect(
      screen.getByText("Thermal Printing & WebXR AR-Guided Operations"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Spool ZPL/TSPL Thermal Print Job"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send ZPL Print Command" }),
    ).toBeInTheDocument();
  });

  it("switches to AR tab when AR button is clicked", () => {
    render(<ThermalPrintingArPanel />);
    const arTabButton = screen.getByRole("button", {
      name: "WebXR AR Pick & Pack Viewport",
    });
    fireEvent.click(arTabButton);

    expect(
      screen.getByText("WebXR Visual AR Spatial Guidance"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Launch AR Overlay Guidance" }),
    ).toBeInTheDocument();
  });

  it("toggles AR guidance active state and updates inputs", () => {
    render(<ThermalPrintingArPanel />);

    // Switch to AR Tab
    const arTabButton = screen.getByRole("button", {
      name: "WebXR AR Pick & Pack Viewport",
    });
    fireEvent.click(arTabButton);

    const targetBinInput = screen.getByLabelText("Target Location Bin");
    const pickSkuInput = screen.getByLabelText("Pick SKU");
    const pickQuantityInput = screen.getByLabelText("Required Quantity");

    fireEvent.change(targetBinInput, { target: { value: "BIN-B-205" } });
    fireEvent.change(pickSkuInput, { target: { value: "SKU-9999" } });
    fireEvent.change(pickQuantityInput, { target: { value: "12" } });

    // Activate AR
    const launchButton = screen.getByRole("button", {
      name: "Launch AR Overlay Guidance",
    });
    fireEvent.click(launchButton);

    expect(screen.getByText("AR LIVE CAMERA FEED")).toBeInTheDocument();
    expect(screen.getByText("TARGET: BIN-B-205")).toBeInTheDocument();
    expect(screen.getByText("Pick 12x SKU-9999")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close AR Viewport" }),
    ).toBeInTheDocument();

    // Test quantity fallback when empty or invalid string is input
    fireEvent.change(pickQuantityInput, { target: { value: "" } });
    expect(screen.getByText("Pick 1x SKU-9999")).toBeInTheDocument();

    // Deactivate AR
    const closeButton = screen.getByRole("button", {
      name: "Close AR Viewport",
    });
    fireEvent.click(closeButton);

    expect(
      screen.getByText(/Click "Launch AR Overlay Guidance" to activate/i),
    ).toBeInTheDocument();
  });

  it("allows editing thermal print parameters and prints with custom values", async () => {
    const mockApi = {
      printZplThermalLabel: vi.fn().mockResolvedValue({
        jobId: "CUSTOM_JOB_789",
        printerName: "Zebra-Custom",
        zplCode: "^XA^FO50,50^FDTEST^FS^XZ",
        sentAt: "2023-01-01T12:00:00Z",
      }),
    };

    render(<ThermalPrintingArPanel api={mockApi} />);

    fireEvent.change(screen.getByLabelText("Target Printer Name"), {
      target: { value: "Zebra-Custom" },
    });
    fireEvent.change(screen.getByLabelText("Label Category"), {
      target: { value: "LOT" },
    });
    fireEvent.change(screen.getByLabelText("Barcode / QR Value"), {
      target: { value: "LOT-998877" },
    });
    fireEvent.change(screen.getByLabelText("Subtitle / Header Text"), {
      target: { value: "Perishable Chemical Storage" },
    });

    const printButton = screen.getByRole("button", {
      name: "Send ZPL Print Command",
    });
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(mockApi.printZplThermalLabel).toHaveBeenCalledWith({
        printerName: "Zebra-Custom",
        labelType: "LOT",
        barcodeValue: "LOT-998877",
        subtitle: "Perishable Chemical Storage",
      });
    });

    expect(screen.getByText(/CUSTOM_JOB_789/)).toBeInTheDocument();
  });

  it("calls api printZplThermalLabel with default arguments", async () => {
    const mockApi = {
      printZplThermalLabel: vi.fn().mockResolvedValue({
        jobId: "TEST_JOB_123",
        printerName: "Zebra-ZT411-DockA",
        zplCode: "^XA^FO50,50^ADN,36,20^FDTEST^FS^XZ",
        sentAt: "2023-01-01T12:00:00Z",
      }),
    };

    render(<ThermalPrintingArPanel api={mockApi} />);

    const printButton = screen.getByRole("button", {
      name: "Send ZPL Print Command",
    });
    fireEvent.click(printButton);

    expect(printButton).toHaveTextContent("Spooling ZPL Job...");
    expect(printButton).toBeDisabled();

    await waitFor(() => {
      expect(mockApi.printZplThermalLabel).toHaveBeenCalledWith({
        printerName: "Zebra-ZT411-DockA",
        labelType: "BIN",
        barcodeValue: "BIN-A-102-RACK4",
        subtitle: "High Velocity Storage Zone",
      });
    });

    expect(screen.getByText(/TEST_JOB_123/)).toBeInTheDocument();
    expect(
      screen.getByText("^XA^FO50,50^ADN,36,20^FDTEST^FS^XZ"),
    ).toBeInTheDocument();
  });

  it("displays and dismisses error when api.printZplThermalLabel fails", async () => {
    const mockApi = {
      printZplThermalLabel: vi
        .fn()
        .mockRejectedValue(new Error("Hardware queue offline")),
    };

    render(<ThermalPrintingArPanel api={mockApi} />);

    const printButton = screen.getByRole("button", {
      name: "Send ZPL Print Command",
    });
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Hardware queue offline")).toBeInTheDocument();
    });

    // Dismiss error
    const dismissButton = screen.getByRole("button", { name: "Dismiss error" });
    fireEvent.click(dismissButton);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("handles error fallback message when rejection has no message", async () => {
    const mockApi = {
      printZplThermalLabel: vi.fn().mockRejectedValue({}),
    };

    render(<ThermalPrintingArPanel api={mockApi} />);

    const printButton = screen.getByRole("button", {
      name: "Send ZPL Print Command",
    });
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Error spooling ZPL thermal label job"),
      ).toBeInTheDocument();
    });
  });

  it("handles fetch fallback correctly when no api provided with auth token", async () => {
    localStorage.setItem("auth_token", "secret-jwt-token");

    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobId: "FETCH_JOB_456",
        printerName: "Zebra-ZT411-DockA",
        zplCode: "^XA^FO50,50^ADN,36,20^FDFETCH^FS^XZ",
        sentAt: "2023-01-01T12:00:00Z",
      }),
    });
    globalThis.fetch = mockFetch;

    render(<ThermalPrintingArPanel />);

    const printButton = screen.getByRole("button", {
      name: "Send ZPL Print Command",
    });
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/hardware/print-thermal",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer secret-jwt-token",
          },
          body: JSON.stringify({
            printerName: "Zebra-ZT411-DockA",
            labelType: "BIN",
            barcodeValue: "BIN-A-102-RACK4",
            subtitle: "High Velocity Storage Zone",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/FETCH_JOB_456/)).toBeInTheDocument();
      expect(
        screen.getByText("^XA^FO50,50^ADN,36,20^FDFETCH^FS^XZ"),
      ).toBeInTheDocument();
    });
  });

  it("handles network failure in fetch fallback mode", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error("Network disconnected"));
    globalThis.fetch = mockFetch;

    render(<ThermalPrintingArPanel />);

    const printButton = screen.getByRole("button", {
      name: "Send ZPL Print Command",
    });
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Network disconnected")).toBeInTheDocument();
    });
  });
});
