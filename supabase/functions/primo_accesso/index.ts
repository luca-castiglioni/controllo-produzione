// Primo accesso: l'operatore sceglie la propria password.
// Chiamata dall'app PRIMA del login (basta la chiave publishable).
// Verifica che il telefono esista, sia attivo e non abbia ancora una password;
// crea l'utente Supabase Auth e lo collega all'operatore. Il login lo fa poi l'app.
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { emailDaTelefono, errore, normalizzaTelefono } from '../_shared/comune.ts'

export default {
  fetch: withSupabase({ auth: 'publishable', errors: { detailed: false } }, async (req, ctx) => {
    const corpo = await req.json().catch(() => ({}))
    const telefono = normalizzaTelefono(String(corpo.telefono ?? ''))
    const password = corpo.password

    if (typeof password !== 'string' || password.length < 6) {
      return errore('La password deve avere almeno 6 caratteri.')
    }

    const admin = ctx.supabaseAdmin
    const { data: operatore, error } = await admin
      .from('operatori')
      .select('id, attivo, auth_user_id')
      .eq('telefono', telefono)
      .maybeSingle()
    if (error) return errore('Errore del database, riprova.', 500)
    if (!operatore) return errore('Numero di telefono non registrato.', 404)
    if (!operatore.attivo) return errore('Accesso disattivato. Rivolgiti al capo reparto.', 403)
    if (operatore.auth_user_id) {
      return errore('La password per questo numero è già stata creata: accedi con la tua password.', 409)
    }

    const { data: creato, error: erroreAuth } = await admin.auth.admin.createUser({
      email: emailDaTelefono(telefono),
      password,
      email_confirm: true,
    })
    if (erroreAuth || !creato.user) {
      return errore('Impossibile creare la password: ' + (erroreAuth?.message ?? 'errore sconosciuto'), 500)
    }

    // collega solo se nel frattempo nessun altro l'ha fatto
    const { data: collegati } = await admin
      .from('operatori')
      .update({ auth_user_id: creato.user.id })
      .eq('id', operatore.id)
      .is('auth_user_id', null)
      .select('id')
    if (!collegati?.length) {
      await admin.auth.admin.deleteUser(creato.user.id)
      return errore('La password per questo numero è già stata creata: accedi con la tua password.', 409)
    }

    return Response.json({ ok: true })
  }),
}
