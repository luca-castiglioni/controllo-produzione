-- =====================================================================
-- Validazioni: flag facoltativo "Controllo incollaggio" (spento di default).
-- I record già esistenti risultano senza controllo incollaggio.
-- =====================================================================

alter table public.validazioni
  add column controllo_incollaggio boolean not null default false;
