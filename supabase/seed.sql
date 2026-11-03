-- =====================================================================
-- Dati di prova — SOLO per provare l'app, non per l'uso reale.
-- Operatori senza password: al primo accesso ognuno crea la propria.
-- Telefoni fittizi: per l'uso reale sostituiscili con quelli veri
-- (vedi README, "Mettere il tuo numero da admin").
-- =====================================================================

insert into public.impianti (codice, descrizione) values
  ('F1', null),
  ('F5', null),
  ('F6', null)
on conflict (codice) do nothing;

insert into public.operatori (id, nome, telefono, ruolo) values
  ('00000000-0000-4000-8000-000000000001', 'Admin Prova',        '3000000001', 'admin'),
  ('00000000-0000-4000-8000-000000000002', 'Capo Reparto Prova', '3000000002', 'capo_reparto'),
  ('00000000-0000-4000-8000-000000000003', 'Operatore Uno',      '3000000003', 'operatore'),
  ('00000000-0000-4000-8000-000000000004', 'Operatore Due',      '3000000004', 'operatore')
on conflict (telefono) do nothing;

-- Qualche record di esempio (dal prototipo AppSheet)
insert into public.test_incollaggio (commessa, barcode, impianto, data, ora, operatore_id, esito, note) values
  ('661539', 'CF$661539020', 'F5', current_date - 2, '08:15', '00000000-0000-4000-8000-000000000003', false, 'Aumentata temperatura 10 gradi'),
  ('661539', 'CF$661539020', 'F5', current_date - 2, '08:40', '00000000-0000-4000-8000-000000000003', true,  null),
  ('661540', null,           'F1', current_date - 1, '14:05', '00000000-0000-4000-8000-000000000004', true,  null),
  ('661552', null,           'F6', current_date,     '07:30', '00000000-0000-4000-8000-000000000002', true,  'Colla nuovo lotto');

insert into public.validazioni (commessa, barcode, impianto, giorno, ora, operatore_id, esito) values
  ('661539', 'CF$661539040', 'F5', current_date - 2, '09:00', '00000000-0000-4000-8000-000000000002', true),
  ('661540', null,           'F1', current_date - 1, '14:30', '00000000-0000-4000-8000-000000000002', false),
  ('661552', null,           'F6', current_date,     '08:00', '00000000-0000-4000-8000-000000000001', true);
