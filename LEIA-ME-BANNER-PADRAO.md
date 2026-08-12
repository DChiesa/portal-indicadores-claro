# Pacote GitHub - banner padrao dos relatorios

## Alteracao aplicada
- Banner de referencia `banner-eventos-operacionais-cluster.png` inserido no topo dos relatorios.
- Botao **Voltar para o portal** restaurado, apontando para `index.html`.
- Botao **Abrir em janela** restaurado, abrindo a pagina atual em nova guia/janela conforme a politica do navegador.
- Nenhum calculo, filtro, grafico, consulta ao Supabase, fonte de dados ou script de negocio foi alterado.

## Publicacao no GitHub
1. Extraia este pacote mantendo a estrutura de pastas.
2. Envie todo o conteudo da pasta `portal-indicadores-claro-main` para a raiz do repositorio.
3. Confirme que `banner-eventos-operacionais-cluster.png` ficou na mesma pasta dos HTMLs.
4. Faça commit e push. Em GitHub Pages, mantenha o arquivo `.nojekyll`.

## Ponto de restauracao
O pacote original recebido foi mantido fora deste ZIP como `portal-indicadores-claro-main.zip`. Para reverter manualmente um unico relatorio, remova dos HTMLs apenas os blocos marcados com `ALTERACAO: banner novo` e `banner-claro-padrao-css`.

## Escopo
Foram padronizados 22 HTMLs de relatorio. Paginas administrativas, portal principal, login, central de atualizacao e visualizador generico foram mantidos sem alteracao para evitar impacto de navegacao e permissao.
