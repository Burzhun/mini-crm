const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing public Supabase configuration');
for (const table of ['profiles', 'projects', 'tasks', 'task_history']) {
  const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: key } });
  const body = await r.json();
  console.log(
    `${table}: HTTP ${r.status}`,
    Array.isArray(body) ? `${body.length} rows visible to anonymous` : body.code || body.message,
  );
  if (r.ok && Array.isArray(body) && body.length) process.exitCode = 1;
}
