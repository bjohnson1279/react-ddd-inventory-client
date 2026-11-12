import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, render, act } from "@testing-library/react";
import {
  useInventory,
  InventoryClientContext,
  ClientContextType,
} from "../../src/api/client";

describe("InventoryClientContext", () => {
  it("provides default value null when rendered outside of a Provider", () => {
    let observedContext: ClientContextType | null = undefined as any;

    render(
      <InventoryClientContext.Consumer>
        {(value) => {
          observedContext = value;
          return null;
        }}
      </InventoryClientContext.Consumer>,
    );

    expect(observedContext).toBeNull();
  });

  it("provides the context value to consumers within a Provider", () => {
    const mockContextValue: ClientContextType = {
      client: {} as any,
      backendType: "express",
      setBackendType: vi.fn(),
    };

    let observedContext: ClientContextType | null = null;

    render(
      <InventoryClientContext.Provider value={mockContextValue}>
        <InventoryClientContext.Consumer>
          {(value) => {
            observedContext = value;
            return null;
          }}
        </InventoryClientContext.Consumer>
      </InventoryClientContext.Provider>,
    );

    expect(observedContext).toBe(mockContextValue);
  });

  it("allows innermost provider to override ancestor provider values", () => {
    const outerValue: ClientContextType = {
      client: {} as any,
      backendType: "graphql",
      setBackendType: vi.fn(),
    };

    const innerValue: ClientContextType = {
      client: {} as any,
      backendType: "laravel",
      setBackendType: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InventoryClientContext.Provider value={outerValue}>
        <InventoryClientContext.Provider value={innerValue}>
          {children}
        </InventoryClientContext.Provider>
      </InventoryClientContext.Provider>
    );

    const { result } = renderHook(() => useInventory(), { wrapper });

    expect(result.current).toBe(innerValue);
    expect(result.current.backendType).toBe("laravel");
  });
});

describe("useInventory", () => {
  it("throws an error when used outside of InventoryClientProvider", () => {
    // Suppress console.error in test output for the expected error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useInventory())).toThrowError(
      "useInventory must be used within an InventoryClientProvider",
    );

    consoleSpy.mockRestore();
  });

  it("throws an error when context value is explicitly provided as null", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InventoryClientContext.Provider value={null}>
        {children}
      </InventoryClientContext.Provider>
    );

    expect(() => renderHook(() => useInventory(), { wrapper })).toThrowError(
      "useInventory must be used within an InventoryClientProvider",
    );

    consoleSpy.mockRestore();
  });

  it("returns context when used within InventoryClientProvider", () => {
    const mockContextValue: ClientContextType = {
      client: {} as any, // Mock client
      backendType: "express",
      setBackendType: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InventoryClientContext.Provider value={mockContextValue}>
        {children}
      </InventoryClientContext.Provider>
    );

    const { result } = renderHook(() => useInventory(), { wrapper });

    expect(result.current).toBe(mockContextValue);
  });

  it("allows calling setBackendType from the hook context", () => {
    const mockSetBackendType = vi.fn();
    const mockContextValue: ClientContextType = {
      client: {} as any,
      backendType: "python",
      setBackendType: mockSetBackendType,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InventoryClientContext.Provider value={mockContextValue}>
        {children}
      </InventoryClientContext.Provider>
    );

    const { result } = renderHook(() => useInventory(), { wrapper });

    act(() => {
      result.current.setBackendType("laravel");
    });

    expect(mockSetBackendType).toHaveBeenCalledTimes(1);
    expect(mockSetBackendType).toHaveBeenCalledWith("laravel");
  });

  it("updates when the context value changes dynamically in provider rerender", () => {
    const initialValue: ClientContextType = {
      client: {} as any,
      backendType: "express",
      setBackendType: vi.fn(),
    };

    const updatedValue: ClientContextType = {
      client: {} as any,
      backendType: "graphql",
      setBackendType: vi.fn(),
    };

    let contextValue = initialValue;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InventoryClientContext.Provider value={contextValue}>
        {children}
      </InventoryClientContext.Provider>
    );

    const { result, rerender } = renderHook(() => useInventory(), { wrapper });

    expect(result.current.backendType).toBe("express");

    contextValue = updatedValue;
    rerender();

    expect(result.current.backendType).toBe("graphql");
  });
});
