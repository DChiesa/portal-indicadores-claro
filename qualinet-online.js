/* Persistencia da ultima leitura QualiNET no Supabase.
   Mantem exatamente uma medicao compartilhada: a ultima analise valida.
   Nao altera calculos, filtros, cores ou estrutura interna do relatorio. */
(function(){
  const TABELA='qualinet_ultima_analise';
  const ID_UNICO=1;
  let cliente=null;
  let carregamentoConcluido=false;

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

  function informar(texto){
    const msg=document.getElementById('msg');
    if(msg)msg.textContent=texto;
  }

  window.qualinetSalvarUltimaLeitura=async function(conteudo,nomeArquivo,totalMedicoes){
    if(!String(conteudo||'').trim()||Number(totalMedicoes||0)<1){
      console.warn('QualiNET: tentativa de substituir a ultima leitura sem medicao valida foi bloqueada.');
      return false;
    }
    const c=obterCliente();
    if(!c){
      console.warn('QualiNET: cliente Supabase nao localizado em portal-config.js.');
      alert('A análise foi feita, mas a última medição não foi salva online porque a conexão com o Supabase não foi localizada.');
      return false;
    }
    try{
      const u=await usuarioAtual(c);
      const payload={
        id:ID_UNICO,
        conteudo,
        nome_arquivo:nomeArquivo||null,
        atualizado_em:new Date().toISOString(),
        atualizado_por:u?.id||null,
        atualizado_por_email:u?.email||null
      };
      const {error}=await c.from(TABELA).upsert(payload,{onConflict:'id'});
      if(error)throw error;
      informar(`Contratos analisados: ${totalMedicoes}. Última medição salva online e mantida até a próxima substituição.`);
      console.info('QualiNET: ultima medicao valida salva online.');
      return true;
    }catch(e){
      console.error('QualiNET: analise local concluida, mas a leitura online nao foi salva.',e);
      alert('A análise foi concluída, mas não foi possível salvar a última medição online. A medição anterior foi mantida. Verifique a permissão no Supabase.');
      return false;
    }
  };

  async function carregar(tentativa=0){
    if(carregamentoConcluido)return;
    const c=obterCliente();
    if(!c){
      if(tentativa<20)setTimeout(()=>carregar(tentativa+1),500);
      return;
    }
    try{
      const {data,error}=await c.from(TABELA).select('conteudo,nome_arquivo,atualizado_em,atualizado_por_email').eq('id',ID_UNICO).maybeSingle();
      if(error)throw error;
      carregamentoConcluido=true;
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
        msg.textContent+=` Última medição online: ${quando}${data.atualizado_por_email?' por '+data.atualizado_por_email:''}.`;
      }
    }catch(e){
      window.__qualinetCarregandoOnline=false;
      console.error('QualiNET: nao foi possivel carregar a ultima leitura online.',e);
      if(tentativa<3)setTimeout(()=>carregar(tentativa+1),1000);
    }
  }

  if(document.readyState==='complete')setTimeout(()=>carregar(),250);
  else window.addEventListener('load',()=>setTimeout(()=>carregar(),250),{once:true});
})();
