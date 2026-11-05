import { useWorkspace } from '../../hooks/useWorkspace';
import { modalTitle } from '../../utils/modalTitle';
import ModalFrame from '../ui/ModalFrame';
import ModalContent from './ModalContent';
export default function ModalHost() {
  const { modal, error, close } = useWorkspace();
  if (!modal) return null;
  return (
    <ModalFrame title={modalTitle(modal)} close={close} wide={modal.kind === 'detail'}>
      {error && (
        <p className="error modal-error" role="alert">
          {error}
        </p>
      )}
      <ModalContent modal={modal} />
    </ModalFrame>
  );
}
