import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReportingDashboardPanel } from './ReportingDashboardPanel';

const mockReports = [
  { id: 'report-1', name: 'Inventory Val', type: 'INVENTORY_VALUATION', filters: {}, grouping: {} },
];
const mockWidgets = [
  { id: 'widget-1', type: 'CHART', config: {}, layoutX: 0, layoutY: 0, width: 1, height: 1 },
];

describe('ReportingDashboardPanel', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getReportDefinitions: vi.fn().mockResolvedValue(mockReports),
      getDashboardWidgets: vi.fn().mockResolvedValue(mockWidgets),
      createReportDefinition: vi.fn().mockResolvedValue({ id: 'new-report' }),
      scheduleReport: vi.fn().mockResolvedValue({ scheduleId: 'sched-1' }),
      executeReport: vi.fn().mockResolvedValue({ executionId: 'exec-1' }),
    };
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders and fetches initial data', async () => {
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    expect(screen.getByText('Reporting & Dashboarding (Item 13)')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    expect(screen.getByText('CHART')).toBeInTheDocument();
  });

  it('displays an error if fetching fails', async () => {
    mockClient.getReportDefinitions.mockRejectedValueOnce(new Error('Fetch failed'));
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });
  });

  it('creates a new report', async () => {
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('Report Name');
    fireEvent.change(input, { target: { value: 'New Report' } });
    const createBtn = screen.getByText('Create');
    fireEvent.click(createBtn);
    await waitFor(() => {
      expect(mockClient.createReportDefinition).toHaveBeenCalledWith('tenant-1', {
        name: 'New Report',
        type: 'INVENTORY_VALUATION',
        filters: {},
        grouping: {}
      });
    });
  });

  it('requires a name to create a report', async () => {
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const createBtn = screen.getByText('Create');
    fireEvent.click(createBtn);
    expect(window.alert).toHaveBeenCalledWith('Name required');
  });

  it('handles report creation error', async () => {
    mockClient.createReportDefinition.mockRejectedValueOnce(new Error('Create error'));
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('Report Name');
    fireEvent.change(input, { target: { value: 'New Report' } });
    const createBtn = screen.getByText('Create');
    fireEvent.click(createBtn);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Create error');
    });
  });

  it('executes a report', async () => {
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const runBtn = screen.getByText('Run Now');
    fireEvent.click(runBtn);
    await waitFor(() => {
      expect(mockClient.executeReport).toHaveBeenCalledWith('tenant-1', 'report-1', 'pdf');
      expect(window.alert).toHaveBeenCalledWith('Report queued for execution');
    });
  });

  it('handles execute error', async () => {
    mockClient.executeReport.mockRejectedValueOnce(new Error('Execute error'));
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const runBtn = screen.getByText('Run Now');
    fireEvent.click(runBtn);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Execute error');
    });
  });

  it('schedules a report', async () => {
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const scheduleBtn = screen.getByText('Schedule');
    fireEvent.click(scheduleBtn);
    await waitFor(() => {
      expect(mockClient.scheduleReport).toHaveBeenCalledWith('tenant-1', 'report-1', '0 0 * * *', 'EMAIL');
      expect(window.alert).toHaveBeenCalledWith('Report scheduled successfully');
    });
  });

  it('handles schedule error', async () => {
    mockClient.scheduleReport.mockRejectedValueOnce(new Error('Schedule error'));
    render(<ReportingDashboardPanel client={mockClient} tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText('Inventory Val')).toBeInTheDocument();
    });
    const scheduleBtn = screen.getByText('Schedule');
    fireEvent.click(scheduleBtn);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Schedule error');
    });
  });
});
