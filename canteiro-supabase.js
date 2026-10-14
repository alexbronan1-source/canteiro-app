
/* Canteiro — autenticação Supabase */
(function () {
  'use strict';

  const URL = 'https://snqoepfwbmjohocnsicb.supabase.co';
  const KEY = 'sb_publishable_fLr6OROdoOecJN52DIAaxg_qovKbGcV';

  let client;
  let organizacao = null;

  async function iniciar() {
    if (!window.supabase) {
      throw new Error('Biblioteca Supabase não carregada.');
    }

    if (!client) {
      client = window.supabase.createClient(URL, KEY);
    }
    return client;
  }

  async function obterSessao() {
    await iniciar();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function entrar(email, senha) {
    await iniciar();
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: senha
    });
    if (error) throw error;
    return data;
  }

  async function sair() {
    await iniciar();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    location.reload();
  }

  async function carregarOrganizacao() {
    await iniciar();

    const { data: vinculos, error } = await client
      .from('membros_organizacao')
      .select('organizacao_id, funcao')
      .order('criado_em');

    if (error) throw error;

    if (!vinculos || vinculos.length === 0) {
      throw new Error('Este usuário não está vinculado a uma organização.');
    }

    const { data, error: erroOrg } = await client
      .from('organizacoes')
      .select('id, nome')
      .eq('id', vinculos[0].organizacao_id)
      .single();

    if (erroOrg) throw erroOrg;

    organizacao = {
      id: data.id,
      nome: data.nome,
      funcao: vinculos[0].funcao
    };

    return organizacao;
  }

  async function carregarDadosOnline() {
    await iniciar();

    if (!organizacao) {
      await carregarOrganizacao();
    }

    const { data, error } = await client
      .from('dados_app')
      .select('dados')
      .eq('organizacao_id', organizacao.id)
      .maybeSingle();

    if (error) throw error;

    if (data && data.dados && window.CanteiroBridge) {
      window.CanteiroBridge.carregarDados(data.dados);
      window.CanteiroBridge.atualizarStatus('Dados carregados da nuvem', false);
    }

    return data ? data.dados : null;
  }

  function criarTela() {
    if (document.getElementById('canteiro-login')) return;

    const estilo = document.createElement('style');
    estilo.textContent = `
      #canteiro-login {
        position:fixed; inset:0; z-index:99999;
        display:flex; align-items:center; justify-content:center;
        padding:20px; background:#f4f5f7;
        font-family:Arial,sans-serif; color:#202124;
      }
      #canteiro-login .login-card {
        width:100%; max-width:390px; box-sizing:border-box;
        background:white; padding:30px; border-radius:16px;
        box-shadow:0 8px 32px #0001;
      }
      #canteiro-login h1 { margin:0 0 8px; font-size:26px; }
      #canteiro-login p { color:#62666d; line-height:1.5; }
      #canteiro-login label { display:block; margin-top:16px; font-weight:600; }
      #canteiro-login input {
        display:block; width:100%; box-sizing:border-box;
        padding:12px; margin-top:7px; border:1px solid #ccd0d5;
        border-radius:8px; font-size:16px;
      }
      #canteiro-login button {
        width:100%; padding:13px; margin-top:20px; border:0;
        border-radius:8px; background:#ffc21a; color:#222;
        font-size:16px; font-weight:700; cursor:pointer;
      }
      #canteiro-login button:disabled { opacity:.6; cursor:wait; }
      #canteiro-login .erro { color:#b42318; overflow-wrap:anywhere; }
      #canteiro-conta {
        position:fixed; z-index:9998; top:8px; right:8px;
        background:#fff; border:1px solid #ddd; border-radius:8px;
        padding:8px 10px; font:12px Arial,sans-serif;
        box-shadow:0 2px 8px #0001;
      }
      #canteiro-conta button { margin-left:8px; cursor:pointer; }
    `;
    document.head.appendChild(estilo);

    const tela = document.createElement('div');
    tela.id = 'canteiro-login';
    tela.innerHTML = `
      <form class="login-card" id="canteiro-form">
        <h1>Canteiro</h1>
        <p>Entre com seu e-mail e senha para acessar sua obra.</p>
        <label for="canteiro-email">E-mail</label>
        <input id="canteiro-email" type="email" autocomplete="username"
          required placeholder="voce@exemplo.com">
        <label for="canteiro-senha">Senha</label>
        <input id="canteiro-senha" type="password"
          autocomplete="current-password" required placeholder="Sua senha">
        <button id="canteiro-entrar" type="submit">Entrar</button>
        <p id="canteiro-mensagem" class="erro" role="alert"></p>
      </form>
    `;
    document.body.appendChild(tela);

    document.getElementById('canteiro-form').addEventListener('submit',
      async function (evento) {
        evento.preventDefault();

        const botao = document.getElementById('canteiro-entrar');
        const mensagem = document.getElementById('canteiro-mensagem');
        botao.disabled = true;
        botao.textContent = 'Verificando acesso…';
        mensagem.textContent = '';

        try {
          await entrar(
            document.getElementById('canteiro-email').value.trim(),
            document.getElementById('canteiro-senha').value
          );
          await concluirAcesso();
        } catch (erro) {
          mensagem.textContent =
            erro.message || 'Não foi possível entrar. Confira seus dados.';
        } finally {
          botao.disabled = false;
          botao.textContent = 'Entrar';
        }
      }
    );
  }

  function mostrarConta(sessao, org) {
    let barra = document.getElementById('canteiro-conta');
    if (!barra) {
      barra = document.createElement('div');
      barra.id = 'canteiro-conta';
      document.body.appendChild(barra);
    }

    barra.replaceChildren();

    const info = document.createElement('span');
    info.textContent =
  org.nome + ' · ' + org.funcao.toUpperCase();

info.style.fontSize = '14px';
info.style.fontWeight = '700';
info.style.color = '#202124';
info.style.background = '#fff3bf';
info.style.padding = '8px 10px';
info.style.borderRadius = '6px';
    barra.appendChild(info);

    const botao = document.createElement('button');
    botao.textContent = 'Sair';
    botao.addEventListener('click', async function () {
      botao.disabled = true;
      try {
        await sair();
      } catch (erro) {
        alert(erro.message || 'Não foi possível sair.');
        botao.disabled = false;
      }
    });
    barra.appendChild(botao);
  }

  async function concluirAcesso() {
    const sessao = await obterSessao();
    if (!sessao) throw new Error('Faça login para continuar.');

    const org = await carregarOrganizacao();
    const tela = document.getElementById('canteiro-login');
    if (tela) tela.remove();

    mostrarConta(sessao, org);
  }

  async function iniciarTela() {
    criarTela();

    try {
      const sessao = await obterSessao();
      if (sessao) {
        await concluirAcesso();
      }
    } catch (erro) {
      const mensagem = document.getElementById('canteiro-mensagem');
      if (mensagem) {
        mensagem.textContent =
          erro.message || 'Não foi possível verificar o acesso.';
      }
    }
  }

  window.CanteiroSupabase = {
    iniciar,
    obterSessao,
    entrar,
    sair,
    carregarOrganizacao,
    getOrganizacao: function () { return organizacao; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarTela);
  } else {
    iniciarTela();
  }
})();
