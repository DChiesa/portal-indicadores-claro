/* QualiNET - acrescimo isolado para reter a ultima medicao.
   Nao altera calculos, filtros, cores, cards ou estrutura do relatorio. */
(function(){
  const TABELA_ATUAL='qualinet_ultima_analise';
  const TABELA_HISTORICO='qualinet_historico_analises';
  const CAMINHO_PADRAO='atual/qualinet.txt';
  let cliente=null;
  let carregandoOnline=false;

  function config(){
    return window.PORTAL_CONFIG||window.APP_CONFIG||{};
  }

  function obterCliente(){
    if(cliente)return cliente;
    const cfg=config();
    const url=cfg.SUPABASE_URL||'';
    const chave=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_KEY||'';
    if(!url||!chave||!window.supabase||typeof window.supabase.createClient!=='function')return null;
    cliente=window.supabase.createClient(url,chave,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return cliente;
  }

  function bucket(){return config().BUCKET||'bases-tecnico'}

  function caminho(){
    const arquivos=config().FILES||{};
    return arquivos['analise_qualinet.html']||
           arquivos['analise_do_qualinet_atualizado.html']||
           CAMINHO_PADRAO;
  }

  function informar(texto,erro){
    const barra=document.querySelector('.portal-auto-status');
    if(barra){
      barra.classList.toggle('ok',!erro);
      barra.classList.toggle('error',!!erro);
      const alvo=barra.querySelector('span')||barra;
      alvo.textContent=texto;
    }
    console[erro?'error':'info']('QualiNET:',texto);
  }

  async function usuarioAtual(c){
    try{return (await c.auth.getUser()).data.user||null}catch(e){return null}
  }

  async function salvarNoStorage(c,conteudo){
    const arquivo=new Blob([conteudo],{type:'text/plain;charset=utf-8'});
    const resposta=await c.storage.from(bucket()).upload(caminho(),arquivo,{
      upsert:true,
      contentType:'text/plain;charset=utf-8',
      cacheControl:'0'
    });
    if(resposta.error)throw resposta.error;
  }

  async function salvarNasTabelas(c,conteudo,nomeArquivo,u){
    const agora=new Date().toISOString();
    const atual={
      id:1,
      conteudo,
      nome_arquivo:nomeArquivo||'texto_colado',
      atualizado_em:agora,
      atualizado_por:u?.id||null,
      atualizado_por_email:u?.email||null
    };
    const r1=await c.from(TABELA_ATUAL).upsert(atual,{onConflict:'id'});
    if(r1.error)throw r1.error;

    const historico={
      conteudo,
      nome_arquivo:atual.nome_arquivo,
      salvo_em:agora,
      salvo_por:u?.id||null,
      salvo_por_email:u?.email||null
    };
    const r2=await c.from(TABELA_HISTORICO).insert(historico);
    if(r2.error)console.warn('QualiNET: base atual salva; histórico não registrado.',r2.error);
  }

  window.qualinetSalvarUltimaLeitura=async function(conteudo,nomeArquivo,totalMedicoes){
    if(carregandoOnline||window.__qualinetCarregandoOnline)return false;
    if(!String(conteudo||'').trim()||Number(totalMedicoes||0)<1)return false;

    const c=obterCliente();
    if(!c){
      alert('Não foi possível iniciar a conexão configurada no portal-config.js. A análise local foi mantida.');
      return false;
    }

    try{
      informar('Salvando última medição...',false);
      const u=await usuarioAtual(c);
      await salvarNoStorage(c,conteudo);
      await salvarNasTabelas(c,conteudo,nomeArquivo,u);
      informar('Última medição salva e compartilhada',false);
      return true;
    }catch(e){
      informar('Erro ao salvar: '+(e.message||e),true);
      alert('A análise foi gerada, mas a última medição não foi salva. Detalhe: '+(e.message||e));
      return false;
    }
  };

  async function lerTabela(c){
    const r=await c.from(TABELA_ATUAL)
      .select('conteudo,atualizado_em,atualizado_por_email')
      .eq('id',1)
      .maybeSingle();
    if(r.error)throw r.error;
    return r.data||null;
  }

  async function lerStorage(c){
    const r=await c.storage.from(bucket()).download(caminho());
    if(r.error)throw r.error;
    return await r.data.text();
  }

  async function aplicar(conteudo,meta){
    if(!String(conteudo||'').trim())return false;
    const campo=document.getElementById('rawText');
    if(!campo||typeof window.processar!=='function')return false;
    carregandoOnline=true;
    window.__qualinetCarregandoOnline=true;
    try{
      campo.value=conteudo;
      window.processar();
    }finally{
      window.__qualinetCarregandoOnline=false;
      carregandoOnline=false;
    }
    const msg=document.getElementById('msg');
    if(msg&&meta?.atualizado_em){
      msg.textContent+=` Última medição: ${new Date(meta.atualizado_em).toLocaleString('pt-BR')}${meta.atualizado_por_email?' por '+meta.atualizado_por_email:''}.`;
    }
    informar('Última medição compartilhada carregada',false);
    return true;
  }

  async function carregar(){
    const c=obterCliente();
    if(!c){informar('Configuração Supabase indisponível',true);return}
    try{
      informar('Carregando última medição...',false);
      let meta=null;
      try{meta=await lerTabela(c)}catch(e){console.warn('QualiNET: tabela atual indisponível; tentando Storage.',e)}
      let conteudo=meta?.conteudo||'';
      if(!conteudo){
        try{conteudo=await lerStorage(c)}catch(e){console.warn('QualiNET: arquivo atual indisponível.',e)}
      }
      if(!(await aplicar(conteudo,meta)))informar('Ainda não existe medição compartilhada',false);
    }catch(e){
      informar('Erro ao carregar: '+(e.message||e),true);
    }
  }

  if(document.readyState==='complete')setTimeout(carregar,300);
  else window.addEventListener('load',()=>setTimeout(carregar,300),{once:true});
})();
