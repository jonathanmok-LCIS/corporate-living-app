'use client';

type BadgeVariant = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  pulse?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PULSE_DOTS: Record<BadgeVariant, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-400',
};

export default function StatusBadge({ label, variant = 'gray', pulse = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${VARIANT_CLASSES[variant]}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${PULSE_DOTS[variant]}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${PULSE_DOTS[variant]}`} />
        </span>
      )}
      {label}
    </span>
  );
}
