import { MapPin } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import HeadingActions from './HeadingActions';

export default function PageHeading() {
  const { selectedProject, pageTitle, headingCount, view, manager } = useWorkspace();
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {selectedProject ? 'КАРТОЧКА ОБЪЕКТА' : 'РАБОЧЕЕ ПРОСТРАНСТВО'}
        </div>
        <h1>
          {pageTitle}
          <span className="heading-count">{headingCount}</span>
        </h1>
        <p>
          {selectedProject ? (
            <>
              <MapPin size={15} />
              {selectedProject.address}
            </>
          ) : view === 'projects' ? (
            'От первого этапа до сдачи. Все ваши стройки здесь.'
          ) : view === 'review' ? (
            'Проверьте результат и дайте команде обратную связь.'
          ) : (
            'Задачи команды, актуальные статусы и следующий шаг.'
          )}
        </p>
      </div>
      {manager && <HeadingActions />}
    </div>
  );
}
