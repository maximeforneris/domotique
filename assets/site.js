/* ═══════════════════════════════════════════════════════════════════════
   SITE — navigation, recherche, et suivi de lecture cote eleve.

   CE FICHIER N'ENREGISTRE RIEN AILLEURS QUE DANS LE NAVIGATEUR.
   localStorage, rien d'autre : pas de compte, pas de requete, pas de cookie.
   Un site sans l'option « comptes: » ne traite donc aucune donnee
   personnelle. Avec l'option, c'est comptes.js — et lui seul — qui recopie
   dans la base ce que ce fichier annonce. Voir GUIDE-SITE.md et GUIDE-COMPTES.md.

   Charge APRES kit.js, qui a deja monte les outils, les quiz et les schemas.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
"use strict";

var socle = document.querySelector("[data-site]");
var CLE = "fed." + (socle ? socle.getAttribute("data-site") : "site") + ".lu";

function lues() {
  try { return JSON.parse(localStorage.getItem(CLE) || "{}") || {}; }
  catch (e) { return {}; }        /* navigation privee, stockage bloque */
}
function noter(etat) {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {}
}

/* ───────────────────────────────── le bouton « lu » d'une page */
var bouton = document.querySelector(".barre-site .lu");
if (bouton) {
  var id = bouton.getAttribute("data-lu");
  var peint = function () {
    var on = !!lues()[id];
    bouton.setAttribute("aria-pressed", on ? "true" : "false");
    bouton.textContent = on ? "Lu" : "Marquer comme lu";
  };
  bouton.addEventListener("click", function () {
    var e = lues();
    if (e[id]) { delete e[id]; } else { e[id] = Date.now(); }
    noter(e); peint();
    /* annonce pour comptes.js ; sans lui, personne n'ecoute */
    document.dispatchEvent(new CustomEvent("lu", { detail: { id: id, on: !!e[id] } }));
  });
  peint();
}

/* ───────────────────────────────── la jauge de lecture
   Sur une page de six mille pixels, la barre de défilement du navigateur ne
   dit rien de la progression dans le cours. Ce trait, lui, la dit. */
var jauge = document.querySelector("#jauge-lecture i");
if (jauge) {
  var majJauge = function () {
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    /* rien à parcourir — page courte, ou vue qui affiche tout d'un coup :
       une jauge pleine y serait un mensonge. On la retire. */
    if (total <= 0) {
      jauge.parentNode.hidden = true;
      jauge.style.width = "0%";
      return;
    }
    jauge.parentNode.hidden = false;
    var part = Math.min(100, Math.max(0, 100 * (window.pageYOffset || h.scrollTop) / total));
    jauge.style.width = part.toFixed(1) + "%";
  };
  window.addEventListener("scroll", majJauge, { passive: true });
  window.addEventListener("resize", majJauge);
  /* un repli qu'on déroule change la hauteur de la page */
  document.addEventListener("toggle", majJauge, true);
  majJauge();
}

/* ───────────────────────────────── les marques sur la frise de l'accueil */
var frise = document.querySelectorAll(".frise li[data-id]");
if (frise.length) {
  var etat = lues(), n = 0, total = 0;
  [].forEach.call(frise, function (li) {
    if (!li.querySelector("a")) return;      /* page pas encore produite */
    total++;
    if (etat[li.getAttribute("data-id")]) { li.classList.add("lu"); n++; }
  });
  var compteur = document.getElementById("compteur-lu");
  if (compteur) {
    if (!n) {
      compteur.textContent = "";
    } else {
      compteur.textContent = n + " page" + (n > 1 ? "s" : "") + " sur " +
        total + " marquée" + (n > 1 ? "s" : "") + " comme lue" + (n > 1 ? "s" : "") + " — ";
      var z = document.createElement("button");
      z.type = "button"; z.className = "raz"; z.textContent = "tout remettre à zéro";
      z.addEventListener("click", function () {
        if (!window.confirm("Effacer vos marques de lecture sur cet appareil ?")) return;
        noter({}); window.location.reload();
      });
      compteur.appendChild(z);
    }
  }
}

/* ───────────────────────────────── l'avancement, séquence par séquence
   Une jauge par séquence, et une invitation à reprendre là où on s'est
   arrêté. Tout se déduit du même localStorage : rien n'est demandé à
   personne, et rien ne sort de l'appareil. */
if (frise.length) {
  var etat2 = lues();

  [].forEach.call(document.querySelectorAll(".sequence"), function (seq) {
    var cartes = [].slice.call(seq.querySelectorAll(".frise li[data-id]"))
                   .filter(function (li) { return li.querySelector("a"); });
    if (!cartes.length) return;
    var n = cartes.filter(function (li) {
      return etat2[li.getAttribute("data-id")];
    }).length;

    var j = document.createElement("p");
    j.className = "jauge";
    j.innerHTML = '<i><b style="width:' + Math.round(100 * n / cartes.length) +
                  '%"></b></i>' + n + " / " + cartes.length + " lue" +
                  (n > 1 ? "s" : "");
    var ol = seq.querySelector(".frise");
    seq.insertBefore(j, ol);
  });

  /* reprendre : la première page non lue après la dernière lue */
  var boite = document.getElementById("reprendre");
  if (boite) {
    var toutes = [].slice.call(document.querySelectorAll(".frise li[data-id]"))
                   .filter(function (li) { return li.querySelector("a"); });
    var dernier = -1, quand = 0;
    toutes.forEach(function (li, i) {
      var t = etat2[li.getAttribute("data-id")];
      if (t && t > quand) { quand = t; dernier = i; }
    });
    var suite = null;
    for (var i = dernier + 1; i < toutes.length; i++) {
      if (!etat2[toutes[i].getAttribute("data-id")]) { suite = toutes[i]; break; }
    }
    if (!suite) {                       /* rien après : la première non lue */
      for (var k = 0; k < toutes.length; k++) {
        if (!etat2[toutes[k].getAttribute("data-id")]) { suite = toutes[k]; break; }
      }
    }
    if (suite) {
      var a = suite.querySelector("a");
      boite.innerHTML = (dernier >= 0 ? "Reprendre : " : "Commencer par : ") +
        '<a href="' + a.getAttribute("href") + '">' +
        suite.querySelector(".n").textContent + " — " +
        suite.querySelector(".t").textContent + "</a>";
      boite.hidden = false;
    }
  }
}

/* ───────────────────────────────── la banque d'exercices
   La page ne porte aucun exercice : elle les repertorie et renvoie a la seance
   qui les contient. Elle relit l'etat pose par kit.js — meme localStorage,
   meme appareil, et rien qui en sorte. */
var liste = document.getElementById("exos-liste");
if (liste) {
  var CLE_EXO = "fed." + (socle ? socle.getAttribute("data-site") : "site") + ".exo";
  var faits = function () {
    try { return JSON.parse(localStorage.getItem(CLE_EXO) || "{}") || {}; }
    catch (e) { return {}; }
  };
  var fSavoir = document.getElementById("f-savoir"),
      fReste  = document.getElementById("f-reste"),
      segs    = [].slice.call(document.querySelectorAll("#f-type-seg .seg")),
      compte  = document.getElementById("compteur-exo"),
      avancee = document.getElementById("avancee-exo"),
      rien    = document.getElementById("rien-exo"),
      blocs   = [].slice.call(liste.querySelectorAll(".bloc-savoir")),
      lignes  = [].slice.call(liste.querySelectorAll(".exo-ligne"));

  var MOT = { juste: "réussi", faux: "à revoir", vu: "commencé" };
  var typeChoisi = "";

  var peindre = function () {
    var etat = faits(), s = fSavoir.value, n = 0, reussis = 0;

    lignes.forEach(function (li) {
      var pastille = li.querySelector(".etat");
      var e = etat[pastille.getAttribute("data-exo")];
      pastille.className = "etat" + (e ? " " + e : "");
      pastille.textContent = MOT[e] || "";
      if (e === "juste") reussis++;
      var ok = (!s || li.getAttribute("data-savoir") === s) &&
               (!typeChoisi || li.getAttribute("data-type") === typeChoisi) &&
               (!fReste.checked || e !== "juste");
      li.hidden = !ok;
      if (ok) n++;
    });

    /* un savoir dont plus aucune ligne n'est visible disparaît avec son titre */
    blocs.forEach(function (b) {
      b.hidden = !b.querySelector(".exo-ligne:not([hidden])");
    });
    if (rien) rien.hidden = n > 0;

    if (avancee) {
      avancee.hidden = !reussis;
      var part = Math.round(100 * reussis / lignes.length);
      avancee.querySelector("b").style.width = part + "%";
      compte.textContent = reussis + " / " + lignes.length + " réussis" +
        (n < lignes.length ? "  —  " + n + " affiché" + (n > 1 ? "s" : "") : "");
    }
  };

  segs.forEach(function (b) {
    b.addEventListener("click", function () {
      segs.forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      typeChoisi = b.getAttribute("data-type");
      peindre();
    });
  });
  fSavoir.addEventListener("change", peindre);
  fReste.addEventListener("change", peindre);
  peindre();
}

/* ───────────────────────────────── le filtre de la boîte à outils
   Dix-neuf outils sur sept thèmes : chercher par le nom va plus vite que
   parcourir. On filtre sur le nom de l'outil, accents et casse ignorés. */
var qOutil = document.getElementById("q-outil");
if (qOutil) {
  var cartes = [].slice.call(document.querySelectorAll(".carte-outil")),
      themes = [].slice.call(document.querySelectorAll(".theme-outils")),
      rienO  = document.getElementById("rien-outil");
  var aplati = function (t) {
    return (t.normalize ? t.normalize("NFD").replace(/[̀-ͯ]/g, "") : t)
             .toLowerCase();
  };
  cartes.forEach(function (c) { c._t = aplati(c.textContent); });
  qOutil.addEventListener("input", function () {
    var q = aplati(qOutil.value.trim()), n = 0;
    cartes.forEach(function (c) {
      var ok = !q || c._t.indexOf(q) >= 0;
      c.hidden = !ok;
      if (ok) n++;
    });
    themes.forEach(function (t) {
      t.hidden = !t.querySelector(".carte-outil:not([hidden])");
    });
    if (rienO) rienO.hidden = n > 0;
  });
}

/* ───────────────────────────────── les annales, filtrées par savoir
   On ne révise pas une session, on révise un thème : les parties d'une U41
   sont indépendantes et se rendent sur copies séparées. */
var fAnnale = document.getElementById("f-annale");
if (fAnnale) {
  var parties  = [].slice.call(document.querySelectorAll(".partie")),
      sessions = [].slice.call(document.querySelectorAll(".session")),
      cptA     = document.getElementById("compteur-annale");

  var trier = function () {
    var s = fAnnale.value, n = 0, minutes = 0;
    parties.forEach(function (p) {
      var ok = !s || (" " + p.getAttribute("data-savoirs") + " ").indexOf(" " + s + " ") >= 0;
      p.hidden = !ok;
      if (ok) {
        n++;
        var m = /(\d+)\s*min/.exec(p.querySelector(".meta").textContent);
        if (m) minutes += parseInt(m[1], 10);
      }
    });
    sessions.forEach(function (se) {
      se.classList.toggle("vide", !se.querySelector(".partie:not([hidden])"));
    });
    cptA.textContent = n + " partie" + (n > 1 ? "s" : "") +
      (s ? " sur " + parties.length : "") +
      (minutes ? " — " + String(Math.round(minutes / 60 * 10) / 10).replace(".", ",") + " h de travail" : "");
  };
  fAnnale.addEventListener("change", trier);
  trier();
}

/* ───────────────────────────────── recherche plein texte
   RECHERCHE est pose par recherche.js, un fichier de script et non un JSON :
   un fetch() est refuse quand la page est ouverte en file://, un <script>
   passe. Le site marche donc aussi depuis un dossier ou une cle USB. */
var champ = document.getElementById("q");
if (champ && typeof RECHERCHE !== "undefined") {
  var sortie = document.getElementById("resultats");

  var plat = function (s) {
    return s.normalize ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                       : s.toLowerCase();
  };
  RECHERCHE.forEach(function (p) { p._t = plat(p.titre + " " + p.texte); });

  var extrait = function (texte, terme) {
    var i = plat(texte).indexOf(terme);
    if (i < 0) return texte.slice(0, 150) + "…";
    var a = Math.max(0, i - 60), b = Math.min(texte.length, i + terme.length + 110);
    var t = (a ? "…" : "") + texte.slice(a, b) + (b < texte.length ? "…" : "");
    var j = plat(t).indexOf(terme);
    return t.slice(0, j) + "<mark>" + t.slice(j, j + terme.length) + "</mark>" +
           t.slice(j + terme.length);
  };

  var echap = function (s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  var chercher = function () {
    var q = plat(champ.value.trim());
    document.body.classList.toggle("en-recherche", q.length >= 2);
    if (q.length < 2) { sortie.innerHTML = ""; return; }
    var mots = q.split(/\s+/);
    var trouves = [];
    RECHERCHE.forEach(function (p) {
      var score = 0;
      for (var i = 0; i < mots.length; i++) {
        var c = p._t.split(mots[i]).length - 1;
        if (!c) return;                                   /* tous les mots */
        score += c + (plat(p.titre).indexOf(mots[i]) >= 0 ? 25 : 0);
      }
      trouves.push({ p: p, s: score });
    });
    trouves.sort(function (a, b) { return b.s - a.s; });
    if (!trouves.length) {
      sortie.innerHTML = '<li class="rien">Rien sur « ' + echap(champ.value.trim()) +
                         " » dans les pages du site.</li>";
      return;
    }
    sortie.innerHTML = trouves.slice(0, 20).map(function (r) {
      return '<li><a href="' + r.p.url + '"><span class="ou">' + echap(r.p.ou) +
             "</span>" + echap(r.p.titre) + '</a><p class="extrait">' +
             extrait(r.p.texte, mots[0]) + "</p></li>";
    }).join("");
  };

  /* ── suggestions pendant la frappe ──────────────────────────────────────
     Le champ seul oblige a deviner le vocabulaire du site. La liste propose
     les titres de pages ET de sections : on voit ou l'on va avant d'y aller,
     et l'ancre mene au bon endroit de la page. */
  var propositions = [];
  RECHERCHE.forEach(function (p) {
    propositions.push({ lib: p.titre, ou: p.ou, url: p.url, page: 1,
                        _t: plat(p.titre + " " + (p.onglet || "")) });
    (p.sections || []).forEach(function (s) {
      propositions.push({ lib: s[1], ou: p.onglet || p.titre,
                          url: p.url + "#" + s[0], page: 0, _t: plat(s[1]) });
    });
    /* les replis : les entrees les plus precises, donc les plus utiles a qui
       cherche un point de detail. Ils pointent sur leur section. */
    (p.replis || []).forEach(function (s) {
      propositions.push({ lib: s[1], ou: p.onglet || p.titre, repli: 1,
                          url: p.url + "#" + s[0], page: 0, _t: plat(s[1]) });
    });
  });

  var liste = document.createElement("ul");
  liste.className = "suggestions";
  liste.setAttribute("role", "listbox");
  liste.hidden = true;
  /* Le champ est enveloppe : sans cela la liste se positionne sur le parent,
     qui contient aussi les resultats — elle tombait donc SOUS eux au lieu de
     sortir du champ. */
  var boite = document.createElement("div");
  boite.className = "a-suggestions";
  champ.parentNode.insertBefore(boite, champ);
  boite.appendChild(champ);
  boite.appendChild(liste);
  champ.setAttribute("autocomplete", "off");

  var sel = -1, vus = [];

  var poser = function () {
    [].forEach.call(liste.children, function (li, i) {
      li.classList.toggle("on", i === sel);
      if (i === sel) li.scrollIntoView({ block: "nearest" });
    });
    champ.setAttribute("aria-activedescendant", sel >= 0 ? "sug" + sel : "");
  };

  var fermer = function () { liste.hidden = true; sel = -1; };

  var suggerer = function () {
    var q = plat(champ.value.trim());
    sel = -1;
    if (q.length < 2) { fermer(); return; }
    var m = [];
    propositions.forEach(function (o) {
      var i = o._t.indexOf(q);
      if (i < 0) return;
      /* un debut de mot vaut mieux qu'un milieu, une page mieux qu'une section */
      var deb = i === 0 || /[\s'’(]/.test(o._t.charAt(i - 1));
      m.push({ o: o, s: (deb ? 100 : 0) + o.page * 10 - i * 0.1 });
    });
    if (!m.length) { fermer(); return; }
    m.sort(function (a, b) { return b.s - a.s; });
    vus = m.slice(0, 8).map(function (x) { return x.o; });
    liste.innerHTML = vus.map(function (o, i) {
      var j = plat(o.lib).indexOf(q), lib = echap(o.lib);
      if (j >= 0) lib = echap(o.lib.slice(0, j)) + "<mark>" +
                        echap(o.lib.slice(j, j + q.length)) + "</mark>" +
                        echap(o.lib.slice(j + q.length));
      /* Le libelle est enferme dans un span : sans lui, chaque <mark> devient
         un element de la flexbox et la ligne se disperse. */
      var dedans = o.page ? '<b>' + lib + '</b>'
                          : (o.repli ? '<i>' + lib + '</i>' : lib);
      return '<li id="sug' + i + '" role="option"><a href="' + o.url + '">' +
             '<span class="lib">' + dedans + '</span>' +
             '<span class="ou">' + echap(o.ou) + "</span></a></li>";
    }).join("");
    liste.hidden = false;
    poser();
  };

  champ.addEventListener("input", function () { chercher(); suggerer(); });
  champ.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!liste.hidden) { fermer(); return; }
      champ.value = ""; chercher(); return;
    }
    if (liste.hidden || !vus.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % vus.length; poser(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel <= 0 ? vus.length : sel) - 1; poser(); }
    else if (e.key === "Enter" && sel >= 0) { e.preventDefault(); location.href = vus[sel].url; }
  });
  champ.addEventListener("blur", function () { setTimeout(fermer, 150); });
  champ.addEventListener("focus", suggerer);
  /* la barre oblique met le curseur dans le champ, comme partout ailleurs */
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== champ) {
      e.preventDefault(); champ.focus();
    }
  });
}

})();
