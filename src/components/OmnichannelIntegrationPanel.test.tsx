import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OmnichannelIntegrationPanel } from './OmnichannelIntegrationPanel';
import { useInventory } from '../api/client';

vi.mock('../api/client', () => ({
  useInventory: vi.fn(),
}));

const mockApiData = {
  amazon: { connected: true },
  woocommerce: { connected: false },
};

describe('OmnichannelIntegrationPanel', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getConnections: vi.fn().mockResolvedValue(mockApiData),
      connectAmazon: vi.fn().mockResolvedValue(undefined),
      connectWooCommerce: vi.fn().mockResolvedValue(undefined),
      connectShopify: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(useInventory).mockReturnValue({ client: mockClient } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly and fetches active connections', async () => {
    render(<OmnichannelIntegrationPanel tenantId="tenant-1" />);

    expect(screen.getByText('Omnichannel Integrations')).toBeInTheDocument();
    expect(screen.getByText('Amazon Seller Central')).toBeInTheDocument();
    expect(screen.getByText('WooCommerce')).toBeInTheDocument();
    expect(screen.getByText('Shopify')).toBeInTheDocument();
    expect(screen.getByText('Loading connections...')).toBeInTheDocument();
    expect(screen.getByText('Active Connections')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockClient.getConnections).toHaveBeenCalledWith('tenant-1');
      // Verify stringified mockApiData
      expect(screen.getByText(/amazon/)).toBeInTheDocument();
    });
  });

  it('successfully connects to Amazon', async () => {
    const user = userEvent.setup();
    render(<OmnichannelIntegrationPanel tenantId="tenant-1" />);

    const sellerIdInput = screen.getByLabelText('Seller ID');
    const authTokenInput = screen.getByLabelText('MWS Auth Token');
    const marketplaceIdInput = screen.getByLabelText('Marketplace ID');
    const connectBtn = screen.getByRole('button', { name: 'Connect Amazon' });

    await user.type(sellerIdInput, 'seller-123');
    await user.type(authTokenInput, 'auth-token');
    await user.type(marketplaceIdInput, 'market-456');

    fireEvent.click(connectBtn);

    expect(connectBtn).toBeDisabled();
    expect(connectBtn).toHaveAttribute('aria-busy', 'true');
    expect(connectBtn).toHaveTextContent('Connecting...');

    await waitFor(() => {
      expect(mockClient.connectAmazon).toHaveBeenCalledWith('tenant-1', 'seller-123', 'auth-token', 'market-456');
      expect(screen.getByText('Amazon connected successfully')).toBeInTheDocument();
    });

    expect(sellerIdInput).toHaveValue('');
    expect(authTokenInput).toHaveValue('');
    expect(marketplaceIdInput).toHaveValue('');
  });

  it('handles Amazon connection errors', async () => {
    mockClient.connectAmazon.mockRejectedValueOnce(new Error('Failed to connect Amazon'));

    const user = userEvent.setup();
    render(<OmnichannelIntegrationPanel tenantId="tenant-1" />);

    const sellerIdInput = screen.getByLabelText('Seller ID');
    const authTokenInput = screen.getByLabelText('MWS Auth Token');
    const marketplaceIdInput = screen.getByLabelText('Marketplace ID');
    const connectBtn = screen.getByRole('button', { name: 'Connect Amazon' });

    await user.type(sellerIdInput, 'seller-err');
    await user.type(authTokenInput, 'auth-err');
    await user.type(marketplaceIdInput, 'market-err');

    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to connect Amazon')).toBeInTheDocument();
    });
  });

  it('successfully connects to WooCommerce', async () => {
    const user = userEvent.setup();
    render(<OmnichannelIntegrationPanel tenantId="tenant-1" />);

    const urlInput = screen.getByLabelText('Store URL');
    const keyInput = screen.getByLabelText('Consumer Key');
    const secretInput = screen.getByLabelText('Consumer Secret');
    const connectBtn = screen.getByRole('button', { name: 'Connect WooCommerce' });

    await user.type(urlInput, 'https://woo.store');
    await user.type(keyInput, 'woo-key');
    await user.type(secretInput, 'woo-secret');

    fireEvent.click(connectBtn);

    expect(connectBtn).toBeDisabled();
    expect(connectBtn).toHaveAttribute('aria-busy', 'true');
    expect(connectBtn).toHaveTextContent('Connecting...');

    await waitFor(() => {
      expect(mockClient.connectWooCommerce).toHaveBeenCalledWith('tenant-1', 'https://woo.store', 'woo-key', 'woo-secret');
      expect(screen.getByText('WooCommerce connected successfully')).toBeInTheDocument();
    });
  });

  it('successfully connects to Shopify', async () => {
    const user = userEvent.setup();
    render(<OmnichannelIntegrationPanel tenantId="tenant-1" />);

    const domainInput = screen.getByLabelText('Store Domain');
    const tokenInput = screen.getByLabelText('Access Token');
    const connectBtn = screen.getByRole('button', { name: 'Connect Shopify' });

    await user.type(domainInput, 'my.shopify.com');
    await user.type(tokenInput, 'shp-token');

    fireEvent.click(connectBtn);

    expect(connectBtn).toBeDisabled();
    expect(connectBtn).toHaveAttribute('aria-busy', 'true');
    expect(connectBtn).toHaveTextContent('Connecting...');

    await waitFor(() => {
      expect(mockClient.connectShopify).toHaveBeenCalledWith('tenant-1', 'my.shopify.com', 'shp-token');
      expect(screen.getByText('Shopify connected successfully')).toBeInTheDocument();
    });
  });
});
