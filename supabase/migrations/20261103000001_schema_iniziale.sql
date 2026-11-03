-- =====================================================================
-- Controllo Produzione — schema iniziale
-- Tabelle, funzioni di appoggio, trigger e regole di sicurezza (RLS).
--
-- Ruoli (operatori.ruolo):
--   operatore     → vede e inserisce test incollaggio; modifica/elimina i propri
--                   solo nel giorno in cui li ha inseriti
--   capo_reparto  → tutto sui test e sulle validazioni; gestisce impianti
--                   e operatori normali
--   admin         → tutto, compresi capi reparto, admin e cambio ruoli
--
-- "Contesto fidato" = nessun utente collegato (auth.uid() nullo): SQL Editor
-- di Supabase, seed e Edge Function con la service key. L'app nel browser
-- ha sempre un utente collegato, quindi non è mai in contesto fidato.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Funzioni di utilità
-- ---------------------------------------------------------------------

-- Data e ora italiane (il server Supabase lavora in UTC)
create or replace function public.oggi_italia()
returns date
language sql
stable
as $$
  select (now() at time zone 'Europe/Rome')::date;
$$;

create or replace function public.ora_italia()
returns time
language sql
stable
as $$
  select date_trunc('second', (now() at time zone 'Europe/Rome'))::time;
$$;

-- Telefono normalizzato: solo cifre, senza prefisso +39 / 0039.
-- La stessa regola è nell'app (src/telefono.ts) e nelle Edge Function.
create or replace function public.normalizza_telefono(t text)
returns text
language sql
immutable
as $$
  select case
    when d like '0039%' then substr(d, 5)
    when d like '39%' and length(d) > 10 then substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g') as d) x;
$$;


-- ---------------------------------------------------------------------
-- Operatori
-- ---------------------------------------------------------------------
create table public.operatori (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  telefono     text not null,
  auth_user_id uuid references auth.users (id) on delete set null,
  ruolo        text not null default 'operatore',
  attivo       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint operatori_nome_obbligatorio check (length(trim(nome)) > 0),
  constraint operatori_telefono_formato  check (telefono ~ '^[0-9]{6,15}$'),
  constraint operatori_telefono_unico    unique (telefono),
  constraint operatori_auth_user_unico   unique (auth_user_id),
  constraint operatori_ruolo_valido      check (ruolo in ('operatore', 'capo_reparto', 'admin'))
);

-- Funzioni sul profilo dell'utente collegato.
-- "security definer": leggono la tabella operatori senza passare dalle RLS
-- (altrimenti le policy di operatori chiamerebbero sé stesse).
-- Un operatore disattivato risulta senza ruolo, quindi non vede né scrive nulla.
create or replace function public.mio_operatore_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select id from public.operatori where auth_user_id = auth.uid() and attivo;
$$;

create or replace function public.ruolo_corrente()
returns text
language sql
stable
security definer set search_path = public
as $$
  select ruolo from public.operatori where auth_user_id = auth.uid() and attivo;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.ruolo_corrente() = 'admin', false);
$$;

-- capo reparto oppure admin
create or replace function public.is_capo()
returns boolean
language sql
stable
as $$
  select coalesce(public.ruolo_corrente() in ('capo_reparto', 'admin'), false);
$$;

-- Controlli che le policy da sole non possono esprimere
create or replace function public.operatori_controlli()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.auth_user_id is not null then
      raise exception 'Questo operatore ha già fatto il primo accesso: non si può eliminare, va disattivato.';
    end if;
    return old;
  end if;

  new.nome := trim(new.nome);
  new.telefono := public.normalizza_telefono(new.telefono);

  if auth.uid() is null then
    return new;  -- contesto fidato
  end if;

  if tg_op = 'INSERT' then
    new.auth_user_id := null;  -- il collegamento lo crea solo la Edge Function del primo accesso
    new.created_at := now();
    return new;
  end if;

  -- UPDATE dall'app
  new.id := old.id;
  new.auth_user_id := old.auth_user_id;
  new.created_at := old.created_at;

  if old.auth_user_id = auth.uid() and (new.ruolo <> old.ruolo or new.attivo <> old.attivo) then
    raise exception 'Non puoi cambiare il tuo ruolo né disattivarti da solo.';
  end if;

  -- il telefono è il nome utente: cambiarlo dopo il primo accesso romperebbe il login
  if old.auth_user_id is not null and new.telefono <> old.telefono then
    raise exception 'Per cambiare il telefono di un operatore che ha già fatto il primo accesso, usa prima "Reimposta accesso".';
  end if;

  return new;
end;
$$;

create trigger operatori_controlli
  before insert or update or delete on public.operatori
  for each row execute function public.operatori_controlli();

-- Deve restare sempre almeno un admin attivo
create or replace function public.operatori_almeno_un_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.operatori where ruolo = 'admin' and attivo) then
    raise exception 'Deve restare almeno un amministratore attivo.';
  end if;
  return null;
end;
$$;

create trigger operatori_almeno_un_admin
  after update or delete on public.operatori
  for each statement execute function public.operatori_almeno_un_admin();


-- ---------------------------------------------------------------------
-- Impianti (menu a tendina)
-- ---------------------------------------------------------------------
create table public.impianti (
  codice      text primary key,
  descrizione text,
  attivo      boolean not null default true,
  constraint impianti_codice_obbligatorio check (length(trim(codice)) > 0)
);


-- ---------------------------------------------------------------------
-- Validazioni commesse (da Validazione.xlsx)
-- ---------------------------------------------------------------------
create table public.validazioni (
  id           uuid primary key default gen_random_uuid(),
  commessa     text not null,
  barcode      text,
  impianto     text not null references public.impianti (codice) on update cascade,
  giorno       date not null default public.oggi_italia(),
  ora          time not null default public.ora_italia(),
  operatore_id uuid not null references public.operatori (id),
  esito        boolean not null,  -- true = OK, false = NO
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  constraint validazioni_commessa_obbligatoria check (length(trim(commessa)) > 0)
);

create index validazioni_giorno_idx   on public.validazioni (giorno desc);
create index validazioni_commessa_idx on public.validazioni (commessa);


-- ---------------------------------------------------------------------
-- Test di incollaggio (da Test.xlsx)
-- ---------------------------------------------------------------------
create table public.test_incollaggio (
  id           uuid primary key default gen_random_uuid(),
  commessa     text not null,
  barcode      text,
  impianto     text not null references public.impianti (codice) on update cascade,
  data         date not null default public.oggi_italia(),
  ora          time not null default public.ora_italia(),
  operatore_id uuid not null references public.operatori (id),
  esito        boolean not null,  -- true = OK (test superato), false = NO
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  constraint test_commessa_obbligatoria check (length(trim(commessa)) > 0)
);

create index test_incollaggio_data_idx     on public.test_incollaggio (data desc);
create index test_incollaggio_commessa_idx on public.test_incollaggio (commessa);


-- ---------------------------------------------------------------------
-- Automatismi comuni a validazioni e test:
--   • operatore_id = utente collegato, mai modificabile (il valore inviato
--     dall'app viene ignorato)
--   • ora di inserimento automatica, non modificabile
--   • updated_at aggiornato a ogni modifica
-- ---------------------------------------------------------------------
create or replace function public.registro_automatismi()
returns trigger
language plpgsql
as $$
begin
  new.commessa := trim(new.commessa);
  new.barcode := nullif(trim(new.barcode), '');

  if tg_op = 'INSERT' then
    new.updated_at := null;
    if auth.uid() is not null then
      new.operatore_id := public.mio_operatore_id();
      if new.operatore_id is null then
        raise exception 'Utente non abilitato a inserire dati.';
      end if;
      new.ora := public.ora_italia();
      new.created_at := now();
    end if;
    -- contesto fidato (seed, importazione): operatore_id e ora come forniti
    return new;
  end if;

  -- UPDATE
  new.id := old.id;
  new.operatore_id := old.operatore_id;
  new.ora := old.ora;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger validazioni_automatismi
  before insert or update on public.validazioni
  for each row execute function public.registro_automatismi();

create trigger test_incollaggio_automatismi
  before insert or update on public.test_incollaggio
  for each row execute function public.registro_automatismi();

-- Un operatore normale modifica/elimina solo i propri record e solo nel
-- giorno in cui li ha inseriti; capo reparto e admin sempre.
create or replace function public.puo_modificare(autore uuid, inserito timestamptz)
returns boolean
language sql
stable
as $$
  select public.is_capo()
      or (autore = public.mio_operatore_id()
          and (inserito at time zone 'Europe/Rome')::date = public.oggi_italia());
$$;


-- ---------------------------------------------------------------------
-- Regole di sicurezza (Row Level Security)
-- Nessun accesso senza login: le policy valgono solo per "authenticated"
-- e richiedono un operatore attivo collegato.
-- ---------------------------------------------------------------------
alter table public.operatori        enable row level security;
alter table public.impianti         enable row level security;
alter table public.validazioni      enable row level security;
alter table public.test_incollaggio enable row level security;

revoke all on public.operatori, public.impianti, public.validazioni, public.test_incollaggio from anon;

-- Operatori: tutti leggono; capo reparto gestisce solo gli operatori normali
-- (non può creare né promuovere capi reparto o admin); l'admin tutto.
create policy "lettura operatori" on public.operatori
  for select to authenticated
  using (public.ruolo_corrente() is not null);

create policy "inserimento operatori" on public.operatori
  for insert to authenticated
  with check (public.is_admin() or (public.is_capo() and ruolo = 'operatore'));

create policy "modifica operatori" on public.operatori
  for update to authenticated
  using      (public.is_admin() or (public.is_capo() and ruolo = 'operatore'))
  with check (public.is_admin() or (public.is_capo() and ruolo = 'operatore'));

create policy "eliminazione operatori" on public.operatori
  for delete to authenticated
  using (public.is_admin() or (public.is_capo() and ruolo = 'operatore'));

-- Impianti: tutti leggono; capo reparto e admin gestiscono
create policy "lettura impianti" on public.impianti
  for select to authenticated
  using (public.ruolo_corrente() is not null);

create policy "inserimento impianti" on public.impianti
  for insert to authenticated with check (public.is_capo());

create policy "modifica impianti" on public.impianti
  for update to authenticated using (public.is_capo()) with check (public.is_capo());

create policy "eliminazione impianti" on public.impianti
  for delete to authenticated using (public.is_capo());

-- Validazioni: solo capo reparto e admin
create policy "lettura validazioni" on public.validazioni
  for select to authenticated using (public.is_capo());

create policy "inserimento validazioni" on public.validazioni
  for insert to authenticated with check (public.is_capo());

create policy "modifica validazioni" on public.validazioni
  for update to authenticated using (public.is_capo()) with check (public.is_capo());

create policy "eliminazione validazioni" on public.validazioni
  for delete to authenticated using (public.is_capo());

-- Test incollaggio: tutti vedono e inseriscono; modifica/eliminazione
-- secondo puo_modificare()
create policy "lettura test" on public.test_incollaggio
  for select to authenticated
  using (public.ruolo_corrente() is not null);

create policy "inserimento test" on public.test_incollaggio
  for insert to authenticated
  with check (operatore_id = public.mio_operatore_id());

create policy "modifica test" on public.test_incollaggio
  for update to authenticated
  using      (public.puo_modificare(operatore_id, created_at))
  with check (public.puo_modificare(operatore_id, created_at));

create policy "eliminazione test" on public.test_incollaggio
  for delete to authenticated
  using (public.puo_modificare(operatore_id, created_at));
