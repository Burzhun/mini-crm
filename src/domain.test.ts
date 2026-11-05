import { describe, it, expect } from 'vitest';
import { statuses, transitions, assertTransition, type Task, type Profile } from './domain';
const manager: Profile = { id: 'm', name: 'Manager', role: 'manager' },
  worker: Profile = { id: 'w', name: 'Worker', role: 'worker' };
const task: Task = {
  id: 't',
  title: 'Test',
  description: '',
  project_id: 'p',
  assignee_id: 'w',
  author_id: 'm',
  created_at: '2026-01-01',
  status: 'new',
};
describe('UI action matrix', () => {
  it('shows only the six allowed edges', () => {
    const expected = {
      new: ['in_progress'],
      in_progress: ['review'],
      review: [],
      rework: ['in_progress'],
      accepted: [],
    };
    for (const status of statuses) {
      expect(transitions('worker', { ...task, status }, 'w')).toEqual(expected[status]);
      expect(transitions('worker', { ...task, status }, 'other')).toEqual([]);
      expect(transitions('manager', { ...task, status }, 'm')).toEqual(
        status === 'review' ? ['accepted', 'rework'] : [],
      );
    }
  });
  it('requires a non-whitespace rework comment', () => {
    expect(() =>
      assertTransition(manager, { ...task, status: 'review' }, 'rework', ' \n '),
    ).toThrow();
    expect(() =>
      assertTransition(manager, { ...task, status: 'review' }, 'rework', 'Fix'),
    ).not.toThrow();
  });
  it('rejects a worker accepting their own task', () => {
    expect(() => assertTransition(worker, { ...task, status: 'review' }, 'accepted', '')).toThrow();
  });
});
