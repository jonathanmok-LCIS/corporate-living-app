'use client';

import { useState, useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser';
import { Profile, UserRole } from '@/lib/types';
import { createUser, updateUser, deleteUser } from './actions';

interface HouseCoordinator {
  house?: {
    name: string;
  };
}

interface TenancyWithRoom {
  status: string;
  room?: {
    label: string;
    house?: {
      name: string;
    };
  };
}

interface UserWithRelations extends Profile {
  house_coordinators?: HouseCoordinator[];
  tenancies?: TenancyWithRoom[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    roles: ['TENANT'] as UserRole[],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchUsers() {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          house_coordinators(
            house:houses(id, name)
          ),
          tenancies!tenant_user_id(
            room:rooms(
              id,
              label,
              house:houses(id, name)
            ),
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error loading users. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    
    try {
      // Validate form
      if (!formData.name) {
        throw new Error('Please fill in the name field');
      }

      if (!editingId && (!formData.email || !formData.password)) {
        throw new Error('Please fill in all required fields');
      }

      if (!editingId && formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (formData.roles.length === 0) {
        throw new Error('Please select at least one role');
      }

      let result;
      if (editingId) {
        // Update existing user
        result = await updateUser({
          id: editingId,
          name: formData.name,
          roles: formData.roles,
        });
      } else {
        // Create new user
        result = await createUser(formData);
      }
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(editingId ? 'User updated successfully!' : 'User created successfully!');
      setFormData({ email: '', name: '', password: '', roles: ['TENANT'] });
      setEditingId(null);
      setShowForm(false);
      
      // Refresh users list
      await fetchUsers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : 'Error saving user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setFormData({ email: '', name: '', password: '', roles: ['TENANT'] });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function handleEdit(user: Profile) {
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      roles: user.roles || ['TENANT'],
    });
    setEditingId(user.id);
    setShowForm(true);
    setError(null);
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteUser(userId);
      if (result.error) {
        throw new Error(result.error);
      }
      setSuccess('User deleted successfully!');
      await fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Error deleting user. Please try again.');
    }
  }

  function toggleRole(role: UserRole) {
    setFormData(prev => {
      const currentRoles = prev.roles;
      if (currentRoles.includes(role)) {
        // Remove role (but keep at least one)
        const newRoles = currentRoles.filter(r => r !== role);
        return { ...prev, roles: newRoles.length > 0 ? newRoles : currentRoles };
      } else {
        // Add role
        return { ...prev, roles: [...currentRoles, role] };
      }
    });
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-red-900 mb-2">Supabase Not Configured</h2>
        <p className="text-red-800">
          Please configure your Supabase credentials in <code className="bg-red-100 px-1 rounded">.env.local</code> to use this application.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
        >
          Create User
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Create/Edit User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit User' : 'Create New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Email {!editingId && '*'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  placeholder="user@example.com"
                  required={!editingId}
                  disabled={submitting || !!editingId}
                />
                {editingId && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John Doe"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Password {!editingId && '*'}
                </label>
                {editingId ? (
                  <p className="text-sm text-gray-500">Password change not supported in edit mode. User can reset via login page.</p>
                ) : (
                  <>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-300 rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      disabled={submitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Roles * <span className="text-gray-500 font-normal">(select one or more)</span>
                </label>
                <div className="space-y-2">
                  {(['ADMIN', 'COORDINATOR', 'TENANT'] as UserRole[]).map((role) => (
                    <label
                      key={role}
                      className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                        formData.roles.includes(role)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        disabled={submitting}
                      />
                      <span className="ml-3">
                        <span className={`inline-flex text-sm font-medium ${
                          role === 'ADMIN'
                            ? 'text-purple-800'
                            : role === 'COORDINATOR'
                            ? 'text-blue-800'
                            : 'text-green-800'
                        }`}>
                          {role === 'ADMIN' && 'Admin'}
                          {role === 'COORDINATOR' && 'Coordinator'}
                          {role === 'TENANT' && 'Tenant'}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {role === 'ADMIN' && 'Full system access, manage users and houses'}
                          {role === 'COORDINATOR' && 'Manage inspections and assigned houses'}
                          {role === 'TENANT' && 'Submit move-out intentions and sign documents'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update User' : 'Create User')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                House Assignment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No users found. Create your first user to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const userWithRelations = user as UserWithRelations;

                // Get house assignments based on roles
                let houseAssignments: string[] = [];
                
                if (userWithRelations.roles?.includes('COORDINATOR') && userWithRelations.house_coordinators) {
                  houseAssignments = userWithRelations.house_coordinators
                    .map((hc) => hc.house?.name)
                    .filter((name): name is string => name !== undefined);
                } else if ((userWithRelations.roles?.includes('TENANT') || userWithRelations.roles?.includes('COORDINATOR')) && userWithRelations.tenancies) {
                  // Get active tenancies only
                  const activeTenancies = userWithRelations.tenancies.filter((t) => t.status === 'OCCUPIED');
                  houseAssignments = activeTenancies
                    .map((t) => {
                      const houseName = t.room?.house?.name;
                      const roomLabel = t.room?.label;
                      return houseName && roomLabel ? `${houseName} - ${roomLabel}` : null;
                    })
                    .filter((name): name is string => name !== null);
                }

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || []).map((role) => (
                          <span
                            key={role}
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : role === 'COORDINATOR'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {houseAssignments.length > 0 ? (
                          <div className="space-y-1">
                            {houseAssignments.map((assignment, idx) => (
                              <div key={idx}>{assignment}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-purple-600 hover:text-purple-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
