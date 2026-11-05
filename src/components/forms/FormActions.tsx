import { useWorkspace } from '../../hooks/useWorkspace';
export default function FormActions({ submitLabel }: { submitLabel: string }) {
  const { busy, close } = useWorkspace();
  return (
    <div className="form-actions">
      <button type="button" disabled={busy} className="secondary" onClick={close}>
        Отмена
      </button>
      <button className="primary" disabled={busy}>
        {busy ? 'Сохраняем…' : submitLabel}
      </button>
    </div>
  );
}
