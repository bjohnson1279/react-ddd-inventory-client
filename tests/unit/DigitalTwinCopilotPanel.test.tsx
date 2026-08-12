import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DigitalTwinCopilotPanel } from '../../src/components/DigitalTwinCopilotPanel';

describe('DigitalTwinCopilotPanel', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders default simulator tab correctly', () => {
    render(<DigitalTwinCopilotPanel />);
    expect(screen.getByText('Warehouse Digital Twin & Conversational AI Copilot')).toBeInTheDocument();
    expect(screen.getByText('Fulfillment Stress Test Parameters')).toBeInTheDocument();
    expect(screen.getByText('Simulation Results & Bottleneck Analytics')).toBeInTheDocument();
    expect(screen.getByText('Run Discrete-Event Simulation')).toBeInTheDocument();
  });

  it('switches to Copilot tab', () => {
    render(<DigitalTwinCopilotPanel />);
    const copilotTabBtn = screen.getByText('AI Warehouse Copilot Chat');
    fireEvent.click(copilotTabBtn);

    expect(screen.getByText('Conversational Natural Language Assistant')).toBeInTheDocument();
    expect(screen.getByText('Hello! I am your AI Warehouse Copilot. Ask me about stockout risks, shrinkage anomalies, or OTIF scorecards.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...')).toBeInTheDocument();
  });
  it('runs simulation with api prop', async () => {
    const mockApi = {
      runDigitalTwinSimulation: vi.fn().mockResolvedValue({
        totalOrdersProcessed: 1200,
        throughputPerHour: 300,
        averageFulfillmentTimeMinutes: 12,
        bottleneckBinId: 'A-45',
        congestionHotspots: ['Zone 2', 'Aisle C']
      })
    };
    render(<DigitalTwinCopilotPanel api={mockApi} />);

    // Update inputs
    const orderWaveInput = screen.getAllByRole('spinbutton')[0]; // Sim Order Waves
    fireEvent.change(orderWaveInput, { target: { value: '20' } });

    const runBtn = screen.getByText('Run Discrete-Event Simulation');
    fireEvent.click(runBtn);

    expect(mockApi.runDigitalTwinSimulation).toHaveBeenCalledWith({
      warehouseId: 'WH-MAIN',
      orderWaveCount: 20,
      activePickersCount: 8
    });

    await waitFor(() => {
      expect(screen.getByText('1200')).toBeInTheDocument();
      expect(screen.getByText('300/hr')).toBeInTheDocument();
      expect(screen.getByText('12 min')).toBeInTheDocument();
      expect(screen.getByText('A-45')).toBeInTheDocument();
      expect(screen.getByText('Zone 2, Aisle C', { exact: false })).toBeInTheDocument();
    });
  });

  it('handles simulation error with api prop', async () => {
    const mockApi = {
      runDigitalTwinSimulation: vi.fn().mockRejectedValue(new Error('Sim engine crashed'))
    };
    render(<DigitalTwinCopilotPanel api={mockApi} />);

    const runBtn = screen.getByText('Run Discrete-Event Simulation');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Sim engine crashed');
    });
  });

  it('runs simulation using fetch fallback when api prop does not have runDigitalTwinSimulation', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        totalOrdersProcessed: 800,
        throughputPerHour: 200,
        averageFulfillmentTimeMinutes: 15,
        bottleneckBinId: 'B-10'
      })
    });

    render(<DigitalTwinCopilotPanel />);
    const runBtn = screen.getByText('Run Discrete-Event Simulation');
    fireEvent.click(runBtn);

    expect(mockFetch).toHaveBeenCalledWith('/api/digital-twin/simulate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ warehouseId: 'WH-MAIN', orderWaveCount: 15, activePickersCount: 8 })
    }));

    await waitFor(() => {
      expect(screen.getByText('800')).toBeInTheDocument();
      expect(screen.getByText('200/hr')).toBeInTheDocument();
      expect(screen.getByText('B-10')).toBeInTheDocument();
    });
  });
  it('sends copilot prompt with api prop', async () => {
    const mockApi = {
      queryCopilot: vi.fn().mockResolvedValue({
        insights: 'Stockout risk is low for top SKUs.',
        suggestedActions: ['Review reorder points', 'Check lead times']
      })
    };
    render(<DigitalTwinCopilotPanel api={mockApi} />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    fireEvent.change(input, { target: { value: 'What is the stockout risk?' } });
    fireEvent.click(screen.getByText('Send'));

    expect(mockApi.queryCopilot).toHaveBeenCalledWith({ query: 'What is the stockout risk?' });

    await waitFor(() => {
      expect(screen.getByText('What is the stockout risk?')).toBeInTheDocument();
      expect(screen.getByText('Stockout risk is low for top SKUs.')).toBeInTheDocument();
      expect(screen.getByText('Review reorder points • Check lead times', { exact: false })).toBeInTheDocument();
    });
  });

  it('handles copilot error with api prop', async () => {
    const mockApi = {
      queryCopilot: vi.fn().mockRejectedValue(new Error('AI token limit exceeded'))
    };
    render(<DigitalTwinCopilotPanel api={mockApi} />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Error: AI token limit exceeded')).toBeInTheDocument();
    });
  });

  it('sends copilot prompt using Enter key and fetch fallback', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        insights: 'Fetch fallback response here.'
      })
    });

    render(<DigitalTwinCopilotPanel />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    fireEvent.change(input, { target: { value: 'Using Enter Key' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockFetch).toHaveBeenCalledWith('/api/copilot/query', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ query: 'Using Enter Key' })
    }));

    await waitFor(() => {
      expect(screen.getByText('Using Enter Key')).toBeInTheDocument();
      expect(screen.getByText('Fetch fallback response here.')).toBeInTheDocument();
    });
  });

  it('does not send empty prompt for copilot', async () => {
    const mockApi = {
      queryCopilot: vi.fn()
    };
    render(<DigitalTwinCopilotPanel api={mockApi} />);
    fireEvent.click(screen.getByText('AI Warehouse Copilot Chat'));

    const input = screen.getByPlaceholderText('Ask Copilot about stock levels, shrinkage, or OTIF scorecards...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Send'));

    expect(mockApi.queryCopilot).not.toHaveBeenCalled();
  });
});
