import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ShopifyPanel } from './Panels';
import React from 'react';

describe('ShopifyPanel', () => {
  const getDefaultProps = () => ({
    newShopifyId: '',
    setNewShopifyId: vi.fn(),
    newShopifyDomain: '',
    setNewShopifyDomain: vi.fn(),
    newShopifyToken: '',
    setNewShopifyToken: vi.fn(),
    handleConnectShopify: vi.fn((e: React.FormEvent) => e.preventDefault()),
    shopifyConns: [],
    loading: false,
  });

  it('renders correctly with empty storefronts', () => {
    const props = getDefaultProps();
    render(<ShopifyPanel {...props} />);

    expect(screen.getByText('Configure Shopify Connection')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. shopify-store-1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('mystore.myshopify.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('shpat_...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Store' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Store' })).not.toBeDisabled();
    expect(screen.getByText('Connected Storefronts')).toBeInTheDocument();
    expect(screen.getByText('No active store connections.')).toBeInTheDocument();
  });

  it('renders connected storefronts correctly', () => {
    const props = getDefaultProps();
    const shopifyConns = [
      { id: '1', storeDomain: 'store1.myshopify.com', platform: 'shopify', isActive: true },
      { id: '2', storeDomain: 'store2.myshopify.com', platform: 'shopify', isActive: false },
    ];
    render(<ShopifyPanel {...props} shopifyConns={shopifyConns} />);

    expect(screen.queryByText('No active store connections.')).not.toBeInTheDocument();
    expect(screen.getByText('store1.myshopify.com')).toBeInTheDocument();
    expect(screen.getByText('store2.myshopify.com')).toBeInTheDocument();

    const connectedBadges = screen.getAllByText('Connected');
    expect(connectedBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls setters on input change', () => {
    const props = getDefaultProps();
    render(<ShopifyPanel {...props} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. shopify-store-1'), { target: { value: 'store-1' } });
    expect(props.setNewShopifyId).toHaveBeenCalledWith('store-1');

    fireEvent.change(screen.getByPlaceholderText('mystore.myshopify.com'), { target: { value: 'test.myshopify.com' } });
    expect(props.setNewShopifyDomain).toHaveBeenCalledWith('test.myshopify.com');

    fireEvent.change(screen.getByPlaceholderText('shpat_...'), { target: { value: 'token123' } });
    expect(props.setNewShopifyToken).toHaveBeenCalledWith('token123');
  });

  it('calls handleConnectShopify on form submit', () => {
    const props = getDefaultProps();
    render(<ShopifyPanel {...props} />);

    const submitButton = screen.getByRole('button', { name: 'Connect Store' });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(props.handleConnectShopify).toHaveBeenCalled();
  });

  it('disables button and shows spinner when loading', () => {
    const props = getDefaultProps();
    const container = render(<ShopifyPanel {...props} loading={true} />).container;

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });
});
