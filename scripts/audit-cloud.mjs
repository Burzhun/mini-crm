// Uses real Auth/REST APIs. --probe creates isolated test records and deletes
// only those records afterwards. It never edits existing customer tasks.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { validateAdminKey } from './seed-config.mjs';

const env = process.env;
const url = env.SUPABASE_URL;
const publicKey = env.VITE_SUPABASE_ANON_KEY;
if (!url || !publicKey) throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
  global: {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  },
};
const anonymous = createClient(url, publicKey, options);
const checks = [];
const clients = [];
const projectIds = [];
const taskIds = [];
let admin, manager;
const result = (response) => {
  if (response.error) throw new Error(`${response.error.code || 'API'}: ${response.error.message}`);
  return response.data;
};
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}
function denied(response) {
  assert.ok(response.error, 'Expected API permission error');
  assert.equal(response.error.code, '42501');
}
const change = (client, taskId, from, to, comment = null) =>
  client.rpc('change_task_status', {
    p_task_id: taskId,
    p_expected_status: from,
    p_target: to,
    p_comment: comment,
  });
async function task(client, projectId, assigneeId, authorId, title) {
  const row = result(
    await client
      .from('tasks')
      .insert({ title, project_id: projectId, assignee_id: assigneeId, author_id: authorId })
      .select()
      .single(),
  );
  taskIds.push(row.id);
  return row;
}

try {
  await check('Cloud Auth disables open signup', async () => {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publicKey } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).disable_signup, true);
  });
  await check('Anonymous cannot read CRM tables', async () => {
    for (const table of ['profiles', 'projects', 'tasks', 'task_history'])
      denied(await anonymous.from(table).select('*').limit(1));
  });
  if (!process.argv.includes('--probe')) {
    console.log(
      'Read-only checks complete. Use --probe for isolated authenticated CRUD/RPC checks.',
    );
  } else {
    admin = createClient(url, validateAdminKey(env.SUPABASE_SERVICE_ROLE_KEY), options);
    await check('Direct public signup endpoint rejects registration', async () => {
      const response = await anonymous.auth.signUp({
        email: `security-audit-${randomUUID()}@kontur.test`,
        password: `Audit-${randomUUID()}-A1!`,
      });
      try {
        assert.equal(response.error?.code, 'signup_disabled');
      } finally {
        if (response.data.user?.id)
          result(await admin.auth.admin.deleteUser(response.data.user.id));
        if (response.data.session) await anonymous.auth.signOut();
      }
    });
    const accounts = [
      ['manager@kontur.test', env.SEED_MANAGER_PASSWORD],
      ['mikhail@kontur.test', env.SEED_WORKER_1_PASSWORD],
      ['anna@kontur.test', env.SEED_WORKER_2_PASSWORD],
    ];
    const users = [];
    for (const [email, password] of accounts) {
      if (!password) throw new Error('Seed account passwords are required for --probe');
      const client = createClient(url, publicKey, options);
      clients.push(client);
      users.push(result(await client.auth.signInWithPassword({ email, password })).user);
    }
    const [worker1, worker2] = clients.slice(1);
    manager = clients[0];
    const [managerUser, user1, user2] = users;
    const marker = `Security audit ${randomUUID()}`;
    for (let i = 0; i < 2; i++) {
      const project = result(
        await manager
          .from('projects')
          .insert({ name: `${marker} ${i}`, address: 'Isolated temporary security test' })
          .select()
          .single(),
      );
      projectIds.push(project.id);
    }
    const own = await task(manager, projectIds[0], user1.id, managerUser.id, marker);
    const foreign = await task(manager, projectIds[1], user2.id, managerUser.id, marker);
    const review = await task(manager, projectIds[0], user1.id, managerUser.id, marker);
    result(await change(worker1, review.id, 'new', 'in_progress'));
    result(await change(worker1, review.id, 'in_progress', 'review'));

    await check('Workers can read only their own tasks, projects and histories', async () => {
      for (const [client, user] of [
        [worker1, user1],
        [worker2, user2],
      ]) {
        const tasks = result(await client.from('tasks').select('id,assignee_id').in('id', taskIds));
        assert.ok(tasks.length > 0);
        assert.ok(tasks.every((task) => task.assignee_id === user.id));
      }
      assert.deepEqual(result(await worker1.from('tasks').select('*').eq('id', foreign.id)), []);
      assert.deepEqual(
        result(await worker1.from('projects').select('*').eq('id', projectIds[1])),
        [],
      );
      assert.deepEqual(
        result(await worker1.from('task_history').select('*').eq('task_id', foreign.id)),
        [],
      );
    });
    await check('Workers cannot edit, reassign or delete another task', async () => {
      assert.deepEqual(
        result(
          await worker1
            .from('tasks')
            .update({ title: marker, assignee_id: user2.id })
            .eq('id', foreign.id)
            .select(),
        ),
        [],
      );
      assert.deepEqual(
        result(await worker1.from('tasks').delete().eq('id', foreign.id).select()),
        [],
      );
      assert.equal(result(await admin.from('tasks').select('id').eq('id', foreign.id)).length, 1);
      assert.deepEqual(
        result(await worker1.from('tasks').update({ title: marker }).eq('id', own.id).select()),
        [],
      );
    });
    await check('Workers cannot promote their role, create tasks or modify projects', async () => {
      denied(await worker1.from('profiles').update({ role: 'worker' }).eq('id', user1.id));
      denied(
        await worker1.from('tasks').insert({
          title: marker,
          project_id: projectIds[0],
          assignee_id: user1.id,
          author_id: user1.id,
        }),
      );
      assert.deepEqual(
        result(
          await worker1.from('projects').update({ name: marker }).eq('id', projectIds[0]).select(),
        ),
        [],
      );
      assert.deepEqual(
        result(await worker1.from('projects').delete().eq('id', projectIds[0]).select()),
        [],
      );
    });
    await check('Direct status, author and timestamp writes are forbidden', async () => {
      for (const client of [manager, worker1]) {
        denied(await client.from('tasks').update({ status: 'accepted' }).eq('id', own.id));
        denied(
          await client
            .from('tasks')
            .update({ author_id: managerUser.id, created_at: own.created_at })
            .eq('id', own.id),
        );
      }
    });
    await check('RPC rejects forbidden roles and status transitions', async () => {
      denied(await change(anonymous, own.id, 'new', 'in_progress'));
      denied(await change(worker2, own.id, 'new', 'in_progress'));
      denied(await change(worker1, own.id, 'new', 'accepted'));
      denied(await change(worker1, own.id, 'new', 'review'));
      denied(await change(manager, own.id, 'new', 'in_progress'));
      denied(await change(worker1, review.id, 'review', 'accepted'));
      assert.equal(
        result(await admin.from('tasks').select('status').eq('id', own.id).single()).status,
        'new',
      );
    });
    await check('History cannot be forged, updated or deleted through client API', async () => {
      for (const client of [manager, worker1]) {
        denied(
          await client.from('task_history').insert({
            task_id: own.id,
            actor_id: user1.id,
            from_status: 'new',
            to_status: 'accepted',
            created_at: '2000-01-01T00:00:00Z',
          }),
        );
        denied(
          await client.from('task_history').update({ comment: 'FORGED' }).eq('task_id', own.id),
        );
        denied(await client.from('task_history').delete().eq('task_id', own.id));
      }
      assert.equal(
        result(await admin.from('task_history').select('id').eq('task_id', own.id)).length,
        1,
      );
    });
    await check(
      'Rework requires a non-whitespace comment and rejection leaves no event',
      async () => {
        const before = result(
          await admin.from('task_history').select('id').eq('task_id', review.id),
        ).length;
        for (const comment of [null, '', ' \n\t ']) {
          const response = await change(manager, review.id, 'review', 'rework', comment);
          assert.equal(response.error?.code, '23514');
        }
        assert.equal(
          result(await admin.from('tasks').select('status').eq('id', review.id).single()).status,
          'review',
        );
        assert.equal(
          result(await admin.from('task_history').select('id').eq('task_id', review.id)).length,
          before,
        );
      },
    );
    await check(
      'Allowed workflow records authentic history and rejects stale requests',
      async () => {
        result(await change(worker1, own.id, 'new', 'in_progress'));
        const stale = await change(worker1, own.id, 'new', 'in_progress');
        assert.equal(stale.error?.code, 'PT409');
        assert.equal(stale.status, 409);
        result(await change(worker1, own.id, 'in_progress', 'review'));
        result(await change(manager, own.id, 'review', 'rework', ' Audit rework '));
        result(await change(worker1, own.id, 'rework', 'in_progress'));
        result(await change(worker1, own.id, 'in_progress', 'review'));
        result(await change(manager, own.id, 'review', 'accepted'));
        const history = result(
          await manager.from('task_history').select('*').eq('task_id', own.id).order('created_at'),
        );
        assert.deepEqual(
          history.map((event) => event.to_status),
          ['new', 'in_progress', 'review', 'rework', 'in_progress', 'review', 'accepted'],
        );
        assert.deepEqual(
          history.map((event) => event.actor_id),
          [managerUser.id, user1.id, user1.id, managerUser.id, user1.id, user1.id, managerUser.id],
        );
        assert.equal(history[3].comment, 'Audit rework');
        denied(await change(worker1, own.id, 'accepted', 'in_progress'));
      },
    );
    await check('Deleting a task retains history and clients still cannot delete it', async () => {
      const before = result(
        await admin.from('task_history').select('id').eq('task_id', foreign.id),
      ).length;
      assert.ok(before > 0);
      result(await manager.from('tasks').delete().eq('id', foreign.id));
      assert.equal(result(await admin.from('tasks').select('id').eq('id', foreign.id)).length, 0);
      assert.equal(
        result(await admin.from('task_history').select('id').eq('task_id', foreign.id)).length,
        before,
      );
      denied(await manager.from('task_history').delete().eq('task_id', foreign.id));
    });
  }
} catch (error) {
  checks.push({ name: 'Audit setup', passed: false, error: error.message });
  process.exitCode = 1;
  console.log(`FAIL Audit setup: ${error.message}`);
} finally {
  if (manager && projectIds.length) {
    await check(
      'Deleting temporary projects removes tasks and retains their histories',
      async () => {
        const historyCount = result(
          await admin.from('task_history').select('id').in('task_id', taskIds),
        ).length;
        for (const id of projectIds) result(await manager.from('projects').delete().eq('id', id));
        assert.equal(
          result(await admin.from('projects').select('id').in('id', projectIds)).length,
          0,
        );
        assert.equal(result(await admin.from('tasks').select('id').in('id', taskIds)).length, 0);
        assert.equal(
          result(await admin.from('task_history').select('id').in('task_id', taskIds)).length,
          historyCount,
        );
      },
    );
  }
  // Security test events remain in the audit trail when history retention is enabled.
  for (const client of clients) await client.auth.signOut();
  await mkdir('.local', { recursive: true });
  await writeFile(
    '.local/security-cloud.json',
    JSON.stringify({ checked_at: new Date().toISOString(), checks }, null, 2),
  );
  console.log(
    `${checks.filter((check) => check.passed).length}/${checks.length} cloud checks passed.`,
  );
}
