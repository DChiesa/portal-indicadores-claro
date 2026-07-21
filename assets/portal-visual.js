/*
  Aplicador visual nao destrutivo.
  Nao interfere em login, logout, Supabase, href, onclick, IDs ou listeners existentes.
*/
(function () {
  "use strict";

  var MAP = [
    { tests: ["qualinet", "quali net"], image: "qualinet.jpg" },
    { tests: ["tnps"], image: "tnps.jpg" },
    { tests: ["nr35", "nr 35"], image: "nr35.jpg" },
    { tests: ["certidao", "certidão"], image: "certidao.jpg" },
    { tests: ["quebra total", "quebra_total"], image: "quebra-total.jpg" },
    { tests: ["recomendacoes", "recomendações"], image: "recomendacoes.jpg" },
    { tests: ["flag 24h", "flag_24h", "flag24h"], image: "flag-24h.jpg" },
    { tests: ["tecnico certificado", "técnico certificado", "tecnico_certificado"], image: "tecnico-certificado.jpg" },
    { tests: ["manifestos rrs", "manif rrs", "manifestos"], image: "manifestos-rrs.jpg" }
  ];

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, " ").replace(/\s+/g, " ");
  }

  function getImage(card) {
    var haystack = normalize((card.textContent || "") + " " + (card.getAttribute("href") || "") + " " + (card.getAttribute("data-file") || ""));
    for (var i = 0; i < MAP.length; i++) {
      if (MAP[i].tests.some(function (term) { return haystack.indexOf(normalize(term)) !== -1; })) return MAP[i].image;
    }
    return "qualinet.jpg";
  }

  function isCandidate(el) {
    if (!el || el.closest("header, nav, footer")) return false;
    if (el.dataset.portalVisualApplied === "1") return false;
    var text = normalize((el.textContent || "") + " " + (el.getAttribute("href") || ""));
    return MAP.some(function (item) {
      return item.tests.some(function (term) { return text.indexOf(normalize(term)) !== -1; });
    });
  }

  function findCards() {
    var selectors = [
      "a.card", "a.panel-card", "a.dashboard-card", "a.indicator-card",
      ".card[href]", ".panel-card[href]", ".dashboard-card[href]",
      "main a[href]", ".content a[href]"
    ];
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selectors.join(",")));
    return nodes.filter(isCandidate).filter(function (el, index, arr) { return arr.indexOf(el) === index; });
  }

  function apply() {
    document.body.classList.add("portal-visual-ready");
    var cards = findCards();
    if (!cards.length) return;

    var counts = new Map();
    cards.forEach(function(card){
      var parent = card.parentElement;
      counts.set(parent, (counts.get(parent) || 0) + 1);
    });
    var grid = Array.from(counts.entries()).sort(function(a,b){ return b[1]-a[1]; })[0][0];
    if (grid) grid.classList.add("portal-cards-grid");

    cards.forEach(function (card) {
      card.dataset.portalVisualApplied = "1";
      card.classList.add("portal-indicator-card");

      var original = document.createElement("div");
      original.className = "portal-card-original-content";
      while (card.firstChild) original.appendChild(card.firstChild);

      var thumb = document.createElement("div");
      thumb.className = "portal-card-thumbnail";
      thumb.setAttribute("aria-hidden", "true");
      thumb.style.backgroundImage = 'url("assets/miniaturas/' + getImage(card) + '")';

      var badge = document.createElement("span");
      badge.className = "portal-card-open-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "›";

      card.appendChild(thumb);
      card.appendChild(original);
      card.appendChild(badge);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
})();
