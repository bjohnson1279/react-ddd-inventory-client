import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhooksPanel } from '../../src/components/Panels';

describe('WebhooksPanel', () => {
  const defaultProps = {
    webhookUrl: '',
    setWebhookUrl: vi.fn(),
    webhookEvents: [],
    setWebhookEvents: vi.fn(),
    handleCreateWebhook: vi.fn((e) => e.preventDefault()),
    webhooks: [],
    handleDeleteWebhook: vi.fn(),
    webhookDeliveries: [],
    loading: false
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with empty data', () => {
    render(<WebhooksPanel {...defaultProps} />);
    expect(screen.getByText('Subscribe Outbound Webhook')).toBeInTheDocument();
    expect(screen.getByText('Webhook Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('No active webhook subscriptions configured.')).toBeInTheDocument();
    expect(screen.getByText('Webhook Delivery Retry Logs')).toBeInTheDocument();
    expect(screen.getByText('No webhook deliveries recorded.')).toBeInTheDocument();
  });

  it('renders webhooks and deliveries when provided', () => {
    const webhooks = [{ id: 'w1', url: 'https://test.com', eventTypes: ['StockReceived'] }];
    const deliveries = [{ id: 'd1', eventName: 'StockReceived', statusCode: 200, occurredOn: new Date().toISOString() }];

    render(<WebhooksPanel {...defaultProps} webhooks={webhooks} webhookDeliveries={deliveries} />);
    expect(screen.getByText('https://test.com')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('handles url input changes', () => {
    render(<WebhooksPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('https://api.thirdparty.com/webhook');
    fireEvent.change(input, { target: { value: 'https://newurl.com' } });
    expect(defaultProps.setWebhookUrl).toHaveBeenCalledWith('https://newurl.com');
  });

  it('handles checkbox events', () => {
    render(<WebhooksPanel {...defaultProps} />);
    // Select StockReceived
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(defaultProps.setWebhookEvents).toHaveBeenCalledWith(['StockReceived']);
  });

  it('handles unchecking events', () => {
    render(<WebhooksPanel {...defaultProps} webhookEvents={['StockReceived']} />);
    const checkbox = screen.getAllByRole('checkbox')[0]; // StockReceived is checked
    fireEvent.click(checkbox);
    expect(defaultProps.setWebhookEvents).toHaveBeenCalledWith([]);
  });

  it('handles form submission', () => {
    render(<WebhooksPanel {...defaultProps} webhookUrl="https://test.com" />);
    const submitBtn = screen.getByText('Create Webhook Subscription');
    fireEvent.click(submitBtn);
    expect(defaultProps.handleCreateWebhook).toHaveBeenCalled();
  });

  it('handles delete webhook', () => {
    const webhooks = [{ id: 'w1', url: 'https://test.com', eventTypes: ['StockReceived'] }];
    render(<WebhooksPanel {...defaultProps} webhooks={webhooks} />);
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    expect(defaultProps.handleDeleteWebhook).toHaveBeenCalledWith('w1');
  });

  it('disables submit button and sets aria-busy when loading', () => {
    render(<WebhooksPanel {...defaultProps} loading={true} />);
    const submitBtn = screen.getByText('Create Webhook Subscription');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
  });
});
