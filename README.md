# Controllo Produzione

App da telefono per il reparto: **validazione commesse** e **verifiche** (test incollaggio e verifica dimensionale).

| Parte | Cosa fa |
|---|---|
| **App web** (`src/`) | Le schermate usate dal telefono |
| **Supabase** | Database nel cloud, utenti e password, piccole funzioni lato server (Edge Functions) |
| **GitHub Pages** | Pubblica l'app su internet, gratis |

## 1. Creare il progetto Supabase (una volta sola)

1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   Nome `controllo-produzione`, una password per il database (conservala), regione **Central EU (Frankfurt)**.
2. **Authentication → Sign In / Providers**: disattiva **Allow new users to sign up** e,
   nella sezione Email, disattiva **Confirm email** → Save.

## 2. Applicare lo schema (migrazioni) e i dati di prova

Dalla cartella del progetto, nel Terminale:

```bash
supabase login                                  # si apre il browser: autorizza
supabase link --project-ref <ref>               # <ref> = codice nell'indirizzo supabase.com/dashboard/project/<ref>
supabase db push --remote --include-seed        # crea le tabelle e inserisce i dati di prova
```

Per le modifiche future allo schema basta `supabase db push --remote` (applica solo le migrazioni nuove).

Prova senza Supabase (database in memoria sul Mac): `npm run test:db`.

### Edge Functions (primo accesso, reimposta accesso, elimina operatore)

```bash
supabase functions deploy primo_accesso reimposta_accesso elimina_operatore --use-api
```

Vanno ripubblicate solo quando cambia il codice in `supabase/functions/`.
La chiave segreta la usano solo queste funzioni, sui server Supabase: non serve copiarla da nessuna parte.

## 3. Collegare l'app

Copia `.env.example` in `.env.local` e inserisci **Project URL** e chiave **anon / publishable**
(pulsante **Connect** in alto nel progetto Supabase). Mai la chiave *service_role / secret*.

## 4. Avviare l'app sul Mac

```bash
npm install
npm run dev
```

Apri `http://localhost:5173`. Dal telefono, sulla stessa Wi-Fi, usa l'indirizzo "Network" del terminale.

Per provare la **fotocamera** dal telefono serve HTTPS: avvia con `npm run dev:https` e apri
`https://<indirizzo Network>:5173`. Il telefono avvisa che il certificato non è sicuro (è un certificato
di prova): scegli *Mostra dettagli → visita il sito* (iPhone) o *Avanzate → Procedi* (Android).
L'app pubblicata su GitHub Pages è già in HTTPS.

## Operatori di prova (dal seed)

| Nome | Telefono | Ruolo |
|---|---|---|
| Admin Prova | 3000000001 | admin |
| Capo Reparto Prova | 3000000002 | capo reparto |
| Operatore Uno | 3000000003 | operatore |
| Operatore Due | 3000000004 | operatore |

Nessuno ha ancora una password: al primo accesso ognuno la crea.

### Mettere il tuo numero da admin

In Supabase → **SQL Editor**:

```sql
update public.operatori set nome = 'Il tuo nome', telefono = '3351234567'
where telefono = '3000000001';
```

## Prima di usarla davvero: togliere i dati di prova

Gli operatori di prova hanno telefoni fittizi: chi li conosce potrebbe creare la password al loro posto.
In Supabase → **SQL Editor**, dopo aver messo il tuo numero da admin (sopra) e fatto il tuo primo accesso:

```sql
-- record di esempio
delete from public.test_incollaggio;
delete from public.validazioni;
-- operatori di prova (il tuo admin resta, perché ha un telefono vero)
delete from public.operatori where telefono like '300000000%' and auth_user_id is null;
update public.operatori set attivo = false where telefono like '300000000%';
```

Gli operatori di prova che hanno già fatto l'accesso non si possono eliminare: vengono disattivati.

## Pubblicazione (GitHub Pages)

Il codice è su GitHub; a ogni modifica sul ramo `main` l'app si ripubblica da sola in circa un minuto
(workflow `.github/workflows/deploy.yml`). URL e chiave publishable di Supabase sono salvati come
**variabili** del repository (Settings → Secrets and variables → Actions → Variables).

Indirizzo dell'app: `https://luca-castiglioni.github.io/controllo-produzione/`

### Installare sul telefono

- **Android (Chrome)**: apri l'indirizzo → menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").
- **iPhone (Safari)**: apri l'indirizzo → pulsante Condividi → **Aggiungi alla schermata Home**.

Il primo accesso di ogni operatore va fatto alla consegna, davanti al capo reparto o all'admin.
