import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { useInventory } from './api/client';
import '@testing-library/jest-dom';

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>();
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

  it('should set an error message if fetchInventoryItems (getInventoryItems) fails', async () => {
    // Testing the error path requires mocking the fetchInventoryItems call to throw an error or reject the promise
    const mockFetchInventoryItems = vi.fn().mockRejectedValue(new Error('fetchInventoryItems network failure'));

    vi.mocked(useInventory).mockReturnValue({
      client: {
        getInventoryItems: mockFetchInventoryItems,
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
      expect(screen.getByRole('alert')).toHaveTextContent(/fetchInventoryItems network failure/i);
    });

    // Verify that the fetch call was made
    expect(mockFetchInventoryItems).toHaveBeenCalled();
  });

  it('should set backend status to offline if health check fetch fails', async () => {
    vi.mocked(useInventory).mockReturnValue({
      client: {
        getInventoryItems: vi.fn().mockResolvedValue([]),
        getProducts: vi.fn().mockResolvedValue([]),
        getShopifyConnections: vi.fn().mockResolvedValue([]),
        getJournalEntries: vi.fn().mockResolvedValue([]),
        subscribeBarcodeScans: vi.fn().mockReturnValue(() => {}),
      } as any,
      backendType: 'express',
      setBackendType: vi.fn(),
    });

    const mockFetch = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network offline'));

    render(<App />);

    // checkHealth runs on mount, so it should call fetch for graphql, express, and laravel
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
    });

    // The health dot classes should become 'offline'
    await waitFor(() => {
      // Find elements with title="offline"
      const offlineDots = document.querySelectorAll('.health-dot.offline');
      expect(offlineDots.length).toBe(3);
    });

    mockFetch.mockRestore();
  });
});
