'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser';
import { Profile, UserRole } from '@/lib/types';
import {
  archiveUser,
  createUser,
  deleteUser,
  reactivateUser,
  resetUserPassword,
  updateUser,
} from './actions';

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

function splitDisplayName(name: string) {
  const trimmed = (name || '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function getLegalName(user: Profile) {
  const fullLegal = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return fullLegal || user.name;
}

function getDisplayName(user: Profile) {
  return user.preferred_name?.trim() || getLegalName(user);
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    preferredName: '',
    password: '',
    roles: ['TENANT'] as UserRole[],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      if (!formData.firstName || !formData.lastName) {
        throw new Error('Please fill in legal first name and legal last name');
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
        result = await updateUser({
          id: editingId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          preferredName: formData.preferredName,
          roles: formData.roles,
        });
      } else {
        result = await createUser({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          preferredName: formData.preferredName,
          password: formData.password,
          roles: formData.roles,
        });
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(editingId ? 'User updated successfully!' : 'User created successfully!');
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        preferredName: '',
        password: '',
        roles: ['TENANT'],
      });
      setEditingId(null);
      setShowForm(false);

      await fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : 'Error saving user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!editingId) return;
    const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
    if (!confirm(`Reset password for "${fullName}"? A new temporary password will be generated.`)) return;

    setResettingPassword(true);
    setError(null);
    setTempPassword(null);

    try {
      const result = await resetUserPassword(editingId, formData.email);
      if (result.error) throw new Error(result.error);
      setTempPassword(result.tempPassword ?? null);
      setSuccess('Password reset successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resetting password.');
    } finally {
      setResettingPassword(false);
    }
  }

  function handleCancel() {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      preferredName: '',
      password: '',
      roles: ['TENANT'],
    });
    setEditingId(null);
    setShowForm(false);
    setError(null);
    setTempPassword(null);
  }

  function handleEdit(user: Profile) {
    const parsed = splitDisplayName(user.name || '');
    setFormData({
      email: user.email,
      firstName: user.first_name || parsed.firstName,
      lastName: user.last_name || parsed.lastName,
      preferredName: user.preferred_name || '',
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

  async function handleArchiveToggle(user: Profile) {
    const action = user.is_archived ? 'reactivate' : 'archive';
    if (!confirm(`Are you sure you want to ${action} user "${getDisplayName(user)}"?`)) {
      return;
    }

    try {
      const result = user.is_archived ? await reactivateUser(user.id) : await archiveUser(user.id);
      if (result.error) {
        throw new Error(result.error);
      }
      setSuccess(user.is_archived ? 'User reactivated successfully!' : 'User archived successfully!');
      await fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Error updating user status. Please try again.');
    }
  }

  function toggleRole(role: UserRole) {
    setFormData((prev) => {
      const currentRoles = prev.roles;
      if (currentRoles.includes(role)) {
        const newRoles = currentRoles.filter((r) => r !== role);
        return { ...prev, roles: newRoles.length > 0 ? newRoles : currentRoles };
      }
      return { ...prev, roles: [...currentRoles, role] };
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

  const filteredUsers = users.filter((user) => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return true;
    return (
      user.name.toLowerCase().includes(search) ||
      (user.first_name || '').toLowerCase().includes(search) ||
      (user.last_name || '').toLowerCase().includes(search) ||
      (user.preferred_name || '').toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.is_archived ? 'archived' : 'active').includes(search) ||
      (user.roles || []).some((role) => role.toLowerCase().includes(search))
    );
  });

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

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by legal name, preferred name, email, role, or status"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

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
                  Legal First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Legal Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Smith"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Preferred Name
                </label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="What they prefer to be called"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Password {!editingId && '*'}
                </label>
                {editingId ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resettingPassword || submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {resettingPassword ? 'Resetting...' : 'Reset Password'}
                    </button>
                    {tempPassword && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-800 mb-1">Temporary password (share securely with user):</p>
                        <code className="block text-sm font-mono text-amber-900 bg-amber-100 px-2 py-1 rounded select-all">{tempPassword}</code>
                        <p className="text-xs text-amber-600 mt-1">User will be prompted to change this on next login.</p>
                      </div>
                    )}
                  </div>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Legal Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Preferred Name
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    {users.length === 0 ? 'No users found. Create your first user to get started.' : 'No users match your search.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userWithRelations = user as UserWithRelations;

                  let houseAssignments: string[] = [];

                  if (userWithRelations.roles?.includes('COORDINATOR') && userWithRelations.house_coordinators) {
                    houseAssignments = userWithRelations.house_coordinators
                      .map((hc) => hc.house?.name)
                      .filter((name): name is string => name !== undefined);
                  } else if ((userWithRelations.roles?.includes('TENANT') || userWithRelations.roles?.includes('COORDINATOR')) && userWithRelations.tenancies) {
                    const activeTenancies = userWithRelations.tenancies.filter((t) => t.status === 'ACTIVE');
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
                        <Link
                          href={`/admin/users/history/${user.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-purple-700 underline-offset-2 hover:underline"
                        >
                          {getLegalName(user)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.preferred_name || '-'}</div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.is_archived
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_archived ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-purple-600 hover:text-purple-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(user)}
                          className="text-amber-600 hover:text-amber-900 mr-4"
                        >
                          {user.is_archived ? 'Reactivate' : 'Archive'}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, getDisplayName(user))}
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
