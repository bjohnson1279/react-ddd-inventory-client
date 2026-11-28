import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useInventory } from '../../src/api/client';

const root = vi.hoisted(() => ({ render: vi.fn(), createRoot: vi.fn() }));
vi.mock('react-dom/client', async original => {
  const actual = await original<typeof import('react-dom/client')>();
  root.createRoot.mockReturnValue({ render: root.render });
  return { ...actual, default: { ...actual.default, createRoot: root.createRoot } };
});
vi.mock('../../src/api/graphql', () => ({ GraphQLAdapter: class { kind = 'graphql'; } }));
vi.mock('../../src/api/express', () => ({ ExpressRESTAdapter: class { kind = 'express'; } }));
vi.mock('../../src/api/laravel', () => ({ LaravelRESTAdapter: class { kind = 'laravel'; } }));
vi.mock('../../src/api/python', () => ({ PythonRESTAdapter: class { kind = 'python'; } }));
vi.mock('../../src/App.tsx', () => ({ default: function Probe() {
  const { client, backendType, setBackendType } = useInventory();
  return <><span data-testid="selected">{backendType}:{(client as any).kind}</span>
    <button onClick={() => setBackendType('python')}>Switch backend</button></>;
} }));

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await import('../../src/main');
});
afterEach(cleanup);

describe('real application bootstrap and backend provider', () => {
  it('mounts the application on the root element', () => {
    expect(root.createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(root.render).toHaveBeenCalledTimes(1);
  });
  it.each(['graphql', 'express', 'laravel', 'python'])('restores the %s backend and constructs its adapter', backend => {
    localStorage.setItem('backend_type', backend);
    render(root.render.mock.calls[0][0]);
    expect(screen.getByTestId('selected')).toHaveTextContent(`${backend}:${backend}`);
  });
  it('defaults to GraphQL when no backend is stored', () => {
    render(root.render.mock.calls[0][0]);
    expect(screen.getByTestId('selected')).toHaveTextContent('graphql:graphql');
  });
  it('persists a backend change and removes the previous backend token', () => {
    localStorage.setItem('backend_type', 'express'); localStorage.setItem('auth_token', 'express-token');
    // jsdom reports full-page reload as unimplemented; storage and provider changes
    // still run and are the observable contract under test here.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(root.render.mock.calls[0][0]);
      fireEvent.click(screen.getByRole('button', { name: 'Switch backend' }));
      expect(localStorage.getItem('backend_type')).toBe('python');
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(screen.getByTestId('selected')).toHaveTextContent('python:python');
    } finally { consoleError.mockRestore(); }
  });
});
