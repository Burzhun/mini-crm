export const statuses = ['new', 'in_progress', 'review', 'rework', 'accepted'] as const;
export type Status = (typeof statuses)[number];
export type Role = 'manager' | 'worker';
export interface Profile {
  id: string;
  name: string;
  role: Role;
}
export interface Project {
  id: string;
  name: string;
  address: string;
  created_at: string;
}
export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string;
  assignee_id: string;
  author_id: string;
  status: Status;
  created_at: string;
}
export interface History {
  id: string;
  task_id: string;
  actor_id: string;
  from_status: Status | null;
  to_status: Status;
  comment: string | null;
  created_at: string;
}
export interface Snapshot {
  projects: Project[];
  tasks: Task[];
  profiles: Profile[];
  history: History[];
}
export const labels: Record<Status, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  rework: 'На доработке',
  accepted: 'Принята',
};
export const actionLabels: Partial<Record<Status, string>> = {
  in_progress: 'Взять в работу',
  review: 'Отправить на проверку',
  accepted: 'Принять задачу',
  rework: 'Вернуть на доработку',
};
export function transitions(role: Role, task: Task, userId: string): Status[] {
  if (role === 'manager') return task.status === 'review' ? ['accepted', 'rework'] : [];
  if (task.assignee_id !== userId) return [];
  if (task.status === 'new' || task.status === 'rework') return ['in_progress'];
  return task.status === 'in_progress' ? ['review'] : [];
}
export function assertTransition(profile: Profile, task: Task, target: Status, comment: string) {
  if (!transitions(profile.role, task, profile.id).includes(target))
    throw new Error('Этот переход статуса недоступен. Обновите задачу.');
  if (target === 'rework' && !comment.trim()) throw new Error('Укажите, что нужно доработать.');
}
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
export const date = (value: string, time = false) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }),
  }).format(new Date(value));
