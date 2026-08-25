import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DigitalTwinCopilotPanel } from '../../src/components/DigitalTwinCopilotPanel';

describe('DigitalTwinCopilotPanel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders default simulator tab and inputs', () => {
    render(<DigitalTwinCopilotPanel />);
    expect(screen.getByText('Warehouse Digital Twin & Conversational AI Copilot')).toBeInTheDocument();
    expect(screen.getByText('Discrete-Event Simulator')).toBeInTheDocument();
    expect(screen.getByText('AI Warehouse Copilot Chat')).toBeInTheDocument();
    expect(screen.getByText('Fulfillment Stress Test Parameters')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Facility ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Discrete-Event Simulation' })).toBeInTheDocument();
  });

  it('switches between simulator and copilot tabs', () => {
    render(<DigitalTwinCopilotPanel />);

    // Switch to Copilot tab
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));
    expect(screen.getByText('Conversational Natural Language Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();

    // Switch back to Simulator tab
    fireEvent.click(screen.getByText('Discrete-Event Simulator'));
    expect(screen.getByText('Fulfillment Stress Test Parameters')).toBeInTheDocument();
  });

  it('runs discrete-event simulation via fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        totalOrdersProcessed: 120,
        throughputPerHour: 30,
        averageFulfillmentTimeMinutes: 15,
        bottleneckBinId: 'BIN-A1',
        congestionHotspots: ['Zone-A', 'Zone-B']
      })
    });

    render(<DigitalTwinCopilotPanel />);

    // Update inputs
    const whInput = screen.getByDisplayValue('WH-MAIN');
    fireEvent.change(whInput, { target: { value: 'WH-TEST' } });

    const wavesInput = screen.getByDisplayValue('15');
    fireEvent.change(wavesInput, { target: { value: '20' } });

    // Run simulation
    fireEvent.click(screen.getByRole('button', { name: 'Run Discrete-Event Simulation' }));

    expect(screen.getByRole('button', { name: 'Running Simulation...' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/digital-twin/simulate', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ warehouseId: 'WH-TEST', orderWaveCount: 20, activePickersCount: 8 })
      }));
    });

    // Check results are rendered
    expect(await screen.findByText('120')).toBeInTheDocument(); // totalOrdersProcessed
    expect(screen.getByText('30/hr')).toBeInTheDocument(); // throughputPerHour
    expect(screen.getByText('15 min')).toBeInTheDocument(); // averageFulfillmentTimeMinutes
    expect(screen.getByText('BIN-A1')).toBeInTheDocument(); // bottleneckBinId
    expect(screen.getByText(/Zone-A, Zone-B/)).toBeInTheDocument(); // congestionHotspots
  });

  it('runs discrete-event simulation via api prop', async () => {
    const apiMock = {
      runDigitalTwinSimulation: vi.fn().mockResolvedValueOnce({
        totalOrdersProcessed: 150,
        throughputPerHour: 40,
        averageFulfillmentTimeMinutes: 10,
        bottleneckBinId: 'BIN-B2',
        congestionHotspots: ['Zone-C']
      })
    };

    render(<DigitalTwinCopilotPanel api={apiMock} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Discrete-Event Simulation' }));

    await waitFor(() => {
      expect(apiMock.runDigitalTwinSimulation).toHaveBeenCalledWith({ warehouseId: 'WH-MAIN', orderWaveCount: 15, activePickersCount: 8 });
    });

    expect(await screen.findByText('150')).toBeInTheDocument();
    expect(screen.getByText('BIN-B2')).toBeInTheDocument();
  });

  it('shows error on simulation failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Simulation failed'));

    render(<DigitalTwinCopilotPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Discrete-Event Simulation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Simulation failed');
  });

  it('sends copilot prompt via fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        insights: 'Stock is healthy.',
        suggestedActions: ['Order more next week']
      })
    });

    render(<DigitalTwinCopilotPanel />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    fireEvent.change(input, { target: { value: 'How is stock?' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByRole('button', { name: 'Thinking...' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/copilot/query', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'How is stock?' })
      }));
    });

    expect(await screen.findByText('How is stock?')).toBeInTheDocument();
    expect(screen.getByText('Stock is healthy.')).toBeInTheDocument();
    expect(screen.getByText(/Order more next week/)).toBeInTheDocument();
  });

  it('sends copilot prompt via api prop', async () => {
    const apiMock = {
      queryCopilot: vi.fn().mockResolvedValueOnce({
        insights: 'Risk is low.',
        suggestedActions: []
      })
    };

    render(<DigitalTwinCopilotPanel api={apiMock} />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    // We already have an initial prompt value, let's just clear it and type something new or just use the initial one.
    // The initial prompt is 'What is the current stockout risk across our primary SKUs?'

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(apiMock.queryCopilot).toHaveBeenCalledWith({ query: 'What is the current stockout risk across our primary SKUs?' });
    });

    expect(await screen.findByText('What is the current stockout risk across our primary SKUs?')).toBeInTheDocument();
    expect(screen.getByText('Risk is low.')).toBeInTheDocument();
  });

  it('sends copilot prompt on Enter key', async () => {
    const apiMock = {
      queryCopilot: vi.fn().mockResolvedValueOnce({
        insights: 'Risk is low.'
      })
    };

    render(<DigitalTwinCopilotPanel api={apiMock} />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(apiMock.queryCopilot).toHaveBeenCalledWith({ query: 'What is the current stockout risk across our primary SKUs?' });
    });
  });

  it('shows error on copilot failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Copilot error'));

    render(<DigitalTwinCopilotPanel />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Error: Copilot error')).toBeInTheDocument();
  });

});