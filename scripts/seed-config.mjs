export function validateAdminKey(value) {
  const key = value?.trim() || '';
  if (key.startsWith('sb_secret_')) return key;

  // Inspect only the role for a useful configuration error. Supabase verifies
  // the actual credential; decoding a JWT here does not authenticate it.
  let role;
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role;
  } catch {
    // Public and malformed keys must never be used by the admin client.
  }
  if (role === 'service_role') return key;

  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY: нужен серверный ключ service_role (JWT) или Secret key (sb_secret_…). ' +
      'Publishable/anon key не подходит для seed. Скопируйте серверный ключ из Supabase → Project Settings → API Keys в .env. ' +
      'VITE_SUPABASE_ANON_KEY должен оставаться публичным ключом.',
  );
}
