import type { Project, Task, Status } from '../domain';

export type View = 'projects' | 'tasks' | 'review';
export type StatusFilter = Status | 'all';
export type Layout = 'grid' | 'list';
export type DeleteTarget = { kind: 'delete'; type: 'projects' | 'tasks'; id: string; name: string };
export type WorkspaceModal =
  | { kind: 'project'; item?: Project }
  | { kind: 'task'; item?: Task }
  | { kind: 'detail'; id: string }
  | DeleteTarget
  | { kind: 'help' };
export type ProjectValues = Pick<Project, 'name' | 'address'>;
export type TaskValues = Pick<Task, 'title' | 'description' | 'project_id' | 'assignee_id'>;
