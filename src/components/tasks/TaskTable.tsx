import { useWorkspace } from '../../hooks/useWorkspace';
import { type Task } from '../../domain';
import Empty from '../ui/Empty';
import TaskRow from './TaskRow';

export default function TaskTable({ tasks }: { tasks: Task[] }) {
  const { query, filter, manager } = useWorkspace();
  return (
    <div className="task-table">
      <div className="table-head">
        <span>Задача</span>
        <span>Статус</span>
        <span>Исполнитель</span>
        <span>Создана</span>
        <span />
      </div>
      {tasks.length ? (
        tasks.map((t) => <TaskRow key={t.id} t={t} />)
      ) : (
        <Empty
          title="Задач пока нет"
          text={
            query || filter !== 'all'
              ? 'Попробуйте изменить поиск или фильтр.'
              : manager
                ? 'Создайте задачу и назначьте исполнителя.'
                : 'Здесь появятся назначенные вам задачи.'
          }
        />
      )}
    </div>
  );
}
