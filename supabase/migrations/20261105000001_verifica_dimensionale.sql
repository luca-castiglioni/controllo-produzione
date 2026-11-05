-- =====================================================================
-- La sezione "Test colla" diventa "Verifica" con due spunte:
--   • esito                  → "Test incollaggio" (true = OK), come prima
--   • verifica_dimensionale  → "Verifica dimensionale" (true = OK), nuova
-- Nomi di tabella e colonne restano invariati per non toccare i dati esistenti.
-- =====================================================================

alter table public.test_incollaggio
  add column verifica_dimensionale boolean not null default false;

-- con la spunta nel modulo il valore c'è sempre; default per sicurezza
alter table public.test_incollaggio
  alter column esito set default false;

comment on column public.test_incollaggio.esito is 'Test incollaggio: true = OK';
comment on column public.test_incollaggio.verifica_dimensionale is 'Verifica dimensionale: true = OK';
