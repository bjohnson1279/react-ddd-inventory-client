import React, { useState, useEffect } from 'react';
import { useInventory, Role, Permission } from '../api/client';

export const RoleManagementPanel: React.FC = () => {
  const { client } = useInventory();
  // Using a fixed tenantId for the scope of this portal demo
  const tenantId = 'TENANT-1';

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New role form state
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // Edit permissions state
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, [client]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedRoles, fetchedPerms] = await Promise.all([
        client.getRoles(tenantId),
        client.getPermissions()
      ]);
      setRoles(fetchedRoles);
      setPermissions(fetchedPerms);
    } catch (err: any) {
      setError(err.message || 'Failed to load RBAC data');
      console.error('Failed to load RBAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      await client.createRole(tenantId, newRoleName, newRoleDesc, selectedPerms);
      setIsCreating(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedPerms([]);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await client.deleteRole(roleId);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      await client.updateRolePermissions(editingRole.id, selectedPerms);
      setEditingRole(null);
      setSelectedPerms([]);
      loadData();
    } catch (err: any) {
       setError(err.message || 'Failed to update permissions');
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const startEditing = (role: Role) => {
    setEditingRole(role);
    setSelectedPerms(role.permissions.map(p => p.id));
  };

  // Organized permissions by resource
  // ⚡ Bolt: Memoize derived permissions mapping to prevent O(n) array traversal on every render
  const permsByResource = React.useMemo(() => {
    return permissions.reduce((acc, p) => {
      if (!acc[p.resource]) acc[p.resource] = [];
      acc[p.resource].push(p);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  if (loading && roles.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(145deg, #0f172a, #1e293b)', color: '#f8fafc', borderRadius: '16px', minHeight: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            RBAC & Permission Engine
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
            Manage system and custom roles. Configure fine-grained permissions across all domain resources.
          </p>
        </div>
        {!isCreating && !editingRole && (
          <button
            onClick={() => { setIsCreating(true); setSelectedPerms([]); setNewRoleName(''); setNewRoleDesc(''); }}
            style={{ background: 'linear-gradient(90deg, #38bdf8, #3b82f6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            + Create Role
          </button>
        )}
      </div>

      {error && (
        <div role="alert" aria-live="assertive" style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#fca5a5', padding: '16px', borderRadius: '6px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      )}

      {(isCreating || editingRole) ? (
        <form onSubmit={isCreating ? handleCreateRole : handleUpdatePermissions} style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '20px' }}>
            {isCreating ? 'Create New Custom Role' : `Edit Permissions: ${editingRole?.name}`}
          </h3>

          {isCreating && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label htmlFor="roleName" style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Role Name *</label>
                <input
                  id="roleName"
                  type="text"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Forklift Operator"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                />
              </div>
              <div>
                <label htmlFor="roleDesc" style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Description</label>
                <input
                  id="roleDesc"
                  type="text"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Brief description of the role's purpose"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '12px' }}>Permissions</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {Object.entries(permsByResource).map(([resource, resourcePerms]) => (
                <div key={resource} style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#38bdf8', textTransform: 'capitalize', marginBottom: '12px', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    {resource}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {resourcePerms.map(perm => (
                      <label key={perm.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={selectedPerms.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          style={{ marginRight: '10px', accentColor: '#38bdf8', width: '16px', height: '16px' }}
                        />
                        {perm.action}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingRole(null); }}
              style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
            >
              {isCreating ? 'Save New Role' : 'Update Permissions'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px', color: '#94a3b8', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '16px', color: '#94a3b8', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '16px', color: '#94a3b8', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</th>
                <th style={{ padding: '16px', color: '#94a3b8', textAlign: 'right', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, idx) => (
                <tr key={role.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 'bold', color: '#e2e8f0', fontSize: '15px' }}>{role.name}</div>
                    {role.description && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{role.description}</div>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: role.isCustom ? 'rgba(52, 211, 153, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                      color: role.isCustom ? '#34d399' : '#38bdf8',
                      border: `1px solid ${role.isCustom ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.2)'}`
                    }}>
                      {role.isCustom ? 'Custom' : 'System'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {role.permissions.slice(0, 3).map(p => (
                        <span key={p.id} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                          {p.resource}:{p.action}
                        </span>
                      ))}
                      {role.permissions.length > 3 && (
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                          +{role.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => startEditing(role)}
                      aria-label={`Edit role ${role.name}`}
                      style={{ background: 'transparent', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '13px', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Edit
                    </button>
                    {role.isCustom && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        aria-label={`Delete role ${role.name}`}
                        style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No roles found. Ensure your backend is running and seeded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
