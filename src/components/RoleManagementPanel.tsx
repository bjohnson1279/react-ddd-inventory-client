import React, { useState, useEffect } from 'react';

interface Role {
  id: string;
  name: string;
  isCustom: boolean;
  permissions?: { resource: string; action: string }[];
}

interface RoleManagementPanelProps {
  api?: any;
}

export const RoleManagementPanel: React.FC<RoleManagementPanelProps> = ({ api }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newRoleName, setNewRoleName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      if (api && api.getRoles) {
        const data = await api.getRoles();
        setRoles(data);
      } else {
        const response = await fetch('/api/roles', {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        const data = await response.json();
        setRoles(data.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    setIsCreating(true);
    try {
      if (api && api.createRole) {
        await api.createRole({ name: newRoleName });
      } else {
        await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
          body: JSON.stringify({ name: newRoleName })
        });
      }
      setNewRoleName('');
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      if (api && api.deleteRole) {
        await api.deleteRole(id);
      } else {
        await fetch(`/api/roles/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer test-token' }
        });
      }
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', borderRadius: '12px', minHeight: '600px' }}>
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', margin: 0 }}>
          RBAC & Permission Engine
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
          Manage system and custom roles. Configure fine-grained permissions across all domain resources.
        </p>
      </div>

      {error && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>New Custom Role Name</label>
          <input 
            type="text" 
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            placeholder="e.g. Forklift Operator"
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }}
          />
        </div>
        <button 
          onClick={handleCreateRole}
          disabled={isCreating || !newRoleName}
          style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isCreating ? 'Creating...' : 'Create Role'}
        </button>
      </div>

      {loading && roles.length === 0 ? (
        <p>Loading roles...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #334155', textAlign: 'left' }}>
              <th style={{ padding: '12px', color: '#94a3b8' }}>Role Name</th>
              <th style={{ padding: '12px', color: '#94a3b8' }}>Type</th>
              <th style={{ padding: '12px', color: '#94a3b8' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{role.name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    background: role.isCustom ? '#065f46' : '#1e3a8a',
                    color: role.isCustom ? '#34d399' : '#93c5fd'
                  }}>
                    {role.isCustom ? 'Custom' : 'System'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button 
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}
                  >
                    Edit Permissions
                  </button>
                  {role.isCustom && (
                    <button 
                      onClick={() => handleDeleteRole(role.id)}
                      style={{ background: 'transparent', border: '1px solid #7f1d1d', color: '#f87171', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
