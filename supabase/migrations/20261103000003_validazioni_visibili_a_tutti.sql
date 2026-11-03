-- =====================================================================
-- Gli operatori vedono le validazioni (per sapere se una commessa è
-- validata), ma inserimento, modifica ed eliminazione restano a capo
-- reparto e admin.
-- =====================================================================

drop policy "lettura validazioni" on public.validazioni;

create policy "lettura validazioni" on public.validazioni
  for select to authenticated
  using (public.ruolo_corrente() is not null);
