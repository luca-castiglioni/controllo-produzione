-- =====================================================================
-- Accesso: stato di un telefono prima del login
-- =====================================================================

-- Chiamata dalla schermata di accesso (quindi anche senza login).
-- Restituisce solo lo stato, mai altri dati dell'operatore:
--   'nuovo'        → operatore attivo senza password: mostrare "Crea la tua password"
--   'attivo'       → ha già la password: mostrare telefono + password
--   'disattivato'  → operatore disattivato
--   'sconosciuto'  → telefono non registrato
create or replace function public.stato_accesso(telefono text)
returns text
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select case
              when not o.attivo then 'disattivato'
              when o.auth_user_id is null then 'nuovo'
              else 'attivo'
            end
       from public.operatori o
      where o.telefono = public.normalizza_telefono(stato_accesso.telefono)),
    'sconosciuto');
$$;

revoke all on function public.stato_accesso(text) from public;
grant execute on function public.stato_accesso(text) to anon, authenticated;
