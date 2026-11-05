// Server-side only: run manually with .env, never bundled into the frontend.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
const env = process.env;
for (const name of [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SEED_MANAGER_PASSWORD',
  'SEED_WORKER_1_PASSWORD',
  'SEED_WORKER_2_PASSWORD',
])
  if (!env[name]) throw new Error(`Missing ${name}`);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const result = (r) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
const existing = result(await admin.from('projects').select('id').limit(1));
if (existing.length)
  throw new Error(
    'Seed stopped: database already contains projects. No existing data was changed.',
  );
const accounts = [
  ['manager@kontur.test', 'Александр Волков', 'manager', env.SEED_MANAGER_PASSWORD],
  ['mikhail@kontur.test', 'Михаил Соколов', 'worker', env.SEED_WORKER_1_PASSWORD],
  ['anna@kontur.test', 'Анна Петрова', 'worker', env.SEED_WORKER_2_PASSWORD],
];
const users = [];
const { users: listed } = result(await admin.auth.admin.listUsers({ perPage: 1000 }));
for (const [email, name, role, password] of accounts) {
  if (password.length < 12) throw new Error('Use seed passwords with at least 12 characters.');
  let user = listed.find((u) => u.email === email);
  if (!user)
    user = result(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user;
  else
    throw new Error(
      `Account ${email} already exists; seed will not change its password or role. Complete setup manually.`,
    );
  result(await admin.from('profiles').insert({ id: user.id, name, role }));
  users.push(user);
}
async function client(index) {
  const c = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, options);
  result(
    await c.auth.signInWithPassword({ email: accounts[index][0], password: accounts[index][3] }),
  );
  return c;
}
const manager = await client(0),
  workers = [null, await client(1), await client(2)];
const projects = [
  { id: randomUUID(), name: 'ЖК «Сосновый парк»', address: 'Москва, ул. Сосновая, 12' },
  {
    id: randomUUID(),
    name: 'Бизнес-центр «Горизонт»',
    address: 'Москва, Ленинградский проспект, 36',
  },
  {
    id: randomUUID(),
    name: 'Загородный дом в Репино',
    address: 'Московская область, пос. Репино, участок 24',
  },
];
// Insert IDs via trusted admin (frontend column grants intentionally forbid setting identity).
result(await admin.from('projects').insert(projects));
const definitions = [
  ['Проверить армирование перекрытия', 0, 1, 'review'],
  ['Согласовать план электрики', 0, 2, 'in_progress'],
  ['Заказать бетон для фундамента', 0, 1, 'new'],
  ['Устранить замечания по кладке', 0, 2, 'rework'],
  ['Принять доставку материалов', 0, 1, 'accepted'],
  ['Подготовить исполнительную схему', 1, 2, 'review'],
  ['Проверить монтаж вентиляции', 1, 1, 'in_progress'],
  ['Согласовать отделочные материалы', 1, 2, 'new'],
  ['Выполнить разметку участка', 2, 1, 'accepted'],
  ['Подготовить котлован', 2, 2, 'in_progress'],
];
for (const [title, p, w, status] of definitions) {
  const task = result(
    await manager
      .from('tasks')
      .insert({
        title,
        description: 'Выполнить работы по проекту. Проверить результат и отправить на проверку.',
        project_id: projects[p].id,
        assignee_id: users[w].id,
        author_id: users[0].id,
      })
      .select()
      .single(),
  );
  const step = async (c, from, to, comment = null) =>
    result(
      await c.rpc('change_task_status', {
        p_task_id: task.id,
        p_expected_status: from,
        p_target: to,
        p_comment: comment,
      }),
    );
  if (status === 'new') continue;
  await step(workers[w], 'new', 'in_progress');
  if (status === 'in_progress') continue;
  await step(workers[w], 'in_progress', 'review');
  if (status === 'review') continue;
  await step(
    manager,
    'review',
    status,
    status === 'rework'
      ? 'Исправьте замечания по швам в осях 2–4 и отправьте на повторную проверку.'
      : null,
  );
}
console.log('Created 3 users, 3 projects and 10 tasks with authentic status histories.');
for (const [email, , role] of accounts)
  console.log(`${role}: ${email} (password from your environment)`);
