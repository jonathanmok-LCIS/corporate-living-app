'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser';
import type { Profile, UserRole } from '@/lib/types';

type DeliveryStatus = 'ALL' | 'FAILED' | 'SENT';

type EmailNotificationLog = {
  id: string;
  recipient_email: string;
  notification_type: string;
  subject: string;
  status: string;
  error_message: string | null;
  related_entity_type: string | null;
  created_at: string;
};

function getLegalName(user: Profile) {
  const fullLegal = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return fullLegal || user.name || user.email;
}

function getDisplayName(user: Profile) {
  return user.preferred_name?.trim() || getLegalName(user);
}

function formatRole(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'COORDINATOR':
      return 'Coordinator';
    case 'TENANT':
      return 'Tenant';
    default:
      return role;
  }
}

function formatNotificationType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<EmailNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus>('ALL');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setError('Supabase is not configured.');
      return;
    }

    void refreshData();
  }, []);

  async function refreshData() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const [usersRes, logsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('email_notifications')
          .select('id, recipient_email, notification_type, subject, status, error_message, related_entity_type, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (usersRes.error) {
        throw new Error(usersRes.error.message);
      }

      if (logsRes.error) {
        throw new Error(logsRes.error.message);
      }

      setUsers(usersRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Error loading notifications page:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notification data.');
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      if (!includeArchived && user.is_archived) return false;
      if (roleFilter !== 'ALL' && !(user.roles || []).includes(roleFilter)) return false;

      if (!search) return true;

      const haystack = [
        getDisplayName(user),
        getLegalName(user),
        user.email,
        ...(user.roles || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [users, searchQuery, roleFilter, includeArchived]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedRecipientIds.includes(user.id)),
    [users, selectedRecipientIds]
  );

  const filteredLogs = useMemo(() => {
    if (deliveryFilter === 'ALL') return logs;
    return logs.filter((log) => log.status === deliveryFilter);
  }, [logs, deliveryFilter]);

  const failedCount = logs.filter((log) => log.status === 'FAILED').length;
  const sentCount = logs.filter((log) => log.status === 'SENT').length;

  function toggleRecipient(id: string) {
    setSelectedRecipientIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function selectFilteredRecipients() {
    setSelectedRecipientIds(Array.from(new Set(filteredUsers.map((user) => user.id))));
  }

  function clearSelectedRecipients() {
    setSelectedRecipientIds([]);
  }

  async function handleSendBulkEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      if (!subject.trim()) {
        throw new Error('Subject is required.');
      }

      if (!body.trim()) {
        throw new Error('Message body is required.');
      }

      if (selectedUsers.length === 0) {
        throw new Error('Select at least one recipient.');
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bulk_custom',
          data: {
            subject: subject.trim(),
            body: body.trim(),
            recipients: selectedUsers.map((user) => ({
              id: user.id,
              email: user.email,
              name: getDisplayName(user),
              role: user.roles?.[0] || undefined,
            })),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send bulk email.');
      }

      const failureSuffix = result.failedCount > 0
        ? ` ${result.failedCount} delivery${result.failedCount === 1 ? '' : 'ies'} failed.`
        : '';

      setSuccess(`Bulk email processed. ${result.sentCount} sent.${failureSuffix}`);
      setSubject('');
      setBody('');
      clearSelectedRecipients();
      await refreshData();
    } catch (err) {
      console.error('Error sending bulk email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send bulk email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review email delivery failures and send bulk updates to selected users.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Failed Deliveries</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{loading ? '—' : failedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Successful Deliveries</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{loading ? '—' : sentCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Selected Recipients</p>
          <p className="mt-2 text-3xl font-bold text-purple-700">{selectedRecipientIds.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Email Composer</h2>
            <p className="text-sm text-gray-500 mt-1">Filter users, select recipients, then send a bulk email from the admin panel.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSendBulkEmail}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Enter email subject"
                disabled={sending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Write the email body here. Line breaks are preserved."
                disabled={sending}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
              >
                {sending ? 'Sending...' : 'Send Bulk Email'}
              </button>
              <button
                type="button"
                onClick={selectFilteredRecipients}
                className="rounded-lg border border-purple-200 px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-50"
              >
                Select Filtered
              </button>
              <button
                type="button"
                onClick={clearSelectedRecipients}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </form>

          <div className="space-y-3 border-t border-gray-100 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Search name, email, role"
              />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as 'ALL' | UserRole)}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">Admins</option>
                <option value="COORDINATOR">Coordinators</option>
                <option value="TENANT">Tenants</option>
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => setIncludeArchived(event.target.checked)}
                />
                Include archived users
              </label>
            </div>

            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200">
              {loading ? (
                <div className="p-4 text-sm text-gray-500">Loading recipients...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No users match the current filters.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const checked = selectedRecipientIds.includes(user.id);
                    return (
                      <label key={user.id} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(user.id)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900">{getDisplayName(user)}</p>
                            {user.is_archived && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Archived</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(user.roles || []).map((role) => (
                              <span key={`${user.id}-${role}`} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                {formatRole(role)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Delivery Log</h2>
              <p className="text-sm text-gray-500 mt-1">Recent notification attempts. Failures are highlighted for follow-up.</p>
            </div>
            <select
              value={deliveryFilter}
              onChange={(event) => setDeliveryFilter(event.target.value as DeliveryStatus)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="ALL">All</option>
              <option value="FAILED">Failed</option>
              <option value="SENT">Sent</option>
            </select>
          </div>

          <div className="max-h-[720px] overflow-y-auto rounded-xl border border-gray-200">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading notifications...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notification logs found for the selected filter.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`px-4 py-4 ${log.status === 'FAILED' ? 'bg-red-50/70' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{log.subject}</p>
                        <p className="text-sm text-gray-500 truncate">{log.recipient_email}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{formatNotificationType(log.notification_type)}</span>
                      <span>•</span>
                      <span>{timeLabel(log.created_at)}</span>
                      {log.related_entity_type && (
                        <>
                          <span>•</span>
                          <span>{formatNotificationType(log.related_entity_type)}</span>
                        </>
                      )}
                    </div>
                    {log.error_message && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}