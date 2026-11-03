# Controllo Produzione

Web app mobile (PWA, usata da smartphone in reparto) per la **validazione commesse** e i
**test di incollaggio**. Sostituisce un prototipo AppSheet. L'utente (Luca) è alle prime
armi: spiega le modifiche in italiano, in modo semplice, un passo alla volta.
La specifica completa è stata fornita nella prima conversazione; le regole chiave sono qui.

## Stack
- Vite + React 19 + TypeScript, CSS semplice in `src/styles.css` (come Casti Money, niente Tailwind)
- Supabase: Auth (telefono → email fittizia `<telefono>@operatori.local` + password),
  Postgres con Row Level Security, Edge Functions (primo accesso, reimposta accesso)
- Pubblicazione su GitHub Pages (`base: './'`), workflow in `.github/workflows/deploy.yml`
- Progetto di riferimento: github.com/luca-castiglioni/casti-money

## Comandi
- `npm run dev` — avvia in locale (raggiungibile dal telefono sulla stessa Wi-Fi)
- `npm run dev:https` — come dev ma in HTTPS (certificato di prova): serve per la fotocamera dal telefono
- `npm run build` — controllo dei tipi + build in `dist/`
- `npm test` — test unitari (Vitest), es. `src/barcode.test.ts`
- `npm run test:db` — applica migrazioni + seed su un Postgres in memoria (PGlite) e verifica i permessi
- `supabase db push --remote` — applica le nuove migrazioni al progetto Supabase collegato
- `supabase functions deploy <nome> --use-api` — pubblica una Edge Function (senza Docker)

## Struttura
- `supabase/migrations/` — schema versionato (fonte di verità). Mai modificare una migrazione
  già applicata: aggiungerne una nuova. Aggiornare `supabase/tests/permessi.mjs` di conseguenza.
- `supabase/seed.sql` — dati di prova (operatori con telefoni fittizi 300000000x)
- `supabase/functions/` — Edge Functions (unico posto dove si usa la service key)
- `src/supabase.ts` — client e tutte le query

## Regole di dominio
- Ruoli: `operatore`, `capo_reparto`, `admin` (vedi commento in testa alla prima migrazione).
- Operatore: vede/inserisce test; modifica/elimina i propri solo nel giorno di inserimento.
  Vede le validazioni in sola lettura (scheda visibile, niente +); nel modulo test un avviso
  sotto la commessa dice se è già validata. Capo reparto: tutto sui dati, gestisce impianti e
  operatori normali. Admin: tutto, unico a gestire capi reparto/admin e ruoli.
- `operatore_id` e `ora` dei record li imposta il database (trigger), mai il client.
- Telefono normalizzato: solo cifre, senza +39/0039 (`normalizza_telefono` in SQL; stessa regola nel client).
- Barcode: `parseBarcode` in `src/barcode.ts` — togli `*`, poi primi 3 e ultimi 3 caratteri → commessa;
  < 7 caratteri = "Codice non valido". Scanner: @zxing/browser (Code 128, Code 39, QR), caricato solo all'uso.
- Logo: `public/logo.png`; icone PWA = logo su fondo bianco (`public/icon.svg` → png con qlmanage).
- Sempre almeno un admin attivo; nessuno cambia il proprio ruolo né si disattiva.
- Export Excel solo per capo reparto e admin.
- Interfaccia e nomi nel codice in italiano. Tema chiaro, verde primario, pulsanti grandi.

## Sicurezza
- Mai committare `.env.local`. Nell'app solo la chiave anon/publishable; service key SOLO nelle Edge Function.
- La protezione sta nelle policy RLS e nei trigger, non nell'interfaccia.
