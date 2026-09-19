/* VIVANT — option « vivant: oui » de SITE.md. Voir vivant.css pour ce que
   chaque bloc fait. Pas de dépendance, pas d'état : six gestes, et rien n'est
   enregistré. Tout s'éteint sous « réduire les animations ». */
(function () {
  "use strict";
  var reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js-vivant");

  /* 2. le diagramme enthalpique : le même que celui de la charte, en
     ligne dans la page pour qu'on puisse l'animer. Le fluide tourne
     1 → 2 → 3 → 4 → 1 ; la chaleur entre par en dessous à l'évaporateur
     et sort par le dessus au condenseur. */
  var CYCLE = "M232 150 L268 70 H100 V150 H232";
  var SVG =
    "<svg viewBox='0 0 320 200' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
    "<g class='va-axe' fill='none' stroke-width='1'><path d='M28 178 H300'/><path d='M28 178 V16'/></g>" +
    "<g class='va-iso' fill='none' stroke-width='1' stroke-dasharray='3 3'><path d='M28 70 H300'/><path d='M28 150 H300'/></g>" +
    "<path class='va-sat' d='M70 170 C86 112 112 58 150 40 C190 58 228 112 245 170' fill='none' stroke-width='1.8'/>" +
    "<circle class='va-satp' cx='150' cy='40' r='2.6'/>" +
    "<g class='va-chaud' fill='none' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path class='va-f va-f1' d='M190 62 V50 M186 54 l4 -4 4 4'/><path class='va-f va-f2' d='M215 62 V50 M211 54 l4 -4 4 4'/><path class='va-f va-f3' d='M240 62 V50 M236 54 l4 -4 4 4'/></g>" +
    "<g class='va-froid' fill='none' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path class='va-f va-f1' d='M140 172 V160 M136 164 l4 -4 4 4'/><path class='va-f va-f2' d='M166 172 V160 M162 164 l4 -4 4 4'/><path class='va-f va-f3' d='M192 172 V160 M188 164 l4 -4 4 4'/></g>" +
    "<path class='va-cycle' d='" + CYCLE + " Z' fill='none' stroke-width='2.4' stroke-linejoin='round'/>" +
    "<path class='va-flux' d='" + CYCLE + " Z' fill='none' stroke-width='1.2' stroke-dasharray='5 9' stroke-linecap='round'/>" +
    "<g class='va-pts'><circle cx='232' cy='150' r='3.6'/><circle cx='268' cy='70' r='3.6'/><circle cx='100' cy='70' r='3.6'/><circle cx='100' cy='150' r='3.6'/></g>" +
    "<circle class='va-pt' r='4.2'><animateMotion dur='7s' repeatCount='indefinite' path='" + CYCLE + "'/></circle>" +
    "<g class='va-num' font-family='monospace' font-size='10'><text x='236' y='165'>1</text><text x='274' y='66'>2</text><text x='90' y='66'>3</text><text x='88' y='163'>4</text></g>" +
    "<g class='va-ax' font-family='monospace' font-size='9'><text x='300' y='192' text-anchor='end'>h</text><text x='22' y='20' text-anchor='end'>p</text></g>" +
    "</svg>";
  /* Le diagramme est celui de la charte « fluides » : on ne le pose que si
     elle est chargée. Les autres chartes gardent leur en-tête tel quel. */
  var tete = document.querySelector(".page[data-site]:not([data-page]) header.tete");
  var fluides = document.querySelector('link[rel="stylesheet"][href*="fluides.css"]');
  if (tete && fluides) {
    var d = document.createElement("div");
    d.className = "tete-anim";
    d.innerHTML = SVG;
    tete.appendChild(d);
    if (reduit && d.firstChild.pauseAnimations) d.firstChild.pauseAnimations();
  }

  /* 3. les compteurs montent jusqu'à leur valeur, en 900 ms, freinés à
     l'arrivée. Sans animation, le chiffre est là dès le départ. */
  if (!reduit && window.requestAnimationFrame) {
    Array.prototype.forEach.call(document.querySelectorAll(".chiffres b"), function (b) {
      var v = parseInt(b.textContent, 10);
      if (isNaN(v)) return;
      var t0 = null, dur = 900;
      b.textContent = "0";
      requestAnimationFrame(function pas(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        k = 1 - Math.pow(1 - k, 3);
        b.textContent = String(Math.round(v * k));
        if (k < 1) requestAnimationFrame(pas);
      });
    });
  }


  /* 1 bis. la page suivante est déjà chargée quand on clique : le
     navigateur la précharge dès que la main s'approche du lien. */
  if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
    var s = document.createElement("script");
    s.type = "speculationrules";
    s.textContent = JSON.stringify({ prefetch: [{ where: { href_matches: "/*" }, eagerness: "moderate" }] });
    document.head.appendChild(s);
  } else {
    var vus = {};
    document.addEventListener("pointerenter", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.origin !== location.origin || vus[a.href]) return;
      vus[a.href] = 1;
      var l = document.createElement("link");
      l.rel = "prefetch"; l.href = a.href;
      document.head.appendChild(l);
    }, true);
  }
})();
