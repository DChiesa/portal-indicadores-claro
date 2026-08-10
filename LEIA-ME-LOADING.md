# Tela de loading do Portal de Indicadores

## Arquivos
- `index.html`: portal original com o overlay de loading integrado.
- `index.aprovado.backup.html`: cópia exata do `index.html` anterior à alteração.
- `loading_tecnico_portal.html`: versão isolada para visualização e manutenção do loading.

## Como publicar
1. Envie todos os arquivos e pastas deste pacote para a raiz do repositório GitHub, substituindo os arquivos atuais.
2. Preserve a mesma estrutura de pastas.
3. O endereço do GitHub Pages continua apontando para `index.html`.
4. Faça uma atualização forçada no navegador com `Ctrl+F5` após a publicação.

## Funcionamento
- O loading aparece imediatamente ao entrar no endereço do portal.
- O portal, Supabase e demais scripts carregam normalmente atrás do overlay.
- Após o evento `load`, o overlay permanece por 4 segundos e desaparece com transição suave.
- O botão `Continuar agora` permite fechar o loading imediatamente.
- As funções globais `showPortalLoading()` e `hidePortalLoading()` ficam disponíveis para uso futuro.

## Como alterar o tempo
No final de `index.html`, procure por:
```js
setTimeout(hideLoading, 4000);
```
Troque `4000` pelo tempo desejado em milissegundos. Exemplo: `2500` equivale a 2,5 segundos.

## Como restaurar exatamente a versão anterior
1. Exclua o `index.html` modificado.
2. Renomeie `index.aprovado.backup.html` para `index.html`.
3. Publique novamente no GitHub.

## Escopo da alteração
Nenhum relatório HTML foi alterado. Não houve mudança em autenticação, Supabase, permissões, filtros, cards, links, visualizador ou cálculos.
