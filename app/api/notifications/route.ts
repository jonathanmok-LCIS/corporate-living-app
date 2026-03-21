import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAdminClient } from '@/lib/supabase-server';

type NotificationType =
  | 'move_out_intention'
  | 'move_out_reviewed'
  | 'inspection_finalized'
  | 'move_in_signed'
  | 'bulk_custom';

type UserRole = 'ADMIN' | 'COORDINATOR' | 'TENANT';

type Recipient = {
  id: string | null;
  email: string;
  name: string;
  role?: UserRole;
};

type NotificationPayload = {
  type: NotificationType;
  data: Record<string, unknown>;
};

type EmailContent = {
  notificationType: NotificationType;
  subject: string;
  body: string;
  htmlBody: string;
  roleMessages?: Partial<Record<UserRole, { text: string; html: string }>>;
  recipients: Recipient[];
  relatedEntityType: string | null;
  relatedEntityId: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function displayName(raw: unknown, fallbackEmail: string): string {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }

  return fallbackEmail;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linesToHtml(lines: string[]): string {
  return lines
    .map((line) => (line.trim().length === 0 ? '<br />' : `<p style="margin: 0 0 10px;">${escapeHtml(line)}</p>`))
    .join('');
}

function roleBadge(role?: UserRole): { label: string; background: string; color: string } {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'Administrator',
        background: '#ede9fe',
        color: '#6d28d9',
      };
    case 'COORDINATOR':
      return {
        label: 'Coordinator',
        background: '#dbeafe',
        color: '#1d4ed8',
      };
    case 'TENANT':
      return {
        label: 'Tenant',
        background: '#dcfce7',
        color: '#166534',
      };
    default:
      return {
        label: 'User',
        background: '#f3f4f6',
        color: '#374151',
      };
  }
}

function eventLabel(type: NotificationType): string {
  switch (type) {
    case 'move_out_intention':
      return 'Move-Out Intention';
    case 'move_out_reviewed':
      return 'Move-Out Review';
    case 'inspection_finalized':
      return 'Inspection Finalized';
    case 'move_in_signed':
      return 'Move-In Signed';
    case 'bulk_custom':
      return 'Bulk Email';
    default:
      return 'Notification';
  }
}

function renderEmailForRecipient(content: EmailContent, recipient: Recipient): { text: string; html: string } {
  const roleMessage = recipient.role ? content.roleMessages?.[recipient.role] : undefined;
  const greetingName = recipient.name?.trim() || recipient.email;
  const badge = roleBadge(recipient.role);

  const textLines = [
    `Hi ${greetingName},`,
    '',
    content.body,
    ...(roleMessage?.text ? ['', roleMessage.text] : []),
    '',
    'Corporate Living Team',
  ];

  const htmlSections = [
    '<div style="margin: 0; padding: 24px; background: #f5f3ff; font-family: Arial, Helvetica, sans-serif; color: #111827;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; border-collapse: collapse;">',
    '<tr>',
    '<td style="padding: 0;">',
    '<div style="background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 55%, #5b21b6 100%); color: #ffffff; border-radius: 18px 18px 0 0; padding: 22px 28px; box-shadow: 0 14px 30px rgba(109, 40, 217, 0.18);">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">',
    '<tr>',
    '<td style="vertical-align: top;">',
    '<div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.82; margin-bottom: 8px;">Corporate Living</div>',
    `<div style="font-size: 28px; line-height: 1.15; font-weight: 700; margin: 0 0 6px;">${escapeHtml(content.subject)}</div>`,
    `<div style="font-size: 14px; opacity: 0.92;">${escapeHtml(eventLabel(content.notificationType))}</div>`,
    '</td>',
    '<td style="vertical-align: top; text-align: right;">',
    `<span style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;">${escapeHtml(badge.label)}</span>`,
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
    '<div style="background: #ffffff; border: 1px solid #ede9fe; border-top: none; border-radius: 0 0 18px 18px; padding: 28px; box-shadow: 0 18px 32px rgba(15, 23, 42, 0.06);">',
    `<p style="margin: 0 0 16px; font-size: 15px;">Hi ${escapeHtml(greetingName)},</p>`,
    '<div style="padding: 18px 18px 8px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fcfcff;">',
    content.htmlBody,
    '</div>',
  ];

  if (roleMessage?.html) {
    htmlSections.push(
      '<div style="margin-top: 18px; padding: 16px 18px; border-radius: 14px; background: #faf5ff; border: 1px solid #ddd6fe;">',
      '<div style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #7c3aed; margin-bottom: 8px;">Your next step</div>',
      roleMessage.html,
      '</div>'
    );
  }

  htmlSections.push(
    '<div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid #e5e7eb; color: #4b5563; font-size: 13px;">',
    '<p style="margin: 0 0 8px;">This email was sent by Corporate Living to support tenancy and house operations.</p>',
    '<p style="margin: 0;">If you were not expecting this message, contact your administrator.</p>',
    '<p style="margin: 14px 0 0; font-weight: 600; color: #111827;">Corporate Living Team</p>',
    '</div>',
    '</div>',
    '</td>',
    '</tr>',
    '</table>',
    '</div>'
  );

  return {
    text: textLines.join('\n'),
    html: htmlSections.join(''),
  };
}

function uniqueRecipients(recipients: Recipient[]): Recipient[] {
  const map = new Map<string, Recipient>();

  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (!email) continue;

    map.set(email, {
      ...recipient,
      email,
    });
  }

  return Array.from(map.values());
}

async function getUsersByRoles(roles: string[]): Promise<Recipient[]> {
  const supabaseAdmin = getAdminClient();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, roles');

  if (error) {
    throw new Error(`Failed loading profiles: ${error.message}`);
  }

  return (data ?? [])
    .filter((profile) => {
      if (!profile?.email) return false;
      const profileRoles = Array.isArray(profile.roles) ? profile.roles : [];
      return profileRoles.some((role: string) => roles.includes(role));
    })
    .map((profile) => ({
      role: (Array.isArray(profile.roles) ? profile.roles : []).find((role: string) => roles.includes(role)) as UserRole | undefined,
      id: profile.id ?? null,
      email: profile.email,
      name: displayName(profile.name, profile.email),
    }));
}

async function buildMoveOutIntentionEmail(data: Record<string, unknown>): Promise<EmailContent> {
  const tenancyId = typeof data.tenancyId === 'string' ? data.tenancyId : null;
  if (!tenancyId) {
    throw new Error('Missing tenancyId for move_out_intention notification');
  }

  const supabaseAdmin = getAdminClient();
  const { data: tenancy, error: tenancyError } = await supabaseAdmin
    .from('tenancies')
    .select(`
      id,
      room_id,
      tenant_user_id,
      room:rooms(
        id,
        label,
        house:houses(id, name)
      ),
      tenant:profiles!tenant_user_id(id, email, name)
    `)
    .eq('id', tenancyId)
    .single();

  if (tenancyError || !tenancy) {
    throw new Error(`Failed loading tenancy for notification: ${tenancyError?.message ?? 'Not found'}`);
  }

  const tenancyRecord = asRecord(tenancy);
  const roomRaw = tenancyRecord?.room;
  const roomRecord = Array.isArray(roomRaw)
    ? asRecord(roomRaw[0])
    : asRecord(roomRaw);
  const houseRaw = roomRecord?.house;
  const houseRecord = Array.isArray(houseRaw)
    ? asRecord(houseRaw[0])
    : asRecord(houseRaw);
  const tenantRaw = tenancyRecord?.tenant;
  const tenantRecord = Array.isArray(tenantRaw)
    ? asRecord(tenantRaw[0])
    : asRecord(tenantRaw);

  const { data: coordinators, error: coordinatorError } = await supabaseAdmin
    .from('house_coordinators')
    .select('user:profiles!user_id(id, email, name)')
    .eq('house_id', (houseRecord?.id as string | undefined) ?? '');

  if (coordinatorError) {
    throw new Error(`Failed loading coordinator recipients: ${coordinatorError.message}`);
  }

  const coordinatorRecipients: Recipient[] = (coordinators ?? []).reduce<Recipient[]>((acc, record) => {
    const user = Array.isArray(record.user) ? record.user[0] : record.user;
    if (!user?.email) return acc;

    acc.push({
      id: user.id ?? null,
      email: user.email,
      name: displayName(user.name, user.email),
      role: 'COORDINATOR',
    });

    return acc;
  }, []);

  const adminRecipients = await getUsersByRoles(['ADMIN']);
  const recipients = uniqueRecipients([...coordinatorRecipients, ...adminRecipients]);

  const tenantEmail = typeof tenantRecord?.email === 'string' ? tenantRecord.email : '';
  const tenantName = typeof tenantRecord?.name === 'string' ? tenantRecord.name : '';
  const houseName = typeof houseRecord?.name === 'string' ? houseRecord.name : 'Unknown house';
  const roomLabel = typeof roomRecord?.label === 'string' ? roomRecord.label : 'Unknown room';

  const tenantLabel = tenantEmail
    ? `${displayName(tenantName, tenantEmail)} (${tenantEmail})`
    : 'Unknown tenant';
  const plannedMoveOutDate = normalizeDate(data.plannedMoveOutDate);
  const isResubmission = data.isResubmission === true;

  const subject = isResubmission
    ? `[Resubmission] Move-out intention for ${houseName}`
    : `New move-out intention for ${houseName}`;

  const bodyLines = [
    isResubmission ? 'A tenant has resubmitted a move-out intention.' : 'A tenant has submitted a move-out intention.',
    '',
    `Tenant: ${tenantLabel}`,
    `House: ${houseName}`,
    `Room: ${roomLabel}`,
    `Planned move-out date: ${plannedMoveOutDate}`,
    '',
    'Please log in to the platform to review and process this request.',
  ];

  const htmlLines = [
    isResubmission ? 'A tenant has resubmitted a move-out intention.' : 'A tenant has submitted a move-out intention.',
    '',
    `Tenant: ${tenantLabel}`,
    `House: ${houseName}`,
    `Room: ${roomLabel}`,
    `Planned move-out date: ${plannedMoveOutDate}`,
    '',
    'Please log in to the platform to review and process this request.',
  ];

  return {
    notificationType: 'move_out_intention',
    subject,
    body: bodyLines.join('\n'),
    htmlBody: linesToHtml(htmlLines),
    roleMessages: {
      COORDINATOR: {
        text: 'Action for coordinator: review the tenant checklist and submit approval/rejection in Move-out Reviews.',
        html: '<p style="margin: 0;">Action for coordinator: review the tenant checklist and submit approval/rejection in Move-out Reviews.</p>',
      },
      ADMIN: {
        text: 'Action for admin: monitor this request and ensure review completion timelines are met.',
        html: '<p style="margin: 0;">Action for admin: monitor this request and ensure review completion timelines are met.</p>',
      },
    },
    recipients,
    relatedEntityType: 'TENANCY',
    relatedEntityId: tenancyId,
  };
}

async function buildMoveOutReviewedEmail(data: Record<string, unknown>): Promise<EmailContent> {
  const intentionId = typeof data.intentionId === 'string' ? data.intentionId : null;
  const status = typeof data.status === 'string' ? data.status.toUpperCase() : null;

  if (!intentionId) {
    throw new Error('Missing intentionId for move_out_reviewed notification');
  }

  const supabaseAdmin = getAdminClient();
  const { data: intention, error: intentionError } = await supabaseAdmin
    .from('move_out_intentions')
    .select(`
      id,
      tenancy_id,
      planned_move_out_date,
      tenancy:tenancies(
        id,
        room:rooms(
          id,
          label,
          house:houses(id, name)
        ),
        tenant:profiles!tenant_user_id(id, email, name)
      )
    `)
    .eq('id', intentionId)
    .single();

  if (intentionError || !intention) {
    throw new Error(`Failed loading move-out intention: ${intentionError?.message ?? 'Not found'}`);
  }

  const intentionRecord = asRecord(intention);
  const tenancyRaw = intentionRecord?.tenancy;
  const tenancyRecord = Array.isArray(tenancyRaw)
    ? asRecord(tenancyRaw[0])
    : asRecord(tenancyRaw);
  const roomRaw = tenancyRecord?.room;
  const roomRecord = Array.isArray(roomRaw)
    ? asRecord(roomRaw[0])
    : asRecord(roomRaw);
  const houseRaw = roomRecord?.house;
  const houseRecord = Array.isArray(houseRaw)
    ? asRecord(houseRaw[0])
    : asRecord(houseRaw);
  const tenantRaw = tenancyRecord?.tenant;
  const tenantRecord = Array.isArray(tenantRaw)
    ? asRecord(tenantRaw[0])
    : asRecord(tenantRaw);

  const recipients: Recipient[] = [];
  const tenantEmail = typeof tenantRecord?.email === 'string' ? tenantRecord.email : '';
  const tenantName = typeof tenantRecord?.name === 'string' ? tenantRecord.name : '';
  const houseName = typeof houseRecord?.name === 'string' ? houseRecord.name : 'Unknown house';
  const roomLabel = typeof roomRecord?.label === 'string' ? roomRecord.label : 'Unknown room';

  if (tenantEmail) {
    recipients.push({
      id: typeof tenantRecord?.id === 'string' ? tenantRecord.id : null,
      email: tenantEmail,
      name: displayName(tenantName, tenantEmail),
      role: 'TENANT',
    });
  }

  const adminRecipients = await getUsersByRoles(['ADMIN']);
  const allRecipients = uniqueRecipients([...recipients, ...adminRecipients]);

  const statusLabel = status === 'APPROVED' ? 'Approved' : 'Rejected';
  const subject = `Move-out review ${statusLabel}: ${houseName}`;

  const bodyLines = [
    `A move-out intention has been ${statusLabel.toLowerCase()}.`,
    '',
    `Tenant: ${tenantEmail ? `${displayName(tenantName, tenantEmail)} (${tenantEmail})` : 'Unknown tenant'}`,
    `House: ${houseName}`,
    `Room: ${roomLabel}`,
    `Planned move-out date: ${normalizeDate(intention.planned_move_out_date)}`,
    `Review status: ${statusLabel}`,
    '',
    status === 'APPROVED'
      ? 'The move-out process can continue to inspection and completion.'
      : 'The tenant should update details and resubmit their move-out intention.',
  ];

  const htmlLines = [
    `A move-out intention has been ${statusLabel.toLowerCase()}.`,
    '',
    `Tenant: ${tenantEmail ? `${displayName(tenantName, tenantEmail)} (${tenantEmail})` : 'Unknown tenant'}`,
    `House: ${houseName}`,
    `Room: ${roomLabel}`,
    `Planned move-out date: ${normalizeDate(intention.planned_move_out_date)}`,
    `Review status: ${statusLabel}`,
    '',
    status === 'APPROVED'
      ? 'The move-out process can continue to inspection and completion.'
      : 'The tenant should update details and resubmit their move-out intention.',
  ];

  return {
    notificationType: 'move_out_reviewed',
    subject,
    body: bodyLines.join('\n'),
    htmlBody: linesToHtml(htmlLines),
    roleMessages: {
      TENANT: {
        text: status === 'APPROVED'
          ? 'Action for tenant: please prepare for final move-out inspection and handover steps.'
          : 'Action for tenant: update your move-out submission details and resubmit from the tenant portal.',
        html: status === 'APPROVED'
          ? '<p style="margin: 0;">Action for tenant: please prepare for final move-out inspection and handover steps.</p>'
          : '<p style="margin: 0;">Action for tenant: update your move-out submission details and resubmit from the tenant portal.</p>',
      },
      ADMIN: {
        text: 'Action for admin: review coordinator outcome and follow through on tenancy status transitions.',
        html: '<p style="margin: 0;">Action for admin: review coordinator outcome and follow through on tenancy status transitions.</p>',
      },
    },
    recipients: allRecipients,
    relatedEntityType: 'MOVE_OUT_INTENTION',
    relatedEntityId: intentionId,
  };
}

function roleFromToken(value: string): UserRole | null {
  if (value === 'ADMIN' || value === 'COORDINATOR' || value === 'TENANT') {
    return value;
  }

  return null;
}

async function buildGenericRoleEmail(
  type: NotificationType,
  data: Record<string, unknown>,
  defaults: {
    subject: string;
    body: string;
    roles: UserRole[];
    relatedEntityType: string | null;
    relatedEntityIdField: string | null;
  }
): Promise<EmailContent> {
  const roleTokens = Array.isArray(data.recipients)
    ? data.recipients.filter((value): value is string => typeof value === 'string')
    : defaults.roles;

  const resolvedRoles: UserRole[] = roleTokens
    .map(roleFromToken)
    .filter((role): role is UserRole => role !== null);

  const recipients = await getUsersByRoles(resolvedRoles.length > 0 ? resolvedRoles : defaults.roles);

  const subject = typeof data.subject === 'string' && data.subject.trim().length > 0
    ? data.subject.trim()
    : defaults.subject;

  const body = typeof data.body === 'string' && data.body.trim().length > 0
    ? data.body.trim()
    : defaults.body;

  let relatedEntityId: string | null = null;
  if (defaults.relatedEntityIdField) {
    const raw = data[defaults.relatedEntityIdField];
    relatedEntityId = typeof raw === 'string' ? raw : null;
  }

  return {
    notificationType: type,
    subject,
    body: `${body}\n\nNotification type: ${type}`,
    htmlBody: linesToHtml([body, '', `Notification type: ${type}`]),
    roleMessages: {
      ADMIN: {
        text: 'Action for admin: review and record next operational steps in the platform.',
        html: '<p style="margin: 0;">Action for admin: review and record next operational steps in the platform.</p>',
      },
      COORDINATOR: {
        text: 'Action for coordinator: confirm any house-level actions and update related records.',
        html: '<p style="margin: 0;">Action for coordinator: confirm any house-level actions and update related records.</p>',
      },
      TENANT: {
        text: 'Action for tenant: check your dashboard for any required follow-up.',
        html: '<p style="margin: 0;">Action for tenant: check your dashboard for any required follow-up.</p>',
      },
    },
    recipients,
    relatedEntityType: defaults.relatedEntityType,
    relatedEntityId,
  };
}

function parseExplicitRecipients(value: unknown): Recipient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<Recipient[]>((acc, item) => {
    const record = asRecord(item);
    const email = typeof record?.email === 'string' ? record.email.trim().toLowerCase() : '';

    if (!email) {
      return acc;
    }

    const role = typeof record?.role === 'string' ? roleFromToken(record.role) : null;

    acc.push({
      id: typeof record?.id === 'string' ? record.id : null,
      email,
      name: displayName(record?.name, email),
      role: role ?? undefined,
    });

    return acc;
  }, []);
}

async function buildBulkCustomEmail(data: Record<string, unknown>): Promise<EmailContent> {
  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  const recipients = uniqueRecipients(parseExplicitRecipients(data.recipients));

  if (!subject) {
    throw new Error('Bulk email subject is required');
  }

  if (!body) {
    throw new Error('Bulk email body is required');
  }

  if (recipients.length === 0) {
    throw new Error('At least one recipient is required for bulk email');
  }

  return {
    notificationType: 'bulk_custom',
    subject,
    body,
    htmlBody: linesToHtml(body.split('\n')),
    recipients,
    relatedEntityType: 'BULK_EMAIL',
    relatedEntityId: null,
  };
}

function parsePayload(body: unknown): NotificationPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request payload');
  }

  const raw = body as { type?: unknown; data?: unknown };

  if (typeof raw.type !== 'string') {
    throw new Error('Invalid notification type');
  }

  if (!raw.data || typeof raw.data !== 'object') {
    throw new Error('Invalid notification data');
  }

  return {
    type: raw.type as NotificationType,
    data: raw.data as Record<string, unknown>,
  };
}

async function sendWithResend(params: {
  to: string;
  subject: string;
  body: string;
  htmlBody: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      error: 'Email provider not configured. Set RESEND_API_KEY and EMAIL_FROM.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
      html: params.htmlBody,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      sent: false,
      error: `Resend API error (${response.status}): ${errorText}`,
    };
  }

  return {
    sent: true,
    error: null,
  };
}

async function logNotificationAttempt(params: {
  recipient: Recipient;
  type: NotificationType;
  subject: string;
  body: string;
  sent: boolean;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}) {
  const supabaseAdmin = getAdminClient();

  const insertPayload = {
    recipient_email: params.recipient.email,
    recipient_id: params.recipient.id,
    notification_type: params.type,
    subject: params.subject,
    body: params.body,
    status: params.sent ? 'SENT' : 'FAILED',
    sent_at: params.sent ? new Date().toISOString() : null,
    error_message: params.errorMessage,
    related_entity_type: params.relatedEntityType,
    related_entity_id: params.relatedEntityId,
  };

  const { error } = await supabaseAdmin
    .from('email_notifications')
    .insert(insertPayload);

  if (error) {
    console.error('Failed to log email notification attempt:', error);
  }
}

async function resolveContent(type: NotificationType, data: Record<string, unknown>): Promise<EmailContent> {
  switch (type) {
    case 'move_out_intention':
      return buildMoveOutIntentionEmail(data);
    case 'move_out_reviewed':
      return buildMoveOutReviewedEmail(data);
    case 'inspection_finalized':
      return buildGenericRoleEmail(type, data, {
        subject: 'Inspection finalized',
        body: 'An inspection has been finalized. Please review the record in the platform.',
        roles: ['ADMIN'],
        relatedEntityType: 'INSPECTION',
        relatedEntityIdField: 'inspectionId',
      });
    case 'move_in_signed':
      return buildGenericRoleEmail(type, data, {
        subject: 'Move-in form signed',
        body: 'A tenant move-in form has been signed. Please review the details in the platform.',
        roles: ['ADMIN', 'COORDINATOR'],
        relatedEntityType: 'MOVE_IN_FORM',
        relatedEntityIdField: 'moveInId',
      });
    case 'bulk_custom':
      return buildBulkCustomEmail(data);
    default:
      throw new Error('Unknown notification type');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const payload = parsePayload(body);

    if (payload.type === 'bulk_custom') {
      const supabaseAdmin = getAdminClient();
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error(`Failed to verify admin access: ${profileError.message}`);
      }

      const roles = Array.isArray(profile?.roles) ? profile.roles : [];
      if (!roles.includes('ADMIN')) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const content = await resolveContent(payload.type, payload.data);

    const recipients = uniqueRecipients(content.recipients);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients resolved for notification' },
        { status: 400 }
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    const failures: Array<{ email: string; error: string | null }> = [];

    for (const recipient of recipients) {
      const renderedEmail = renderEmailForRecipient(content, recipient);

      const delivery = await sendWithResend({
        to: recipient.email,
        subject: content.subject,
        body: renderedEmail.text,
        htmlBody: renderedEmail.html,
      });

      if (delivery.sent) {
        sentCount += 1;
      } else {
        failedCount += 1;
        failures.push({
          email: recipient.email,
          error: delivery.error,
        });
      }

      await logNotificationAttempt({
        recipient,
        type: payload.type,
        subject: content.subject,
        body: renderedEmail.text,
        sent: delivery.sent,
        errorMessage: delivery.error,
        relatedEntityType: content.relatedEntityType,
        relatedEntityId: content.relatedEntityId,
      });
    }

    return NextResponse.json({
      success: true,
      type: payload.type,
      sentCount,
      failedCount,
      failures,
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    const message = err instanceof Error ? err.message : 'Failed to send notification';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
