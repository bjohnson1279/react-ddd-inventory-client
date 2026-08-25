import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogisticsErpPanel } from '../../src/components/LogisticsErpPanel';

describe('LogisticsErpPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockApi = {
    calculateShippingRates: vi.fn(),
    generateShippingLabel: vi.fn(),
    syncERPJournal: vi.fn(),
  };

  it('renders default rates tab', () => {
    render(<LogisticsErpPanel api={mockApi} />);
    expect(screen.getByText('Enterprise Logistics & ERP Integrations')).toBeInTheDocument();
    expect(screen.getByText('Carrier Quote Request')).toBeInTheDocument();
  });

  it('switches to label tab', () => {
    render(<LogisticsErpPanel api={mockApi} />);
    const labelBtn = screen.getByText('🏷️ Label Generator');
    fireEvent.click(labelBtn);
    expect(screen.getByText('Label Generator Parameters')).toBeInTheDocument();
  });

  it('switches to erp tab', () => {
    render(<LogisticsErpPanel api={mockApi} />);
    const erpBtn = screen.getByText('📊 ERP Sync');
    fireEvent.click(erpBtn);
    expect(screen.getByText('ERP Accounting Sync Input')).toBeInTheDocument();
  });
});
