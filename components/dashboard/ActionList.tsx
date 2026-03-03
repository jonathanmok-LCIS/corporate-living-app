'use client';

import Link from 'next/link';
import StatusBadge from './StatusBadge';

type BadgeVariant = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  href: string;
  badge?: { label: string; variant: BadgeVariant; pulse?: boolean };
  icon?: React.ReactNode;
  meta?: string; // e.g. time ago, date
}

interface ActionListProps {
  items: ActionItem[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export default function ActionList({ items, emptyMessage = 'No actions required', emptyIcon }: ActionListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-lg group"
          >
            {item.icon && (
              <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                {item.icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
              )}
            </div>
            {item.badge && (
              <StatusBadge label={item.badge.label} variant={item.badge.variant} pulse={item.badge.pulse} />
            )}
            {item.meta && <span className="text-xs text-gray-400 flex-shrink-0">{item.meta}</span>}
            <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
