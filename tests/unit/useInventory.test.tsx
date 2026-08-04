import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInventory, InventoryClientContext, ClientContextType } from '../../src/api/client';

describe('useInventory', () => {
  it('throws an error when used outside of InventoryClientProvider', () => {
    // Suppress console.error in test output for the expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useInventory())).toThrowError('useInventory must be used within an InventoryClientProvider');

    consoleSpy.mockRestore();
  });

  it('returns context when used within InventoryClientProvider', () => {
    const mockContextValue: ClientContextType = {
      client: {} as any, // Mock client
      backendType: 'express',
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
});
