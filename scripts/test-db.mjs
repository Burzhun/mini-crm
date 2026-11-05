import pg from 'pg';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set TEST_DATABASE_URL to an administrative connection on a disposable PostgreSQL cluster. A temporary database and missing test roles will be created.',
  );
const admin = new pg.Client({ connectionString: url });
await admin.connect();
const dbName = `crm_test_${randomUUID().replaceAll('-', '')}`;
const target = new URL(url);
target.pathname = `/${dbName}`;
let db;
let checks = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const manager = uid(1),
  worker = uid(2),
  other = uid(3),
  secondManager = uid(4),
  p1 = uid(10),
  p2 = uid(11),
  p3 = uid(12);
async function asUser(id, sql, params = [], role = 'authenticated') {
  await db.query('begin');
  try {
    await db.query(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id || '']);
    return await db.query(sql, params);
  } finally {
    await db.query('rollback');
  }
}
async function ok(name, fn) {
  await fn();
  checks++;
  console.log(`PASS ${name}`);
}
try {
  await admin.query(`create database ${dbName}`);
  db = new pg.Client({ connectionString: target.toString() });
  await db.connect();
  await db.query(`do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.query(await readFile(new URL(name, migrations), 'utf8'));
  }
  await db.query('insert into auth.users(id) values ($1),($2),($3),($4)', [
    manager,
    worker,
    other,
    secondManager,
  ]);
  await db.query(
    "insert into profiles values($1,'Manager','manager'),($2,'Worker 1','worker'),($3,'Worker 2','worker'),($4,'Manager 2','manager')",
    [manager, worker, other, secondManager],
  );
  await db.query(
    "insert into projects(id,name,address) values($1,'A','Address A'),($2,'B','Address B'),($3,'Empty','Address C')",
    [p1, p2, p3],
  );
  const states = ['new', 'in_progress', 'review', 'rework', 'accepted'];
  // Trusted fixture setup; API roles cannot disable triggers.
  await db.query('alter table tasks disable trigger user');
  for (let i = 0; i < states.length; i++)
    await db.query(
      'insert into tasks(id,title,project_id,assignee_id,author_id,status) values($1,$2,$3,$4,$5,$6)',
      [uid(100 + i), states[i], p1, worker, manager, states[i]],
    );
  await db.query(
    "insert into tasks(id,title,project_id,assignee_id,author_id) values($1,'Other task',$2,$3,$4)",
    [uid(200), p2, other, secondManager],
  );
  await db.query('alter table tasks enable trigger user');
  await db.query(
    "insert into task_history(task_id,actor_id,to_status) values($1,$2,'new'),($3,$4,'new')",
    [uid(100), manager, uid(200), secondManager],
  );
  await ok('RLS is enabled on every CRM table', async () => {
    const tables = await db.query(
      "select relname, relrowsecurity from pg_class where oid in ('public.profiles'::regclass,'public.projects'::regclass,'public.tasks'::regclass,'public.task_history'::regclass)",
    );
    assert.equal(tables.rowCount, 4);
    assert.ok(tables.rows.every((table) => table.relrowsecurity));
  });
  await ok(
    'authenticated requests without a user cannot read records or call status RPC',
    async () => {
      for (const table of ['profiles', 'projects', 'tasks', 'task_history']) {
        assert.equal((await asUser(null, `select * from ${table}`)).rowCount, 0);
      }
      await assert.rejects(
        asUser(null, "select change_task_status($1,'new','in_progress',null)", [uid(100)]),
        /Authentication required/,
      );
    },
  );
  await ok(
    'client roles cannot call trigger functions or supply a status when creating tasks',
    async () => {
      for (const name of ['private.guard_task()', 'private.record_task_status()']) {
        const permission = await db.query('select has_function_privilege($1,$2,$3) as allowed', [
          'authenticated',
          name,
          'EXECUTE',
        ]);
        assert.equal(permission.rows[0].allowed, false);
      }
      await assert.rejects(
        asUser(
          manager,
          "insert into tasks(title,project_id,assignee_id,author_id,status) values('Spoofed',$1,$2,$3,'accepted')",
          [p1, worker, manager],
        ),
        /permission denied/,
      );
    },
  );
  await ok('anonymous reads and RPC denied', async () => {
    for (const table of ['profiles', 'projects', 'tasks', 'task_history'])
      await assert.rejects(asUser(null, `select * from ${table}`, [], 'anon'), /permission denied/);
    await assert.rejects(
      asUser(null, "select change_task_status($1,'new','in_progress',null)", [uid(100)], 'anon'),
      /permission denied/,
    );
  });
  await ok('worker sees only own tasks, objects, history and relevant people', async () => {
    assert.equal((await asUser(worker, 'select * from tasks')).rowCount, 5);
    assert.deepEqual(
      (await asUser(worker, 'select id from projects')).rows.map((x) => x.id),
      [p1],
    );
    assert.equal((await asUser(worker, 'select * from task_history')).rowCount, 1);
    assert.equal((await asUser(worker, 'select * from profiles')).rowCount, 2);
    assert.equal((await asUser(other, 'select * from tasks')).rowCount, 1);
  });
  await ok('multiple managers can see all data', async () => {
    for (const id of [manager, secondManager])
      assert.equal((await asUser(id, 'select * from tasks')).rowCount, 6);
  });
  await ok('workers cannot edit details, reassign or delete', async () => {
    for (const id of [uid(100), uid(200)]) {
      assert.equal(
        (
          await asUser(
            worker,
            "update tasks set title='Hacked',assignee_id=$2 where id=$1 returning *",
            [id, other],
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (await asUser(worker, 'delete from tasks where id=$1 returning *', [id])).rowCount,
        0,
      );
    }
    assert.equal(
      (await asUser(worker, "update projects set name='Hacked' returning *")).rowCount,
      0,
    );
    assert.equal((await asUser(worker, 'delete from projects returning *')).rowCount, 0);
  });
  await ok('workers cannot create objects or tasks', async () => {
    await assert.rejects(
      asUser(worker, "insert into projects(name,address) values('Bad','Bad')"),
      /row-level security/,
    );
    await assert.rejects(
      asUser(
        worker,
        "insert into tasks(title,project_id,assignee_id,author_id) values('Bad',$1,$2,$2)",
        [p1, worker],
      ),
      /Only a manager|row-level security/,
    );
  });
  await ok('roles and task identity are immutable through API', async () => {
    await assert.rejects(
      asUser(worker, "update profiles set role='manager' where id=$1", [worker]),
      /permission denied/,
    );
    for (const field of ["author_id='" + worker + "'", 'created_at=now()', "id='" + uid(888) + "'"])
      await assert.rejects(
        asUser(manager, `update tasks set ${field} where id=$1`, [uid(100)]),
        /permission denied/,
      );
  });
  await ok('all direct status writes denied, including managers', async () => {
    for (const id of [manager, worker])
      await assert.rejects(
        asUser(id, "update tasks set status='accepted' where id=$1", [uid(100)]),
        /permission denied/,
      );
  });
  await ok('history cannot be inserted, updated or deleted by either role', async () => {
    for (const id of [manager, worker])
      for (const sql of [
        "insert into task_history(task_id,actor_id,to_status) values($1,'" +
          manager +
          "','accepted')",
        "update task_history set comment='Forged' where task_id=$1",
        'delete from task_history where task_id=$1',
      ])
        await assert.rejects(asUser(id, sql, [uid(100)]), /permission denied/);
  });
  await ok('full status matrix: 75 actor/edge combinations', async () => {
    for (const [i, from] of states.entries())
      for (const to of states)
        for (const id of [manager, worker, other]) {
          const allowed =
            id === manager
              ? from === 'review' && ['accepted', 'rework'].includes(to)
              : id === worker &&
                ((['new', 'rework'].includes(from) && to === 'in_progress') ||
                  (from === 'in_progress' && to === 'review'));
          const call = () =>
            asUser(id, 'select * from change_task_status($1,$2,$3,$4)', [
              uid(100 + i),
              from,
              to,
              'Fix it',
            ]);
          if (allowed) {
            assert.equal((await call()).rows[0].status, to);
          } else await assert.rejects(call());
        }
  });
  await ok('rework requires meaningful comment and rejects oversized comment', async () => {
    for (const comment of [null, '', '   ', ' \n\t\r ', 'x'.repeat(4001)])
      await assert.rejects(
        asUser(manager, "select change_task_status($1,'review','rework',$2)", [uid(102), comment]),
        /comment|Comment/,
      );
  });
  await ok('stale updates fail instead of overwriting current state', async () => {
    await assert.rejects(
      asUser(worker, "select change_task_status($1,'review','in_progress',null)", [uid(100)]),
      (error) => error.code === 'PT409' && /Refresh and retry/.test(error.message),
    );
  });
  await ok('new tasks always get authentic initial history', async () => {
    await db.query('begin');
    try {
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [manager]);
      const row = (
        await db.query(
          "insert into tasks(title,project_id,assignee_id,author_id) values('New',$1,$2,$3) returning *",
          [p1, worker, manager],
        )
      ).rows[0];
      const h = (await db.query('select * from task_history where task_id=$1', [row.id])).rows[0];
      assert.equal(row.status, 'new');
      assert.equal(h.actor_id, manager);
      assert.equal(h.from_status, null);
      assert.equal(h.to_status, 'new');
    } finally {
      await db.query('rollback');
    }
  });
  await ok(
    'history and status commit atomically with actual actor and trimmed comment',
    async () => {
      await db.query('begin');
      try {
        await db.query('set local role authenticated');
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [worker]);
        await db.query("select change_task_status($1,'new','in_progress',' Working ')", [uid(100)]);
        const h = (
          await db.query(
            'select * from task_history where task_id=$1 order by created_at desc limit 1',
            [uid(100)],
          )
        ).rows[0];
        assert.equal(h.actor_id, worker);
        assert.equal(h.from_status, 'new');
        assert.equal(h.to_status, 'in_progress');
        assert.equal(h.comment, 'Working');
        await assert.rejects(
          db.query("select change_task_status($1,'in_progress','accepted',null)", [uid(100)]),
        );
      } finally {
        await db.query('rollback');
      }
      assert.equal(
        (await db.query('select status from tasks where id=$1', [uid(100)])).rows[0].status,
        'new',
      );
      assert.equal(
        (await db.query('select count(*)::int n from task_history where task_id=$1', [uid(100)]))
          .rows[0].n,
        1,
      );
    },
  );
  await ok('manager cannot spoof author or assign a manager', async () => {
    await assert.rejects(
      asUser(
        manager,
        "insert into tasks(title,project_id,assignee_id,author_id) values('Bad',$1,$2,$3)",
        [p1, worker, secondManager],
      ),
      /author/,
    );
    await assert.rejects(
      asUser(manager, 'update tasks set assignee_id=$1 where id=$2', [manager, uid(100)]),
      /worker/,
    );
  });
  await ok(
    'deleting a task retains history and client API cannot erase orphan events',
    async () => {
      await db.query('begin');
      try {
        await db.query('set local role authenticated');
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [manager]);
        await db.query('delete from tasks where id=$1', [uid(100)]);
        assert.equal((await db.query('select * from tasks where id=$1', [uid(100)])).rowCount, 0);
        assert.equal(
          (await db.query('select * from task_history where task_id=$1', [uid(100)])).rowCount,
          1,
        );
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [worker]);
        assert.equal(
          (await db.query('select * from task_history where task_id=$1', [uid(100)])).rowCount,
          0,
        );
        await assert.rejects(
          db.query('delete from task_history where task_id=$1', [uid(100)]),
          /permission denied/,
        );
      } finally {
        await db.query('rollback');
      }
    },
  );
  await ok('manager can edit and delete objects while task history is retained', async () => {
    await db.query('begin');
    try {
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [secondManager]);
      assert.equal(
        (await db.query("update tasks set title='Edited' where id=$1 returning *", [uid(100)]))
          .rowCount,
        1,
      );
      await db.query('delete from projects where id=$1', [p1]);
      assert.equal((await db.query('select * from tasks where project_id=$1', [p1])).rowCount, 0);
      assert.equal(
        (await db.query('select * from task_history where task_id=$1', [uid(100)])).rowCount,
        1,
      );
    } finally {
      await db.query('rollback');
    }
  });
  await ok('concurrent status requests serialize and reject a stale second writer', async () => {
    const a = new pg.Client({ connectionString: target.toString() }),
      b = new pg.Client({ connectionString: target.toString() });
    await a.connect();
    await b.connect();
    try {
      for (const c of [a, b]) {
        await c.query('begin');
        await c.query('set local role authenticated');
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [worker]);
      }
      await a.query("select * from change_task_status($1,'in_progress','review',null)", [uid(101)]);
      const pending = b.query("select * from change_task_status($1,'in_progress','review',null)", [
        uid(101),
      ]);
      const rejected = assert.rejects(pending, /Refresh and retry/);
      await a.query('commit');
      await rejected;
      await b.query('rollback');
      assert.equal(
        (await db.query('select count(*)::int n from task_history where task_id=$1', [uid(101)]))
          .rows[0].n,
        1,
      );
    } finally {
      await a.query('rollback');
      await b.query('rollback');
      await a.end();
      await b.end();
    }
  });
  console.log(`\n${checks} security checks passed (including 75 status combinations).`);
} finally {
  await db?.end();
  await admin.query(`drop database if exists ${dbName} with (force)`);
  await admin.end();
}
