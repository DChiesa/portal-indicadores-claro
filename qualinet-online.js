/* Persistencia da ultima leitura QualiNET no Supabase.
   Nao altera calculos, filtros, cores ou estrutura interna do relatorio. */
(function(){
  const TABELA='qualinet_ultima_analise';
  let cliente=null;

  function obterCliente(){
    if(cliente)return cliente;
    const candidatos=[window.supabaseClient,window.supabase_cliente,window.sb,window._supabase,window.portalSupabase];
    cliente=candidatos.find(c=>c&&typeof c.from==='function')||null;
    if(cliente)return cliente;
    let url='',chave='';
    try{url=window.SUPABASE_URL||(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'')||window.PORTAL_CONFIG?.SUPABASE_URL||window.portalConfig?.supabaseUrl||''}catch(e){}
    try{chave=window.SUPABASE_ANON_KEY||(typeof SUPABASE_ANON_KEY!=='undefined'?SUPABASE_ANON_KEY:'')||window.SUPABASE_KEY||(typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'')||window.PORTAL_CONFIG?.SUPABASE_ANON_KEY||window.portalConfig?.supabaseAnonKey||''}catch(e){}
    if(url&&chave&&window.supabase?.createClient)cliente=window.supabase.createClient(url,chave);
    return cliente;
  }

  async function usuarioAtual(c){
    try{return (await c.auth.getUser()).data.user||null}catch(e){return null}
  }

  window.qualinetSalvarUltimaLeitura=async function(conteudo,nomeArquivo){
    const c=obterCliente();
    if(!c){console.warn('QualiNET: cliente Supabase nao localizado em portal-config.js.');return}
    try{
      const u=await usuarioAtual(c);
      const payload={id:1,conteudo,nome_arquivo:nomeArquivo||null,atualizado_em:new Date().toISOString(),atualizado_por:u?.id||null,atualizado_por_email:u?.email||null};
      const {error}=await c.from(TABELA).upsert(payload,{onConflict:'id'});
      if(error)throw error;
      console.info('QualiNET: ultima leitura salva online.');
    }catch(e){
      console.error('QualiNET: analise local concluida, mas a leitura online nao foi salva.',e);
      alert('A análise foi concluída, mas não foi possível salvar a última leitura online. Verifique a permissão no Supabase.');
    }
  };

  async function carregar(){
    const c=obterCliente();
    if(!c)return;
    try{
      const {data,error}=await c.from(TABELA).select('conteudo,nome_arquivo,atualizado_em,atualizado_por_email').eq('id',1).maybeSingle();
      if(error)throw error;
      if(!data?.conteudo)return;
      const campo=document.getElementById('rawText');
      if(!campo)return;
      window.__qualinetCarregandoOnline=true;
      campo.value=data.conteudo;
      if(typeof window.processar==='function')window.processar();
      window.__qualinetCarregandoOnline=false;
      const msg=document.getElementById('msg');
      if(msg&&data.atualizado_em){
        const quando=new Date(data.atualizado_em).toLocaleString('pt-BR');
        msg.textContent+=` Última leitura online: ${quando}${data.atualizado_por_email?' por '+data.atualizado_por_email:''}.`;
      }
    }catch(e){window.__qualinetCarregandoOnline=false;console.error('QualiNET: nao foi possivel carregar a ultima leitura online.',e)}
  }

  window.addEventListener('load',()=>setTimeout(carregar,250));
})();
