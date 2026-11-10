// POST /api/lead  -> grava um lead no Supabase.
// Usa a service_role key (apenas no servidor). Nunca exponha essa key no front.
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { nome, contato, servico, mensagem } = JSON.parse(event.body || '{}');

    if (!nome || !contato) {
      return { statusCode: 400, body: JSON.stringify({ error: 'nome e contato sao obrigatorios' }) };
    }

    const { error } = await supabase
      .from('leads')
      .insert({ nome, contato, servico: servico || null, mensagem: mensagem || null });

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
