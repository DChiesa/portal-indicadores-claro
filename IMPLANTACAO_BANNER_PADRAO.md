# Implantação do banner padrão dos relatórios

## O que foi alterado
- Cabeçalho único em HTML/CSS, sem banner estático por relatório.
- Título central obtido do `<title>` de cada página.
- Marca Claro à esquerda, construída em HTML/CSS.
- Área Serviços Técnicos BI e certificado de propriedade à direita.
- Saudação `Olá:` preenchida pela sessão/localStorage quando disponível.
- Campo `Última data no relatório` mostrado somente quando uma data válida é localizada no conteúdo.
- Botão **Voltar para o portal** usa caminho absoluto resolvido para `index.html`, sem depender do histórico.
- Botão **Abrir em nova janela** abre o relatório atual em nova guia/janela.
- A lógica interna, filtros, gráficos, tabelas, Supabase e bases dos relatórios não foi alterada.

## Arquivos compartilhados obrigatórios
- `portal-report-header.css`
- `portal-report-header.js`

Esses dois arquivos devem permanecer na mesma pasta dos HTMLs.

## Passo a passo para publicar
1. Faça uma cópia de segurança da pasta atual do portal.
2. Extraia este pacote mantendo todos os nomes e a estrutura de pastas.
3. Substitua os arquivos do repositório pelos arquivos deste pacote.
4. Confirme que `portal-report-header.css` e `portal-report-header.js` ficaram no mesmo diretório de `index.html`.
5. Publique/commit normalmente no servidor ou GitHub Pages.
6. Limpe o cache do navegador com `Ctrl+F5`.
7. Abra `index.html`, faça login e acesse pelo menos um relatório de cada categoria.

## Validação antes de liberar
- O título do banner corresponde ao relatório aberto.
- `Olá:` mostra o usuário conectado ou o fallback `usuário conectado`.
- O certificado mostra `Demétrius Chiesa`.
- **Voltar para o portal** retorna para `index.html` na mesma guia.
- **Abrir em nova janela** abre outra guia com o mesmo relatório.
- Quando o relatório contém datas, aparece a maior data válida encontrada.
- Filtros, gráficos, downloads, carregamento Supabase e atualização de base continuam funcionando.
- Teste também em tela estreita/celular.

## Como aplicar em um HTML novo
Adicione dentro de `<head>`:

```html
<link rel="stylesheet" href="./portal-report-header.css">
<script src="./portal-report-header.js" defer></script>
```

Defina um `<title>` correto. O texto será usado automaticamente como nome do relatório.

## Reversão
Restaure o backup, ou remova as duas referências acima de cada HTML. Nenhuma função de dados dos relatórios foi modificada.
