-- Run once in SQL Editor after 202611050003_conflict_response.sql.
-- Only closes PostgREST requests to this app's status RPC that have already
-- been running for more than a minute; normal short requests are untouched.
-- This clears requests started before the SQLSTATE fix, which retain old code.
select pg_terminate_backend(pid)
from pg_stat_activity
where usename = 'authenticator'
  and state = 'active'
  and query like '%change_task_status%'
  and query_start < clock_timestamp() - interval '1 minute'
  and pid <> pg_backend_pid();
