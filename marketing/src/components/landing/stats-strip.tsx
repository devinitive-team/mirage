import { NumberTicker } from '@/components/ui/number-ticker';

const STATS = [
  {
    value: 10000,
    label: 'documents',
    detail: 'Searchable with the same workflow from the first file to enterprise scale.',
  },
  {
    value: 0,
    label: 'manual tags',
    detail: 'Mirage answers document questions without taxonomy setup or keyword lists.',
  },
  {
    value: 202,
    label: 'Accepted ingest',
    detail: 'Uploads return immediately so teams keep moving while processing runs in background.',
  },
] as const;

export function StatsStrip() {
  return (
    <div className="stats-grid" role="list" aria-label="Mirage proof points">
      {STATS.map((stat, index) => (
        <article key={stat.label} className="surface-elevated stat-card" role="listitem">
          <p className="stat-number">
            <NumberTicker
              value={stat.value}
              delay={index * 0.15}
              className="stat-number__value"
              aria-hidden="true"
            />
            <span className="stat-number__suffix">{stat.label}</span>
          </p>
          <p className="stat-detail">{stat.detail}</p>
        </article>
      ))}
    </div>
  );
}
