/* Correcao exclusiva do Estudo de Codigos Cluster.
   Nao altera calculos, filtros, visual, permissoes ou outros relatorios. */
(function(){
  'use strict';

  if (typeof PC === 'undefined' || typeof sb === 'undefined' || typeof PATH === 'undefined') {
    console.error('Correcao Estudo de Codigos: configuracao original nao encontrada.');
    return;
  }

  async function obterArrayBuffer(){
    /* Mantem o metodo original como primeira tentativa. */
    const original = await sb.storage.from(BUCKET).download(PATH);
    if (!original.error && original.data) return await original.data.arrayBuffer();

    /* Fallback exclusivo: URL publica com cache-buster. */
    const pub = sb.storage.from(BUCKET).getPublicUrl(PATH);
    const publicUrl = pub && pub.data && pub.data.publicUrl;
    if (!publicUrl) throw original.error || new Error('URL publica nao gerada.');

    const sep = publicUrl.includes('?') ? '&' : '?';
    const response = await fetch(publicUrl + sep + 'v=' + Date.now(), {cache:'no-store'});
    if (!response.ok) {
      const originalMsg = original.error && original.error.message ? original.error.message : 'falha no download original';
      throw new Error('HTTP ' + response.status + ' ao baixar ' + PATH + ' (' + originalMsg + ')');
    }
    return await response.arrayBuffer();
  }

  load = async function(){
    const st = $('#status');
    try {
      st.className = 'status';
      st.textContent = 'Validando sessao...';

      const sessionResult = await sb.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data.session) throw new Error('sessao do portal nao encontrada');
      if (!PATH) throw new Error('caminho da base nao configurado para ' + FILE);

      st.textContent = 'Baixando estudo codigo.xlsx...';
      const ab = await obterArrayBuffer();
      if (!ab || !ab.byteLength) throw new Error('arquivo vazio: ' + PATH);

      const url = URL.createObjectURL(new Blob([WORKER], {type:'text/javascript'}));
      const w = new Worker(url);

      await new Promise(function(ok,no){
        w.onmessage = function(e){
          if (e.data.err) return no(new Error(e.data.err));
          data = e.data.data;
          base = e.data.base;
          descs = e.data.desc;
          w.terminate();
          URL.revokeObjectURL(url);
          ok();
        };
        w.onerror = function(e){
          w.terminate();
          URL.revokeObjectURL(url);
          no(new Error(e.message));
        };
        w.postMessage(ab,[ab]);
      });

      fill($('#cluster'),uniq(data.map(function(r){return r[0];})));
      fill($('#cidade'),uniq(data.map(function(r){return r[1];})));
      fill($('#produto'),uniq(data.map(function(r){return r[3];})));
      buildView();
      st.className = 'status ok';
      st.textContent = 'Analitico carregado: ' + fmt(data.length) + ' registros - ' + ml(view.cur);
    } catch(e) {
      console.error('Estudo de Codigos - falha de base:', {bucket:BUCKET,path:PATH,error:e});
      st.className = 'status err';
      st.textContent = 'Erro ao carregar automaticamente o Supabase: ' + (e.message || String(e));
    }
  };

  /* A chamada original pode estar em andamento; esta executa novamente com o fallback. */
  setTimeout(function(){ load(); }, 250);
})();
