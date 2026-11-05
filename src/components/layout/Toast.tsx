import { Check } from 'lucide-react';

export default function Toast({ notice }: { notice: string }) {
  return (
    <div className="toast" role="status">
      <Check size={17} />
      {notice}
    </div>
  );
}
