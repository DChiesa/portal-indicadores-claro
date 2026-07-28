/* QualiNET - ultima medicao compartilhada.
   Fonte principal: arquivo TXT fixo no Supabase Storage.
   Espelho atual + historico: tabelas do Supabase. */
(function(){
  const BUCKET='qualinet-retencao';
  const ARQUIVO='qualinet/ultima-leitura.txt';
  const TABELA_ATUAL='qualinet_ultima_analise';
  const TABELA_HISTORICO='qualinet_historico_analises';
  let cliente=null;
  let carregando=false;

  function textoConfig(obj,...nomes){
    for(const nome of nomes){if(obj&&typeof obj[nome]==='string'&&obj[nome].trim())return obj[nome].trim()}
    return '';
  }

  function obterCliente(){
    if(cliente&&typeof cliente.from==='function')return cliente;
    const candidatos=[window.supabaseClient,window.supabase_cliente,window.sb,window._supabase,window.portalSupabase,window.supabase?.client];
    cliente=candidatos.find(c=>c&&typeof c.from==='function'&&c.storage)||null;
    if(cliente)return cliente;

    const cfg=window.PORTAL_CONFIG||window.portalConfig||window.SUPABASE_CONFIG||window.config||{};
    let url=textoConfig(window,'SUPABASE_URL','supabaseUrl');
    let chave=textoConfig(window,'SUPABASE_ANON_KEY','SUPABASE_KEY','supabaseAnonKey');
    try{url=url||(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'')}catch(e){}
    try{chave=chave||(typeof SUPABASE_ANON_KEY!=='undefined'?SUPABASE_ANON_KEY:'')||(typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'')}catch(e){}
    url=url||textoConfig(cfg,'SUPABASE_URL','supabaseUrl','url');
    chave=chave||textoConfig(cfg,'SUPABASE_ANON_KEY','SUPABASE_KEY','supabaseAnonKey','anonKey','key');
    if(url&&chave&&window.supabase?.createClient){
      cliente=window.supabase.createClient(url,chave,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    }
    return cliente;
  }

  function status(texto,erro=false){
    const topo=document.querySelector('.portal-auto-status');
    if(topo){topo.classList.toggle('error',erro);topo.classList.toggle('ok',!erro);const alvo=topo.querySelector('span')||topo;alvo.textContent=texto}
    console[erro?'error':'info']('QualiNET:',texto);
  }

  async function usuarioAtual(c){
    try{return (await c.auth.getUser()).data.user||null}catch(e){return null}
  }

  async function sessaoValida(c){
    try{return !!(await c.auth.getSession()).data.session}catch(e){return false}
  }

  async function salvarArquivo(c,conteudo){
    const blob=new Blob([conteudo],{type:'text/plain;charset=utf-8'});
    const {error}=await c.storage.from(BUCKET).upload(ARQUIVO,blob,{contentType:'text/plain;charset=utf-8',upsert:true,cacheControl:'0'});
    if(error)throw error;
  }

  async function salvarTabelas(c,conteudo,nomeArquivo,u){
    const atual={id:1,conteudo,nome_arquivo:nomeArquivo||'ultima-leitura.txt',atualizado_em:new Date().toISOString(),atualizado_por:u?.id||null,atualizado_por_email:u?.email||null};
    const historico={conteudo,nome_arquivo:atual.nome_arquivo,salvo_em:atual.atualizado_em,salvo_por:atual.atualizado_por,salvo_por_email:atual.atualizado_por_email};
    const r1=await c.from(TABELA_ATUAL).upsert(atual,{onConflict:'id'});if(r1.error)throw r1.error;
    const r2=await c.from(TABELA_HISTORICO).insert(historico);if(r2.error)throw r2.error;
  }

  window.qualinetSalvarUltimaLeitura=async function(conteudo,nomeArquivo,totalMedicoes){
    if(carregando)return false;
    if(!String(conteudo||'').trim()||Number(totalMedicoes||0)<1){
      alert('Nenhuma medição válida foi encontrada. A última base compartilhada foi mantida.');return false;
    }
    const c=obterCliente();
    if(!c){alert('Supabase não localizado. Verifique portal-config.js. A medição anterior foi mantida.');return false}
    if(!(await sessaoValida(c))){alert('A sessão do portal não foi localizada. Entre novamente no portal antes de salvar.');return false}
    try{
      status('Salvando última medição...');
      const u=await usuarioAtual(c);
      await salvarArquivo(c,conteudo);
      await salvarTabelas(c,conteudo,nomeArquivo,u);
      status('Última medição retida e compartilhada');
      const msg=document.getElementById('msg');
      if(msg)msg.textContent+=` Base compartilhada salva agora${u?.email?' por '+u.email:''}.`;
      return true;
    }catch(e){
      status('Erro ao salvar a última medição: '+(e.message||e),true);
      alert('A análise foi gerada, mas não foi salva para outros usuários. A medição anterior foi mantida. Detalhe: '+(e.message||e));
      return false;
    }
  };

  async function lerArquivo(c){
    const {data,error}=await c.storage.from(BUCKET).download(ARQUIVO+'?v='+Date.now());
    if(error)throw error;
    return await data.text();
  }

  async function lerTabela(c){
    const {data,error}=await c.from(TABELA_ATUAL).select('conteudo,atualizado_em,atualizado_por_email').eq('id',1).maybeSingle();
    if(error)throw error;
    return data||null;
  }

  async function aplicar(conteudo,meta){
    if(!conteudo?.trim())return false;
    const campo=document.getElementById('rawText');if(!campo)return false;
    carregando=true;window.__qualinetCarregandoOnline=true;
    campo.value=conteudo;
    if(typeof window.processar==='function')window.processar();
    window.__qualinetCarregandoOnline=false;carregando=false;
    const msg=document.getElementById('msg');
    if(msg)msg.textContent+=` Última medição compartilhada carregada${meta?.atualizado_em?' em '+new Date(meta.atualizado_em).toLocaleString('pt-BR'):''}${meta?.atualizado_por_email?' por '+meta.atualizado_por_email:''}.`;
    status('Última medição compartilhada carregada');
    return true;
  }

  async function carregar(tentativa=0){
    const c=obterCliente();
    if(!c){if(tentativa<20)return setTimeout(()=>carregar(tentativa+1),500);status('Supabase não localizado no portal-config.js',true);return}
    if(!(await sessaoValida(c))){if(tentativa<10)return setTimeout(()=>carregar(tentativa+1),500);status('Sessão do portal não localizada',true);return}
    try{
      status('Carregando última medição...');
      const meta=await lerTabela(c).catch(()=>null);
      let conteudo='';
      try{conteudo=await lerArquivo(c)}catch(e){if(meta?.conteudo)conteudo=meta.conteudo;else throw e}
      if(!(await aplicar(conteudo,meta)))status('Ainda não existe medição compartilhada');
    }catch(e){status('Não foi possível carregar a base: '+(e.message||e),true)}
  }

  if(document.readyState==='complete')setTimeout(carregar,350);
  else window.addEventListener('load',()=>setTimeout(carregar,350),{once:true});
})();
