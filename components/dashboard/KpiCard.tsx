'use client';

type KpiColor = 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'gray';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: KpiColor;
  subtitle?: string;
  loading?: boolean;
}

const COLOR_MAP: Record<KpiColor, { bg: string; icon: string; text: string }> = {
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
  gray: { bg: 'bg-gray-50', icon: 'text-gray-600', text: 'text-gray-700' },
};

export default function KpiCard({ label, value, icon, color = 'gray', subtitle, loading = false }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 rounded-lg p-2.5 ${c.bg}`}>
        <div className={`h-6 w-6 ${c.icon}`}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
        ) : (
          <p className={`text-2xl font-bold ${c.text} mt-0.5`}>{value}</p>
        )}
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
