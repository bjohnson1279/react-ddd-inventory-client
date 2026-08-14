import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../../src/App';
import { InventoryClientContext } from '../../src/api/client';
import React from 'react';
import "fake-indexeddb/auto";

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('App health checks', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles health check failures and sets status offline', async () => {
    // Return Promise.reject to simulate network failure
    global.fetch = vi.fn().mockReturnValue(Promise.reject(new Error('Network error')));

    const mockContextValue = {
      client: {
        login: vi.fn().mockResolvedValue({ token: 'fake-token' }),
        getLocations: vi.fn().mockResolvedValue([]),
        getEvents: vi.fn().mockResolvedValue([]),
        getAggregates: vi.fn().mockResolvedValue([]),
        onScanReceived: vi.fn(),
        offScanReceived: vi.fn(),
        onAnomalyDetected: vi.fn(),
        offAnomalyDetected: vi.fn(),
        searchProducts: vi.fn().mockResolvedValue([]),
        searchProductsBySku: vi.fn().mockResolvedValue([]),
        getProducts: vi.fn().mockResolvedValue([]),
        getAllProducts: vi.fn().mockResolvedValue([]),
        getInventoryItems: vi.fn().mockResolvedValue([]),
        subscribeBarcodeScans: vi.fn().mockReturnValue(vi.fn()),
      } as any, // Mock client
      backendType: 'express',
      setBackendType: vi.fn(),
    };

    render(
      <InventoryClientContext.Provider value={mockContextValue}>
        <App />
      </InventoryClientContext.Provider>
    );

    // Skip to after initial login form render
    const form = screen.getByRole('button', { name: /Authenticate Credentials/i }).closest('form');

    await act(async () => {
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });

    // Wait for the app to complete async login and fetch calls
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve(); // flush microtasks
        await vi.advanceTimersByTimeAsync(1000);
      }
    });

    // Verify global.fetch was actually called for health check
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/health', expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/health', expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/health', expect.any(Object));

    // Check dots
    const dots = document.querySelectorAll('.health-dot');
    expect(dots.length).toBeGreaterThan(0);

    const offlineDots = document.querySelectorAll('.health-dot.offline');
    expect(offlineDots.length).toBe(dots.length);
  });
});
