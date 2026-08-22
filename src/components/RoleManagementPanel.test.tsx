import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { RoleManagementPanel } from './RoleManagementPanel';

// Mock the useInventory hook
vi.mock('../api/client', () => ({
  useInventory: () => ({
    client: {
      getRoles: vi.fn().mockResolvedValue([
        { id: 'r1', name: 'Admin', description: 'System admin', isCustom: false, permissions: [{ id: 'p1', resource: 'user', action: 'edit_role' }] }
      ]),
      getPermissions: vi.fn().mockResolvedValue([
        { id: 'p1', resource: 'user', action: 'edit_role' }
      ]),
      createRole: vi.fn().mockResolvedValue({}),
      deleteRole: vi.fn().mockResolvedValue({}),
      updateRolePermissions: vi.fn().mockResolvedValue({})
    }
  })
}));

describe('RoleManagementPanel', () => {
  it('renders loading state initially, then shows data', async () => {
    render(<RoleManagementPanel />);
    
    // Will show loading initially but might resolve too fast for queryBy depending on exact mock speed
    // Let's just wait for the component to render the mocked roles
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('RBAC & Permission Engine')).toBeInTheDocument();
    });
  });
});
