import { Building2 } from 'lucide-react';
export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Building2 size={25} strokeWidth={1.8} />
      </span>
      <span>
        контур<span className="brand-period">.</span>
      </span>
    </div>
  );
}
