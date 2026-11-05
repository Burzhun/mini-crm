import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  FolderKanban,
  HardHat,
  LayoutGrid,
  List,
  LoaderCircle,
  LogOut,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Repository, supabase, demoAccounts } from './api';
import { demoData } from './demo';
import {
  labels,
  statuses,
  transitions,
  actionLabels,
  date,
  initials,
  type Profile,
  type Project,
  type Task,
  type Status,
  type Snapshot,
} from './domain';

type View = 'projects' | 'tasks' | 'review';
type Modal =
  | { kind: 'project'; item?: Project }
  | { kind: 'task'; item?: Task }
  | { kind: 'detail'; id: string }
  | { kind: 'delete'; type: 'projects' | 'tasks'; id: string; name: string }
  | { kind: 'help' }
  | null;
const empty: Snapshot = { projects: [], tasks: [], profiles: [], history: [] };
function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {labels[status]}
    </span>
  );
}
function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? 'small' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
function ModalFrame({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && el) {
        const nodes = Array.from(
          el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex="0"]'),
        ).filter((x) => !x.hasAttribute('disabled'));
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === el)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? 'wide' : ''}`}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button aria-label="Закрыть" className="icon-button" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<Profile | null>(null),
    [demo, setDemo] = useState(false),
    [authLoading, setAuthLoading] = useState(!!supabase),
    [authError, setAuthError] = useState('');
  const [data, setData] = useState<Snapshot>(empty),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [view, setView] = useState<View>('projects'),
    [projectId, setProjectId] = useState<string | null>(null),
    [modal, setModal] = useState<Modal>(null),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState<Status | 'all'>('all'),
    [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [comment, setComment] = useState('');
  const repo = useMemo(() => (user ? new Repository(demo, user) : null), [user, demo]);
  const manager = user?.role === 'manager';
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let ticket = 0;
    const accept = async (id?: string) => {
      const current = ++ticket;
      setAuthLoading(true);
      try {
        if (!id) {
          if (alive && current === ticket) setUser(null);
          return;
        }
        const { data: p, error: e } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        if (e)
          throw new Error('Профиль не настроен. Примените миграцию и назначьте роль пользователю.');
        if (alive && current === ticket) {
          setDemo(false);
          setUser(p as Profile);
          setAuthError('');
        }
      } catch (e) {
        if (alive && current === ticket) {
          setUser(null);
          setAuthError(message(e));
        }
      } finally {
        if (alive && current === ticket) setAuthLoading(false);
      }
    };
    supabase.auth.getSession().then(({ data: { session }, error: e }) => {
      if (e) {
        setAuthError(e.message);
        setAuthLoading(false);
      } else void accept(session?.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (alive) void accept(session?.user.id);
      }, 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!repo) return;
    let active = true;
    setData(empty);
    setLoading(true);
    repo
      .load()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  function message(e: unknown) {
    return e instanceof Error ? e.message : 'Не удалось выполнить действие.';
  }
  async function mutate(action: () => Promise<void>, success: string, close = true) {
    setBusy(true);
    setError('');
    try {
      await action();
      setData(await repo!.load());
      if (close) {
        setModal(null);
        setComment('');
      }
      setNotice(success);
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: View) {
    setView(next);
    setProjectId(null);
    setQuery('');
    setFilter('all');
  }
  function open(next: Modal) {
    setError('');
    setComment('');
    setModal(next);
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      if (!supabase) throw new Error('Подключение к Supabase не настроено. Используйте деморежим.');
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e)
        throw new Error(
          e.message === 'Invalid login credentials' ? 'Неверный email или пароль.' : e.message,
        );
    } catch (e) {
      setAuthError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function enterDemo(id: string) {
    setDemo(true);
    setAuthLoading(false);
    setUser(demoData().profiles.find((p) => p.id === id)!);
    setAuthError('');
    navigate('projects');
  }
  async function logout() {
    if (!demo) {
      const { error: e } = await supabase!.auth.signOut();
      if (e) {
        setError(e.message);
        return;
      }
    }
    setUser(null);
    setData(empty);
    setDemo(false);
    setModal(null);
    setPassword('');
    setError('');
  }
  const profile = (id: string) => data.profiles.find((p) => p.id === id)?.name || 'Пользователь';
  const selectedProject = data.projects.find((p) => p.id === projectId);
  const task = modal?.kind === 'detail' ? data.tasks.find((t) => t.id === modal.id) : undefined;
  const reviewCount = data.tasks.filter((t) => t.status === 'review').length;
  const filteredTasks = data.tasks.filter(
    (t) =>
      (!projectId || t.project_id === projectId) &&
      (view !== 'review' || t.status === 'review') &&
      (filter === 'all' || t.status === filter) &&
      `${t.title} ${t.description} ${profile(t.assignee_id)} ${data.projects.find((p) => p.id === t.project_id)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const filteredProjects = data.projects.filter(
    (p) =>
      `${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || data.tasks.some((t) => t.project_id === p.id && t.status === filter)),
  );
  const pageTitle =
    selectedProject?.name ||
    (view === 'projects'
      ? 'Объекты'
      : view === 'review'
        ? 'На проверке'
        : manager
          ? 'Все задачи'
          : 'Мои задачи');
  const taskRows = (tasks: Task[]) => (
    <div className="task-table">
      <div className="table-head">
        <span>Задача</span>
        <span>Статус</span>
        <span>Исполнитель</span>
        <span>Создана</span>
        <span />
      </div>
      {tasks.length ? (
        tasks.map((t) => (
          <button
            key={t.id}
            className="task-row"
            onClick={() => open({ kind: 'detail', id: t.id })}
          >
            <span className="task-name">
              <span className={`task-mark ${t.status === 'accepted' ? 'done' : ''}`}>
                {t.status === 'accepted' ? <Check size={14} /> : <ClipboardList size={15} />}
              </span>
              <span>
                <strong>{t.title}</strong>
                {!projectId && (
                  <small>{data.projects.find((p) => p.id === t.project_id)?.name}</small>
                )}
              </span>
            </span>
            <span>
              <Badge status={t.status} />
            </span>
            <span className="person">
              <Avatar name={profile(t.assignee_id)} small />
              {profile(t.assignee_id)}
            </span>
            <span className="muted task-date">{date(t.created_at)}</span>
            <ChevronRight size={16} />
          </button>
        ))
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
  if (authLoading)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        <p>Загружаем рабочее пространство…</p>
      </div>
    );
  if (!user)
    return (
      <div className="login-page">
        <div className="login-story">
          <Brand />
          <div>
            <span className="eyebrow light">СТРОИМ ВМЕСТЕ. РАБОТАЕМ СИСТЕМНО.</span>
            <h1>
              Каждый объект.
              <br />
              Каждая задача.
              <br />
              <em>Всё под контролем.</em>
            </h1>
            <p>Единое рабочее пространство для вашей строительной команды.</p>
          </div>
          <span className="login-foot">
            <ShieldCheck size={17} /> Доступ к данным — только по вашей роли
          </span>
          <div className="blueprint" aria-hidden="true">
            <Building2 size={310} strokeWidth={0.5} />
          </div>
        </div>
        <main className="login-main">
          <div className="login-form">
            <span className="eyebrow">ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО</span>
            <h2>С возвращением</h2>
            <p className="muted">Войдите, чтобы продолжить работу.</p>
            <form onSubmit={login}>
              <label>
                Email
                <input
                  autoComplete="username"
                  type="email"
                  required
                  placeholder="name@company.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Пароль
                <input
                  autoComplete="current-password"
                  type="password"
                  required
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {authError && (
                <p className="error" role="alert">
                  {authError}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <>
                    Войти в систему
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
            <p className="login-hint">
              Нет доступа? Обратитесь к руководителю.
              <br />
              Регистрация доступна только по приглашению.
            </p>
            <div className="demo-login">
              <span className="eyebrow">ПОСМОТРЕТЬ БЕЗ РЕГИСТРАЦИИ</span>
              <p>Демонстрационные данные в этом браузере</p>
              <button className="secondary full" onClick={() => enterDemo('manager')}>
                Открыть демо постановщика <ArrowUpRight size={16} />
              </button>
              <div className="demo-workers">
                <button onClick={() => enterDemo('worker-1')}>Исполнитель: Михаил</button>
                <button onClick={() => enterDemo('worker-2')}>Исполнитель: Анна</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <div className="workspace-icon">
            <HardHat size={20} />
          </div>
          <div>
            <strong>Строительная компания</strong>
            <small>Рабочее пространство</small>
          </div>
        </div>
        <span className="nav-label">УПРАВЛЕНИЕ</span>
        <nav>
          <button
            className={view === 'projects' ? 'active' : ''}
            onClick={() => navigate('projects')}
          >
            <Building2 size={19} />
            Объекты<span className="nav-count">{data.projects.length}</span>
          </button>
          <button className={view === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>
            <ClipboardList size={19} />
            {manager ? 'Все задачи' : 'Мои задачи'}
            <span className="nav-count">{data.tasks.length}</span>
          </button>
          {manager && (
            <button
              className={view === 'review' ? 'active' : ''}
              onClick={() => navigate('review')}
            >
              <CheckCheck size={19} />
              На проверке
              {reviewCount > 0 && <span className="nav-count highlight">{reviewCount}</span>}
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <ShieldCheck size={19} />
            </span>
            <strong>Всё на своих местах</strong>
            <p>
              {manager
                ? 'Объекты, команда и задачи — в одном рабочем пространстве.'
                : 'Вам доступны ваши задачи и связанные с ними объекты.'}
            </p>
            <button onClick={() => open({ kind: 'help' })}>
              Как это работает <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="user-profile" onClick={() => open({ kind: 'help' })}>
            <Avatar name={user.name} />
            <span>
              <strong>{user.name}</strong>
              <small>{manager ? 'Постановщик' : 'Исполнитель'}</small>
            </span>
            <ChevronDown size={14} />
          </button>
          <button className="logout" onClick={() => void logout()}>
            <LogOut size={15} />
            Выйти из аккаунта
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Рабочее пространство</span>
            <ChevronRight size={14} />
            <strong>{selectedProject ? 'Объекты' : pageTitle}</strong>
            {selectedProject && (
              <>
                <ChevronRight size={14} />
                <span className="truncate">{selectedProject.name}</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className={`connection ${demo ? 'demo' : ''}`}>
              <i />
              {demo ? 'Деморежим' : 'Supabase'}
            </span>
            <button
              className="icon-button"
              aria-label="Обновить данные"
              disabled={busy || loading}
              onClick={() => void mutate(async () => {}, 'Данные обновлены', false)}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Справка"
              onClick={() => open({ kind: 'help' })}
            >
              <CircleHelp size={19} />
            </button>
            <Avatar name={user.name} small />
          </div>
        </header>
        <main className="content">
          {demo && (
            <div className="demo-banner">
              <span>Деморежим · данные хранятся в вашем браузере</span>
              <label>
                Смотреть как
                <select
                  aria-label="Демонстрационная роль"
                  value={user.id}
                  onChange={(e) => enterDemo(e.target.value)}
                >
                  {demoData().profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.role === 'manager' ? 'Постановщик' : 'Исполнитель'} ·{' '}
                      {p.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {selectedProject && (
            <button
              className="back-link"
              onClick={() => {
                setProjectId(null);
                setQuery('');
                setFilter('all');
              }}
            >
              <ChevronLeft size={16} />
              Все объекты
            </button>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {selectedProject ? 'КАРТОЧКА ОБЪЕКТА' : 'РАБОЧЕЕ ПРОСТРАНСТВО'}
              </div>
              <h1>
                {pageTitle}
                <span className="heading-count">
                  {selectedProject
                    ? data.tasks.filter((t) => t.project_id === projectId).length
                    : view === 'projects'
                      ? data.projects.length
                      : view === 'review'
                        ? reviewCount
                        : data.tasks.length}
                </span>
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
            {manager && (
              <div className="heading-actions">
                {selectedProject && (
                  <>
                    <button
                      className="secondary"
                      aria-label="Редактировать объект"
                      onClick={() => open({ kind: 'project', item: selectedProject })}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="secondary"
                      aria-label="Удалить объект"
                      onClick={() =>
                        open({
                          kind: 'delete',
                          type: 'projects',
                          id: selectedProject.id,
                          name: selectedProject.name,
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button
                  className="primary"
                  onClick={() =>
                    open({ kind: view === 'projects' && !projectId ? 'project' : 'task' })
                  }
                >
                  <Plus size={18} />
                  {view === 'projects' && !projectId ? 'Новый объект' : 'Новая задача'}
                </button>
              </div>
            )}
          </div>
          {error && !modal && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => void mutate(async () => {}, 'Данные обновлены', false)}>
                Повторить
              </button>
            </div>
          )}
          <div className="stats">
            <Stat
              label="Всего задач"
              value={data.tasks.filter((t) => !projectId || t.project_id === projectId).length}
              icon={<ClipboardList size={20} />}
              note="В рабочем пространстве"
            />
            <Stat
              label="В работе"
              value={
                data.tasks.filter(
                  (t) => (!projectId || t.project_id === projectId) && t.status === 'in_progress',
                ).length
              }
              icon={<Clock3 size={20} />}
              note="Команда уже занимается"
              tone="blue"
            />
            <Stat
              label="На проверке"
              value={
                data.tasks.filter(
                  (t) => (!projectId || t.project_id === projectId) && t.status === 'review',
                ).length
              }
              icon={<CheckCheck size={20} />}
              note="Ожидают решения"
              tone="orange"
            />
            <Stat
              label="Принято"
              value={
                data.tasks.filter(
                  (t) => (!projectId || t.project_id === projectId) && t.status === 'accepted',
                ).length
              }
              icon={<Check size={20} />}
              note="Работа выполнена"
              tone="green"
            />
          </div>
          <section className="workspace-section">
            <div className="section-top">
              <div className="section-tabs">
                <button className="selected" onClick={() => setFilter('all')}>
                  {view === 'projects' && !projectId
                    ? 'Все объекты'
                    : view === 'review'
                      ? 'Ожидают проверки'
                      : 'Список задач'}
                  <span>
                    {view === 'projects' && !projectId
                      ? filteredProjects.length
                      : filteredTasks.length}
                  </span>
                </button>
                {view === 'projects' && !projectId && (
                  <span className="section-description">От идеи до результата</span>
                )}
              </div>
            </div>
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
                  <button
                    className="icon-button"
                    aria-label="Очистить поиск"
                    onClick={() => setQuery('')}
                  >
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
            {loading ? (
              <div className="empty-state">
                <LoaderCircle className="spin" />
                <p>Загружаем данные…</p>
              </div>
            ) : view === 'projects' && !projectId ? (
              <div className={`project-grid ${layout === 'list' ? 'as-list' : ''}`}>
                {filteredProjects.map((p, i) => {
                  const tasks = data.tasks.filter((t) => t.project_id === p.id),
                    done = tasks.filter((t) => t.status === 'accepted').length,
                    people = [...new Set(tasks.map((t) => t.assignee_id))],
                    percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                  return (
                    <article className="project-card" key={p.id}>
                      <button
                        className="project-open"
                        onClick={() => {
                          setProjectId(p.id);
                          setQuery('');
                          setFilter('all');
                        }}
                      >
                        <div className="project-card-top">
                          <span className={`project-symbol symbol-${i % 3}`}>
                            <Building2 size={25} strokeWidth={1.5} />
                          </span>
                          <span
                            className={`project-state ${tasks.length && done === tasks.length ? 'completed' : ''}`}
                          >
                            <i />
                            {!tasks.length
                              ? 'Нет задач'
                              : done === tasks.length
                                ? 'Завершён'
                                : 'В работе'}
                          </span>
                          <ArrowUpRight className="project-arrow" size={18} />
                        </div>
                        <h2>{p.name}</h2>
                        <p className="project-address">
                          <MapPin size={14} />
                          {p.address}
                        </p>
                        <div className="project-progress">
                          <div>
                            <span>Выполнение задач</span>
                            <strong>{percent}%</strong>
                          </div>
                          <div className="progress-track">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                        <div className="project-numbers">
                          <span>
                            <ClipboardList size={15} />
                            {tasks.length}{' '}
                            {tasks.length === 1
                              ? 'задача'
                              : tasks.length > 1 && tasks.length < 5
                                ? 'задачи'
                                : 'задач'}
                          </span>
                          <span>
                            <CheckCheck size={15} />
                            {done} принято
                          </span>
                        </div>
                        <div className="project-card-foot">
                          <div className="avatar-stack">
                            {people.slice(0, 3).map((id) => (
                              <Avatar key={id} name={profile(id)} small />
                            ))}
                            {!people.length && <span className="muted">Команда не назначена</span>}
                          </div>
                          <span>
                            {tasks.filter((t) => t.status === 'review').length > 0 ? (
                              <span className="review-note">
                                <i />
                                {tasks.filter((t) => t.status === 'review').length} на проверке
                              </span>
                            ) : (
                              <span className="muted">
                                Создан {date(p.created_at).replace('2026 г.', '')}
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                      {manager && (
                        <button
                          className="card-menu icon-button"
                          aria-label={`Редактировать ${p.name}`}
                          onClick={() => open({ kind: 'project', item: p })}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      )}
                    </article>
                  );
                })}
                {manager && !query && filter === 'all' && (
                  <button className="add-project-card" onClick={() => open({ kind: 'project' })}>
                    <span>
                      <Plus size={24} />
                    </span>
                    <strong>Следующий большой проект</strong>
                    <p>Добавьте объект и начните работу</p>
                  </button>
                )}
                {!filteredProjects.length && (query || !manager || filter !== 'all') && (
                  <Empty
                    title="Объекты не найдены"
                    text={
                      query || filter !== 'all'
                        ? 'Измените поисковый запрос или фильтр.'
                        : 'Здесь появятся объекты с вашими задачами.'
                    }
                  />
                )}
              </div>
            ) : (
              taskRows(filteredTasks)
            )}
          </section>
          <footer className="page-footer">
            <span>
              <ShieldCheck size={14} />
              {manager
                ? 'Вы видите все объекты и задачи компании'
                : 'Вы видите только назначенные вам задачи'}
            </span>
            <span>
              Контур <span className="footer-dot">·</span> Пространство для работы
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {modal && (
        <ModalFrame
          title={
            modal.kind === 'project'
              ? modal.item
                ? 'Редактировать объект'
                : 'Новый объект'
              : modal.kind === 'task'
                ? modal.item
                  ? 'Редактировать задачу'
                  : 'Новая задача'
                : modal.kind === 'detail'
                  ? 'Карточка задачи'
                  : modal.kind === 'delete'
                    ? 'Подтвердите удаление'
                    : 'Как работает Контур'
          }
          close={() => {
            if (!busy) {
              setModal(null);
              setError('');
            }
          }}
          wide={modal.kind === 'detail'}
        >
          {error && (
            <p className="error modal-error" role="alert">
              {error}
            </p>
          )}
          {(modal.kind === 'project' || modal.kind === 'task') && (
            <form
              className="entity-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (modal.kind === 'project') {
                  void mutate(
                    () =>
                      repo!.project(
                        {
                          name: String(f.get('name')).trim(),
                          address: String(f.get('address')).trim(),
                        },
                        modal.item?.id,
                      ),
                    'Объект сохранён',
                  );
                } else
                  void mutate(
                    () =>
                      repo!.task(
                        {
                          title: String(f.get('title')).trim(),
                          description: String(f.get('description')).trim(),
                          project_id: String(f.get('project_id')),
                          assignee_id: String(f.get('assignee_id')),
                        },
                        modal.item?.id,
                      ),
                    'Задача сохранена',
                  );
              }}
            >
              {modal.kind === 'project' ? (
                <>
                  <label>
                    Название объекта
                    <input
                      name="name"
                      required
                      maxLength={180}
                      pattern=".*\S.*"
                      placeholder="Например, ЖК «Сосновый парк»"
                      defaultValue={modal.item?.name}
                    />
                  </label>
                  <label>
                    Адрес
                    <input
                      name="address"
                      required
                      maxLength={400}
                      pattern=".*\S.*"
                      placeholder="Город, улица, номер дома"
                      defaultValue={modal.item?.address}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Название задачи
                    <input
                      name="title"
                      required
                      pattern=".*\S.*"
                      maxLength={240}
                      placeholder="Что нужно сделать?"
                      defaultValue={modal.item?.title}
                    />
                  </label>
                  <label>
                    Описание
                    <textarea
                      name="description"
                      maxLength={10000}
                      rows={4}
                      placeholder="Подробности, требования и ожидаемый результат"
                      defaultValue={modal.item?.description}
                    />
                  </label>
                  <label>
                    Объект
                    <select
                      aria-label="Объект"
                      name="project_id"
                      required
                      defaultValue={modal.item?.project_id || projectId || ''}
                    >
                      <option value="" disabled>
                        Выберите объект
                      </option>
                      {data.projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Исполнитель
                    <select
                      aria-label="Исполнитель"
                      name="assignee_id"
                      required
                      defaultValue={modal.item?.assignee_id || ''}
                    >
                      <option value="" disabled>
                        Назначьте исполнителя
                      </option>
                      {data.profiles
                        .filter((p) => p.role === 'worker')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {!data.projects.length && <p className="muted">Сначала создайте объект.</p>}
                  {!data.profiles.some((p) => p.role === 'worker') && (
                    <p className="muted">Администратору нужно добавить исполнителей в базу.</p>
                  )}
                </>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  disabled={busy}
                  className="secondary"
                  onClick={() => setModal(null)}
                >
                  Отмена
                </button>
                <button className="primary" disabled={busy}>
                  {busy
                    ? 'Сохраняем…'
                    : modal.item
                      ? 'Сохранить изменения'
                      : modal.kind === 'project'
                        ? 'Создать объект'
                        : 'Создать задачу'}
                </button>
              </div>
            </form>
          )}
          {modal.kind === 'detail' && task && (
            <div className="task-detail">
              <div className="detail-title">
                <Badge status={task.status} />
                <h2>{task.title}</h2>
              </div>
              <div className="detail-meta">
                <div>
                  <span>Объект</span>
                  <strong>{data.projects.find((p) => p.id === task.project_id)?.name}</strong>
                </div>
                <div>
                  <span>Исполнитель</span>
                  <strong>
                    <Avatar name={profile(task.assignee_id)} small />
                    {profile(task.assignee_id)}
                  </strong>
                </div>
                <div>
                  <span>Постановщик</span>
                  <strong>{profile(task.author_id)}</strong>
                </div>
                <div>
                  <span>Дата создания</span>
                  <strong>{date(task.created_at, true)}</strong>
                </div>
              </div>
              <div className="detail-description">
                <h3>Описание</h3>
                <p>{task.description || 'Описание не добавлено.'}</p>
              </div>
              {transitions(user.role, task, user.id).length > 0 && (
                <div className="status-actions">
                  <label>
                    Комментарий{manager ? ' (обязателен для доработки)' : ' (необязательно)'}
                    <textarea
                      maxLength={4000}
                      rows={3}
                      placeholder={
                        manager
                          ? 'Добавьте замечания или комментарий к приёмке'
                          : 'Расскажите о результате работы'
                      }
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </label>
                  <div>
                    {transitions(user.role, task, user.id).map((s) => (
                      <button
                        key={s}
                        className={s === 'rework' ? 'secondary' : 'primary'}
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            () => repo!.transition(task, s, comment),
                            'Статус задачи обновлён',
                            false,
                          ).then((success) => {
                            if (success) setComment('');
                          })
                        }
                      >
                        {s === 'rework' ? (
                          <ArrowDownLeft size={16} />
                        ) : s === 'accepted' ? (
                          <Check size={16} />
                        ) : (
                          <ArrowRight size={16} />
                        )}{' '}
                        {actionLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <section className="history">
                <h3>
                  История изменений{' '}
                  <span>{data.history.filter((h) => h.task_id === task.id).length}</span>
                </h3>
                {data.history
                  .filter((h) => h.task_id === task.id)
                  .sort(
                    (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
                  )
                  .map((h) => (
                    <div className="history-item" key={h.id}>
                      <span className={`history-dot ${h.to_status === 'accepted' ? 'green' : ''}`}>
                        {h.to_status === 'accepted' ? <Check size={12} /> : <Clock3 size={12} />}
                      </span>
                      <div>
                        <div className="history-person">
                          <strong>{profile(h.actor_id)}</strong>
                          <time>{date(h.created_at, true)}</time>
                        </div>
                        <p>
                          {h.from_status ? (
                            <>
                              {labels[h.from_status]}
                              <ArrowRight size={12} />
                              <strong>{labels[h.to_status]}</strong>
                            </>
                          ) : (
                            <>
                              Создал задачу <strong>«Новая»</strong>
                            </>
                          )}
                        </p>
                        {h.comment && <blockquote>{h.comment}</blockquote>}
                      </div>
                    </div>
                  ))}
              </section>
              {manager && (
                <div className="detail-admin">
                  <button className="secondary" onClick={() => open({ kind: 'task', item: task })}>
                    <Pencil size={15} />
                    Редактировать
                  </button>
                  <button
                    className="danger-link"
                    onClick={() =>
                      open({ kind: 'delete', type: 'tasks', id: task.id, name: task.title })
                    }
                  >
                    <Trash2 size={15} />
                    Удалить задачу
                  </button>
                </div>
              )}
            </div>
          )}
          {modal.kind === 'delete' && (
            <div className="entity-form">
              <p className="delete-copy">
                Удалить «{modal.name}»?{' '}
                {modal.type === 'projects'
                  ? 'Будут удалены все задачи объекта и их история.'
                  : 'История задачи тоже будет удалена.'}{' '}
                Это действие нельзя отменить.
              </p>
              <div className="form-actions">
                <button disabled={busy} className="secondary" onClick={() => setModal(null)}>
                  Отмена
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    const m = modal;
                    void mutate(async () => {
                      await repo!.remove(m.type, m.id);
                      if (m.type === 'projects' && m.id === projectId) setProjectId(null);
                    }, 'Удалено');
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
          {modal.kind === 'help' && (
            <div className="help-content">
              <span className="help-big">
                <FolderKanban size={30} />
              </span>
              <h3>От задачи до результата</h3>
              <p>
                Постановщик создаёт объекты и задачи, назначает исполнителей и проверяет результат.
                Исполнитель берёт свою задачу в работу и отправляет на проверку.
              </p>
              <div className="workflow">
                <Badge status="new" />
                <ArrowRight size={14} />
                <Badge status="in_progress" />
                <ArrowRight size={14} />
                <Badge status="review" />
                <ArrowRight size={14} />
                <Badge status="accepted" />
              </div>
              <p>
                Если нужна доработка, постановщик оставляет обязательный комментарий. Исполнитель
                исправляет результат и снова отправляет его на проверку. Все смены статуса
                сохраняются в истории.
              </p>
              <div className="security-note">
                <ShieldCheck size={22} />
                <p>
                  {demo
                    ? 'Вы в демонстрационном режиме. Данные хранятся локально и не защищены базой. Для реальной работы выйдите и войдите по email через Supabase.'
                    : 'Права проверяются в базе данных. Исполнитель видит только свои задачи, не может назначать их другим, принимать результат или изменять историю.'}
                </p>
              </div>
              {demo && (
                <details>
                  <summary>Демонстрационные аккаунты</summary>
                  {demoAccounts.map((a) => (
                    <p className="account-line" key={a.id}>
                      {a.email} · {a.password}
                    </p>
                  ))}
                  <small>
                    Демо открывается кнопками на экране входа; эти аккаунты не созданы в Supabase
                    автоматически.
                  </small>
                </details>
              )}
              <button className="primary full" onClick={() => setModal(null)}>
                Понятно, к работе
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </ModalFrame>
      )}
    </div>
  );
}
function Brand() {
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
function Stat({
  label,
  value,
  icon,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  note: string;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div>
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="stat-value">{value.toString().padStart(2, '0')}</strong>
      <span className="stat-note">{note}</span>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <FolderKanban size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
