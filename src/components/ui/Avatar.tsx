import { initials } from '../../domain';
export default function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? 'small' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
