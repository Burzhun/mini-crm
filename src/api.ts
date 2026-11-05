import { createClient } from '@supabase/supabase-js';
import {
  assertTransition,
  type Profile,
  type Project,
  type Task,
  type Status,
  type Snapshot,
} from './domain';
import { demoData } from './demo';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const demoAccounts = [
  { email: 'manager@demo.local', password: 'Manager123!', id: 'manager' },
  { email: 'mikhail@demo.local', password: 'Worker123!', id: 'worker-1' },
  { email: 'anna@demo.local', password: 'Worker123!', id: 'worker-2' },
];
let demoState: Snapshot;
try {
  demoState = JSON.parse(localStorage.getItem('kontur-data') || 'null') || demoData();
} catch {
  demoState = demoData();
}
const persist = () => localStorage.setItem('kontur-data', JSON.stringify(demoState));
function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export class Repository {
  constructor(
    public demo: boolean,
    public user: Profile,
  ) {}
  async load(): Promise<Snapshot> {
    if (this.demo) {
      const tasks = demoState.tasks.filter(
        (t) => this.user.role === 'manager' || t.assignee_id === this.user.id,
      );
      return structuredClone({
        profiles: demoState.profiles,
        tasks,
        projects: demoState.projects.filter(
          (p) => this.user.role === 'manager' || tasks.some((t) => t.project_id === p.id),
        ),
        history: demoState.history.filter(
          (h) => this.user.role === 'manager' || tasks.some((t) => t.id === h.task_id),
        ),
      });
    }
    const results = await Promise.all([
      supabase!.from('projects').select('*').order('created_at', { ascending: false }),
      supabase!.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase!.from('profiles').select('*'),
      supabase!.from('task_history').select('*').order('created_at'),
    ]);
    return {
      projects: unwrap(results[0]),
      tasks: unwrap(results[1]),
      profiles: unwrap(results[2]),
      history: unwrap(results[3]),
    } as Snapshot;
  }
  private manager() {
    if (this.user.role !== 'manager') throw new Error('Действие доступно только постановщику.');
  }
  async project(values: Pick<Project, 'name' | 'address'>, id?: string) {
    this.manager();
    if (!this.demo) {
      unwrap(
        await (id
          ? supabase!.from('projects').update(values).eq('id', id)
          : supabase!.from('projects').insert(values)),
      );
      return;
    }
    if (id) {
      Object.assign(
        demoState.projects.find((p) => p.id === id)!,
        values,
      );
    } else
      demoState.projects.unshift({
        ...values,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
    persist();
  }
  async task(
    values: Pick<Task, 'title' | 'description' | 'project_id' | 'assignee_id'>,
    id?: string,
  ) {
    this.manager();
    if (!this.demo) {
      unwrap(
        await (id
          ? supabase!.from('tasks').update(values).eq('id', id)
          : supabase!.from('tasks').insert({ ...values, author_id: this.user.id })),
      );
      return;
    }
    if (id) {
      Object.assign(
        demoState.tasks.find((t) => t.id === id)!,
        values,
      );
    } else {
      const task: Task = {
        ...values,
        id: crypto.randomUUID(),
        status: 'new',
        author_id: this.user.id,
        created_at: new Date().toISOString(),
      };
      demoState.tasks.unshift(task);
      demoState.history.push({
        id: crypto.randomUUID(),
        task_id: task.id,
        actor_id: this.user.id,
        from_status: null,
        to_status: 'new',
        comment: null,
        created_at: task.created_at,
      });
    }
    persist();
  }
  async remove(type: 'projects' | 'tasks', id: string) {
    this.manager();
    if (!this.demo) {
      unwrap(await supabase!.from(type).delete().eq('id', id));
      return;
    }
    const ids = demoState.tasks
      .filter((t) => (type === 'tasks' ? t.id === id : t.project_id === id))
      .map((t) => t.id);
    demoState.tasks = demoState.tasks.filter((t) => !ids.includes(t.id));
    if (type === 'projects') demoState.projects = demoState.projects.filter((p) => p.id !== id);
    persist();
  }
  async transition(task: Task, target: Status, comment: string) {
    if (!this.demo) {
      unwrap(
        await supabase!.rpc('change_task_status', {
          p_task_id: task.id,
          p_expected_status: task.status,
          p_target: target,
          p_comment: comment.trim() || null,
        }),
      );
      return;
    }
    const current = demoState.tasks.find((t) => t.id === task.id)!;
    if (current.status !== task.status) throw new Error('Задача уже изменена. Обновите страницу.');
    assertTransition(this.user, current, target, comment);
    demoState.history.push({
      id: crypto.randomUUID(),
      task_id: task.id,
      actor_id: this.user.id,
      from_status: current.status,
      to_status: target,
      comment: comment.trim() || null,
      created_at: new Date().toISOString(),
    });
    current.status = target;
    persist();
  }
}
