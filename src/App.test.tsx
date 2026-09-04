import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { useInventory } from './api/client';
import '@testing-library/jest-dom';

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useInventory: vi.fn(),
  };
});

describe('App - Error Path Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'fake-token');
    localStorage.setItem('auth_role', 'admin');
    localStorage.setItem('auth_tenant', 'tenant-1');
  });

  it('should set an error message if getInventoryItems fails', async () => {
    const mockGetInventoryItems = vi.fn().mockRejectedValue(new Error('Simulated network failure'));

    vi.mocked(useInventory).mockReturnValue({
      client: {
        getInventoryItems: mockGetInventoryItems,
        getProducts: vi.fn().mockResolvedValue([]),
        getShopifyConnections: vi.fn().mockResolvedValue([]),
        getJournalEntries: vi.fn().mockResolvedValue([]),
        subscribeBarcodeScans: vi.fn().mockReturnValue(() => {}),
      } as any,
      backendType: 'express',
      setBackendType: vi.fn(),
    });

    render(<App />);

    // Wait for the error message to be set and displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Simulated network failure/i);
    });

    // Verify that getInventoryItems was called
    expect(mockGetInventoryItems).toHaveBeenCalled();
  });
});
