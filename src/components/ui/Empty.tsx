import { FolderKanban } from 'lucide-react';
export default function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <FolderKanban size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
