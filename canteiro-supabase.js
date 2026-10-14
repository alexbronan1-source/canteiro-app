
/* Canteiro — conexão Supabase
   Não coloque senhas nem chaves secretas neste arquivo. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://snqoepfwbmjohocnsicb.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fLr6OROdoOecJN52DIAaxg_qovKbGcV';

  let client = null;

  async function iniciar() {
    if (!window.supabase) {
      throw new Error('Biblioteca Supabase não carregada.');
    }

    client = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    return client;
  }

  async function obterSessao() {
    if (!client) await iniciar();

    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    return data.session;
  }

  async function entrar(email, senha) {
    if (!client) await iniciar();

    const { data, error } =
      await client.auth.signInWithPassword({
        email: email,
        password: senha
      });

    if (error) throw error;
    return data;
  }

  async function sair() {
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function carregarOrganizacao() {
    if (!client) await iniciar();

    const { data: vinculos, error } = await client
      .from('membros_organizacao')
      .select('organizacao_id, funcao')
      .order('criado_em');

    if (error) throw error;

    if (!vinculos || vinculos.length === 0) {
      throw new Error(
        'Este usuário ainda não está vinculado a uma organização.'
      );
    }

    const { data: organizacao, error: erroOrg } = await client
      .from('organizacoes')
      .select('id, nome')
      .eq('id', vinculos[0].organizacao_id)
      .single();

    if (erroOrg) throw erroOrg;

    return {
      id: organizacao.id,
      nome: organizacao.nome,
      funcao: vinculos[0].funcao
    };
  }

  window.CanteiroSupabase = {
    iniciar,
    obterSessao,
    entrar,
    sair,
    carregarOrganizacao
  };
})();
