import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PythonIntegrationsPanel } from './PythonIntegrationsPanel';

afterEach(cleanup);
function api() {
  return { getConnections: vi.fn().mockResolvedValue([]), getIntegrationDeliveries: vi.fn().mockResolvedValue([]),
    getIntegrationOrders: vi.fn().mockResolvedValue([]), createIntegrationConnection: vi.fn().mockResolvedValue({}),
    retryIntegrationDelivery: vi.fn().mockResolvedValue({}), completeIntegrationOrder: vi.fn().mockResolvedValue({}) };
}

describe('Python integration operations', () => {
  it('shows real empty states and registers configuration references without credentials', async () => {
    const client = api();
    render(<PythonIntegrationsPanel client={client as any} tenantId="retail" />);
    await screen.findByText(/No connections registered/);
    fireEvent.change(screen.getByLabelText('Connection name'), { target: { value: 'My shop' } });
    fireEvent.change(screen.getByLabelText('Canonical shop domain or store URL'), { target: { value: 'my-shop.myshopify.com' } });
    fireEvent.change(screen.getByLabelText('Signing-key setting name'), { target: { value: 'INTEGRATION_SHOP_KEY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register connection' }));
    await waitFor(() => expect(client.createIntegrationConnection).toHaveBeenCalledOnce());
    expect(client.createIntegrationConnection.mock.calls[0][0]).toMatchObject({ tenantId: 'retail', provider: 'SHOPIFY',
      secretRef: 'INTEGRATION_SHOP_KEY', origin: 'my-shop.myshopify.com', locationId: 'default' });
    expect(client.createIntegrationConnection.mock.calls[0][0].mutationId).toBeTruthy();
  });

  it('preserves the retry command after an uncertain response and shows real errors', async () => {
    const client = api();
    client.getIntegrationDeliveries.mockResolvedValue([{ id: 'job', number: 7, type: 'StockChanged', status: 'FAILED', version: 4, lastError: 'RemoteHTTP503' }]);
    client.retryIntegrationDelivery.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValue({});
    render(<PythonIntegrationsPanel client={client as any} tenantId="retail" />);
    const button = await screen.findByRole('button', { name: 'Retry delivery 7' });
    fireEvent.click(button);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Response lost');
    fireEvent.click(button);
    await waitFor(() => expect(client.retryIntegrationDelivery).toHaveBeenCalledTimes(2));
    expect(client.retryIntegrationDelivery.mock.calls[1]).toEqual(client.retryIntegrationDelivery.mock.calls[0]);
  });

  it('releases the selected versioned reservation without recording a shipment', async () => {
    const client = api();
    client.getIntegrationOrders.mockResolvedValue([{ id: 'order', externalOrderId: 'online-1', status: 'RESERVED', version: 2 }]);
    render(<PythonIntegrationsPanel client={client as any} tenantId="retail" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel reservation for online-1' }));
    await waitFor(() => expect(client.completeIntegrationOrder).toHaveBeenCalledOnce());
    expect(client.completeIntegrationOrder.mock.calls[0]).toEqual(['order', 'cancel', expect.objectContaining({ tenantId: 'retail', expectedVersion: 2 })]);
  });

  it('surfaces permission failures instead of showing an empty healthy connection list', async () => {
    const client = api();
    client.getConnections.mockRejectedValue(new Error('Integration permission required'));
    render(<PythonIntegrationsPanel client={client as any} tenantId="retail" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Integration permission required');
    expect(screen.queryByText(/No connections registered/)).not.toBeInTheDocument();
  });
});
