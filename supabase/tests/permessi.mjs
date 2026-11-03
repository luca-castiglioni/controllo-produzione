// Prova migrazioni + seed + permessi su PGlite con un finto "auth" Supabase
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

// Uso: npm run test:db  (dalla cartella del progetto)
const P = process.argv[2] ?? '.'
const db = new PGlite()
let ok = 0, ko = 0
const verifica = (cond, msg) => { cond ? ok++ : ko++; console.log(`${cond ? '✓' : '✗'} ${msg}`) }

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema auth; grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`)
for (const f of readdirSync(`${P}/supabase/migrations`).sort())
  await db.exec(readFileSync(`${P}/supabase/migrations/${f}`, 'utf8'))
await db.exec(readFileSync(`${P}/supabase/seed.sql`, 'utf8'))
console.log('migrazioni e seed applicati')

const U = { admin: 'a0000000-0000-4000-8000-000000000001', capo: 'a0000000-0000-4000-8000-000000000002',
            op1: 'a0000000-0000-4000-8000-000000000003', op2: 'a0000000-0000-4000-8000-000000000004' }
const O = (n) => `00000000-0000-4000-8000-00000000000${n}`
// collegamento come farebbe la Edge Function del primo accesso (contesto fidato)
for (const [i, k] of ['admin', 'capo', 'op1', 'op2'].entries()) {
  await db.query(`insert into auth.users values ($1, $2)`, [U[k], `${k}@operatori.local`])
  await db.query(`update operatori set auth_user_id = $1 where id = $2`, [U[k], O(i + 1)])
}
// un test di op1 inserito ieri
await db.exec(`alter table test_incollaggio disable trigger test_incollaggio_automatismi;
  update test_incollaggio set created_at = now() - interval '1 day' where note = 'Aumentata temperatura 10 gradi';
  alter table test_incollaggio enable trigger test_incollaggio_automatismi;`)

async function come(utente, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${utente ? U[utente] : ''}', false);`)
  await db.exec(utente ? 'set role authenticated' : 'set role anon')
  try { return { r: await db.query(sql, params) } }
  catch (e) { return { e: e.message } }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const fidato = (sql, params) => db.query(sql, params).then((r) => ({ r }), (e) => ({ e: e.message }))

// --- anon
let x = await come(null, 'select * from test_incollaggio')
verifica(x.e?.includes('permission denied'), 'anon: nessun accesso ai dati')

// --- operatore
x = await come('op1', 'select count(*)::int n from test_incollaggio')
verifica(x.r?.rows[0].n === 4, 'operatore vede tutti i test')
x = await come('op1', 'select count(*)::int n from validazioni')
verifica(x.r?.rows[0].n === 0, 'operatore non vede le validazioni')
x = await come('op1', `insert into validazioni (commessa, impianto, esito, operatore_id) values ('1','F1',true,$1)`, [O(3)])
verifica(!!x.e, 'operatore non inserisce validazioni')
x = await come('op1', `insert into test_incollaggio (commessa, impianto, esito, operatore_id, ora) values (' 777 ','F1',true,$1,'01:02') returning *`, [O(1)])
verifica(x.r?.rows[0].operatore_id === O(3), 'operatore_id inviato dal client ignorato (messo quello loggato)')
verifica(x.r?.rows[0].ora !== '01:02:00' && x.r?.rows[0].commessa === '777', 'ora automatica e commessa ripulita')
const nuovo = x.r?.rows[0].id
x = await come('op1', `update test_incollaggio set note = 'ok', operatore_id = $2 where id = $1 returning operatore_id, updated_at`, [nuovo, O(4)])
verifica(x.r?.rows.length === 1 && x.r.rows[0].operatore_id === O(3) && x.r.rows[0].updated_at, 'operatore modifica il proprio test di oggi, autore invariato')
x = await come('op1', `update test_incollaggio set note = 'x' where note = 'Aumentata temperatura 10 gradi'`)
verifica(x.r?.affectedRows === 0, 'operatore NON modifica il proprio test di ieri')
x = await come('op1', `delete from test_incollaggio where operatore_id = $1`, [O(4)])
verifica(x.r?.affectedRows === 0, 'operatore NON elimina test altrui')
x = await come('op1', `insert into operatori (nome, telefono) values ('Tizio','3331112222')`)
verifica(!!x.e, 'operatore non crea operatori')
x = await come('op1', `insert into impianti (codice) values ('F9')`)
verifica(!!x.e, 'operatore non crea impianti')
x = await come('op1', `update operatori set ruolo = 'admin' where id = $1`, [O(3)])
verifica(x.r?.affectedRows === 0 || !!x.e, 'operatore non si promuove admin')

// --- capo reparto
x = await come('capo', 'select count(*)::int n from validazioni')
verifica(x.r?.rows[0].n === 3, 'capo vede le validazioni')
x = await come('capo', `insert into validazioni (commessa, impianto, esito) values ('661600','F6',false) returning operatore_id, giorno`)
verifica(x.r?.rows[0].operatore_id === O(2), 'capo inserisce validazione a proprio nome')
x = await come('capo', `update test_incollaggio set note = 'corretto dal capo' where note = 'Aumentata temperatura 10 gradi'`)
verifica(x.r?.affectedRows === 1, 'capo modifica test altrui di ieri')
x = await come('capo', `insert into operatori (nome, telefono) values (' Nuovo ', '+39 333 123 4567') returning telefono, nome, auth_user_id`)
verifica(x.r?.rows[0].telefono === '3331234567' && x.r.rows[0].nome === 'Nuovo', 'capo crea operatore, telefono normalizzato')
x = await come('capo', `insert into operatori (nome, telefono) values ('Doppio', '0039 3331234567')`)
verifica(x.e?.includes('operatori_telefono_unico'), 'telefono duplicato bloccato (anche con 0039)')
x = await come('capo', `insert into operatori (nome, telefono, ruolo) values ('Capo2', '3339990000', 'capo_reparto')`)
verifica(!!x.e, 'capo NON crea capi reparto')
x = await come('capo', `update operatori set ruolo = 'capo_reparto' where telefono = '3331234567'`)
verifica(!!x.e, 'capo NON promuove operatori')
x = await come('capo', `update operatori set attivo = false where id = $1`, [O(1)])
verifica(x.r?.affectedRows === 0, 'capo NON modifica admin')
x = await come('capo', `update operatori set telefono = '3330000000' where id = $1`, [O(4)])
verifica(x.e?.includes('Reimposta accesso'), 'telefono non cambiabile dopo il primo accesso')
x = await come('capo', `update operatori set auth_user_id = null where id = $1 returning auth_user_id`, [O(4)])
verifica(x.r?.rows[0].auth_user_id === U.op2, 'auth_user_id non modificabile dall\'app')
x = await come('capo', `delete from operatori where telefono = '3331234567'`)
verifica(x.r?.affectedRows === 1, 'capo elimina operatore mai entrato e senza record')
x = await come('capo', `insert into impianti (codice, descrizione) values ('F9', 'nuovo')`)
verifica(!x.e, 'capo crea impianti')
x = await come('capo', `delete from impianti where codice = 'F5'`)
verifica(!!x.e, 'impianto usato nei record non eliminabile')

// --- admin
x = await come('admin', `update operatori set ruolo = 'operatore' where id = $1`, [O(1)])
verifica(x.e?.includes('tuo ruolo'), 'admin non cambia il proprio ruolo')
x = await come('admin', `update operatori set attivo = false where id = $1`, [O(1)])
verifica(x.e?.includes('disattivarti'), 'admin non si disattiva da solo')
x = await come('admin', `update operatori set ruolo = 'capo_reparto' where id = $1`, [O(4)])
verifica(x.r?.affectedRows === 1, 'admin promuove operatore a capo reparto')
x = await come('admin', `update operatori set ruolo = 'admin' where id = $1`, [O(2)])
verifica(x.r?.affectedRows === 1, 'admin nomina un secondo admin')
x = await come('admin', `update operatori set attivo = false where id = $1`, [O(2)])
verifica(x.r?.affectedRows === 1, 'admin disattiva il secondo admin')
x = await come('admin', `delete from operatori where id = $1`, [O(3)])
verifica(!!x.e, 'operatore con accesso/record non eliminabile')

// --- operatore disattivato (O(2) ora disattivato)
x = await come('capo', 'select count(*)::int n from test_incollaggio')
verifica(x.r?.rows[0].n === 0, 'operatore disattivato non vede nulla')
x = await come('capo', `insert into test_incollaggio (commessa, impianto, esito) values ('1','F1',true)`)
verifica(!!x.e, 'operatore disattivato non inserisce')

// --- ultimo admin (contesto fidato)
x = await fidato(`update operatori set attivo = false where id = $1`, [O(1)])
verifica(x.e?.includes('almeno un amministratore'), 'deve restare almeno un admin attivo')

console.log(`\n${ok} riuscite, ${ko} fallite`)
process.exit(ko ? 1 : 0)
