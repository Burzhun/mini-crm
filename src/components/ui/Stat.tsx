import type { ReactNode } from 'react';
export default function Stat({
  label,
  value,
  icon,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  note: string;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div>
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="stat-value">{value.toString().padStart(2, '0')}</strong>
      <span className="stat-note">{note}</span>
    </div>
  );
}
