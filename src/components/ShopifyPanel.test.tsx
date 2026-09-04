import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ShopifyPanel } from './Panels';
import React from 'react';

// Don't mock Spinner since it might be an inline function or causing issues with how we mock.
// The SVG it renders has class="spinner", we can assert against that instead.

describe('ShopifyPanel', () => {
  const defaultProps = {
    newShopifyId: '',
    setNewShopifyId: vi.fn(),
    newShopifyDomain: '',
    setNewShopifyDomain: vi.fn(),
    newShopifyToken: '',
    setNewShopifyToken: vi.fn(),
    handleConnectShopify: vi.fn((e) => e.preventDefault()),
    shopifyConns: [],
    loading: false,
  };

  it('renders correctly with empty storefronts', () => {
    render(<ShopifyPanel {...defaultProps} />);

    expect(screen.getByText('Configure Shopify Connection')).toBeInTheDocument();

    // We cannot use getByLabelText because the labels don't have htmlFor and the inputs don't have ids or aria-labels.
    // We'll use getByPlaceholderText instead.
    expect(screen.getByPlaceholderText('e.g. shopify-store-1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('mystore.myshopify.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('shpat_...')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Connect Store' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Store' })).not.toBeDisabled();

    expect(screen.getByText('Connected Storefronts')).toBeInTheDocument();
    expect(screen.getByText('No active store connections.')).toBeInTheDocument();
  });

  it('renders connected storefronts correctly', () => {
    const shopifyConns = [
      { id: '1', storeDomain: 'store1.myshopify.com', platform: 'shopify', isActive: true },
      { id: '2', storeDomain: 'store2.myshopify.com', platform: 'shopify', isActive: false },
    ];
    render(<ShopifyPanel {...defaultProps} shopifyConns={shopifyConns} />);

    expect(screen.queryByText('No active store connections.')).not.toBeInTheDocument();

    expect(screen.getByText('store1.myshopify.com')).toBeInTheDocument();
    expect(screen.getByText('store2.myshopify.com')).toBeInTheDocument();

    const connectedBadges = screen.getAllByText('Connected');
    expect(connectedBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls setters on input change', () => {
    render(<ShopifyPanel {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. shopify-store-1'), { target: { value: 'store-1' } });
    expect(defaultProps.setNewShopifyId).toHaveBeenCalledWith('store-1');

    fireEvent.change(screen.getByPlaceholderText('mystore.myshopify.com'), { target: { value: 'test.myshopify.com' } });
    expect(defaultProps.setNewShopifyDomain).toHaveBeenCalledWith('test.myshopify.com');

    fireEvent.change(screen.getByPlaceholderText('shpat_...'), { target: { value: 'token123' } });
    expect(defaultProps.setNewShopifyToken).toHaveBeenCalledWith('token123');
  });

  it('calls handleConnectShopify on form submit', () => {
    render(<ShopifyPanel {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Connect Store' });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(defaultProps.handleConnectShopify).toHaveBeenCalled();
  });

  it('disables button and shows spinner when loading', () => {
    // Need to clear handleConnectShopify mock since it's shared in defaultProps across tests,
    // although this test doesn't check it, it's good practice.
    const container = render(<ShopifyPanel {...defaultProps} loading={true} />).container;

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    // Check for spinner class since it's an SVG
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });
});
