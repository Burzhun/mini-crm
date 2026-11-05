import { Search, X, LayoutGrid, List } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { statuses, labels, type Status } from '../../domain';

export default function WorkspaceToolbar() {
  const { view, projectId, query, setQuery, filter, setFilter, layout, setLayout } = useWorkspace();
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={17} />
        <input
          aria-label="Поиск"
          placeholder={
            view === 'projects' && !projectId
              ? 'Найти объект по названию или адресу…'
              : 'Поиск по задачам…'
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="icon-button" aria-label="Очистить поиск" onClick={() => setQuery('')}>
            <X size={15} />
          </button>
        )}
      </div>
      <div className="toolbar-actions">
        {view !== 'review' && (
          <select
            aria-label="Фильтр по статусу"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Status | 'all')}
          >
            <option value="all">Все статусы</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
        )}
        {view === 'projects' && !projectId && (
          <div className="view-switch">
            <button
              aria-label="Карточки"
              aria-pressed={layout === 'grid'}
              className={layout === 'grid' ? 'selected' : ''}
              onClick={() => setLayout('grid')}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              aria-label="Список"
              aria-pressed={layout === 'list'}
              className={layout === 'list' ? 'selected' : ''}
              onClick={() => setLayout('list')}
            >
              <List size={19} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
