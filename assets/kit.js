/* ═══════════════════════════════════════════════════════════════════════
   KIT WEB — sommaire actif, replis, quiz et outils de calcul.
   Inline dans chaque page par webseance.py. Un outil s'appelle depuis le
   markdown par   ::: {.outil data-outil="paroi"}   :::
   Ajouter un outil = ajouter une entree dans OUTILS, rien d'autre.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ───────────────────────────────── formatage francais */
function fr(x,n){
  if(!isFinite(x))return "—";
  var s=Math.abs(x)<Math.pow(10,-n)/2?0:x;
  return s.toFixed(n).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g," ");
}
function frs(x,n){
  if(!isFinite(x))return "—";
  return (Math.abs(x)<Math.pow(10,-n)/2?0:x).toFixed(n).replace(".",",");
}
function E(t,a,h){var e=document.createElement(t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(h!==undefined)e.innerHTML=h;return e;}

/* État partagé : les outils se chaînent comme les séances.
   L'enchaînement est EXPLICITE et ordonné — paroi donne U, bilan donne GV,
   energie consomme GV. Un mécanisme d'abonnement se rappellerait lui-même. */
var ETAT={u_mur:0.30, gv:0, surface:0, phi:0};
function suivant(nom){var o=OUTILS[nom];if(o&&o._recalc)o._recalc();}

/* ───────────────────────────────── sommaire actif */
var liens=[].slice.call(document.querySelectorAll("nav.somm a"));
if(liens.length&&"IntersectionObserver" in window){
  var cibles=liens.map(function(a){return document.getElementById(a.getAttribute("href").slice(1));})
                  .filter(Boolean);
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      liens.forEach(function(a){
        a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id);});
    });
  },{rootMargin:"-45% 0px -50% 0px"});
  cibles.forEach(function(c){io.observe(c);});
}

/* ───────────────────────────────── quiz */
[].forEach.call(document.querySelectorAll(".quiz"),function(q){
  var items=[].slice.call(q.querySelectorAll("li"));
  var total=items.length, faits=0, justes=0;
  var chap=E("p",{"class":"chapeau"},"Vérifiez-vous — "+total+" questions");
  q.insertBefore(chap,q.firstChild);
  var score=E("p",{"class":"score"},"");
  items.forEach(function(li){
    /* « énoncé : bonne / mauvaise / mauvaise »  — le gras marque la bonne */
    var html=li.innerHTML;
    /* separateurs : " : " avant les reponses, " | " entre elles.
       Ni l'un ni l'autre n'apparait dans un enonce ou une reponse — ce que
       « / » ne garantissait pas : il coupait dans </strong> et dans R = 1 / U. */
    var coupe=html.lastIndexOf(" : ");
    var enonce=coupe>0?html.slice(0,coupe):html;
    var reps=(coupe>0?html.slice(coupe+3):"").split(/\s*\|\s*/);
    var bloc=E("div",{"class":"qq"});
    bloc.appendChild(E("p",{},enonce.trim()));
    var ch=E("div",{"class":"choix"});
    var repondu=false;
    reps.forEach(function(r){
      var juste=/<strong>/.test(r);
      var txt=r.replace(/<\/?strong>/g,"").trim();
      if(!txt)return;
      var b=E("button",{type:"button"},txt);
      b.addEventListener("click",function(){
        if(repondu)return;
        repondu=true;faits++;if(juste)justes++;
        [].forEach.call(ch.children,function(o){o.disabled=true;});
        b.classList.add(juste?"juste":"faux");
        if(!juste)[].forEach.call(ch.children,function(o,i){
          if(/<strong>/.test(reps[i]))o.classList.add("juste");});
        score.textContent=justes+" / "+faits+" — "+
          (faits<total?(total-faits)+" restantes":"terminé");
      });
      ch.appendChild(b);
    });
    bloc.appendChild(ch);
    q.appendChild(bloc);
  });
  var ul=q.querySelector("ul");if(ul)ul.remove();
  q.appendChild(score);
});

/* ───────────────────────────────── exercices
   L'exercice DIT SI C'EST JUSTE et rappelle la methode. Il ne donne jamais la
   valeur attendue ni la redaction : le corrige reste au polycopie. Voir
   GUIDE-WEB.md. La reponse voyage obscurcie dans data-a — de quoi ne pas
   tomber dessus en survolant la page, rien de plus. */
var socleExo=document.querySelector("[data-site]");
var CLE_EXO="fed."+(socleExo?socleExo.getAttribute("data-site"):"autonome")+".exo";
function exoLu(){try{return JSON.parse(localStorage.getItem(CLE_EXO)||"{}")||{};}
                 catch(e){return {};}}
/* L'evenement annonce aussi CE QUI A ETE TAPE et le genre du bloc. Le kit
   n'en fait rien ; comptes.js, charge sur un site a comptes, l'ecoute pour
   le recopier dans la base. Sans lui, ces deux champs ne vont nulle part. */
function exoNote(id,etat,valeur,genre){var t=exoLu();t[id]=etat;
  try{localStorage.setItem(CLE_EXO,JSON.stringify(t));}catch(e){}
  document.dispatchEvent(new CustomEvent("exo",{detail:{id:id,etat:etat,
    valeur:valeur===undefined?null:valeur,genre:genre||"exercice"}}));}
function aplat(s){
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function memeTexte(a,b){
  /* « 1,5 m », « 1,5m » et « 1.5 m » sont la meme reponse : l'eleve tape vite,
     et l'espace avant l'unite n'est pas ce qu'on evalue. */
  var x=aplat(a),y=aplat(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function aplatSignes(s){
  /* Comme aplat(), mais on GARDE les symboles qui portent le sens :
     + - * / ^ ( ) [ ] ; < > = et le point decimal. Sans eux, « 5x - 5 »
     et « 5x + 5 » deviennent la meme reponse, et « [0 ; 10[ » vaut
     « ]0 ; 10] ». Les variantes typographiques sont ramenees a la touche
     du clavier : moins, fois, divise, virgule decimale. */
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase()
         .replace(/[\u2212\u2013\u2014]/g,"-")
         .replace(/[\u00d7\u22c5\u2217]/g,"*")
         .replace(/[\u00f7\u2215]/g,"/")
         .replace(/,/g,".")
         .replace(/[^a-z0-9+\-*\/^()\[\];<>=.]+/g," ").trim();
}
function memeSignes(a,b){
  var x=aplatSignes(a),y=aplatSignes(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function nombre(s){
  /* « 1 376 » et « 1,38 » et « 1.38e3 » : l'eleve tape comme il veut */
  /* le moins typographique d'un clavier de tablette vaut le tiret du clavier */
  var t=s.replace(/\s/g,"").replace(",",".").replace(/[−–]/g,"-");   /* \s couvre U+00A0 et U+202F */
  return t===""?NaN:parseFloat(t);
}
[].forEach.call(document.querySelectorAll(".exo"),function(ex){
  var sec;try{sec=JSON.parse(atob(ex.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=ex.getAttribute("data-exo"), typ=sec.t;
  var indice=ex.querySelector(".indice"), liste=ex.querySelector(".verifier");
  var zone=E("div",{"class":"reponse"}), verdict=E("p",{"class":"verdict"},"");
  var champ, valider;

  if(typ==="justification"){
    champ=E("textarea",{rows:"4","aria-label":"Votre justification",
      placeholder:"Rédigez votre réponse, puis comparez-la aux points à vérifier."});
    valider=E("button",{type:"button","class":"btn"},"J’ai répondu");
  }else{
    champ=E("input",{type:"text",autocomplete:"off","aria-label":"Votre réponse",
      inputmode:typ==="calcul"?"decimal":"text",
      placeholder:typ==="calcul"?"Votre valeur":"Votre réponse"});
    valider=E("button",{type:"button","class":"btn"},"Vérifier");
  }
  var ligne=E("div",{"class":"saisie"});
  ligne.appendChild(champ);
  if(typ==="calcul"&&sec.u)ligne.appendChild(E("span",{"class":"unite"},sec.u));
  ligne.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    ligne.appendChild(bi);
  }
  zone.appendChild(ligne);zone.appendChild(verdict);
  ex.appendChild(zone);
  if(indice)ex.appendChild(indice);

  function juge(){
    if(typ==="justification"){
      /* rien a corriger automatiquement : on rend les points a verifier, et
         l'eleve se juge lui-meme. Les points disent QUOI verifier, pas la
         reponse. */
      if(!champ.value.trim()){verdict.className="verdict";
        verdict.textContent="Rédigez d’abord votre réponse.";return;}
      if(liste&&liste.hidden){
        liste.hidden=false;
        [].forEach.call(liste.children,function(li){
          var b=E("input",{type:"checkbox"});
          b.addEventListener("change",compte);
          li.insertBefore(b,li.firstChild);
        });
        ex.appendChild(liste);
        valider.textContent="Relire ma réponse";
      }
      compte();
      return;
    }
    var ok;
    if(typ==="calcul"){
      var v=nombre(champ.value);
      if(isNaN(v)){verdict.className="verdict";
        verdict.textContent="Entrez une valeur numérique.";return;}
      ok=sec.v!==null&&Math.abs(v-sec.v)<=Math.abs(sec.v)*(sec.tol/100);
    }else{
      var r=aplat(champ.value);
      ok=!!r&&(sec.a||[]).some(function(a){return aplat(a)===r;});
    }
    verdict.className="verdict "+(ok?"juste":"faux");
    verdict.textContent=ok?"C’est juste."
      :(typ==="calcul"?"Ce n’est pas la valeur attendue. Reprenez la méthode."
                      :"Ce n’est pas la réponse attendue.");
    exoNote(id,ok?"juste":"faux",champ.value,"exercice");
    if(!ok&&indice)indice.hidden=false;
  }
  function compte(){
    var b=liste?[].slice.call(liste.querySelectorAll("input")):[];
    var n=b.filter(function(x){return x.checked;}).length;
    verdict.className="verdict "+(n===b.length&&b.length?"juste":"");
    verdict.textContent=n+" point"+(n>1?"s":"")+" sur "+b.length+
      (n===b.length&&b.length?" — votre réponse est complète.":" à vérifier dans votre réponse.");
    exoNote(id,n===b.length&&b.length?"juste":"vu",champ.value,"justification");
  }
  valider.addEventListener("click",juge);
  champ.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&typ!=="justification"){e.preventDefault();juge();}
  });
  var fait=exoLu()[id];
  if(fait==="juste"){ex.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussi.";}
});



/* ───────────────────────────────── series d'entrainement
   Le pendant web du tableau a remplir du polycopie : une case par item, on
   remplit, on verifie tout d'un coup. Meme regle que l'exercice — la page dit
   juste ou faux et rappelle la methode, elle ne donne jamais la reponse.
   Une case fausse GARDE ce qui a ete tape : on corrige, on ne recommence pas. */
[].forEach.call(document.querySelectorAll(".serie"),function(se){
  var sec;try{sec=JSON.parse(atob(se.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=se.getAttribute("data-serie");
  var items=[].slice.call(se.querySelectorAll("ol.items > li"));
  var indice=se.querySelector(".indice"), cases=[];

  items.forEach(function(li,i){
    var d=(sec.i||[])[i]||{};
    var rep=E("span",{"class":"rep"});
    var inp=E("input",{type:"text",autocomplete:"off",
      inputmode:d.v!==undefined?"decimal":"text",
      "class":d.v!==undefined?"":"texte",
      "aria-label":"Réponse"});
    rep.appendChild(inp);
    if(sec.u)rep.appendChild(E("span",{"class":"unite"},sec.u));
    var mq=E("span",{"class":"marque"},"");
    rep.appendChild(mq);
    li.appendChild(rep);
    cases.push({e:inp,m:mq,d:d,li:li});
    inp.addEventListener("input",function(){
      li.classList.remove("juste","faux");mq.textContent="";
    });
    inp.addEventListener("keydown",function(ev){
      if(ev.key!=="Enter")return;
      ev.preventDefault();
      if(i+1<cases.length)cases[i+1].e.focus();else juger();
    });
  });

  function juste(d,txt){
    if(!txt.trim())return null;                    /* non traite */
    if(d.v!==undefined){
      var v=nombre(txt);
      if(isNaN(v))return false;
      return Math.abs(v-d.v)<=Math.abs(d.v)*(sec.tol/100)+1e-9;
    }
    var cmp=(sec.m==="signes")?memeSignes:memeTexte;
    return !!txt.trim()&&(d.a||[]).some(function(a){return cmp(a,txt);});
  }

  var verdict=E("p",{"class":"verdict"},"");
  var valider=E("button",{type:"button","class":"btn"},"Vérifier la série");
  var barre=E("div",{"class":"barre"});
  barre.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    barre.appendChild(bi);
  }
  se.appendChild(barre);se.appendChild(verdict);
  if(indice)se.appendChild(indice);

  function juger(){
    var bons=0,faux=0,vides=0;
    cases.forEach(function(c){
      var r=juste(c.d,c.e.value);
      c.li.classList.remove("juste","faux");
      if(r===null){vides++;c.m.textContent="";return;}
      if(r){bons++;c.li.classList.add("juste");c.m.textContent="✓";}
      else {faux++;c.li.classList.add("faux");c.m.textContent="✗";}
    });
    var tout=bons===cases.length;
    verdict.className="verdict "+(tout?"juste":(faux?"faux":""));
    var reste=[];
    if(faux)reste.push(faux+" à reprendre");
    if(vides)reste.push(vides+(vides>1?" non traitées":" non traitée"));
    verdict.textContent=tout
      ?"La série entière est juste."
      :bons+" sur "+cases.length+(reste.length?" — "+reste.join(", "):"")+".";
    if(tout)se.classList.add("fait");else se.classList.remove("fait");
    exoNote(id,tout?"juste":(faux?"faux":"vu"),
      bons+"/"+cases.length+" : "+cases.map(function(c){return c.e.value.trim()||"·";}).join(" | "),
      "serie");
    if(faux&&indice)indice.hidden=false;
  }
  valider.addEventListener("click",juger);

  if(exoLu()[id]==="juste"){
    se.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussie.";
  }
});

/* ═══════════════════════════════════════════════════ PSYCHROMETRIE
   Une seule implementation pour tout le depot. Pression atmospherique
   normale ; au-dela de 100 degres l'air ne sature plus, d'ou le garde-fou
   de rDe qui renverrait sinon une humidite absolue negative. */
var PATM=101325;
function pvs(t){return 610.94*Math.exp(17.625*t/(t+243.04));}      /* Pa */
function rDe(t,hr){                                                /* g/kg as */
  var p=hr/100*pvs(t);
  if(p>=PATM*0.999)return 1e4;
  return 622*p/(PATM-p);
}
function hrDe(t,r){var p=PATM*r/(622+r);return Math.min(100,100*p/pvs(t));}
function enth(t,r){return 1.006*t+r/1000*(2501+1.83*t);}           /* kJ/kg as */
function rosee(t,hr){
  var a=17.625,b=243.04,g=Math.log(Math.max(hr,0.01)/100)+a*t/(b+t);
  return b*g/(a-g);
}
function volSpec(t,r){return 287.06*(t+273.15)*(1+1.6078*r/1000)/PATM;}
function bulbeH(t,r){                                              /* dichotomie */
  var lo=-30,hi=t,m,i;
  for(i=0;i<60;i++){
    m=(lo+hi)/2;
    var rs=rDe(m,100)/1000;                                        /* kg/kg */
    var rc=(rs*(2501-2.326*m)-1.006*(t-m))/(2501+1.86*t-4.186*m);
    if(rc*1000>r)hi=m;else lo=m;
  }
  return m;
}
function tDeH(h,r){return (h-2.501*r)/(1.006+0.00183*r);}          /* adiabatique */

/* ═══════════════════════════════════════════════════ LA REMISE
   « ::: {.remise} » — l'eleve tape l'identifiant donne en classe et produit un
   FICHIER TEXTE de ses reponses. Tout se fabrique dans le navigateur : rien
   n'est envoye, rien n'est enregistre. Le fichier atterrit dans ses
   telechargements, et c'est lui qui le remet.

   Ce qui est collecte : les series et les exercices qui se trouvent entre le
   dernier titre de niveau 1 AVANT le bloc, et le bloc lui-meme. Un bilan pose
   sous « # Exercices bilan de sequence » ne ramasse donc pas les exercices de
   la seance qui le precede. */
[].forEach.call(document.querySelectorAll(".remise"),function(bl){

  /* --- la portee : du dernier h1 qui precede, jusqu'ici --- */
  function portee(){
    var tous=[].slice.call(document.querySelectorAll("h1, .serie, .exo"));
    var fin=tous.indexOf(bl), debut=0;
    if(fin<0){
      /* le bloc n'est pas dans la liste : on se repere sur sa position */
      fin=tous.length;
      for(var k=0;k<tous.length;k++){
        if(bl.compareDocumentPosition(tous[k])&Node.DOCUMENT_POSITION_PRECEDING)continue;
        fin=k;break;
      }
    }
    for(var i=fin-1;i>=0;i--){ if(tous[i].tagName==="H1"){debut=i+1;break;} }
    return tous.slice(debut,fin).filter(function(n){return n.tagName!=="H1";});
  }

  function titreDe(n){
    /* le titre d'un exercice et celui d'une serie sont des h4 ; le repli sur
       un <strong> attrapait le premier mot gras de l'enonce. */
    var t=n.querySelector("h3, h4, .titre-exo");
    return t?t.textContent.trim():"(sans titre)";
  }

  function lignesSerie(se){
    var out=["SÉRIE — "+titreDe(se),""];
    [].forEach.call(se.querySelectorAll("ol.items > li"),function(li,i){
      var inp=li.querySelector("input");
      var lib=li.cloneNode(true);
      var rep=lib.querySelector(".rep"); if(rep)rep.parentNode.removeChild(rep);
      var etat=li.classList.contains("juste")?"juste"
              :li.classList.contains("faux") ?"faux":"non vérifié";
      out.push("  "+(i+1)+". "+lib.textContent.replace(/\s+/g," ").trim());
      out.push("     réponse : "+((inp&&inp.value.trim())||"(vide)")+"   ["+etat+"]");
    });
    out.push("");
    return out;
  }

  function lignesExo(ex){
    var out=["EXERCICE — "+titreDe(ex),""];
    var champ=ex.querySelector("textarea, .saisie input");
    out.push("  réponse : "+((champ&&champ.value.trim())||"(vide)"));
    var liste=ex.querySelector(".verifier");
    if(liste&&!liste.hidden){
      var pts=[].slice.call(liste.children), n=0;
      pts.forEach(function(li){
        var cb=li.querySelector("input[type=checkbox]");
        var coche=cb&&cb.checked; if(coche)n++;
        var txt=li.cloneNode(true);
        var c=txt.querySelector("input"); if(c)c.parentNode.removeChild(c);
        out.push("     ["+(coche?"x":" ")+"] "+txt.textContent.replace(/\s+/g," ").trim());
      });
      out.splice(2,0,"  points retrouvés : "+n+" sur "+pts.length);
    }
    var v=ex.querySelector(".verdict");
    if(v&&v.textContent.trim())out.push("  verdict : "+v.textContent.trim());
    out.push("");
    return out;
  }

  function fabriquer(id){
    var titre=(document.querySelector("h1")||{textContent:"Bilan"}).textContent.trim();
    var onglet=document.title||titre;
    var d=new Date(), deux=function(n){return (n<10?"0":"")+n;};
    var out=["BILAN DE SÉQUENCE",
             "Page       : "+onglet,
             "Identifiant: "+id,
             "Date       : "+deux(d.getDate())+"/"+deux(d.getMonth()+1)+"/"+d.getFullYear()
                            +" à "+deux(d.getHours())+"h"+deux(d.getMinutes()),
             new Array(64).join("="), ""];
    var n=0;
    portee().forEach(function(el){
      if(el.classList.contains("serie")){out=out.concat(lignesSerie(el));n++;}
      else if(el.classList.contains("exo")){out=out.concat(lignesExo(el));n++;}
    });
    if(!n)out.push("(aucune réponse trouvée sur cette page)","");
    out.push(new Array(64).join("-"));
    out.push("Fichier produit dans le navigateur de l'élève.");
    out.push("Rien n'a été envoyé, rien n'a été enregistré ailleurs.");
    return out.join("\r\n");
  }

  function nettoie(s){
    return (s.normalize?s.normalize("NFD").replace(/[̀-ͯ]/g,""):s)
           .replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase()
           || "sans-identifiant";
  }

  /* --- l'interface --- */
  bl.appendChild(E("p",{"class":"remise-quoi"},
    "Tapez l’<b>identifiant donné en classe</b>, puis produisez le fichier. "+
    "Il se fabrique <b>dans votre navigateur</b> : rien n’est envoyé, rien n’est "+
    "enregistré. Le fichier part dans vos téléchargements, et c’est vous qui le remettez."));
  var ligne=E("div",{"class":"saisie"});
  var ident=E("input",{type:"text",autocomplete:"off","aria-label":"Identifiant",
    placeholder:"identifiant donné en classe"});
  var bouton=E("button",{type:"button","class":"btn"},"Produire mon fichier");
  var dit=E("p",{"class":"verdict"},"");
  ligne.appendChild(ident);ligne.appendChild(bouton);
  bl.appendChild(ligne);bl.appendChild(dit);

  bouton.addEventListener("click",function(){
    var id=ident.value.trim();
    if(!id){dit.className="verdict";dit.textContent="Tapez d’abord votre identifiant.";
      ident.focus();return;}
    var texte=fabriquer(id);
    try{
      var b=new Blob([texte],{type:"text/plain;charset=utf-8"});
      var u=URL.createObjectURL(b), a=E("a",{href:u,download:"bilan-"+nettoie(id)+".txt"});
      document.body.appendChild(a);a.click();
      document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(u);},2000);
      dit.className="verdict juste";
      dit.textContent="Fichier produit : bilan-"+nettoie(id)+".txt";
    }catch(e){
      dit.className="verdict faux";
      dit.textContent="Le navigateur a refusé le téléchargement. Recopiez vos réponses à la main.";
    }
  });
  ident.addEventListener("keydown",function(ev){
    if(ev.key==="Enter"){ev.preventDefault();bouton.click();}
  });
});



/* ═══════════════════════════════════════════════════ SCHEMAS
   Dessines ici, pas repris du polycopie : vectoriels, ils suivent le theme
   sombre, et « paroi-coupe » se redessine avec le composeur de paroi. */
var SCHEMAS={}, SCHEMA_MAJ=[];
/* declare ici : le schema des degres-jours s'en sert autant que l'outil */
var VILLES=[["Nice",1100],["Marseille",1300],["Bordeaux",1700],["Lyon",2200],
            ["Paris",2300],["Rouen",2400],["Strasbourg",2700],["Briançon",3800]];
var NS="http://www.w3.org/2000/svg";
function S(t,a,txt){
  var e=document.createElementNS(NS,t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function V(c){return "var(--"+c+")";}

/* ─────────── coupe de paroi, avec le profil de temperature ─────────── */


/* ─────────── l'echelle des conductivites ─────────── */



/* ─────────── les trois modes de transfert ─────────── */


/* ─────────── les degres-jours, ville par ville ─────────── */



/* ─────────── la double etiquette du DPE ─────────── */
/* Seuils : arrete du 31 mars 2021, cas general. La classe retenue est la plus
   mauvaise des deux — c'est tout l'objet de ce schema. */
var DPE=[
 {c:"A",cep:70, ges:6,  e:"#2e8b3d",g:"#ece9f4"},
 {c:"B",cep:110,ges:11, e:"#6bb43a",g:"#d5cee8"},
 {c:"C",cep:180,ges:30, e:"#b5cf3c",g:"#bab0da"},
 {c:"D",cep:250,ges:50, e:"#f2d81f",g:"#8878c4"},
 {c:"E",cep:330,ges:70, e:"#f0a52a",g:"#6f5ab4"},
 {c:"F",cep:420,ges:100,e:"#e6702c",g:"#57409f"},
 {c:"G",cep:1e9,ges:1e9,e:"#d02b20",g:"#3d2a80"}
];


/* ─────────── chaine d'energie et chaine d'information ─────────── */
SCHEMAS["deux-chaines"]=function(el){
  var W=760,H=352;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Chaîne d'énergie et chaîne d'information"});
  function boite(x,y,l,h,titre,ex,coul){
    svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,rx:3,fill:V(coul),
      opacity:"0.13"}));
    svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x+l/2,y:y+21,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    ex.split("|").forEach(function(m,k){
      svg.appendChild(S("text",{x:x+l/2,y:y+40+k*15,"text-anchor":"middle",
        "class":"s-nom"},m));
    });
  }
  function fl(x1,y1,x2,y2,coul){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-8*Math.cos(a),y2:y2-8*Math.sin(a),
      stroke:V(coul),"stroke-width":"2.5"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-10*Math.cos(a-0.4))+","+(y2-10*Math.sin(a-0.4))+
      "L"+(x2-10*Math.cos(a+0.4))+","+(y2-10*Math.sin(a+0.4))+"Z",fill:V(coul)}));
  }
  /* le couloir entre les deux rangees accueille les deux liaisons :
     les ordres a y=152, le compte rendu a y=190. Rien ne croise un titre. */
  var YI=44, YE=244, HB=74;
  function coude(pts,coul){
    var d="M"+pts[0][0]+","+pts[0][1];
    for(var i=1;i<pts.length;i++)d+="L"+pts[i][0]+","+pts[i][1];
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V(coul),"stroke-width":"2.5",
      "stroke-linejoin":"round"}));
    var a=pts[pts.length-1], b=pts[pts.length-2];
    var an=Math.atan2(a[1]-b[1],a[0]-b[0]);
    svg.appendChild(S("path",{d:"M"+a[0]+","+a[1]+
      "L"+(a[0]-10*Math.cos(an-0.4))+","+(a[1]-10*Math.sin(an-0.4))+
      "L"+(a[0]-10*Math.cos(an+0.4))+","+(a[1]-10*Math.sin(an+0.4))+"Z",fill:V(coul)}));
  }
  svg.appendChild(S("text",{x:14,y:26,"class":"s-tit",fill:V("froid")},
    "CHAÎNE D'INFORMATION — elle transporte la décision"));
  [[74,"ACQUÉRIR","sonde de départ|sonde extérieure"],
   [292,"TRAITER","régulateur|automate"],
   [510,"COMMUNIQUER","GTB, superviseur|Modbus, BACnet"]].forEach(function(b){
    boite(b[0],YI,176,HB,b[1],b[2],"froid");
  });
  fl(250,YI+HB/2,292,YI+HB/2,"froid");
  fl(468,YI+HB/2,510,YI+HB/2,"froid");

  svg.appendChild(S("text",{x:14,y:YE-14,"class":"s-tit",fill:V("chaud")},
    "CHAÎNE D'ÉNERGIE — elle transporte la puissance"));
  [[14,"ALIMENTER","réseau de chaleur"],
   [170,"DISTRIBUER","vanne 3 voies|motorisée"],
   [326,"CONVERTIR","échangeur|circulateur"],
   [482,"TRANSMETTRE","réseau de|tuyauteries"]].forEach(function(b){
    boite(b[0],YE,140,HB,b[1],b[2],"chaud");
  });
  [156,312,468].forEach(function(x){fl(x,YE+HB/2,x+14,YE+HB/2,"chaud");});

  /* la matiere d'oeuvre */
  svg.appendChild(S("rect",{x:640,y:YE,width:106,height:HB,rx:3,fill:V("vert"),
    opacity:"0.13"}));
  svg.appendChild(S("rect",{x:640,y:YE,width:106,height:HB,rx:3,fill:"none",
    stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("text",{x:693,y:YE+26,"text-anchor":"middle","class":"s-tit",
    fill:V("vert")},"LE LOCAL"));
  svg.appendChild(S("text",{x:693,y:YE+48,"text-anchor":"middle","class":"s-nom"},
    "à 19 °C"));
  fl(626,YE+HB/2,640,YE+HB/2,"chaud");

  /* les deux chaines se rejoignent — en equerre, dans le couloir */
  coude([[380,YI+HB],[380,152],[240,152],[240,YE]],"froid");
  svg.appendChild(S("text",{x:310,y:146,"text-anchor":"middle","class":"s-nom",
    fill:V("froid")},"ordres"));
  coude([[693,YE],[693,190],[150,190],[150,YI+HB]],"vert");
  svg.appendChild(S("text",{x:430,y:184,"text-anchor":"middle","class":"s-nom",
    fill:V("vert")},"compte rendu — ce que mesure la sonde"));

  svg.appendChild(S("text",{x:W/2,y:H-14,"text-anchor":"middle","class":"s-nom"},
    "Elles se rejoignent à l'actionneur. C'est presque toujours là que l'épreuve interroge."));
  el.appendChild(svg);
};


/* ─────────── topologies d'une ligne, et les trois longueurs ─────────── */
SCHEMAS["topologies-bus"]=function(el){
  var W=760,H=318;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Topologies autoris\u00e9es sur une ligne de bus et les trois longueurs \u00e0 v\u00e9rifier"});
  function noeud(x,y,c){
    svg.appendChild(S("circle",{cx:x,cy:y,r:5.5,fill:V(c||"froid")}));
  }
  function cadre(x,titre,verdict,coul){
    svg.appendChild(S("rect",{x:x,y:16,width:176,height:132,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"1.6","stroke-opacity":".55"}));
    svg.appendChild(S("text",{x:x+88,y:34,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    svg.appendChild(S("text",{x:x+88,y:138,"text-anchor":"middle","class":"s-nom",
      fill:V(coul)},verdict));
  }
  function trait(x1,y1,x2,y2){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V("encre2"),
      "stroke-width":"2"}));
  }
  /* ligne */
  cadre(6,"LIGNE","autoris\u00e9e","vert");
  trait(26,88,166,88);
  for(var i=0;i<5;i++)noeud(30+i*34,88);
  /* etoile */
  cadre(196,"\u00c9TOILE","autoris\u00e9e","vert");
  var cx=284,cy=88;
  [[-52,-26],[-52,26],[52,-26],[52,26],[0,-40]].forEach(function(d){
    trait(cx,cy,cx+d[0],cy+d[1]); noeud(cx+d[0],cy+d[1]);
  });
  noeud(cx,cy,"chaud");
  /* arbre */
  cadre(386,"ARBRE","autoris\u00e9e","vert");
  trait(410,70,550,70);
  for(var k=0;k<4;k++){
    var x=416+k*44; noeud(x,70); trait(x,70,x,108); noeud(x,108);
  }
  /* anneau */
  cadre(576,"ANNEAU","interdite","chaud");
  svg.appendChild(S("rect",{x:610,y:62,width:110,height:52,fill:"none",
    stroke:V("encre2"),"stroke-width":"2"}));
  [[610,62],[720,62],[610,114],[720,114]].forEach(function(p){noeud(p[0],p[1]);});
  svg.appendChild(S("path",{d:"M598,50L732,126M598,126L732,50",stroke:V("chaud"),
    "stroke-width":"4","stroke-linecap":"round"}));
  /* les trois longueurs */
  svg.appendChild(S("rect",{x:14,y:176,width:58,height:26,rx:3,fill:V("chaud"),
    opacity:"0.13"}));
  svg.appendChild(S("rect",{x:14,y:176,width:58,height:26,rx:3,fill:"none",
    stroke:V("chaud"),"stroke-width":"1.6"}));
  svg.appendChild(S("text",{x:43,y:193,"text-anchor":"middle","class":"s-lab"},"ALIM"));
  trait(72,189,700,189);
  for(var j=0;j<6;j++)noeud(140+j*112,189);
  svg.appendChild(S("text",{x:140,y:212,"text-anchor":"middle","class":"s-nom"},
    "participant"));
  svg.appendChild(S("text",{x:700,y:212,"text-anchor":"end","class":"s-nom"},
    "le plus \u00e9loign\u00e9"));
  [["1",'de l\'alimentation au participant le plus \u00e9loign\u00e9',"350 m"],
   ["2","entre deux participants quelconques","700 m"],
   ["3","de c\u00e2ble pos\u00e9 au total sur la ligne","1 000 m"]].forEach(function(r,n){
    var y=244+n*24;
    svg.appendChild(S("text",{x:14,y:y,"class":"s-nom",fill:V("froid")},r[0]+" \u2014"));
    svg.appendChild(S("text",{x:44,y:y,"class":"s-nom"},r[1]));
    svg.appendChild(S("text",{x:700,y:y,"text-anchor":"end","class":"s-lab"},r[2]+" au maximum"));
  });
  el.appendChild(svg);
};

/* ─────────── les trois couches, quatre protocoles ─────────── */
SCHEMAS["couches-protocole"]=function(el){
  var W=760,H=300;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Trois couches et ce que quatre protocoles mettent dans chacune"});
  var COLS=[["KNX TP1","froid"],["Modbus RTU","tiede"],["BACnet/IP","vert"],
            ["DALI","violet"]];
  var LX=[152,304,456,608], LW=146;
  COLS.forEach(function(c,i){
    svg.appendChild(S("text",{x:LX[i]+LW/2,y:22,"text-anchor":"middle","class":"s-lab"},c[0]));
  });
  var LIGNES=[
    ["APPLICATION","ce qu'on \u00e9change",
     ["objets de groupe|datapoints typ\u00e9s","registres et bits|num\u00e9rot\u00e9s",
      "objets et propri\u00e9t\u00e9s|nomm\u00e9s","niveau, groupes,|sc\u00e8nes"]],
    ["LIAISON","qui parle, et quand",
     ["CSMA/CA|arbitrage bit \u00e0 bit","ma\u00eetre-esclave|1 ma\u00eetre",
      "client-serveur|sur IP","ma\u00eetre-esclave|1 contr\u00f4leur"]],
    ["PHYSIQUE","sur quoi \u00e7a circule",
     ["paire torsad\u00e9e|30 V, 9 600 bit/s","RS-485|2 ou 3 fils",
      "Ethernet|UDP 47808","2 fils|\u00b116 V, sans polarit\u00e9"]]
  ];
  LIGNES.forEach(function(L,r){
    var y=36+r*84;
    svg.appendChild(S("rect",{x:8,y:y,width:136,height:74,rx:3,fill:V("encre2"),
      opacity:"0.10"}));
    svg.appendChild(S("text",{x:18,y:y+26,"class":"s-tit"},L[0]));
    svg.appendChild(S("text",{x:18,y:y+48,"class":"s-nom"},L[1]));
    L[2].forEach(function(txt,i){
      svg.appendChild(S("rect",{x:LX[i],y:y,width:LW,height:74,rx:3,
        fill:V(COLS[i][1]),opacity:"0.11"}));
      svg.appendChild(S("rect",{x:LX[i],y:y,width:LW,height:74,rx:3,fill:"none",
        stroke:V(COLS[i][1]),"stroke-width":"1.4","stroke-opacity":".5"}));
      txt.split("|").forEach(function(m,k){
        svg.appendChild(S("text",{x:LX[i]+LW/2,y:y+30+k*17,"text-anchor":"middle",
          "class":"s-nom"},m));
      });
    });
  });
  svg.appendChild(S("text",{x:W/2,y:H-10,"text-anchor":"middle","class":"s-nom"},
    "Deux syst\u00e8mes se parlent quand les trois couches concordent. Sinon il faut une passerelle."));
  el.appendChild(svg);
};

/* ─────────── perimetrique, volumetrique, zonage ─────────── */


/* ─────────── les deux situations de CCF de l'epreuve E5 ─────────── */
SCHEMAS["situations-e5"]=function(el){
  var W=760,H=246;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les deux situations de CCF de l'\u00e9preuve E5 et leurs \u00e9ch\u00e9ances"});
  svg.appendChild(S("text",{x:W/2,y:18,"text-anchor":"middle","class":"s-tit"},
    "E5 \u2014 INTERVENTIONS SUR LES SYST\u00c8MES \u00b7 COEFFICIENT 5"));
  function boite(x,w,coul,titre,comp,quand){
    svg.appendChild(S("rect",{x:x,y:38,width:w,height:84,rx:3,fill:V(coul),
      opacity:"0.12"}));
    svg.appendChild(S("rect",{x:x,y:38,width:w,height:84,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x+w/2,y:60,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    comp.split("|").forEach(function(m,k){
      svg.appendChild(S("text",{x:x+w/2,y:80+k*16,"text-anchor":"middle",
        "class":"s-nom"},m));
    });
    svg.appendChild(S("text",{x:x+w/2,y:113,"text-anchor":"middle","class":"s-lab"},quand));
  }
  boite(46,268,"froid","SITUATION 1",
        "C7 \u2014 r\u00e9aliser des essais|et des mesures",
        "AVANT LA FIN DE LA 1re ANN\u00c9E");
  boite(446,268,"vert","SITUATION 2",
        "C6 \u2014 outils de pilotage|C8 \u2014 performances d'un syst\u00e8me",
        "AVANT LE PRINTEMPS DE 2e ANN\u00c9E");
  /* la frise */
  svg.appendChild(S("line",{x1:30,y1:180,x2:722,y2:180,stroke:V("encre2"),
    "stroke-width":"2"}));
  svg.appendChild(S("path",{d:"M730,180L718,175L718,185Z",fill:V("encre2")}));
  svg.appendChild(S("line",{x1:380,y1:158,x2:380,y2:212,stroke:V("encre2"),
    "stroke-width":"1.5","stroke-dasharray":"5 4"}));
  svg.appendChild(S("line",{x1:300,y1:122,x2:330,y2:172,stroke:V("froid"),
    "stroke-width":"2"}));
  svg.appendChild(S("circle",{cx:330,cy:180,r:6,fill:V("froid")}));
  svg.appendChild(S("line",{x1:600,y1:122,x2:630,y2:172,stroke:V("vert"),
    "stroke-width":"2"}));
  svg.appendChild(S("circle",{cx:630,cy:180,r:6,fill:V("vert")}));
  svg.appendChild(S("text",{x:190,y:204,"text-anchor":"middle","class":"s-nom"},
    "1re ann\u00e9e"));
  svg.appendChild(S("text",{x:550,y:204,"text-anchor":"middle","class":"s-nom"},
    "2e ann\u00e9e"));
  svg.appendChild(S("text",{x:W/2,y:236,"text-anchor":"middle","class":"s-nom"},
    "Chaque situation donne lieu \u00e0 un rapport argument\u00e9 et \u00e0 une proposition de note pr\u00e9sent\u00e9e au jury."));
  el.appendChild(svg);
};

/* ─────────── la monotone de puissance et la puissance souscrite ───────────
   Les points sont ceux de l'exercice du cours : au-dela de 36 kVA, seule la
   duree du depassement se paie, pas son ampleur. */


/* ─────────── trois courants, et ce qui revient par le neutre ─────────── */


/* ─────────── le batiment en ecorche ─────────── */



/* ─────────── le diagramme de l'air humide ─────────── */



/* --------- dispersion : deux series de meme moyenne ---------
   Ajoute le 3 septembre 2026 pour la sequence 1 de maths-PC. Aucun schema du
   kit ne montrait une dispersion, et c'est tout le propos de la sequence :
   deux installations de meme moyenne, l'une reglee, l'autre qui oscille. */


/* ═══════════════════════════════════════════════════ OUTILS */
var OUTILS={};

/* ─────────── 1. convertisseur d'unités ─────────── */


/* ─────────── le diviseur de tension et la resistance de LED ───────────
   Premier outil ecrit pour une classe de bac pro CIEL. Il ne remplace aucun
   calcul : il permet d'en essayer dix en dix secondes, ce qu'une feuille ne
   permet pas — et de VOIR que la tension se partage proportionnellement aux
   resistances, au lieu de le lire. */


/* ─────────── 2. puissance transportée ─────────── */


/* ─────────── 3. composeur de paroi ─────────── */
var MAT=[
 ["Enduit ciment",1.15],["Enduit plâtre",0.25],["Plaque de plâtre BA13",0.25],
 ["Béton",1.65],["Béton armé",2.50],["Parpaing creux",1.05],["Brique creuse",0.45],
 ["Brique pleine",0.85],["Pierre calcaire",1.40],["Bois massif",0.15],
 ["Laine minérale",0.038],["Laine de bois",0.040],["Ouate de cellulose",0.039],
 ["Polystyrène expansé",0.035],["Polystyrène extrudé",0.030],["Polyuréthane",0.025],
 ["Verre",1.00],["Acier",50],["Lame d'air non ventilée",null]
];


/* ─────────── 4. bilan de déperditions ─────────── */
OUTILS.bilan={
  titre:"Bilan de déperditions",
  intro:"Un bâtiment de plain-pied. Entrez le relevé de votre local : le classement des "+
        "postes se refait à chaque changement.",
  chaine:"le U des murs vient du composeur de paroi",
  monte:function(d){
    var P={L:12,l:7,h:2.7,ti:19,te:-7,tu:8,ren:0.5,sf:14,uf:1.3,ut:0.20,up:0.30,
           psi:0.45,psim:0.10};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec).replace("-","−")+unite;});
    }
    ch(c1,"Longueur","L",4,40,0.5,1," m");
    ch(c1,"Largeur","l",3,25,0.5,1," m");
    ch(c1,"Hauteur sous plafond","h",2.2,6,0.1,1," m");
    ch(c1,"Température intérieure","ti",15,24,0.5,1," °C");
    ch(c1,"Extérieure de base","te",-15,5,0.5,1," °C");
    ch(c1,"Local sous le plancher","tu",-15,19,0.5,1," °C");
    ch(c1,"Renouvellement d'air","ren",0,2,0.05,2," vol/h");
    ch(c2,"Surface de fenêtres","sf",0,60,1,0," m²");
    ch(c2,"U des fenêtres","uf",0.7,5,0.05,2,"");
    ch(c2,"U de la toiture","ut",0.08,2.5,0.01,2,"");
    ch(c2,"U du plancher","up",0.08,2.5,0.01,2,"");
    ch(c2,"Ψ plancher / façade","psi",0,1.2,0.01,2,"");
    ch(c2,"Ψ des menuiseries (30 m)","psim",0,0.4,0.01,2,"");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:18px"});
    var barres=E("div",{"class":"barres",style:"margin-top:14px"});
    d.appendChild(res);d.appendChild(barres);
    function calc(){
      maj.forEach(function(f){f();});
      var sol=P.L*P.l, per=2*(P.L+P.l), vol=sol*P.h;
      var smur=Math.max(0,per*P.h-P.sf), dte=P.ti-P.te, dtu=P.ti-P.tu;
      var q=vol*P.ren;
      var A=[["Murs",ETAT.u_mur*smur*dte],["Fenêtres",P.uf*P.sf*dte],
             ["Toiture",P.ut*sol*dte],["Plancher",P.up*sol*dtu],
             ["Pont thermique plancher",P.psi*per*dte],
             ["Ponts de menuiseries",P.psim*30*dte],["Air neuf",0.34*q*dte]];
      var tot=A.reduce(function(a,b){return a+b[1];},0);
      ETAT.phi=tot;ETAT.surface=sol;ETAT.gv=dte>0?tot/dte:0;
      ETAT.postes=A;
      SCHEMA_MAJ.forEach(function(f){f();});
      var r=tot/sol;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Déperditions</b><span>"+fr(tot,0)+" W</span></span>"+
        "<span><b>À installer × 1,15</b><span>"+fr(tot*1.15,0)+" W</span></span>"+
        "<span><b>Ratio</b><span>"+frs(r,1)+" W/m²</span></span>"+
        "<span><b>GV</b><span>"+frs(ETAT.gv,1)+" W/K</span></span></div>"+
        "<p>Sol "+frs(sol,0)+" m², périmètre "+frs(per,0)+" m, murs "+frs(smur,0)+
        " m², air neuf "+fr(q,0)+" m³/h. "+
        (r>80?"<b>Au-delà de 80 W/m² : bâtiment ancien non isolé.</b>"
         :r>40?"Entre 40 et 80 W/m² : isolation partielle."
         :"<b>Sous 40 W/m² : niveau d'une construction récente.</b>")+"</p>";
      var s=A.slice().sort(function(a,b){return b[1]-a[1];}), mx=s[0][1]||1;
      barres.innerHTML=s.map(function(p){
        return '<div class="barre"><span class="l">'+p[0]+'</span><span class="b" style="width:'+
          (100*p[1]/mx)+'%"></span><span class="p">'+fr(p[1],0)+' W · '+
          fr(100*p[1]/tot,0)+' %</span></div>';}).join("");
      suivant("energie");
    }
    OUTILS.bilan._recalc=calc;
    calc();

  }
};

/* ─────────── 5. besoin annuel et temps de retour ─────────── */



/* ─────────── lire une unite ─────────── */
var UNITES=[
 {k:"W",u:"W",n:"Le watt — une puissance",
  lit:"watt",
  m:"Ce que la machine fait <b>à chaque instant</b>. Elle ne s'accumule pas : "+
    "à l'arrêt, elle vaut zéro.",
  f:"Un radiateur <b>appelle</b> 1 500 W. Il ne « consomme » pas 1 500 W.",
  o:"radiateur 1 à 2 kW · chaudière de maison 20 à 25 kW"},
 {k:"kWh",u:"kWh",n:"Le kilowattheure — une énergie",
  lit:"kilowatt-heure",
  m:"Une puissance <b>multipliée par une durée</b>. C'est ce qui est facturé.",
  f:"L'unité contient sa formule : kW × h, donc <b>E = P × t</b>.",
  o:"1 kWh = 3 600 kJ · un radiateur de 1 kW pendant 1 h"},
 {k:"K",u:"K",n:"Le kelvin — un écart de température",
  lit:"kelvin",
  m:"Un <b>écart</b>, jamais une température absolue dans nos formules.",
  f:"Un écart de 20 °C vaut 20 K. <b>On n'ajoute pas 273.</b>",
  o:"régime 70/50 → 20 K · plancher chauffant 45/35 → 10 K"},
 {k:"m3h",u:"m³/h",n:"Le mètre cube par heure — un débit",
  lit:"mètre cube par heure",
  m:"Un <b>volume par unité de temps</b>. Le « par heure » est ce qui piège : "+
    "les fiches constructeur donnent souvent des L/s.",
  f:"1 L/s = 3,6 m³/h. 1 m³/h = 1 000 L/h.",
  o:"air neuf 25 à 30 m³/h par personne · réseau d'immeuble 2 m³/h"},
 {k:"lambda",u:"W/(m·K)",p:"W/(m·K)  λ",n:"λ — la conductivité du matériau",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui traverse <b>un mètre d'épaisseur</b> du matériau, par kelvin d'écart. "+
    "Propriété du matériau seul.",
  f:"On la <b>divise</b> par une longueur, on ne la multiplie pas : <b>R = e / λ</b>.",
  o:"isolant < 0,05 · béton 1,65 · acier 50"},
 {k:"R",u:"m²·K/W",n:"R — la résistance thermique",
  lit:"mètres carrés-kelvin par watt",
  m:"L'inverse d'un flux : combien de <b>kelvins d'écart</b> il faut pour faire "+
    "passer un watt par mètre carré.",
  f:"C'est l'unité de U retournée. <b>U = 1 / R</b>.",
  o:"10 cm de laine 2,6 · Rsi 0,13 · Rse 0,04"},
 {k:"U",u:"W/(m²·K)",n:"U — le coefficient de transmission",
  lit:"watts par mètre carré et par kelvin",
  m:"Ce qui traverse <b>un mètre carré de paroi complète</b> pour un kelvin d'écart. "+
    "Il englobe déjà la conduction, la convection et le rayonnement.",
  f:"Il manque des m² et des K : <b>Φ = U × S × ΔT</b>.",
  o:"mur neuf 0,20 · double vitrage 1,4 · mur non isolé 2,5"},
 {k:"psi",u:"W/(m·K)",p:"W/(m·K)  Ψ",n:"Ψ — le coefficient linéique d'un pont thermique",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui fuit par <b>un mètre de liaison</b>, par kelvin d'écart. Une liaison "+
    "est une ligne, pas une surface.",
  f:"Il manque des <b>mètres</b> et des K : <b>Φ = Ψ × L × ΔT</b>. "+
    "<b>Même unité que λ, rôle opposé</b> : λ se divise, Ψ se multiplie.",
  o:"ITE 0,05 à 0,15 · ITI plancher traversant 0,60 à 0,90"},
 {k:"GV",u:"W/K",n:"GV — la signature du bâtiment",
  lit:"watts par kelvin",
  m:"Ce que le bâtiment perd <b>par kelvin d'écart</b>, tous postes confondus. "+
    "Il ne dépend pas de la météo.",
  f:"Il manque des K : <b>Φ = GV × ΔT</b>, donc <b>GV = Φ / ΔT</b>.",
  o:"petit bureau 130 W/K · maison rénovée 80 à 150 W/K"},
 {k:"DJU",u:"DJU",n:"Le degré-jour unifié",
  lit:"degré-jour unifié",
  m:"La somme, sur toute la saison, des <b>degrés manquants sous 18 °C</b>. "+
    "Un jour à 13 °C de moyenne apporte 5 DJU.",
  f:"Des kelvins × des jours. Avec le GV : <b>besoin = GV × DJU × 24 / 1 000</b>.",
  o:"Nice 1 100 · Paris 2 300 · Strasbourg 2 700"},
 {k:"ratio",u:"kWh/(m²·an)",n:"Le ratio de consommation",
  lit:"kilowattheures par mètre carré et par an",
  m:"L'énergie d'une année ramenée au <b>mètre carré chauffé</b>. C'est ce qui "+
    "permet de comparer deux bâtiments de tailles différentes.",
  f:"Précisez toujours <b>lequel</b> : utile, final ou primaire. Les trois "+
    "peuvent varier du simple au triple.",
  o:"passif 15 · EnerPHit 25 · bâtiment 1970 non rénové 200 et plus"}
];



/* ═══════════════════════════════════════════════════ HYDRAULIQUE
   Eau a 60 degres : masse volumique 983 kg/m3, viscosite 0,474e-6 m2/s.
   Blasius vaut pour un tube lisse — cuivre, PER, multicouche — et pour un
   Reynolds compris entre 4 000 et 100 000, ce qui couvre tout le chauffage. */
var RHO_EAU=983, NU_EAU=0.474e-6;
var TUBES=[["14 × 1",12],["16 × 1",14],["18 × 1",16],["20 × 1",18],
           ["22 × 1",20],["26 × 1",24],["28 × 1,5",25]];
function debit(pkW,dt){return pkW*1000/(1163*dt);}          /* m3/h */
function vitesse(Q,dmm){                                     /* m/s */
  var S=Math.PI*Math.pow(dmm/1000,2)/4;
  return (Q/3600)/S;
}
function lineique(Q,dmm){                                    /* Pa/m */
  var d=dmm/1000, v=vitesse(Q,dmm);
  if(v<=0)return 0;
  var Re=v*d/NU_EAU;
  var lam=Re<2000?64/Math.max(Re,1):0.3164/Math.pow(Re,0.25);
  return lam*RHO_EAU*v*v/(2*d);
}
var SINGU=[["Coude à 90°",0.065],["Té de passage",0.035],["Vanne d'arrêt",0.020],
           ["Robinet thermostatique",0.250],["Radiateur",0.125]];
/* longueur equivalente = coefficient x diametre interieur en mm, formule
   d'atelier qui redonne les valeurs du tableau de la seance 8 */

/* ─────────── 1. pertes de charge ─────────── */


/* ─────────── 2. point de fonctionnement ─────────── */
var POMPES=[["Vitesse I",2.0,1.8],["Vitesse II",3.0,2.2],["Vitesse III",4.0,2.6]];


/* ─────────── 3. eau chaude sanitaire ─────────── */
/* litres puises par heure, internat de 40 eleves — total 1 632 L par jour */
var PROFIL=[0,0,0,0,0,32,128,224,160,64,32,32,48,32,32,32,48,96,192,256,128,64,32,0];


/* Saturation du R134a, valeurs arrondies : T, p bar, h liquide, h vapeur */
var SAT134=[[-30,0.84,160,380],[-20,1.33,173,386],[-10,2.01,186,392],[0,2.93,200,399],
  [10,4.15,213,404],[20,5.72,227,409],[30,7.70,241,414],[40,10.17,256,419],
  [50,13.18,271,423],[60,16.82,287,426],[70,21.17,304,428]];
function sat134(t){
  var i=0;while(i<SAT134.length-2&&SAT134[i+1][0]<t)i++;
  var a=SAT134[i],b=SAT134[i+1],f=(t-a[0])/(b[0]-a[0]);
  return {p:Math.exp(Math.log(a[1])+f*(Math.log(b[1])-Math.log(a[1]))),
          hl:a[2]+f*(b[2]-a[2]), hv:a[3]+f*(b[3]-a[3])};
}












/* ─── la sous-station a ballon primaire : les cinq reseaux ─── */
var SS_RESEAUX=[
  {k:"urbain",   c:"chaud",  n:"Réseau de chauffage urbain",
   d:"Le primaire. Il appartient au fournisseur : c'est son compteur qui facture."},
  {k:"chauffage",c:"tiede",  n:"Chauffage du bâtiment",
   d:"Départ régulé par V21 en loi d'eau, circulateur à vitesse variable."},
  {k:"charge",   c:"vert",   n:"Charge du ballon primaire",
   d:"P22 remplit la réserve d'énergie par le haut ; le bas repart vers l'échangeur."},
  {k:"primecs",  c:"violet", n:"Primaire de production ECS",
   d:"P23 puise en haut du ballon ; V22 dose pour tenir la température distribuée."},
  {k:"sanitaire",c:"froid",  n:"Réseaux sanitaires",
   d:"Eau froide et bouclage entrent, l'eau chaude sanitaire sort. Aucun stockage."}
];



/* ─────────── sous-station : puissance souscrite et abonnement ─────────── */


/* ─── pompe a chaleur : ce qui entre, ce qui sort, a l'echelle ─── */


/* ─── batterie froide : l'ADP et le facteur de bipasse ─── */


/* ─── les barres du calibrage U41 : une mesure, une teinte, un accent ─── */
function barres(el,opt){
  /* opt : {titre, source, lignes:[{n, v, unite, detail, accent}], max} */
  var W=880, HL=46, H=64+opt.lignes.length*HL+40;
  var X0=300, X1=770;                       /* la zone tracee */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":opt.titre});
  svg.appendChild(S("text",{x:24,y:26,"class":"s-tit"},opt.titre.toUpperCase()));
  var mx=opt.max||Math.max.apply(null,opt.lignes.map(function(l){return l.v;}));
  var carte=E("p",{"class":"leg-schema"},opt.source||"");
  var barres=[];

  opt.lignes.forEach(function(l,i){
    var y=64+i*HL, h=24;
    var w=Math.max(3,(X1-X0)*l.v/mx);
    /* le libelle, en encre — jamais dans la couleur de la barre */
    svg.appendChild(S("text",{x:X0-14,y:y+17,"text-anchor":"end","class":"s-nom"},l.n));
    var r=S("rect",{x:X0,y:y,width:w,height:h,rx:4,
      fill:V(l.accent?"chaud":"froid"),opacity:l.accent?"0.9":"0.62"});
    svg.appendChild(r);
    /* etiquette directe : la valeur au bout de la barre, le detail en retrait.
       Un seul <text> avec deux <tspan> : le decalage est mesure par le moteur
       de rendu, jamais estime au nombre de caracteres. */
    var et=S("text",{x:X0+w+12,y:y+17,"class":"s-lab"});
    et.appendChild(S("tspan",{},l.v+(l.unite||"")));
    if(l.detail)et.appendChild(S("tspan",{dx:"10","class":"s-pet"},l.detail));
    svg.appendChild(et);
    /* zone de survol plus large que la barre */
    var z=S("rect",{x:0,y:y-8,width:W,height:h+16,fill:"transparent"});
    svg.appendChild(z);
    barres.push({r:r,l:l});
    z.addEventListener("mouseenter",function(){
      barres.forEach(function(b){b.r.setAttribute("opacity",b.r===r?"1":"0.22");});
      carte.innerHTML="<b>"+l.n+"</b> — "+(l.aide||l.detail||"");});
    z.addEventListener("mouseleave",function(){
      barres.forEach(function(b){
        b.r.setAttribute("opacity",b.l.accent?"0.9":"0.62");});
      carte.textContent=opt.source||"";});
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(carte);
}





/* ═══════════════════════════════════════════════════ SCHEMAS — CAP
   Consolidation maths. Rien de thermique ici : ce sont les six images qui
   manquaient aux fiches, et qu'aucun polycopie ne portait. Elles servent
   plusieurs fiches chacune — la barre des fractions revient en proportion,
   la droite graduee en lecture de graphique. */

/* ─────────── le tableau des rangs, et la virgule qui glisse ─────────── */


/* ─────────── poser : les virgules l'une sous l'autre ─────────── */


/* ─────────── decomposer un produit : le rectangle ─────────── */


/* ─────────── la barre des fractions ─────────── */


/* ─────────── la droite graduee : 0,75 contre 0,8 ─────────── */


/* ─────────── arrondir : trois sens, une seule regle du 5 ─────────── */


/* ─────────── priorites : les memes touches, deux resultats ─────────── */


/* ─────────── B · milli, unité, kilo ─────────── */


/* ─────────── B · l'escalier des longueurs ─────────── */


/* ─────────── B · le mètre carré, découpé pour de vrai ─────────── */


/* ─────────── B · le mètre cube et le litre ─────────── */


/* ─────────── B · l'heure, en minutes et en décimal ─────────── */


/* ─────────── B · des km/h aux m/s ─────────── */


/* ─────────── C · le tableau de proportionnalité et son coefficient ─────────── */


/* ─────────── C · forfait plus part variable ─────────── */


/* ─────────── C · une remise puis une TVA ─────────── */


/* ─────────── C · ce que pèse un mètre cube ─────────── */


/* ─────────── D · croiser une ligne et une colonne ─────────── */


/* ─────────── D · l'échelle d'un plan ─────────── */


/* ─────────── E · défaire les opérations dans l'ordre inverse ─────────── */


/* ─────────── F · les trois morceaux d'une réponse ─────────── */







/* ─── PAC : le point de bivalence, et le piege de la puissance ─── */


/* ─── echangeur : co-courant contre contre-courant, et le DTLM ─── */


/* ─── les quatre domaines du site, pour l'en-tete de l'accueil ─── */


/* ═══════════════════════════════════════════════ LA MACHINE FRIGORIFIQUE
   Six fluides, leurs tables de saturation, et quatre outils qui s'en servent.

   Les enthalpies ne sont pas tabulees : elles se calculent, avec la reference
   internationale h liquide = 200 kJ/kg a 0 °C, commune a tous les fluides pour
   que deux cycles se comparent.

     hl(t) = 200 + cpl x t
     Lv(t) = Lv0 x ((Tc - T) / (Tc - 273,15))^0,38      formule de Watson
     hv(t) = hl(t) + Lv(t)

   Verifie sur R134a contre la table du kit : ecart sous 1,5 kJ/kg de -20 a
   +40 °C. Ne pas remplacer par une interpolation lineaire de Lv, qui derive de
   10 % pres du point critique. */

var FLUIDES = {
  "R134a": {M:102, chim:"tétrafluoroéthane", gwp:1430, classe:"A1", lp:0.25,
    tc:101.1, lv0:198.6, cpl:1.34, cpv:0.90, gam:1.12, coul:"froid",
    ou:"climatisation, pompes à chaleur anciennes, transport",
    p:[[-40,0.51],[-30,0.85],[-20,1.33],[-10,2.01],[0,2.93],[10,4.15],[20,5.72],
       [30,7.70],[40,10.17],[50,13.18],[60,16.82],[70,21.17]]},
  "R410A": {M:72.6, chim:"mélange R32 + R125", gwp:2088, classe:"A1", lp:0.44,
    tc:71.4, lv0:221.4, cpl:1.52, cpv:1.05, gam:1.16, coul:"violet",
    ou:"climatisation split, le parc installé des vingt dernières années",
    p:[[-40,1.75],[-30,2.72],[-20,4.00],[-10,5.73],[0,7.98],[10,10.87],[20,14.50],
       [30,19.00],[40,24.50],[50,31.16],[60,39.10]]},
  "R32": {M:52, chim:"difluorométhane", gwp:675, classe:"A2L", lp:0.061,
    tc:78.1, lv0:315.3, cpl:1.85, cpv:1.15, gam:1.20, coul:"tiede",
    ou:"climatisation neuve : il remplace le R410A",
    p:[[-40,1.79],[-30,2.79],[-20,4.06],[-10,5.81],[0,8.13],[10,11.12],[20,14.90],
       [30,19.60],[40,25.30],[50,32.30],[60,40.60]]},
  "R290": {M:44.1, chim:"propane", gwp:3, classe:"A3", lp:0.008,
    tc:96.7, lv0:374.5, cpl:2.42, cpv:1.72, gam:1.13, coul:"vert",
    ou:"pompes à chaleur récentes, vitrines, petites charges",
    p:[[-40,1.11],[-30,1.67],[-20,2.45],[-10,3.45],[0,4.74],[10,6.37],[20,8.36],
       [30,10.79],[40,13.70],[50,17.13],[60,21.20]]},
  "R717": {M:17, chim:"ammoniac", gwp:0, classe:"B2L", lp:0.00035,
    tc:132.3, lv0:1262, cpl:4.61, cpv:2.65, gam:1.31, coul:"chaud",
    ou:"grand froid industriel, patinoires, agroalimentaire",
    p:[[-40,0.72],[-30,1.20],[-20,1.90],[-10,2.91],[0,4.29],[10,6.15],[20,8.57],
       [30,11.67],[40,15.55],[50,20.33],[60,26.10]]},
  "R744": {M:44, chim:"dioxyde de carbone", gwp:1, classe:"A1", lp:0.10,
    tc:31.0, lv0:230.9, cpl:2.42, cpv:1.30, gam:1.29, coul:"encre2",
    ou:"froid commercial, ECS en pompe à chaleur",
    p:[[-40,10.05],[-30,14.28],[-20,19.70],[-10,26.49],[0,34.85],[10,45.02],
       [20,57.29],[30,72.14]]}
};
var NOMS_FLUIDES = ["R134a","R410A","R32","R290","R717","R744"];

/* pression de saturation, interpolee en logarithme : la courbe est
   exponentielle, une interpolation lineaire y perdrait 3 % au milieu du pas */
function psatF(nom, t) {
  var T = FLUIDES[nom].p, i = 0;
  if (t <= T[0][0]) return T[0][1];
  if (t >= T[T.length-1][0]) return T[T.length-1][1];
  while (i < T.length-2 && T[i+1][0] < t) i++;
  var a = T[i], b = T[i+1], f = (t-a[0])/(b[0]-a[0]);
  return Math.exp(Math.log(a[1]) + f*(Math.log(b[1])-Math.log(a[1])));
}
function lvF(nom, t) {
  var f = FLUIDES[nom], Tc = f.tc + 273.15, T = t + 273.15;
  if (T >= Tc) return 0;
  return f.lv0 * Math.pow((Tc-T)/(Tc-273.15), 0.38);
}
function satF(nom, t) {
  var f = FLUIDES[nom], hl = 200 + f.cpl*t;
  return {p:psatF(nom,t), hl:hl, hv:hl + lvF(nom,t)};
}
/* un menu de fluides, monte partout pareil */
function choixFluide(par, etat, cle, calc, libelle) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},libelle||"Fluide frigorigène"));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var s = E("select",{}, NOMS_FLUIDES.map(function(n){
    return '<option value="'+n+'"'+(n===etat[cle]?" selected":"")+'>'+n+
           " — "+FLUIDES[n].chim+"</option>";}).join(""));
  s.addEventListener("change", function(){etat[cle]=this.value;calc();});
  c.appendChild(s);
  par.appendChild(c);
  return function(){v.textContent = FLUIDES[etat[cle]].classe;};
}
/* un curseur, meme geste que partout ailleurs dans le kit */
function curseur(par, maj, etat, lab, cle, min, max, pas, dec, unite, calc, reg) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},lab));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var i = E("input",{type:"range",min:min,max:max,step:pas,value:etat[cle]});
  i.addEventListener("input", function(){etat[cle]=parseFloat(this.value);calc();});
  c.appendChild(i);
  par.appendChild(c);
  /* le registre permet a un scenario de reposer le curseur */
  if (reg) reg[cle] = i;
  maj.push(function(){v.textContent = frs(etat[cle],dec)+unite;});
}

/* ─────────── ce qu'un kilogramme transporte ─────────── */


/* ─────────── une pression, une temperature ─────────── */


/* ─────────── le cycle, en le deformant ─────────── */


/* ─────────── la charge, le local, et la limite ─────────── */


/* ─────────── le circuit et ses organes annexes ─────────── */



/* ─────────── l'embleme d'en-tete : la boucle en petit ─────────── */


/* ═══════════════════════════════════════════ LE FROID, NIVEAU 3 (option B)
   Quatre savoirs que le referentiel place a 0 ou 1 pour l'option C et a 3
   pour l'option FCA : les denrees, les huiles, les cycles, l'impact
   environnemental. Un outil par savoir, plus le protocole de refroidissement.

   Tout s'appuie sur la table FLUIDES deja posee plus haut. Les masses
   molaires y ont ete ajoutees pour le calcul de masse volumique de vapeur,
   dont le retour d'huile depend. */

var DENREES = {
  "Fruits et légumes": {cp1:3.8, cp2:1.9, lf:290, tc:-1.0, resp:45},
  "Viande fraîche":    {cp1:3.2, cp2:1.7, lf:250, tc:-1.7, resp:0},
  "Poisson":           {cp1:3.4, cp2:1.8, lf:275, tc:-2.0, resp:0},
  "Produits laitiers": {cp1:3.3, cp2:1.8, lf:270, tc:-1.5, resp:0},
  "Boissons et eau":   {cp1:4.1, cp2:2.0, lf:330, tc: 0.0, resp:0},
  "Produits secs":     {cp1:1.9, cp2:1.5, lf:0,   tc:-5.0, resp:0}
};
var NOMS_DENREES = ["Fruits et légumes","Viande fraîche","Poisson",
                    "Produits laitiers","Boissons et eau","Produits secs"];

/* un menu quelconque, sur le modele de choixFluide */
function choixListe(par, etat, cle, noms, libelle, calc, legende, reg) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},libelle));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var s = E("select",{}, noms.map(function(n){
    return '<option value="'+n+'"'+(n===etat[cle]?" selected":"")+'>'+n+
           "</option>";}).join(""));
  s.addEventListener("change", function(){etat[cle]=this.value;calc();});
  c.appendChild(s);
  par.appendChild(c);
  if (reg) reg[cle] = s;
  return function(){v.textContent = legende ? legende(etat[cle]) : "";};
}
/* l'air humide, en trois lignes : la chambre froide en a besoin pour son
   poste de renouvellement, et le kit ne l'expose pas ailleurs */
function pvsAir(t){return 610.78*Math.exp(17.27*t/(t+237.3));}
function hAir(t, hr){
  var pv = hr*pvsAir(t), r = 622*pv/(101325-pv);
  return 1.006*t + (r/1000)*(2501+1.83*t);
}

/* ─────────── le bilan d'une chambre froide : sept postes ─────────── */


/* ─────────── le cycle bi-etage, contre le mono-etage ─────────── */


/* ─────────── TEWI : ce que la machine pese vraiment ─────────── */


/* ─────────── le protocole de refroidissement ─────────── */


/* ─────────── le retour d'huile dans une colonne montante ─────────── */


/* ─────────── la chambre froide et ses apports ─────────── */



/* ═══════════════════════════════════════════ LE FROID EN MOUVEMENT
   Deux objets que le site n'avait pas : du temps, et un jeu.

   Tout ce qui precede calcule un regime etabli. Une chambre froide n'y est
   jamais : sa porte s'ouvre, une livraison entre tiede a sept heures, le
   groupe s'arrete pour degivrer. Le premier outil joue une journee en une
   minute, sur un modele a deux noeuds — l'air, qui reagit vite, et la
   marchandise, qui reagit lentement. Le second retourne le diagnostic : au
   lieu de lire une panne, on la devine sur quatre nombres, et l'outil dit
   juste ou faux sans jamais la nommer. */

/* ─────────── une journee de chambre froide ─────────── */


/* ─────────── lire la machine : quatre nombres, une panne ─────────── */
var PANNES=[
  {n:"Machine saine", d:[0,0,0,0],
   lire:"Tout est dans la plage : BP et HP au régime, surchauffe de 5 à 8 K, "+
        "sous-refroidissement de 3 à 6 K."},
  {n:"Manque de fluide", d:[-6,-4,16,-3.5],
   lire:"Peu de liquide au condenseur : le sous-refroidissement disparaît. Peu de "+
        "liquide à l'évaporateur : il s'évapore trop tôt, la surchauffe explose. "+
        "Les deux pressions baissent."},
  {n:"Excès de fluide", d:[1,4,-2,9],
   lire:"Le condenseur se remplit de liquide : le sous-refroidissement grimpe et la "+
        "HP monte. L'évaporateur est mieux alimenté, la surchauffe baisse un peu."},
  {n:"Condenseur encrassé", d:[1,12,0,-2],
   lire:"La chaleur ne part plus : la HP monte fort, le liquide sort à peine "+
        "sous-refroidi, le refoulement chauffe. La BP suit légèrement."},
  {n:"Évaporateur givré", d:[-7,-2,-4,0],
   lire:"L'air ne passe plus : peu de chaleur entre, la BP chute et la surchauffe "+
        "s'effondre. Le liquide menace d'atteindre le compresseur."},
  {n:"Détendeur bloqué ouvert", d:[4,1,-6,0],
   lire:"Trop de fluide envoyé : l'évaporateur est noyé, la surchauffe tombe à zéro "+
        "et la BP monte. Coups de liquide en vue."},
  {n:"Détendeur bouché", d:[-10,-3,18,3],
   lire:"Presque plus de fluide envoyé : la BP s'effondre, la surchauffe explose, et "+
        "le liquide s'accumule au condenseur, sous-refroidissement en hausse."},
  {n:"Incondensables", d:[0,8,0,5],
   lire:"De l'air est pris dans le circuit : il gonfle la HP sans rien condenser. Le "+
        "sous-refroidissement paraît élevé, parce que la température de condensation "+
        "lue sur la pression est fausse."}
];



/* ─────────── l'embleme d'en-tete : vingt-quatre heures ─────────── */



/* ═══════════════════════════════════════════ LA CTA EN MOUVEMENT
   La salle polyvalente du DS n° 8 — 240 m², 960 m³, jusqu'a cent personnes —
   servie par sa double flux : 1,80 kg/s souffles, 0,80 kg/s d'air neuf au
   plus, un recuperateur a plaques, une batterie chaude, une batterie froide,
   un humidificateur a vapeur. Une journee en une minute.

   Le local est un seul noeud thermique, plus une teneur en eau et un CO2. La
   centrale regule sa temperature de soufflage en proportionnel sur l'ambiance,
   module son air neuf sur le CO2, et passe en free-cooling quand l'exterieur
   le permet. Ce qui est paye et ce qui est gratuit sont comptes a part. */

function rsatAir(t){var p=pvsAir(t);return 622*p/(101325-p);}
function rAir(t,hr){var p=hr*pvsAir(t);return 622*p/(101325-p);}
function hAirR(t,r){return 1.006*t+(r/1000)*(2501+1.83*t);}
function hrAir(t,r){return 100*(101325*r/(622+r))/pvsAir(t);}



/* ─────────── lire la centrale : cinq temperatures, une panne ─────────── */
var PANNES_CTA=[
  {n:"Centrale saine", r:[-5,9.4,14.7,29,30,100,120,850],
   lire:"L'air neuf gagne 14 K au récupérateur, le mélange est entre les deux, la "+
        "batterie porte à 29 et le ventilateur ajoute son kelvin. Débit, filtre et CO₂ "+
        "dans la plage."},
  {n:"Filtre colmaté", r:[-5,9.4,14.7,33,34,70,270,850],
   lire:"La perte de charge du filtre a doublé et le débit est tombé. À eau égale, "+
        "la batterie chauffe davantage le peu d'air qui passe : la température monte "+
        "alors que la puissance baisse."},
  {n:"Récupérateur givré ou bipasse ouvert", r:[-5,-4,8.3,29,30,90,120,850],
   lire:"L'air neuf ressort du récupérateur presque à sa température d'entrée : rien "+
        "n'est récupéré. Le mélange est plus froid, la batterie compense, et la "+
        "facture aussi."},
  {n:"Registre d'air neuf bloqué fermé", r:[-5,9.4,19,29,30,100,120,1900],
   lire:"Le mélange est à la température de reprise : tout est recyclé. Le CO₂ monte "+
        "sans que rien ne l'arrête. C'est la panne qu'on ne voit pas au thermomètre "+
        "et que les occupants sentent."},
  {n:"Registre d'air neuf bloqué ouvert", r:[-5,9.4,9.4,29,30,100,120,520],
   lire:"Le mélange est à la température de sortie du récupérateur : tout air neuf, "+
        "aucun recyclage. Le CO₂ est très bas, et la batterie chauffe deux fois plus "+
        "d'air neuf qu'il n'en faut."},
  {n:"Vanne de batterie chaude bloquée fermée", r:[-5,9.4,14.7,14.7,15.7,100,120,850],
   lire:"L'air sort de la batterie comme il y est entré. Le seul écart qui reste est "+
        "le kelvin du ventilateur : la salle se refroidit, régulateur en pleine demande."},
  {n:"Courroie de ventilateur cassée", r:[-5,11,16,16,16,0,0,1600],
   lire:"Plus de débit, plus de perte de charge au filtre. Les sondes lisent un air "+
        "immobile qui s'homogénéise, et le CO₂ grimpe puisque rien n'entre."}
];



/* ─────────── l'embleme d'en-tete : la journee de la salle ─────────── */



/* ═══════════════════════════════════════════ LA CHAUFFERIE EN MOUVEMENT
   Le batiment du fil rouge : une aile de college, 1 500 m², 75 kW de
   radiateurs en 80/60 a la base, une chaudiere a condensation de 90 kW qui
   module, un ballon d'ECS de 1 500 L avec sa boucle, une loi d'eau, un reduit
   de nuit. Une journee en une minute.

   Le batiment est un seul noeud thermique. Les radiateurs emettent en
   puissance 1,3 de l'ecart moyen eau-air ; le retour se deduit du debit,
   constant. Le rendement de la chaudiere depend de la temperature de l'eau
   qui LUI revient — et un bipasse peut la rechauffer, ce qui tue la
   condensation. L'ECS a priorite sur le chauffage. */



/* ─────────── lire la chaufferie : six cadrans, une panne ─────────── */
var PANNES_CH=[
  {n:"Chaufferie saine", r:[0,66,48,19.5,1.6,58],
   lire:"Départ à la loi d'eau, retour 18 K plus bas, bâtiment à la consigne, pression "+
        "à froid dans la plage, ballon chaud. Rien à signaler."},
  {n:"Circulateur de chauffage arrêté", r:[0,68,66,15,1.6,58],
   lire:"Le départ et le retour se rejoignent : rien ne circule. L'eau stagne chaude "+
        "dans la chaudière et le bâtiment refroidit, alors que tout paraît chaud en "+
        "chaufferie."},
  {n:"Vanne trois voies bloquée côté retour", r:[0,34,31,14,1.6,58],
   lire:"Le départ est à peine plus chaud que le retour : la vanne ne prend plus d'eau "+
        "chaude. Le bâtiment refroidit, la chaudière chauffe pour rien."},
  {n:"Sonde extérieure au soleil", r:[8,46,36,17.5,1.6,58],
   lire:"La sonde lit 8 °C par 0 °C réel : la loi d'eau baisse le départ de 20 K, et "+
        "le bâtiment reste 1,5 K sous la consigne tout l'après-midi. Tout fonctionne, "+
        "sur une mesure fausse."},
  {n:"Circuit emboué", r:[0,66,30,16.5,1.6,58],
   lire:"Le débit s'effondre : l'eau met longtemps à traverser les radiateurs et revient "+
        "très froide. Grand écart et bâtiment froid, c'est le contraire d'une bonne "+
        "nouvelle."},
  {n:"Thermostatiques tous fermés", r:[0,66,33,21.5,1.6,58],
   lire:"Même grand écart, mais le bâtiment est chaud : les robinets ont fermé parce "+
        "qu'il y a des apports. Ce n'est pas une panne, c'est la loi d'eau qui est "+
        "trop haute."},
  {n:"Manque d'eau, chaudière en sécurité", r:[0,45,44,16,0.4,58],
   lire:"La pression est tombée sous le bar : le pressostat a coupé le brûleur. Départ "+
        "et retour se refroidissent ensemble, et le bâtiment suit."},
  {n:"Échangeur d'ECS entartré", r:[0,66,48,19.5,1.6,31],
   lire:"Le chauffage est parfait, mais le ballon ne remonte plus : l'échangeur ne passe "+
        "plus la puissance. Les douches du matin finissent froides."}
];



/* ─────────── l'embleme d'en-tete : la journee de la chaufferie ─────────── */


/* ═══════════════════════════════════════════ LE PRODUCTIBLE PHOTOVOLTAIQUE
   Seance 22. Quatre nombres suffisent a un productible, trois de plus a ce
   qu'il vaut : la puissance crete, l'irradiation du plan, le ratio de
   performance, puis la consommation, la part autoconsommee et les deux prix.
   L'outil ne connait pas la courbe horaire : la part autoconsommee est un
   curseur, et c'est voulu — c'est elle que le cours discute. */


/* ═══════════════════════════════════════════ ÉCLAIRER UNE SALLE
   Seance 23. La methode du facteur d'utilisation, telle qu'elle se fait a
   la main : le flux a installer, le nombre de luminaires, la puissance au
   metre carre, et ce que la gestion en retire sur l'annee. */


/* ═══════════════════════════════════════════ DIX MINUTES, CHRONO
   Les automatismes se travaillent en temps limite : c'est la contrainte qui
   fait l'automatisme, pas la difficulte. Le decompte est celui de la classe —
   dix minutes en debut d'heure —, et il se lit de loin pour pouvoir etre
   projete. Rien n'est enregistre : fermer l'onglet remet tout a zero. */


/* ═══════════════════════════════════════════ QUINZE MINUTES DE LECTURE
   Fiche FICHE-LECTURE-DOSSIER. L'epreuve commence par quinze a vingt
   minutes de lecture, et 40 % de ses points sont de l'extraction. Le jeu
   entraine le geste sans le contenu : trois dossiers fictifs, un groupe
   scolaire, une piscine, un immeuble de bureaux, douze consignes chacun, et
   pour chaque consigne deux choix, OU chercher, et QUELLE FORME de reponse
   le verbe demande. Le chronometre tourne. Le retour dit juste ou faux et
   rappelle la methode ; il ne donne jamais de reponse de fond, il n'y en a
   pas. Un menu choisit le dossier, « au hasard » en premier : le hasard
   empeche de refaire toujours le meme, le menu permet d'en imposer un en
   classe. */
var FORMES_LECTURE = [
  "un mot, ou une valeur avec son unité",
  "trois lignes : la donnée, la règle, la conclusion",
  "l'ordre des étapes, numérotées",
  "la formule, les valeurs, le résultat souligné avec son unité",
  "sur le document réponse, au crayon"
];
/* chaque consigne : [texte, document, forme, ce que rappelle le retour] */
var DOSSIERS_LECTURE = [
 {nom:"Groupe scolaire",
  titre:"Groupe scolaire des Terrasses, extension et rénovation énergétique",
  docs:[
    ["DT 1","Présentation du projet, plan de masse, sources d'énergie"],
    ["DT 2","Schéma de principe de la chaufferie, régimes d'eau"],
    ["DT 3","Fiche technique de la chaudière à condensation"],
    ["DT 4","Schéma de la CTA de la salle polyvalente, occupation, débits"],
    ["DT 5","Diagramme de l'air humide"],
    ["DT 6","Extrait de catalogue : sondes de CO₂"],
    ["DT 7","Tableau de points et programme horaire de la GTB"],
    ["DT 8","Index des compteurs et facture annuelle"],
    ["DR 1","Schéma hydraulique à surligner"],
    ["DR 2","Graphe de régulation de la batterie chaude à compléter"]
  ],
  questions:[
    ["Indiquer la puissance nominale de la chaudière et son rendement sur PCI.",2,0,
     "« Indiquer » et une fiche technique : on relève, on n'explique pas."],
    ["Justifier le choix d'une chaudière à condensation au regard du régime d'eau des radiateurs.",1,1,
     "Le régime d'eau est sur le schéma de principe ; « justifier » demande la donnée, la règle et la conclusion."],
    ["Surligner le circuit primaire sur le schéma hydraulique.",8,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Déterminer le débit d'air neuf de la salle polyvalente pour l'occupation prévue.",3,3,
     "L'occupation est une donnée du schéma de la CTA ; « déterminer » est un calcul, avec l'unité."],
    ["Placer le point de soufflage sur le diagramme et lire sa teneur en eau.",4,4,
     "Un point se place sur le diagramme fourni, qui est un document réponse de fait."],
    ["Expliquer pourquoi la sonde de CO₂ est installée sur la reprise et non sur le soufflage.",3,1,
     "« Expliquer » : trois lignes, et la donnée est la position de la sonde sur le schéma de la CTA."],
    ["Choisir la sonde de CO₂ adaptée et relever sa plage de mesure et son signal de sortie.",5,0,
     "Un extrait de catalogue se lit ; « relever » donne des valeurs, pas des phrases."],
    ["Compléter le tableau de points : la nature de chaque point de la CTA.",6,4,
     "Un tableau à compléter est un document réponse, même s'il est dans un DT."],
    ["Calculer la consommation de chauffage de l'année à partir des index.",7,3,
     "Deux index, une différence, une unité : c'est un calcul, et il s'écrit."],
    ["Compléter le graphe de régulation de la batterie chaude avec les valeurs manquantes.",9,4,
     "Un graphe se complète sur le DR, au crayon d'abord."],
    ["Décrire, dans l'ordre, ce que fait la GTB à la relance de 6 h.",6,2,
     "« Décrire » demande un ordre ; le programme horaire est dans le tableau de points de la GTB."],
    ["Citer les deux sources d'énergie du groupe scolaire.",0,0,
     "« Citer » : deux mots, pris dans la présentation du projet."]
  ]},
 {nom:"Piscine",
  titre:"Centre aquatique des Oliviers, construction neuve",
  docs:[
    ["DT 1","Présentation du centre : bassins, fréquentation, températures, énergies"],
    ["DT 2","Schéma de principe de la chaufferie et de la PAC sur air extrait"],
    ["DT 3","Schéma de la CTA de déshumidification du hall, points de fonctionnement"],
    ["DT 4","Diagramme de l'air humide"],
    ["DT 5","Schéma de l'ECS avec récupérateur sur eaux grises"],
    ["DT 6","Extrait de catalogue : vannes trois voies et servomoteurs"],
    ["DT 7","Programme de régulation des deux batteries chaudes"],
    ["DT 8","Consommations mensuelles d'eau et d'énergie, fréquentation"],
    ["DR 1","Schéma de l'ECS à surligner"],
    ["DR 2","Graphe de régulation des deux vannes à compléter"]
  ],
  questions:[
    ["Indiquer la température de l'eau des bassins et celle de l'air du hall.",0,0,
     "« Indiquer » : deux valeurs relevées dans la présentation, avec leur unité."],
    ["Expliquer pourquoi l'air du hall est maintenu deux degrés au-dessus de l'eau des bassins.",0,1,
     "Les deux températures sont dans la présentation ; la règle est l'évaporation des bassins, et « expliquer » veut trois lignes."],
    ["Citer les deux générateurs de la chaufferie.",1,0,
     "« Citer » : deux noms, lus sur le schéma de principe."],
    ["Justifier le choix d'une PAC sur air extrait plutôt qu'un rejet direct de l'air du hall.",1,1,
     "La PAC figure sur le schéma de la chaufferie ; « justifier » demande la donnée, la règle et la conclusion."],
    ["Déterminer la puissance de la batterie froide à partir des enthalpies d'entrée et de sortie.",2,3,
     "Les points de fonctionnement sont sur le schéma de la CTA ; « déterminer » est un calcul, qm × Δh, avec l'unité."],
    ["Placer le point de l'air du hall sur le diagramme et lire son humidité absolue.",3,4,
     "Un point se place sur le diagramme fourni, qui est un document réponse de fait."],
    ["Expliquer l'intérêt du récupérateur sur eaux grises.",4,1,
     "Le récupérateur est sur le schéma de l'ECS ; trois lignes, la donnée, la règle, la conclusion."],
    ["Surligner le parcours de l'eau froide sanitaire, du compteur au ballon, à travers le récupérateur.",8,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Relever le signal de commande et le temps de course du servomoteur retenu.",5,0,
     "Un extrait de catalogue se lit ; « relever » donne des valeurs, pas des phrases."],
    ["Décrire, dans l'ordre, l'enclenchement des deux batteries chaudes quand la température de soufflage baisse.",6,2,
     "« Décrire » demande un ordre ; il est dans le programme de régulation."],
    ["Compléter le graphe de régulation des deux vannes en séquence.",9,4,
     "Un graphe se complète sur le DR, au crayon d'abord."],
    ["Calculer la consommation d'eau par baigneur au mois de juillet.",7,3,
     "La consommation et la fréquentation sont dans le même tableau ; une division, avec son unité."]
  ]},
 {nom:"Immeuble de bureaux",
  titre:"Immeuble Le Belvédère, rénovation lourde de bureaux",
  docs:[
    ["DT 1","Présentation du projet : surfaces, effectif, calendrier des travaux"],
    ["DT 2","Coupe de la façade avant et après isolation par l'extérieur"],
    ["DT 3","Fiches techniques des isolants : conductivité, épaisseur, prix"],
    ["DT 4","Schéma de principe de la sous-station de chauffage urbain"],
    ["DT 5","Contrat de réseau de chaleur : abonnement et prix du kWh"],
    ["DT 6","Implantation des modules photovoltaïques en toiture"],
    ["DT 7","Synoptique de raccordement du photovoltaïque au TGBT"],
    ["DT 8","Index des compteurs de production, d'injection et de soutirage"],
    ["DR 1","Tableau de calcul du coefficient U de la façade"],
    ["DR 2","Synoptique du raccordement à surligner"]
  ],
  questions:[
    ["Indiquer la surface de plancher et l'effectif du bâtiment.",0,0,
     "« Indiquer » : deux valeurs de la présentation, avec leur unité."],
    ["Calculer la résistance thermique du nouvel isolant, à partir de son épaisseur et de sa conductivité.",2,3,
     "L'épaisseur et la conductivité sont sur la fiche de l'isolant ; R = e / λ, avec l'unité."],
    ["Compléter le tableau de calcul du coefficient U de la façade isolée.",8,4,
     "Un tableau à compléter est un document réponse."],
    ["Expliquer pourquoi l'isolation par l'extérieur supprime le pont thermique du plancher.",1,1,
     "La coupe avant et après montre le plancher ; trois lignes, la donnée, la règle, la conclusion."],
    ["Nommer les éléments repérés 1 à 4 sur la sous-station.",3,0,
     "« Nommer » : un mot par repère, lu sur le schéma de principe."],
    ["Décrire le parcours de l'eau du réseau primaire, de l'arrivée au retour.",3,2,
     "« Décrire » demande un ordre ; on suit le schéma dans le sens de l'eau."],
    ["Calculer la part fixe annuelle de la facture de chaleur.",4,3,
     "L'abonnement est dans le contrat ; une multiplication par la puissance souscrite, avec l'unité."],
    ["Relever la puissance crête installée et le nombre d'onduleurs.",5,0,
     "« Relever » : deux valeurs, lues sur l'implantation en toiture."],
    ["Justifier l'orientation est-ouest retenue pour les modules.",5,1,
     "L'orientation est sur l'implantation ; la règle est la forme de la courbe de production sur la journée."],
    ["Expliquer pourquoi l'onduleur s'arrête lors d'une coupure du réseau.",6,1,
     "Le synoptique montre la protection de découplage ; trois lignes, la donnée, la règle, la conclusion."],
    ["Surligner le parcours de l'énergie produite quand la production dépasse la consommation.",9,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Calculer le taux d'autoconsommation du mois de mai à partir des index.",7,3,
     "Trois index, deux différences, un quotient : c'est un calcul, et il s'écrit."]
  ]}
];



/* ═══════════════════════════════════════════ LA CARTE DES PREREQUIS
   Page d'essai. Le site ecrit prerequis.js, la carte des pages publiees et
   des pages que chacune suppose lues. L'outil la dessine en colonnes, une par
   sequence, et la croise avec les marques « lu » du navigateur : on choisit
   la page qu'on va lire, et la carte dit ce qu'il faut avoir lu avant, et ce
   qui ne l'est pas encore. Tout reste dans le navigateur, rien ne sort. */


/* ═══════════════════════════════════════════ UNE SAISON DE POMPE A CHALEUR
   Page d'essai. Une journee ne dit rien d'une pompe a chaleur : son COP
   change avec l'exterieur et avec la temperature qu'on lui demande, sa
   puissance tombe quand il fait froid, et l'appoint prend le relais sous le
   point de bivalence. Il faut une saison, jour par jour, du 1er octobre au
   30 avril. Le batiment est celui du fil rouge : G kW/K, une consigne, des
   apports gratuits qui valent 3 K. La PAC est definie a +7/35 et suit une loi
   simple : la puissance perd 3 % par kelvin sous +7, le COP vaut la moitie de
   Carnot avec un givrage entre -3 et +5 °C. */
var CLIMATS = {
  "Fréjus":     {tm:[17,12,9,8,9,11,14],  base:-5,  amp:7},
  "Lyon":       {tm:[13,7,4,3,4,8,11],    base:-10, amp:9},
  "Lille":      {tm:[12,7,4,3,4,7,10],    base:-9,  amp:8},
  "Strasbourg": {tm:[11,5,2,1,2,6,10],    base:-15, amp:10}
};
var NOMS_CLIMATS = ["Fréjus","Lyon","Lille","Strasbourg"];
var EMETTEURS = {
  "Plancher chauffant 35/28":  {tbase:35, pente:0.67},
  "Radiateurs basse T 55/45":  {tbase:55, pente:1.5},
  "Radiateurs existants 65/55":{tbase:65, pente:1.9}
};
var NOMS_EMETTEURS = ["Plancher chauffant 35/28","Radiateurs basse T 55/45","Radiateurs existants 65/55"];
var MOIS_SAISON = ["oct.","nov.","déc.","janv.","févr.","mars","avr."];
var JOURS_MOIS = [31,30,31,31,28,31,30];



/* ═══════════════════════════════════════════ CE QUE CONTIENT UN KILO D'AIR
   Fiche enthalpie. Deux airs, A et B, chacun par sa temperature et son
   humidite relative. Pour chacun, h en trois morceaux : l'air sec (1,006 θ),
   la vaporisation de son eau (2 501 r), et la vapeur rechauffee (1,83 θ r).
   Puis la difference, ce qu'elle vaut en puissance pour un debit, et ce que
   le thermometre seul en aurait dit : c'est tout l'argument de la fiche. */




/* ─────────── ou passent les 100 unites de combustible ─────────── */


/* ─────────── la loi d'emission, et la droite qu'on croit suivre ─────────── */


/* ─────────── simple flux et double flux ─────────── */


/* ─────────── boucle ouverte et boucle fermee ─────────── */


/* ─────────── bitube, monotube, pieuvre ─────────── */


/* ─────────── retour direct contre retour inverse ─────────── */



/* ═══════════════════════════════════════════════════ SYMBOLES HYDRAULIQUES
   Chaque symbole se dessine dans un cadre 64 x 44, trait de 2. Les
   conventions suivies sont celles des schemas de principe des sujets. */
function symbole(nom, coul){
  var s=S("svg",{viewBox:"0 0 64 44","class":"sym"});
  var c=coul||"encre";
  function L(x1,y1,x2,y2,ep){s.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,
    stroke:V(c),"stroke-width":ep||2,"stroke-linecap":"round"}));}
  function P(d,fill){s.appendChild(S("path",{d:d,fill:fill?V(c):"none",
    stroke:V(c),"stroke-width":2,"stroke-linejoin":"round"}));}
  function C2(cx,cy,r,fill){s.appendChild(S("circle",{cx:cx,cy:cy,r:r,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function R2(x,y,l,h,fill){s.appendChild(S("rect",{x:x,y:y,width:l,height:h,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function T2(x,y,txt,t2){s.appendChild(S("text",{x:x,y:y,"text-anchor":"middle",
    "class":"s-sym"},txt));}
  var noeud=22;                                   /* demi-largeur du papillon */
  function papillon(){P("M10,10L10,34L32,22Z");P("M54,10L54,34L32,22Z");}
  var d={
   "arret":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);L(24,8,40,8);},
   "reglage":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);
     L(24,8,40,8);L(20,34,44,6,2);},
   "v2v":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,14);
     R2(22,2,20,12);},
   "v3v":function(){L(0,22,10,22);L(54,22,64,22);L(32,44,32,34);
     P("M10,10L10,34L30,22Z");P("M54,10L54,34L34,22Z");
     P("M22,44L42,44L32,32Z");R2(22,0,20,12);L(32,12,32,18);},
   "clapet":function(){L(0,22,10,22);L(54,22,64,22);P("M10,10L10,34L32,22Z",true);
     L(32,8,32,36,2.5);},
   "soupape":function(){L(0,22,10,22);L(32,22,32,10);L(20,10,44,10);
     P("M10,10L10,34L32,22Z");L(32,10,44,2);L(38,4,46,8);L(54,22,64,22);
     P("M54,10L54,34L32,22Z");},
   "pompe":function(){L(0,22,8,22);L(56,22,64,22);C2(32,22,15);
     P("M25,13L45,22L25,31Z",true);},
   "echangeur":function(){R2(10,6,44,32);
     P("M16,10L26,22L16,34");P("M28,10L38,22L28,34");P("M40,10L50,22L40,34");},
   "vase":function(){L(32,44,32,34);P("M12,34L12,16A20,10 0 0 1 52,16L52,34Z");
     L(12,25,52,25,2);},
   "mano":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"P");},
   "sonde":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"T");},
   "filtre":function(){L(0,22,14,22);L(50,22,64,22);R2(14,10,36,24);
     L(20,10,20,34,1.5);L(26,10,26,34,1.5);L(32,10,32,34,1.5);L(38,10,38,34,1.5);
     L(44,10,44,34,1.5);},
   "purgeur":function(){L(32,44,32,30);C2(32,20,11);L(32,9,32,3);L(26,3,38,3);},
   "compteur":function(){L(0,22,12,22);L(52,22,64,22);R2(12,8,40,28);
     T2(32,28,"kWh");},
   "disconnecteur":function(){L(0,22,8,22);L(56,22,64,22);R2(8,10,48,24);
     L(24,10,24,34,1.5);L(40,10,40,34,1.5);T2(16,28,"B");T2(48,28,"A");}
  };
  (d[nom]||function(){})();
  return s;
}

var ORGANES_HYDRO=[
 {k:"echangeur",n:"Échangeur à plaques",rep:1,
  r:"Il transfère la chaleur du réseau urbain au circuit du bâtiment <b>sans que "+
    "les deux eaux se mélangent</b>. C'est la frontière entre le primaire, qui "+
    "appartient au fournisseur, et le secondaire, qui appartient au bâtiment.",
  ou:"Au cœur de la sous-station, entre primaire et secondaire.",
  ep:"Calculer sa puissance, tracer les deux circuits sur un DR, ou justifier "+
     "pourquoi les fluides ne se mélangent pas."},
 {k:"pompe",n:"Circulateur",rep:2,
  r:"Il met l'eau en mouvement et <b>fournit la pression que le réseau consomme</b> "+
    "en pertes de charge. Il ne crée pas de chaleur : il transporte.",
  ou:"Sur le départ ou le retour du secondaire, un par circuit.",
  ep:"Lire une courbe caractéristique, choisir une vitesse, trouver le point de "+
     "fonctionnement."},
 {k:"v3v",n:"Vanne 3 voies motorisée",rep:3,
  r:"Elle <b>mélange</b> deux eaux à températures différentes, ou <b>répartit</b> "+
    "un débit entre deux branches. C'est l'organe de régulation du départ : "+
    "l'automate lui donne un ordre, elle agit sur l'énergie.",
  ou:"En sortie de production, sur le départ du circuit de chauffage.",
  ep:"Identifier sa fonction — mélange ou répartition —, la placer sur un schéma, "+
     "expliquer le rôle du moteur."},
 {k:"v2v",n:"Vanne 2 voies motorisée",rep:4,
  r:"Elle <b>étrangle</b> un débit sans le dériver. En se fermant, elle augmente "+
    "la résistance du circuit et fait remonter la pression ailleurs — d'où la "+
    "nécessité d'un circulateur à pression variable.",
  ou:"Sur un émetteur, un aérotherme, une batterie de CTA.",
  ep:"La distinguer de la V3V, et en déduire l'effet sur le débit total."},
 {k:"arret",n:"Vanne d'arrêt",rep:5,
  r:"Elle isole une portion du circuit pour l'intervention. <b>Elle ne règle "+
    "rien</b> : elle est ouverte ou fermée.",
  ou:"De part et d'autre de tout organe démontable.",
  ep:"La repérer, et justifier pourquoi on en place deux autour d'une pompe."},
 {k:"reglage",n:"Vanne d'équilibrage",rep:6,
  r:"Elle ajoute <b>volontairement</b> de la perte de charge à une branche trop "+
    "favorisée, pour que chaque émetteur reçoive son débit. Elle porte une "+
    "graduation et se règle une fois pour toutes.",
  ou:"Sur le retour de chaque branche, ou de chaque colonne.",
  ep:"Expliquer l'équilibrage, lire un procès-verbal de réglage."},
 {k:"clapet",n:"Clapet anti-retour",rep:7,
  r:"Il ne laisse passer l'eau que <b>dans un sens</b>. Il empêche une pompe à "+
    "l'arrêt d'être traversée à l'envers par une pompe voisine.",
  ou:"En aval d'un circulateur, ou sur un remplissage.",
  ep:"Repérer le sens de circulation qu'il impose."},
 {k:"soupape",n:"Soupape de sécurité",rep:8,
  r:"Elle <b>s'ouvre toute seule</b> si la pression dépasse son tarage — 3 bar en "+
    "chauffage — et évacue de l'eau jusqu'à ce que la pression redescende. C'est "+
    "un organe de sécurité, jamais de régulation.",
  ou:"Sur la production, sans aucune vanne entre elle et le générateur.",
  ep:"Justifier son tarage, expliquer pourquoi rien ne doit pouvoir l'isoler."},
 {k:"vase",n:"Vase d'expansion",rep:9,
  r:"L'eau se dilate en chauffant. Le vase <b>absorbe ce volume</b> dans une "+
    "membrane comprimant un coussin d'azote. Sans lui, la pression monterait "+
    "jusqu'au déclenchement de la soupape à chaque chauffe.",
  ou:"Sur le retour, au plus près du générateur.",
  ep:"Calculer son volume à partir de la dilatation, ou expliquer son rôle."},
 {k:"mano",n:"Manomètre",rep:10,
  r:"Il indique la pression du circuit. Une pression qui baisse lentement signale "+
    "une fuite ; une pression qui monte à chaud signale un vase hors service.",
  ou:"Sur la production, près du remplissage.",
  ep:"Lire une valeur et la comparer à une consigne."},
 {k:"sonde",n:"Sonde de température",rep:11,
  r:"Elle <b>acquiert</b> l'information dont la régulation a besoin. Elle "+
    "appartient à la chaîne d'information, pas à la chaîne d'énergie.",
  ou:"Sur le départ, le retour, en ambiance, et en extérieur.",
  ep:"La placer dans la bonne chaîne, ou justifier son emplacement."},
 {k:"filtre",n:"Filtre — pot à boue",rep:12,
  r:"Il retient les particules qui useraient la pompe et boucheraient les "+
    "émetteurs. <b>Il s'encrasse, donc il se nettoie</b> : un filtre colmaté "+
    "ajoute une perte de charge considérable.",
  ou:"En amont du circulateur et de l'échangeur.",
  ep:"Expliquer sa présence, ou l'effet de son encrassement sur le débit."},
 {k:"purgeur",n:"Purgeur d'air",rep:13,
  r:"L'air dissous se rassemble aux points hauts et <b>bloque la circulation</b>. "+
    "Le purgeur l'évacue automatiquement.",
  ou:"À chaque point haut du réseau.",
  ep:"Justifier son emplacement — c'est presque toujours « au point haut »."},
 {k:"compteur",n:"Compteur d'énergie",rep:14,
  r:"Il mesure le débit et l'écart de température, et en déduit l'énergie "+
    "livrée. C'est lui qui fait la facture du réseau de chaleur.",
  ou:"Sur le primaire, côté fournisseur.",
  ep:"Retrouver l'énergie à partir de P = Q × 1 163 × ΔT."},
 {k:"disconnecteur",n:"Disconnecteur",rep:15,
  r:"Il empêche l'eau du circuit de chauffage de <b>revenir dans le réseau "+
    "d'eau potable</b>. C'est une obligation sanitaire sur tout remplissage.",
  ou:"Sur la conduite de remplissage, entre l'eau de ville et le circuit.",
  ep:"Le nommer et donner sa fonction sanitaire."}
];



/* ─────────── le schema de principe d'une sous-station ─────────── */
/* ─────────────────────────────────────────────── le cycle sur le diagramme
   enthalpique (log p, h) — dit « diagramme de Mollier » en froid.
   La courbe de saturation est SCHEMATIQUE : elle a la forme d'un vrai
   diagramme — liquide raide, vapeur presque plate, point critique au
   sommet — mais elle n'est celle d'aucun fluide. Les enthalpies portees
   sont celles de l'exemple traite dans la page, et elles bouclent :
   qk = qo + w. Un schema qui ne bouclerait pas apprendrait a ne pas
   verifier. */
/* Deux noms, un seul dessin. « cycle-mollier » porte les valeurs lues ;
   « cycle-mollier-muet » ne porte que les symboles — c'est la version
   qui accompagne une question, ou le diagramme donnerait la reponse. */
function dessineMollier(el,chiffre){
  var W=740,H=440,X0=64,X1=690,Y0=44,Y1=336;
  var HMIN=190,HMAX=500,PMIN=1,PMAX=60;          /* kJ/kg et bar absolus */
  var H1=425,H2=460,H3=270,BP=9.3,HP=30;         /* l'exemple de la page */

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Cycle frigorifique sur le diagramme enthalpique"});
  el.appendChild(svg);

  function px(h){return X0+(h-HMIN)/(HMAX-HMIN)*(X1-X0);}
  function u(p){return (Math.log(p)-Math.log(PMIN))/(Math.log(PMAX)-Math.log(PMIN));}
  function py(p){return Y1-u(p)*(Y1-Y0);}         /* l'axe des pressions est LOG */
  /* La cloche est SCHEMATIQUE — forme d'un vrai diagramme, fluide d'aucun.
     Les exposants sont cales pour que les quatre points du cycle tombent
     dans la bonne zone : 3 en liquide sous-refroidi, 4 sous la cloche,
     1 et 2 en vapeur surchauffee. Un schema ou le point 3 serait dans le
     melange enseignerait le contraire de ce que dit le texte. */
  function hL(p){return 200+140*Math.pow(u(p),2.692);}
  function hV(p){return 430- 90*Math.pow(u(p),2.952);}

  /* -- la grille */
  [1,2,3,5,10,20,30,60].forEach(function(p){
    svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-9,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
      String(p)));
  });
  for(var h=200;h<=HMAX;h+=50){
    svg.appendChild(S("line",{x1:px(h),y1:Y0,x2:px(h),y2:Y1,stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:px(h),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
      String(h)));
  }
  svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+60,"text-anchor":"middle","class":"s-pet"},
    "enthalpie massique h  (kJ/kg)"));
  var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
    transform:"translate(17,"+((Y0+Y1)/2)+") rotate(-90)"});
  lab.textContent="pression absolue p  (bar, échelle log)";
  svg.appendChild(lab);

  /* -- la courbe de saturation, en une seule cloche */
  var d="",p,k=0;
  for(p=PMIN;p<=PMAX;p*=1.05) d+=(k++?"L":"M")+px(hL(p)).toFixed(1)+","+py(p).toFixed(1);
  d+="L"+px(340).toFixed(1)+","+py(PMAX).toFixed(1);
  for(p=PMAX;p>=PMIN;p/=1.05) d+="L"+px(hV(p)).toFixed(1)+","+py(p).toFixed(1);
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"2.5"}));
  svg.appendChild(S("circle",{cx:px(340),cy:py(PMAX),r:4,fill:V("froid")}));
  svg.appendChild(S("text",{x:px(340),y:py(PMAX)-12,"text-anchor":"middle",
    "class":"s-pet",fill:V("froid")},"point critique"));

  /* -- les trois zones : la premiere lecture a savoir faire */
  [[224,2.4,"liquide"],[330,2.4,"mélange liquide + vapeur"],[458,2.4,"vapeur surchauffée"]]
    .forEach(function(z){
      svg.appendChild(S("text",{x:px(z[0]),y:py(z[1]),"text-anchor":"middle",
        "class":"s-pet",fill:V("encre2")},z[2]));
    });

  /* -- le cycle : 1 aspiration, 2 refoulement, 3 liquide, 4 apres detente */
  var P1=[px(H1),py(BP)],P2=[px(H2),py(HP)],P3=[px(H3),py(HP)],P4=[px(H3),py(BP)];
  function trait(a,b,coul){
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),
      "stroke-width":"3.5","stroke-linecap":"round"}));
  }
  trait(P4,P1,"froid");            /* evaporation  */
  trait(P1,P2,"chaud");            /* compression  */
  trait(P2,P3,"chaud");            /* condensation */
  trait(P3,P4,"encre");            /* detente      */

  /* Chaque point porte SON enthalpie. Ce n'est pas une reponse — les
     questions demandent des differences et des rapports — et sans elle on ne
     lit qu'a la graduation de 50 kJ/kg, ce qui interdit tout calcul juste. */
  [[P1,"1",9,16,H1,10,34],[P2,"2",9,-9,H2,10,-26],
   [P3,"3",-16,-9,H3,-18,20],[P4,"4",-16,16,H3,-18,34]].forEach(function(q){
    svg.appendChild(S("circle",{cx:q[0][0],cy:q[0][1],r:5.5,fill:V("carte"),
      stroke:V("encre"),"stroke-width":"2.5"}));
    svg.appendChild(S("text",{x:q[0][0]+q[2],y:q[0][1]+q[3],"class":"s-nom"},q[1]));
    svg.appendChild(S("text",{x:q[0][0]+q[5],y:q[0][1]+q[6],"class":"s-pet",
      "text-anchor":q[5]<0?"end":"start",fill:V("encre2")},q[4]+" kJ/kg"));
  });

  /* -- ce que chaque segment vaut. Les deux mesures horizontales sont posees
        LOIN l'une de l'autre : cote a cote, elles se chevauchaient. */
  function mesure(x1,x2,y,texte,coul,dessous){
    svg.appendChild(S("line",{x1:x1,y1:y,x2:x2,y2:y,stroke:V(coul),"stroke-width":"1.5",
      "stroke-dasharray":"5 4"}));
    svg.appendChild(S("text",{x:(x1+x2)/2,y:y+(dessous?15:-7),"text-anchor":"middle",
      "class":"s-pet",fill:V(coul)},texte));
  }
  mesure(px(H3),px(H1),Y1-16,chiffre?"qo = h1 − h4 = 155 kJ/kg":"qo","froid",false);
  mesure(px(H3),px(H2),py(HP)-26,chiffre?"qk = h2 − h3 = 190 kJ/kg":"qk","chaud",false);
  svg.appendChild(S("text",{x:(P1[0]+P2[0])/2+30,y:(P1[1]+P2[1])/2,"class":"s-pet",
    fill:V("chaud")},chiffre?"w = h2 − h1 = 35":"w"));

  /* -- la detente est VERTICALE : c'est la lecture qui surprend le plus */
  svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2-4,"text-anchor":"end",
    "class":"s-pet",fill:V("encre2")},"détente"));
  if(chiffre)svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2+12,
    "text-anchor":"end","class":"s-pet",fill:V("encre2")},"h constante"));

  if(!chiffre)return;
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  lect.innerHTML="<strong>qk = qo + w</strong> — 190 = 155 + 35. Le condenseur évacue "+
    "tout ce que l'évaporateur a pris, <em>plus</em> le travail du compresseur. "+
    "Un relevé qui ne boucle pas est un relevé faux.<br>"+
    "<strong>EER = qo / w = 4,43</strong> et <strong>COP = qk / w = 5,43</strong> : "+
    "exactement une unité d'écart, et c'est la même relation que Q<sub>chaud</sub> = "+
    "Q<sub>froid</sub> + W, lue sur le diagramme.";
  el.appendChild(lect);
}





/* ═══════ Quatre schemas pour les fiches d'automatismes de la 2de ═══════
   Ajoutes le 9 septembre 2026. Comme les vingt et un precedents, ils ne
   parlent d'aucun metier : c'est ce qui les rend reutilisables ailleurs. */

/* ─────────── un repere orthogonal, et quatre points a lire ─────────── */


/* ─────────── lire une image, puis un antecedent, sur la meme courbe ─────────── */


/* ─────────── les quatre crochets, sur la meme portion de droite ─────────── */


/* ─────────── reconnaitre Pythagore, reconnaitre Thales ─────────── */


/* ─────────── la pile zinc-cuivre, et le chemin des electrons ───────────
   Ajoute le 18 septembre 2026 pour la Tle CTRM, sequence 2. Il sert aussi
   en sequence 9 : la corrosion est la meme reaction, sans le fil. */


/* ─────────── ce que pese l'energie, pour un meme besoin ───────────
   Une seule mesure, donc une seule teinte, plus l'accent sur la ligne qui
   porte le message. Les barres sont A L'ECHELLE : celle du gazole est
   presque invisible, et c'est exactement ce qu'il faut voir. */


/* ─────────── le banc de l'activite 2, dans les deux sens ───────────
   L'accumulateur est A LA MEME PLACE dans les deux panneaux — montant de
   droite. Seule la fleche change, et c'est tout le propos de la seance.
   Les valeurs sont celles d'un NiMH format AA : 1,2 V nominal, 2 000 mA·h. */


/* ─────────── la decharge complete, d'ou sortent Q et E ───────────
   Le prolongement du banc de la seance 2, a courant constant. Les nombres
   sont ceux de l'accumulateur AA, JAMAIS ceux des tableaux i) et j) du
   polycopie : la fiche montre comment on lit, elle ne rend pas la copie. */


/* ─────────── peser l'accumulateur, puis remonter au camion ───────────
   Une manip de trente secondes qui ancre la table de l'activite 4 : le
   W·h/kg cesse d'etre un nombre lu quelque part. */


/* ══════════════════════════════════ SCHEMAS — Tle CTRM, sequence 3
   Vecteurs dans l'espace. La convention d'axes est celle de la figure du
   polycopie, fig3-espace : x longueur vers la DROITE, y largeur en fuyante
   vers le haut-droit, z hauteur vers le HAUT. Un schema web qui inverserait
   deux axes ferait douter de la feuille, pas de lui-meme. */

/* ─────────── la caisse, et trois nombres pour un point ─────────── */


/* ─────────── les deux sangles, et pourquoi 2 + 2 ne font pas 4 ───────────
   A, B et S ont tous x = 4 : la figure est PLANE, et ce dessin en (y ; z)
   n'est donc pas une projection, c'est la vraie forme. */


/* ─────────── colineaires : la meme droite, pas le meme sens ─────────── */


/* ─────────── ce que dit la troisieme coordonnee ───────────
   Les deux panneaux sont vus DE COTE, et c'est indispensable : une vue de
   dessus ne peut pas montrer que z vaut zero, puisque tout y parait
   horizontal. Le premier essai la prenait, et ne demontrait rien. */


/* ══════════════════════════════ SCHEMAS — Tle CTRM, sequence 1
   Ajustement d'un nuage. Ce sont des GRAPHIQUES, pas des dessins, et deux
   regles les tiennent :

   — deux teintes de serie au maximum par graphique, « chaud » et « froid ».
     Eprouve au validateur : ecart 24,3 en vision normale et 18,7 en
     protanopie. « encre2 » est un GRIS — chroma 0,007, ecart 12,8 de
     « froid » — il ne peut donc pas porter une troisieme courbe. C'est la
     raison pour laquelle le comparatif a quatre modeles est fait en petits
     multiples : un seul trace par panneau, et le probleme disparait.

   — l'identite ne repose jamais sur la seule couleur : chaque courbe porte
     son nom en bout de trace, et le modele retenu porte le mot RETENU. */

/* nuage + courbe : helpers communs aux quatre */
function _pts(svg,X,Y,fx,fy,r){
  X.forEach(function(x,i){
    svg.appendChild(S("circle",{cx:fx(x),cy:fy(Y[i]),r:r||"3.6",fill:V("encre")}));
  });
}
function _courbe(svg,f,x0,x1,fx,fy,coul,ep,ymin,ymax,tirets){
  var d="",n=90,dessus=false;
  for(var k=0;k<=n;k++){
    var x=x0+(x1-x0)*k/n, y=f(x);
    if(y<ymin||y>ymax){ dessus=false; continue; }
    d+=(dessus?" L ":" M ")+fx(x).toFixed(1)+" "+fy(y).toFixed(1);
    dessus=true;
  }
  var at={d:d,fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linecap":"round"};
  if(tirets)at["stroke-dasharray"]=tirets;
  svg.appendChild(S("path",at));
}

/* ─────────── le meme nuage, les quatre modeles ─────────── */


/* ─────────── deux modeles que le R2 ne separe pas ─────────── */


/* ─────────── jusqu'ou les modeles restent d'accord ─────────── */


/* ─────────── le cafe : deux R2 excellents, une reponse absurde ─────────── */






/* ─────────── CAP · ce qu'une multiprise accepte ─────────── */


/* ─────────── CAP · l'ordre dans lequel les choses arrivent ─────────── */


/* ─────────── CAP · un chemin ou plusieurs ─────────── */


/* ─────────── CAP · ou se branchent les deux appareils ─────────── */


/* ─────────── CAP · la droite U-I et le quotient qui ne bouge pas ─────────── */




/* ─────────── CAP · ce qui rentre encore quand le radiateur tourne ─────────── */


/* ─────────── CAP · trouver l'ampoule grillee au voltmetre ─────────── */


/* ─────────── CAP · faire le tour ou couvrir la surface ─────────── */


/* ─────────── CAP · la diagonale, et les pouces ─────────── */


/* ─────────── CAP · ce que fait le courant selon son intensite ─────────── */


/* ─────────── CAP · la conversion decide du resultat ─────────── */




/* ─────────── CAP · deux appareils, deux protections ─────────── */


/* ─────────── CAP · un chiffre plutot qu'un adjectif ─────────── */


/* ─────────── CAP · c'est le plus faible qui fixe la limite ─────────── */


/* ─────────── CAP · proportionnel, ou pas ─────────── */


/* ─────────── CAP · le meme tableau, deux metiers ─────────── */


/* ─────────── CAP · decouper un local en rectangles ─────────── */


/* ─────────── CAP · l'angle droit au metre ruban ─────────── */




/* ─────────── 2DE CIEL · le facteur huit entre bits et octets ─────────── */


/* ─────────── 2DE CIEL · qui protege qui ─────────── */


/* ─────────── 2DE CIEL · jusqu'ou va la TBTS ─────────── */


/* ─────────── 2DE CIEL · la tension se partage ─────────── */


/* ─────────── 2DE CIEL · la resistance de la LED ─────────── */



/* ─────────── CAP · la puissance ne suffit pas ─────────── */


/* ─────────── CAP · deux offres qui se croisent ─────────── */


/* ─────────── TLE · les pertes en ligne, sous deux tensions ─────────── */


/* ─────────── TLE · le transformateur et ses deux bobines ─────────── */


/* ─────────── TLE · par ou la chaleur entre dans la remorque ─────────── */


/* ─────────── TLE · la caisse qui se rechauffe : droite ou courbe ─────────── */


/* ─────────── TLE · retirer toujours pareil, ou multiplier toujours pareil ─────────── */


/* ─────────── TLE · moins 20 %, puis plus 20 % ─────────── */


/* ─────────── TLE · le verre, piege a infrarouge ─────────── */


/* ─────────── TLE · du gazole au CO2, en quatre etapes ─────────── */


/* ─────────── TLE · la suite ne connait que les annees, la fonction tous les instants ─────────── */


/* ─────────── TLE · l'echelle de pH, un facteur dix par unite ─────────── */


/* ─────────── TLE · qui donne ses electrons a qui ─────────── */


/* ─────────── TLE · passivation ou rouille ─────────── */


/* ─────────── TLE · de la tole au bac ─────────── */


/* ─────────── TLE · le signe de la derivee, et le maximum ─────────── */


/* ─────────── TLE · poids et poussee ─────────── */


/* ─────────── TLE · l'arbre de la tournee ─────────── */


/* ─────────── TLE · au moins une fois ─────────── */


/* ─────────── TLE · la reflexion totale dans une fibre ─────────── */


/* ─────────── TLE · repartir son temps selon les points ─────────── */


/* ─────────── 2DE CIEL · une equation est une balance ─────────── */


/* ─────────── 2DE CIEL · de l'inequation a la reponse concrete ─────────── */


/* ─────────── 2DE CIEL · detecteurs piece par piece ─────────── */


/* ─────────── 2DE CIEL · la marge du generateur de brouillard ─────────── */


/* ─────────── 2DE CIEL · trois capteurs, trois formes de courbe ─────────── */


/* ─────────── 2DE CIEL · le transmetteur 4-20 mA ─────────── */


/* ─────────── 2DE CIEL · deux abonnements, un point de croisement ─────────── */


/* ─────────── 2DE CIEL · f(x) + k : monter, jamais glisser ─────────── */


/* ─────────── 2DE CIEL · plexiglas vers air : trois incidences ─────────── */


/* ─────────── 2DE CIEL · le spectre, du visible a la fibre ─────────── */


/* ─────────── 2DE CIEL · periode courte, son aigu ─────────── */


/* ─────────── 2DE CIEL · l'echelle des decibels ─────────── */


/* ─────────── 2DE CIEL · trois reglages, un poids ─────────── */


/* ─────────── 2DE CIEL · lire un enregistrement de positions ─────────── */


/* ─────────── 2DE CIEL · la vitesse du bord d'une pale ─────────── */


/* ─────────── 2DE CIEL · deux forces qui s'equilibrent ─────────── */


/* ─────────── 2DE CIEL · la dilution au dixieme ─────────── */


/* ─────────── 2DE CIEL · le pH qui monte vers 7 ─────────── */


/* ─────────── 2DE CIEL · trois tubes, deux couleurs ─────────── */


/* ─────────── 2DE CIEL · deux fournisseurs, meme moyenne ─────────── */


/* ─────────── 2DE CIEL · deux pourcentages, deux denominateurs ─────────── */


/* ─────────── 2DE CIEL · la fluctuation selon la taille ─────────── */


/* ─────────── 2DE CIEL · deux bornes, meme moyenne, deux ecarts types ─────────── */


/* ─────────── 2DE CIEL · regrouper, c'est remplacer par le centre ─────────── */


/* ─────────── CAP · la même eau sucrée dans trois récipients ─────────── */


/* ─────────── CAP · diluer, c'est completer jusqu'au trait ─────────── */


/* ─────────── CAP · comparer des newtons a des newtons ─────────── */


/* ─────────── CAP · repartir la charge sur deux tablettes ─────────── */


/* ─────────── CAP · la fluctuation, 60 lancers contre 600 ─────────── */


/* ─────────── CAP · la machine a pinces, sur cent parties ─────────── */


/* ─────────── CAP co-intervention · la verrerie de la paillasse ─────────── */


/* ─────────── CAP co-intervention · des grammes par litre ─────────── */


/* ─────────── CAP co-intervention · repos ou mouvement ─────────── */


/* ─────────── CAP co-intervention · deux forces, trois conditions ─────────── */


/* ─────────── CAP co-intervention · l'echelle des chances ─────────── */


/* ─────────── CAP co-intervention · le garage et sa goulotte ─────────── */


/* ═══════════ CAP · cours V2, séquences 5, 6 et 7 — lot A ═══════════ */

/* ─────────── CAP · deux échelles de température ─────────── */


/* ─────────── CAP · la chaleur va du chaud vers le froid ─────────── */


/* ─────────── CAP · isoler ralentit la perte ─────────── */


/* ─────────── CAP · les angles depuis la normale ─────────── */


/* ─────────── CAP · un pas de côté ─────────── */


/* ─────────── CAP · réflexion ou réfraction ─────────── */


/* ─────────── CAP · grave ou aigu, fort ou faible ─────────── */


/* ─────────── CAP · trois décibels de plus, la moitié du temps ─────────── */


/* ─────────── CAP · le casque fermé dans le métro ─────────── */


/* ═══════════════════════════════════════════════════════════════════
   CAP · co-intervention, sequences 4 a 7 (creneaux J11 a J20)
   Lot de schemas a verser dans kit.js, apres les schemas CAP existants.
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────── CAP co-int · S4 · la tension est le coefficient ─────────── */


/* ─────────── CAP co-int · S4 · une question, trois reponses ─────────── */


/* ─────────── CAP co-int · S5 · l'infrarouge lit une surface ─────────── */


/* ─────────── CAP co-int · S5 · deux temperatures qui se rejoignent ─────────── */


/* ─────────── CAP co-int · S5 · image ou antecedent : le geste ─────────── */


/* ─────────── CAP co-int · S6 · le rayon qui rebondit, le rayon qui plie ─────────── */


/* ─────────── CAP co-int · S6 · le spectre et ses deux voisins invisibles ─────────── */


/* ─────────── CAP co-int · S6 · trois lampes sur un ecran ─────────── */


/* ─────────── CAP co-int · S7 · grave ou aigu : compter les vibrations ─────────── */


/* ─────────── CAP co-int · S7 · ou agit chaque protection ─────────── */


/* ─────────── CAP co-int · S7 · la moyenne egalise ─────────── */


/* --------- dispersion d'une serie de releves ---------
   Ajoute le 3 septembre 2026, sequence 1 de maths-PC. C'est la statistique
   descriptive du CCF de mathematiques, sur des donnees de chaufferie. */


/* ═══════════════════════════════════════════════════ montage */
/* ═══════════ OUTILS DE DOMOTIQUE, 1re année (16 septembre 2026) ═══════════
   Chaque outil ci-dessous suit le patron du kit : OUTILS["nom"]={titre, intro,
   monte(d)}. Les deux repères qui suivent servent d'ancres d'insertion. */
/* ═══════════ réseau et bus : quatre outils de domotique 1re année ═══════════
   ligne-knx (A1, A4, A5, B4), adresses-groupe (A11), plan-ip (A6) et
   budget-poe (A6, A8). Les aides communes sont préfixées rb pour ne pas entrer
   en collision avec le reste du kit. Même patron que partout : titre, intro,
   monte(d). Rien n'est enregistré, rien n'est chargé. */
function rbChapeau(txt){
  return E("div",{style:"font-family:'Bricolage Grotesque',sans-serif;font-size:11px;"+
    "font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
    "margin:12px 0 6px"},txt);
}
/* ok vaut true, false, ou null quand la règle ne peut pas être tranchée */
function rbVerdict(ok,txt){
  var c=ok===null?"encre2":(ok?"vert":"chaud");
  var m=ok===null?"à vérifier":(ok?"conforme":"non conforme");
  return "<span style='color:var(--"+c+");font-weight:600;white-space:nowrap'>"+m+"</span>"+
    (txt?"<br><span style='font-size:13px;color:var(--encre2)'>"+txt+"</span>":"");
}
/* lignes : [règle, valeur, limite, ok, pourquoi] */
function rbTable(lignes){
  var h="<table style='margin:12px 0 0;font-size:14px'><thead><tr><th>Règle</th><th>Valeur</th>"+
        "<th>Limite</th><th>Verdict</th></tr></thead><tbody>";
  lignes.forEach(function(l){
    h+="<tr><td>"+l[0]+"</td><td class='mono' style='white-space:nowrap'>"+l[1]+
       "</td><td style='white-space:nowrap'>"+l[2]+"</td><td>"+rbVerdict(l[3],l[4]||"")+"</td></tr>";});
  return h+"</tbody></table>";
}
/* une rangée de boutons dont un seul est enfoncé : .bt, et .p pour l'actif */
function rbBoutons(par,opts,etat,cle,calc){
  var w=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px"}),bs=[];
  opts.forEach(function(o){
    var b=E("button",{type:"button","class":"bt"+(etat[cle]===o[0]?" p":"")},o[1]);
    b.addEventListener("click",function(){
      etat[cle]=o[0];
      bs.forEach(function(x,i){x.className="bt"+(opts[i][0]===o[0]?" p":"");});
      calc();});
    bs.push(b);w.appendChild(b);
  });
  par.appendChild(w);return w;
}
function rbNombre(par,lab,etat,cle,min,max,pas,unite,calc){
  var w=E("div",{"class":"champ"});
  w.appendChild(E("label",{},lab));
  var s=E("span",{"class":"v"});
  var i=E("input",{type:"number",min:min,max:max,step:pas,value:etat[cle]});
  i.addEventListener("input",function(){
    var v=parseFloat(String(this.value).replace(",","."));
    if(isFinite(v)){etat[cle]=v;calc();}});
  s.appendChild(i);
  if(unite)s.appendChild(E("span",{style:"margin-left:6px;color:var(--encre2);font-size:13px;"+
    "font-weight:400"},unite));
  w.appendChild(s);par.appendChild(w);return i;
}
function rbTexte(par,lab,etat,cle,calc,largeur){
  var w=E("div",{"class":"champ"});
  w.appendChild(E("label",{},lab));
  var s=E("span",{"class":"v"});
  var i=E("input",{type:"text",value:etat[cle],spellcheck:"false",autocomplete:"off",
    inputmode:"decimal",
    style:"font-family:'IBM Plex Mono',monospace;font-size:14px;padding:5px 7px;"+
          "border:1px solid var(--trait);border-radius:var(--r);background:var(--carte);"+
          "color:var(--encre);width:"+(largeur||150)+"px;text-align:right"});
  i.addEventListener("input",function(){etat[cle]=this.value;calc();});
  s.appendChild(i);w.appendChild(s);par.appendChild(w);return i;
}
var rbSel="width:100%;font:inherit;font-size:14px;padding:7px;border-radius:var(--r);"+
          "border:1px solid var(--trait);background:var(--carte);color:var(--encre)";

/* ─────────── 1. une ligne KNX TP1 ───────────
   Les trois longueurs, les 64 participants, le calibre, et la chute de tension
   du cours : ΔU = ½ r I L pour des participants répartis. La ligne se décrit
   soit par ses trois longueurs, soit tronçon par tronçon en ligne droite. */
OUTILS["ligne-knx"]={
  titre:"Une ligne KNX TP1 : longueurs, participants, courant, tension",
  intro:"Décrivez la ligne : ses participants, son alimentation, son câble. L'outil "+
        "vérifie les trois longueurs, les 64 participants et le calibre, puis calcule la "+
        "tension qui reste au participant le plus éloigné. Au départ, la ligne du cours : "+
        "64 participants répartis sur 350 m, 640 mA.",
  monte:function(d){
    var R=0.075,U0=30,UMIN=21;
    var P={mode:"n",n:64,imA:640,cal:640,rep:"rep",forme:"trois",
           lalim:350,lpp:350,ltot:350,deux:0,dalim:250,pos:0,pos2:3};
    var T=[100,150,100],maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");

    /* colonne 1 : participants, calibre, répartition */
    c1.appendChild(rbChapeau("Les participants"));
    rbBoutons(c1,[["n","par leur nombre"],["i","par le courant total"]],P,"mode",calc);
    var wN=E("div"),wI=E("div");
    curseur(wN,maj,P,"Participants, à 10 mA chacun","n",1,80,1,0,"",calc);
    rbNombre(wI,"Courant total demandé au bus",P,"imA",10,1000,10,"mA",calc);
    c1.appendChild(wN);c1.appendChild(wI);
    c1.appendChild(rbChapeau("Le calibre de l'alimentation"));
    rbBoutons(c1,[[160,"160 mA"],[320,"320 mA"],[640,"640 mA"]],P,"cal",calc);
    c1.appendChild(rbChapeau("Où sont les participants"));
    rbBoutons(c1,[["rep","répartis le long du câble"],["bout","tous regroupés au bout"]],P,"rep",calc);

    /* colonne 2 : le câble, sous deux formes */
    c2.appendChild(rbChapeau("Le câble"));
    rbBoutons(c2,[["trois","par les trois longueurs"],["tr","par tronçons, en ligne droite"]],P,"forme",calc);
    var wTrois=E("div"),wTr=E("div");
    rbNombre(wTrois,"De l'alimentation au participant le plus éloigné",P,"lalim",1,2000,5,"m",calc);
    var labLalim=wTrois.querySelector("label");
    rbNombre(wTrois,"Entre les deux participants les plus éloignés l'un de l'autre",P,"lpp",1,2000,5,"m",calc);
    rbNombre(wTrois,"Câble posé au total sur la ligne",P,"ltot",1,3000,5,"m",calc);
    var wD1=E("div");
    rbNombre(wD1,"Câble entre les deux alimentations",P,"dalim",0,1000,5,"m",calc);
    wTrois.appendChild(wD1);

    wTr.appendChild(E("p",{style:"font-size:13.5px;color:var(--encre2);margin:0 0 6px"},
      "Tronçon après tronçon, un participant à chaque jonction et aux deux bouts. "+
      "Pour un arbre ou une étoile, saisissez plutôt les trois longueurs."));
    var liste=E("div");
    var ajout=E("button",{type:"button","class":"bt",style:"margin-top:8px"},"Ajouter un tronçon");
    ajout.addEventListener("click",function(){if(T.length<6){T.push(50);dessineTr();calc();}});
    var wPos=E("div",{"class":"champ"});wPos.appendChild(E("label",{},"L'alimentation est posée"));
    var selPos=E("select",{style:rbSel});wPos.appendChild(selPos);
    var wD2=E("div",{"class":"champ"});wD2.appendChild(E("label",{},"La seconde alimentation est posée"));
    var selPos2=E("select",{style:rbSel});wD2.appendChild(selPos2);
    selPos.addEventListener("change",function(){P.pos=+this.value;calc();});
    selPos2.addEventListener("change",function(){P.pos2=+this.value;calc();});
    wTr.appendChild(liste);wTr.appendChild(ajout);wTr.appendChild(wPos);wTr.appendChild(wD2);
    function dessineTr(){
      liste.innerHTML=T.map(function(t,i){
        return '<div class="lignec" style="grid-template-columns:1fr 84px 30px"><span>Tronçon '+(i+1)+
          '</span><input type="number" data-i="'+i+'" min="1" max="1000" step="5" value="'+t+'">'+
          '<button class="xx" data-i="'+i+'" aria-label="Retirer" type="button">×</button></div>';}).join("");
      [].forEach.call(liste.querySelectorAll("input"),function(s){
        s.addEventListener("input",function(){var v=parseFloat(this.value);
          if(isFinite(v)&&v>0){T[+this.getAttribute("data-i")]=v;calc();}});});
      [].forEach.call(liste.querySelectorAll(".xx"),function(b){
        b.addEventListener("click",function(){
          if(T.length<=1)return;
          T.splice(+this.getAttribute("data-i"),1);
          P.pos=Math.min(P.pos,T.length);P.pos2=Math.min(P.pos2,T.length);
          dessineTr();calc();});});
      [[selPos,"pos"],[selPos2,"pos2"]].forEach(function(q){
        q[0].innerHTML="";
        for(var j=0;j<=T.length;j++){
          q[0].appendChild(E("option",{value:j},j===0?"au départ du tronçon 1":
            j===T.length?"au bout du tronçon "+T.length:"entre les tronçons "+j+" et "+(j+1)));}
        q[0].value=P[q[1]];
      });
      ajout.style.display=T.length<6?"":"none";
    }
    c2.appendChild(wTrois);c2.appendChild(wTr);
    var wDeux=E("label",{style:"display:flex;align-items:center;gap:8px;font-size:14.5px;"+
      "margin:12px 0 0;cursor:pointer"});
    var cbDeux=E("input",{type:"checkbox"});
    cbDeux.addEventListener("change",function(){P.deux=this.checked?1:0;calc();});
    wDeux.appendChild(cbDeux);wDeux.appendChild(E("span",{},"Une seconde alimentation sur la ligne"));
    c2.appendChild(wDeux);
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);

    var svg=S("svg",{viewBox:"0 0 760 190",role:"img",
      "aria-label":"La ligne, son alimentation et la longueur critique",style:"margin-top:14px"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:10px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      wN.style.display=P.mode==="n"?"":"none";wI.style.display=P.mode==="i"?"":"none";
      wTrois.style.display=P.forme==="trois"?"":"none";wTr.style.display=P.forme==="tr"?"":"none";
      wD1.style.display=P.deux?"":"none";wD2.style.display=P.deux?"":"none";
      labLalim.textContent=P.deux?"De l'alimentation la plus proche au participant le plus éloigné d'elle"
                                 :"De l'alimentation au participant le plus éloigné";
      var imA=P.mode==="n"?P.n*10:P.imA,I=imA/1000,n=P.mode==="n"?P.n:null;
      var lalim,lpp,ltot,dalim,cum=[0];
      if(P.forme==="tr"){
        T.forEach(function(t){cum.push(cum[cum.length-1]+t);});
        ltot=cum[T.length];lpp=ltot;
        var a=cum[P.pos];
        if(P.deux){var b=cum[P.pos2];dalim=Math.abs(b-a);
          lalim=Math.max(Math.min(a,b),ltot-Math.max(a,b),dalim/2);}
        else{lalim=Math.max(a,ltot-a);dalim=0;}
      }else{lalim=P.lalim;lpp=P.lpp;ltot=P.ltot;dalim=P.dalim;}
      var dU=(P.rep==="rep"?0.5:1)*R*I*lalim,U=U0-dU;
      var L=[
        ["De l'alimentation au participant le plus éloigné",fr(lalim,0)+" m","350 m au plus",lalim<=350,
         lalim>350?"la ligne dépasse la portée de son alimentation : la déplacer, ou couper la ligne en deux":""],
        ["Entre deux participants quelconques",fr(lpp,0)+" m","700 m au plus",lpp<=700,
         lpp>700?"deux participants trop éloignés ne se lisent plus l'un l'autre":""],
        ["Câble posé sur la ligne",fr(ltot,0)+" m","1 000 m au plus",ltot<=1000,
         ltot>1000?"trop de câble sur une seule ligne : en créer une seconde":""],
        ["Participants sur la ligne",n===null?"—":String(n),"64 au plus",n===null?null:n<=64,
         n===null?"le courant seul ne dit pas combien ils sont":
         (n>64?"une ligne pleine ne s'allonge pas : seconde ligne, coupleur et alimentation":"")],
        ["Courant demandé à l'alimentation",fr(imA,0)+" mA","calibre "+P.cal+" mA",imA<=P.cal,
         imA>P.cal?(P.cal<640?"prendre le calibre supérieur":"640 mA est le calibre maximal : il faut une seconde ligne"):""],
        ["Tension au participant le plus éloigné",frs(U,1)+" V","21 V au moins",U>=UMIN,
         U<UMIN?"chute de "+frs(dU,1)+" V : trop de courant sur trop de câble":"chute de "+frs(dU,1)+" V sur les 30 V"]
      ];
      if(P.deux)L.push(["Câble entre les deux alimentations",fr(dalim,0)+" m","200 m au moins",dalim>=200,
        dalim<200?"deux alimentations trop proches se gênent : les écarter":""]);
      var nok=L.filter(function(l){return l[3]===false;}).length;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Courant</b><span>"+fr(imA,0)+" mA</span></span>"+
        "<span><b>Chute de tension</b><span>"+frs(dU,1)+" V</span></span>"+
        "<span><b>Au plus éloigné</b><span>"+frs(U,1)+" V</span></span>"+
        "<span><b>Ligne</b><span style='color:var(--"+(nok?"chaud":"vert")+")'>"+
        (nok?nok+" règle"+(nok>1?"s":"")+" en défaut":"conforme")+"</span></span></div>"+
        rbTable(L)+
        "<p>ΔU = "+(P.rep==="rep"?"½ × ":"")+"0,075 × "+frs(I,2)+" × "+fr(lalim,0)+" = "+frs(dU,2)+" V. "+
        (P.rep==="rep"?"Hypothèse du cours : les participants sont répartis régulièrement de "+
          "l'alimentation au plus éloigné, et le courant diminue en chemin."
         :"Tout le courant traverse toute la longueur : le facteur ½ disparaît.")+
        (P.deux?" Avec deux alimentations, la chute réelle est plus faible : ce résultat la majore, "+
          "et les 350 m se comptent depuis l'alimentation la plus proche.":"")+"</p>";
      dessine(lalim,ltot,cum,n,U,I);
    }
    function dessine(lalim,ltot,cum,n,U,I){
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var X0=80,X1=730,Y=96,coul=lalim<=350?"vert":"chaud";
      var ech=(X1-X0)/Math.max(ltot,lalim,1);
      function alim(x,txt){
        svg.appendChild(S("rect",{x:x-27,y:Y-52,width:54,height:24,rx:3,fill:V("chaud"),opacity:"0.13"}));
        svg.appendChild(S("rect",{x:x-27,y:Y-52,width:54,height:24,rx:3,fill:"none",stroke:V("chaud"),
          "stroke-width":"1.6"}));
        svg.appendChild(S("text",{x:x,y:Y-36,"text-anchor":"middle","class":"s-lab"},txt));
        svg.appendChild(S("line",{x1:x,y1:Y-28,x2:x,y2:Y,stroke:V("chaud"),"stroke-width":"2"}));
      }
      function point(x){svg.appendChild(S("circle",{cx:x,cy:Y,r:5,fill:V("froid")}));}
      function cote(xa,xb,y,txt){
        var a=Math.min(xa,xb),b=Math.max(xa,xb);
        svg.appendChild(S("line",{x1:a,y1:y,x2:b,y2:y,stroke:V(coul),"stroke-width":"2.5"}));
        [a,b].forEach(function(x){svg.appendChild(S("line",{x1:x,y1:y-6,x2:x,y2:y+6,stroke:V(coul),
          "stroke-width":"2.5"}));});
        svg.appendChild(S("text",{x:(a+b)/2,y:y-8,"text-anchor":"middle","class":"s-lab",fill:V(coul)},txt));
      }
      var xFin,nb=n===null?Math.round(I*100):n;
      if(P.forme==="tr"){
        var xE=X0+ltot*ech;
        svg.appendChild(S("line",{x1:X0,y1:Y,x2:xE,y2:Y,stroke:V("encre2"),"stroke-width":"2.5"}));
        cum.forEach(function(c,j){point(X0+c*ech);
          if(j<T.length)svg.appendChild(S("text",{x:X0+(c+T[j]/2)*ech,y:Y+24,"text-anchor":"middle",
            "class":"s-pet"},fr(T[j],0)+" m"));});
        var xa=X0+cum[P.pos]*ech;alim(xa,"ALIM");
        var xb=P.deux?X0+cum[P.pos2]*ech:xa;if(P.deux)alim(xb,"ALIM 2");
        var proche=function(x){return Math.abs(x-xa)<=Math.abs(x-xb)?xa:xb;};
        var cand=[[X0,proche(X0)],[xE,proche(xE)]];
        if(P.deux)cand.push([(xa+xb)/2,xa]);
        var best=cand[0];
        cand.forEach(function(c){if(Math.abs(c[0]-c[1])>Math.abs(best[0]-best[1]))best=c;});
        cote(best[0],best[1],Y-70,fr(lalim,0)+" m, alimentation → le plus éloigné");
        xFin=best[0];
      }else{
        var xL=X0+lalim*ech;
        svg.appendChild(S("line",{x1:X0,y1:Y,x2:xL,y2:Y,stroke:V(coul),"stroke-width":"2.5"}));
        alim(X0,"ALIM");
        var m=P.rep==="rep"?Math.max(2,Math.min(nb,12)):Math.max(1,Math.min(nb,5));
        for(var k=0;k<m;k++){
          var x=P.rep==="rep"?X0+(xL-X0)*(k+1)/m:xL-k*11;if(x>X0)point(x);}
        cote(X0,xL,Y-70,fr(lalim,0)+" m, alimentation → le plus éloigné");
        var reste=ltot-lalim;
        if(reste>0){
          svg.appendChild(S("line",{x1:X0,y1:Y+30,x2:X0+reste*ech,y2:Y+30,stroke:V("encre2"),
            "stroke-width":"2","stroke-dasharray":"6 5"}));
          svg.appendChild(S("text",{x:X0,y:Y+48,"class":"s-pet"},
            "reste du câble : "+fr(reste,0)+" m, sur d'autres branches"));
        }
        xFin=xL;
      }
      svg.appendChild(S("text",{x:xFin,y:Y+(P.forme==="tr"?46:22),"text-anchor":xFin<300?"start":"end",
        "class":"s-lab",fill:V(U>=UMIN?"vert":"chaud")},"U = "+frs(U,1)+" V"));
      svg.appendChild(S("text",{x:X1,y:Y+74,"text-anchor":"end","class":"s-nom"},
        (n===null?fr(I*1000,0)+" mA demandés":n+" participant"+(n>1?"s":""))+
        (P.rep==="rep"?", répartis":", regroupés au bout")));
    }
    dessineTr();calc();
  }
};

/* ─────────── 2. le mini-projet KNX d'une salle : adresses de groupe ───────────
   Six participants, sept adresses. On émet, on regarde qui réagit. Le
   pré-actionneur renvoie l'état de sa sortie, le variateur la valeur atteinte :
   la commande et l'état sont deux adresses, et c'est ce que l'outil fait voir. */
OUTILS["adresses-groupe"]={
  titre:"Six participants, sept adresses de groupe : qui réagit à quoi",
  intro:"La salle 1 du projet, câblée sur une seule ligne. Choisissez l'appareil qui "+
        "émet, l'adresse de groupe et la valeur, puis émettez : le télégramme parcourt "+
        "toute la ligne, et seuls les participants dont la table contient l'adresse "+
        "réagissent.",
  monte:function(d){
    var GA={"1/1/0":["commande zone fenêtres","1.001"],"1/1/1":["état zone fenêtres","1.001"],
            "1/1/2":["commande zone couloir","1.001"],"1/1/3":["état zone couloir","1.001"],
            "1/2/0":["variation estrade","5.001"],"1/2/1":["valeur estrade","5.001"],
            "1/3/0":["présence","1.001"]};
    var ORDRE=["1/1/0","1/1/1","1/1/2","1/1/3","1/2/0","1/2/1","1/3/0"];
    var PART=[
      {adr:"1.1.1",nom:"poussoir double",
       role:"touche gauche : fenêtres, touche droite : couloir ; un voyant par touche",t:{}},
      {adr:"1.1.2",nom:"pré-actionneur 4 sorties",
       role:"sortie A : zone fenêtres, sortie B : zone couloir ; coupe les deux zones à l'absence",
       t:{"1/1/0":"E","1/1/1":"T","1/1/2":"E","1/1/3":"T","1/3/0":"E"}},
      {adr:"1.1.3",nom:"détecteur de présence",
       role:"signale la présence, puis l'absence après temporisation",t:{"1/3/0":"T"}},
      {adr:"1.1.4",nom:"écran tactile",role:"commande les trois zones, affiche les états",
       t:{"1/1/0":"T","1/1/2":"T","1/2/0":"T","1/1/1":"E","1/1/3":"E","1/2/1":"E","1/3/0":"E"}},
      {adr:"1.1.5",nom:"variateur de l'estrade",
       role:"règle le niveau de l'estrade, renvoie la valeur atteinte",t:{"1/2/0":"E","1/2/1":"T"}},
      {adr:"1.1.6",nom:"passerelle IP",role:"remonte les états à la GTB, qui peut aussi commander",
       t:{"1/1/0":"T","1/1/2":"T","1/2/0":"T","1/1/1":"E","1/1/3":"E","1/2/1":"E","1/3/0":"E"}}
    ];
    var ET={fen:0,coul:0,est:0,pres:0};   /* l'état réel des sorties */
    var MEM={};                            /* ce que chaque appareil a reçu, par adresse */
    var hors={},voyant="etat",journal=[],ajoute=false,cartes={},attente=[];
    var P={src:0,ga:"1/1/0",val:1};
    function idx(adr){for(var i=0;i<PART.length;i++)if(PART[i].adr===adr)return i;return -1;}
    function tablesPoussoirs(){
      PART.forEach(function(p){
        if(p.adr==="1.1.1")p.t=voyant==="etat"?{"1/1/0":"T","1/1/2":"T","1/1/1":"E","1/1/3":"E"}
                                              :{"1/1/0":"TE","1/1/2":"TE"};
        if(p.adr==="1.1.7")p.t=voyant==="etat"?{"1/1/0":"T","1/1/1":"E"}:{"1/1/0":"TE"};
      });
    }
    tablesPoussoirs();
    PART.forEach(function(p){MEM[p.adr]={};});

    /* ── la commande d'émission, et la salle ── */
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    c1.appendChild(rbChapeau("Le télégramme"));
    var wSrc=E("div",{"class":"champ"});wSrc.appendChild(E("label",{},"L'appareil qui émet"));
    var selSrc=E("select",{style:rbSel});wSrc.appendChild(selSrc);c1.appendChild(wSrc);
    var wGa=E("div",{"class":"champ"});wGa.appendChild(E("label",{},"L'adresse de groupe, prise dans sa table"));
    var selGa=E("select",{style:rbSel});wGa.appendChild(selGa);c1.appendChild(wGa);
    var wVal=E("div",{style:"margin:10px 0 4px"});c1.appendChild(wVal);
    var btE=E("button",{type:"button","class":"bt p",style:"margin-top:6px"},"Émettre le télégramme");
    c1.appendChild(btE);
    var tele=E("div",{"class":"res",style:"margin-top:12px;min-height:3em"},
      "<p style='margin:0'>Aucun télégramme émis pour l'instant.</p>");
    c1.appendChild(tele);
    var svg=S("svg",{viewBox:"0 0 380 215",role:"img","aria-label":"La salle 1 et ses luminaires"});
    c2.appendChild(svg);
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);

    selSrc.addEventListener("change",function(){P.src=+this.value;remplitGa();});
    selGa.addEventListener("change",function(){P.ga=this.value;remplitVal();});
    function remplitSrc(){
      selSrc.innerHTML="";
      PART.forEach(function(p,i){selSrc.appendChild(E("option",{value:i},p.adr+" · "+p.nom));});
      selSrc.value=P.src;remplitGa();
    }
    function remplitGa(){
      var p=PART[P.src];selGa.innerHTML="";
      var dispo=ORDRE.filter(function(ga){return p.t[ga];});
      dispo.forEach(function(ga){
        var fl=p.t[ga];
        selGa.appendChild(E("option",{value:ga},ga+" · "+GA[ga][0]+
          (fl.indexOf("T")>=0?"":" (reçoit seulement)")));});
      if(dispo.indexOf(P.ga)<0)P.ga=dispo[0];
      selGa.value=P.ga;remplitVal();
    }
    function remplitVal(){
      wVal.innerHTML="";
      var dpt=GA[P.ga][1];
      if(dpt==="5.001"){
        if(typeof P.val!=="number"||P.val>100)P.val=60;
        var o={v:P.val};
        rbNombre(wVal,"Valeur, en pour cent (DPT 5.001, un octet)",o,"v",0,100,5,"%",
          function(){P.val=Math.max(0,Math.min(100,Math.round(o.v)));});
      }else{
        if(P.val!==0&&P.val!==1)P.val=1;
        wVal.appendChild(E("div",{style:"font-size:14px;margin:0 0 6px"},"Valeur (DPT 1.001, un bit)"));
        var opts=P.ga==="1/3/0"?[[1,"1 · présence"],[0,"0 · absence"]]:[[1,"1 · marche"],[0,"0 · arrêt"]];
        rbBoutons(wVal,opts,P,"val",function(){});
      }
    }
    function libVal(ga,v){
      if(GA[ga][1]==="5.001")return fr(v,0)+" %";
      if(ga==="1/3/0")return v?"1 · présence":"0 · absence";
      return v?"1 · marche":"0 · arrêt";
    }
    btE.addEventListener("click",function(){emet(P.src,P.ga,P.val,false);});

    /* ── les participants sur leur ligne ── */
    d.appendChild(rbChapeau("La ligne 1.1 et ses participants"));
    var bus=E("div",{style:"border-top:2.5px solid var(--chaud);margin:4px 0 10px;position:relative"});
    bus.appendChild(E("span",{"class":"mono",style:"position:absolute;right:0;top:-18px;font-size:11px;"+
      "color:var(--chaud)"},"bus TP1 · 30 V · 9 600 bit/s"));
    d.appendChild(bus);
    var rangee=E("div",{style:"display:flex;flex-wrap:wrap;gap:8px"});d.appendChild(rangee);
    function carteHtml(p){
      var lignes=ORDRE.filter(function(ga){return p.t[ga];}).map(function(ga){
        return "<span style='display:inline-block;min-width:44px'>"+ga+"</span>"+
          "<span style='display:inline-block;min-width:24px;color:var(--encre)'>"+p.t[ga].split("").join(" ")+
          "</span><span style='color:var(--encre2)'>"+GA[ga][0]+"</span>";}).join("<br>");
      return "<div class='mono' style='font-size:12px;color:var(--encre2)'>"+p.adr+"</div>"+
        "<div style='font-weight:700;font-size:14.5px;line-height:1.25'>"+p.nom+"</div>"+
        "<div style='font-size:12.5px;color:var(--encre2);margin:2px 0 6px'>"+p.role+"</div>"+
        "<div class='mono' style='font-size:11.5px;line-height:1.5'>"+lignes+"</div>"+
        "<div data-etat style='margin-top:7px;font-size:13px;min-height:1.2em'></div>";
    }
    function dessineCartes(){
      rangee.innerHTML="";cartes={};
      PART.forEach(function(p){
        var c=E("div",{style:"flex:1 1 200px;min-width:200px;border:1px solid var(--trait);"+
          "border-radius:var(--r);padding:9px 11px;background:var(--carte);transition:opacity .2s,box-shadow .2s"},
          carteHtml(p));
        cartes[p.adr]=c;rangee.appendChild(c);
      });
      etats();
    }
    function oui(v){return v===undefined?"—":(v?"marche":"arrêt");}
    function etats(){
      PART.forEach(function(p){
        var e=cartes[p.adr].querySelector("[data-etat]"),m=MEM[p.adr],s="";
        if(p.adr==="1.1.1"||p.adr==="1.1.7"){
          var gaF=voyant==="etat"?"1/1/1":"1/1/0",gaC=voyant==="etat"?"1/1/3":"1/1/2";
          s="voyant fenêtres : "+(m[gaF]===undefined?"—":(m[gaF]?"● allumé":"○ éteint"));
          if(p.adr==="1.1.1")s+="<br>voyant couloir : "+(m[gaC]===undefined?"—":(m[gaC]?"● allumé":"○ éteint"));
        }else if(p.adr==="1.1.2")s="sortie A : "+oui(ET.fen)+" · sortie B : "+oui(ET.coul);
        else if(p.adr==="1.1.3")s="dernier envoi : "+(m["1/3/0"]===undefined?"—":(m["1/3/0"]?"présence":"absence"));
        else if(p.adr==="1.1.5")s="niveau : "+fr(ET.est,0)+" %";
        else{
          s=(p.adr==="1.1.6"?"vers la GTB : ":"affiche : ")+
            "fenêtres "+oui(m["1/1/1"])+" · couloir "+oui(m["1/1/3"])+" · estrade "+
            (m["1/2/1"]===undefined?"—":fr(m["1/2/1"],0)+" %")+" · présence "+
            (m["1/3/0"]===undefined?"—":(m["1/3/0"]?"oui":"non"));
          if(hors[p.adr])s="<span style='color:var(--chaud);font-weight:600'>hors service</span> — la GTB ne reçoit plus rien";
        }
        e.innerHTML=s;
        cartes[p.adr].style.textDecoration=hors[p.adr]?"line-through":"";
      });
      dessineSalle();
    }
    function allume(srcAdr,recus){
      PART.forEach(function(p){
        var c=cartes[p.adr];
        if(p.adr===srcAdr){c.style.opacity="1";c.style.boxShadow="0 0 0 2px var(--chaud)";}
        else if(recus.indexOf(p.adr)>=0){c.style.opacity="1";c.style.boxShadow="0 0 0 2px var(--vert)";}
        else{c.style.opacity="0.45";c.style.boxShadow="none";}
      });
    }
    function dessineSalle(){
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      svg.appendChild(S("rect",{x:8,y:8,width:364,height:200,rx:4,fill:"none",stroke:V("trait"),
        "stroke-width":"1.6"}));
      svg.appendChild(S("rect",{x:60,y:8,width:200,height:5,fill:V("froid"),opacity:"0.5"}));
      svg.appendChild(S("text",{x:160,y:26,"text-anchor":"middle","class":"s-nom"},"fenêtres"));
      svg.appendChild(S("text",{x:300,y:26,"class":"s-tit"},"SALLE 1"));
      function lampe(x,y,on,niv){
        svg.appendChild(S("circle",{cx:x,cy:y,r:13,fill:on?V("tiede"):V("carte2"),
          "fill-opacity":on?String(0.25+0.75*niv):"1",stroke:V(on?"tiede":"trait"),"stroke-width":"1.6"}));
      }
      [70,160,250].forEach(function(x){lampe(x,52,ET.fen===1,1);});
      svg.appendChild(S("text",{x:160,y:80,"text-anchor":"middle","class":"s-nom"},
        "zone fenêtres — "+oui(ET.fen)));
      svg.appendChild(S("rect",{x:30,y:98,width:130,height:40,rx:3,fill:V("carte2"),stroke:V("trait2")}));
      lampe(95,118,ET.est>0,ET.est/100);
      svg.appendChild(S("text",{x:95,y:154,"text-anchor":"middle","class":"s-nom"},
        "estrade — "+fr(ET.est,0)+" %"));
      svg.appendChild(S("circle",{cx:300,cy:112,r:7,fill:V(ET.pres?"vert":"carte2"),
        stroke:V(ET.pres?"vert":"trait"),"stroke-width":"1.6"}));
      svg.appendChild(S("text",{x:300,y:134,"text-anchor":"middle","class":"s-nom"},
        "détecteur — "+(ET.pres?"présence":"absence")));
      [70,160,250].forEach(function(x){lampe(x,172,ET.coul===1,1);});
      svg.appendChild(S("text",{x:160,y:200,"text-anchor":"middle","class":"s-nom"},
        "zone couloir — "+oui(ET.coul)));
    }

    /* ── l'émission et ce qui s'ensuit ── */
    var journalEl=E("div",{style:"margin-top:12px"});
    function plusTard(adr,ga,val){attente.push([adr,ga,val]);}
    function emet(srcI,ga,val,auto){
      var src=PART[srcI];
      if(hors[src.adr]){
        tele.innerHTML="<p style='margin:0'><b>"+src.adr+"</b> est hors service : rien n'est émis.</p>";return;}
      var fl=src.t[ga]||"";
      if(fl.indexOf("T")<0){
        tele.innerHTML="<p style='margin:0'>L'objet de <b>"+src.adr+"</b> associé à <b>"+ga+"</b> n'a pas le "+
          "drapeau <b>T</b> : cet appareil reçoit sur cette adresse, il n'y émet pas.</p>";return;}
      var recus=[];attente=[];
      if(ga==="1/3/0")ET.pres=val;
      PART.forEach(function(p,i){
        if(p.t[ga]===undefined||hors[p.adr])return;
        MEM[p.adr][ga]=val;
        if(i!==srcI)recus.push(p.adr);
        if(p.adr==="1.1.2"){
          if(ga==="1/1/0"){ET.fen=val;plusTard("1.1.2","1/1/1",val);}
          else if(ga==="1/1/2"){ET.coul=val;plusTard("1.1.2","1/1/3",val);}
          else if(ga==="1/3/0"&&val===0){
            if(ET.fen){ET.fen=0;plusTard("1.1.2","1/1/1",0);}
            if(ET.coul){ET.coul=0;plusTard("1.1.2","1/1/3",0);}
          }
        }else if(p.adr==="1.1.5"&&ga==="1/2/0"){ET.est=val;plusTard("1.1.5","1/2/1",val);}
      });
      journal.unshift([src.adr,ga,val,recus,auto]);
      if(journal.length>8)journal.pop();
      allume(src.adr,recus);
      var suite=attente.slice();
      tele.innerHTML="<p style='margin:0'>"+(auto?"Puis, ":"")+"<b>"+src.adr+"</b> → <b>"+ga+"</b>, "+
        GA[ga][0]+", valeur <b>"+libVal(ga,val)+"</b>"+
        (recus.length?" — reçu par "+recus.join(", "):" — aucun autre appareil n'a cette adresse dans sa table")+
        (auto?" : l'état réel de la sortie, émis par celui qui la tient.":".")+"</p>";
      etats();ecritJournal();
      suite.forEach(function(s,k){
        setTimeout(function(){emet(idx(s[0]),s[1],s[2],true);},500*(k+1));});
    }
    function ecritJournal(){
      journalEl.innerHTML="<table style='font-size:13.5px;margin:6px 0 0'><thead><tr><th>Source</th>"+
        "<th>Destination</th><th>Valeur</th><th>Reçu par</th></tr></thead><tbody>"+
        (journal.length?"":"<tr><td colspan='4' style='color:var(--encre2)'>Aucun télégramme émis pour l'instant.</td></tr>")+
        journal.map(function(j){
          return "<tr"+(j[4]?" style='color:var(--encre2)'":"")+"><td class='mono'>"+j[0]+"</td>"+
            "<td class='mono'>"+j[1]+" <span style='font-family:inherit;color:var(--encre2)'>"+GA[j[1]][0]+
            "</span></td><td class='mono'>"+libVal(j[1],j[2])+"</td><td class='mono'>"+
            (j[3].length?j[3].join(", "):"—")+"</td></tr>";}).join("")+"</tbody></table>";
    }

    /* ── ce qu'on peut changer dans le projet ── */
    d.appendChild(rbChapeau("Modifier le projet"));
    var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:8px;align-items:center"});
    var btAj=E("button",{type:"button","class":"bt"},"Ajouter un second poussoir sur 1/1/0");
    var btGw=E("button",{type:"button","class":"bt"},"Couper la passerelle IP");
    barre.appendChild(btAj);barre.appendChild(btGw);d.appendChild(barre);
    var note=E("div",{style:"margin-top:8px;font-size:14px;color:var(--encre2)"});d.appendChild(note);
    btAj.addEventListener("click",function(){
      if(ajoute)return;ajoute=true;
      PART.push({adr:"1.1.7",nom:"poussoir simple, ajouté",role:"touche unique : fenêtres ; un voyant",t:{}});
      MEM["1.1.7"]={};tablesPoussoirs();
      note.innerHTML="<b>Aucun câble tiré.</b> Le poussoir 1.1.7 se raccorde sur la paire déjà posée ; "+
        "son objet est associé à l'adresse 1/1/0, qui existait déjà ; lui seul est téléversé. "+
        "La ligne passe à 7 participants, 70 mA — loin des 64 et des 640 mA.";
      btAj.disabled=true;btAj.style.opacity="0.5";
      dessineCartes();remplitSrc();
    });
    btGw.addEventListener("click",function(){
      hors["1.1.6"]=!hors["1.1.6"];
      btGw.textContent=hors["1.1.6"]?"Rétablir la passerelle IP":"Couper la passerelle IP";
      note.innerHTML=hors["1.1.6"]?"La passerelle est coupée. Émettez depuis le poussoir : la salle répond-elle encore ?"
                                  :"La passerelle est de retour sur la ligne.";
      etats();
    });
    var wV=E("div",{style:"margin-top:12px"});
    wV.appendChild(E("div",{style:"font-size:14px;margin:0 0 6px"},"Le voyant du poussoir écoute"));
    var oV={v:"etat"};
    rbBoutons(wV,[["etat","l'adresse d'état, 1/1/1"],["commande","l'adresse de commande, 1/1/0"]],oV,"v",
      function(){voyant=oV.v;tablesPoussoirs();PART.forEach(function(p){
        if(p.adr==="1.1.1"||p.adr==="1.1.7")MEM[p.adr]={};});
        dessineCartes();remplitSrc();});
    d.appendChild(wV);
    d.appendChild(rbChapeau("Les derniers télégrammes"));
    d.appendChild(journalEl);
    d.appendChild(rbChapeau("À essayer"));
    d.appendChild(E("ul",{style:"font-size:14.5px;margin:0;padding-left:20px"},
      "<li>Coupez la passerelle IP, puis appuyez sur le poussoir : que se passe-t-il dans la salle, et que voit la GTB ?</li>"+
      "<li>Allumez la zone fenêtres, puis faites signaler une absence par le détecteur. Que montre le voyant du "+
      "poussoir s'il écoute la commande plutôt que l'état ?</li>"+
      "<li>Ajoutez le second poussoir et émettez depuis chacun des deux : quel appareil a-t-il fallu reprogrammer ?</li>"));

    dessineCartes();remplitSrc();ecritJournal();
  }
};

/* ─────────── 3. adresse IPv4 et masque ───────────
   Tout est fait en entiers non signés (>>> 0) : les opérateurs binaires de
   JavaScript travaillent en 32 bits signés, et 192.x.x.x est négatif sans cela. */
OUTILS["plan-ip"]={
  titre:"Adresse IPv4 et masque : le réseau, la diffusion, la plage d'hôtes",
  intro:"Une adresse et son masque, en /n ou en décimal. L'outil sépare la partie réseau "+
        "de la partie équipement, bit à bit, puis dit si deux appareils se joignent "+
        "directement ou par le routeur.",
  monte:function(d){
    var P={ip:"192.168.20.65",forme:"cidr",n:24,masque:"255.255.255.0",
           A:"192.168.20.11",B:"192.168.20.65",n2:24,G:"192.168.20.1"};
    function lit(s){
      var p=String(s).trim().split(".");if(p.length!==4)return null;
      var n=0;for(var i=0;i<4;i++){if(!/^\d{1,3}$/.test(p[i]))return null;
        var v=+p[i];if(v>255)return null;n=n*256+v;}
      return n>>>0;
    }
    function ecrit(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join(".");}
    function masque(b){return b===0?0:((0xFFFFFFFF<<(32-b))>>>0);}
    function bitsMasque(n){
      var s="";for(var i=31;i>=0;i--)s+=((n>>>i)&1);
      return /^1*0*$/.test(s)?s.indexOf("0")<0?32:s.indexOf("0"):null;
    }
    function octet(v,o,n){
      var s="";
      for(var b=0;b<8;b++){var i=o*8+b,bit=(v>>>(31-i))&1;
        var st=i<n?"color:var(--froid)":"color:var(--chaud)";
        if(i===n)st+=";border-left:2px solid var(--encre);padding-left:3px;margin-left:2px";
        s+="<span style='"+st+"'>"+bit+"</span>";}
      return s;
    }
    function reseau(ip,n){
      var m=masque(n),net=(ip&m)>>>0,bc=(net|(~m>>>0))>>>0;
      return {m:m,net:net,bc:bc,prem:(net+1)>>>0,der:(bc-1)>>>0,
              hotes:n>=31?(n===32?1:2):Math.pow(2,32-n)-2};
    }

    /* ── premier bloc : une adresse ── */
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    c1.appendChild(rbChapeau("L'adresse et son masque"));
    rbTexte(c1,"Adresse IPv4",P,"ip",calc);
    rbBoutons(c1,[["cidr","masque en /n"],["dec","masque en décimal"]],P,"forme",calc);
    var wN=E("div"),wM=E("div");
    rbNombre(wN,"Longueur du préfixe",P,"n",0,32,1,"bits",calc);
    rbTexte(wM,"Masque",P,"masque",calc);
    c1.appendChild(wN);c1.appendChild(wM);
    var res=E("div",{"class":"res",style:"margin-top:0"});c2.appendChild(res);
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var bin=E("div",{style:"margin-top:12px;overflow-x:auto"});d.appendChild(bin);

    /* ── second bloc : deux appareils ── */
    d.appendChild(rbChapeau("Ces deux appareils se voient-ils ?"));
    var g2=E("div",{"class":"g2"}),e1=E("div"),e2=E("div");
    rbTexte(e1,"Appareil A",P,"A",calc);
    rbTexte(e1,"Appareil B",P,"B",calc);
    rbNombre(e1,"Masque commun, en /n",P,"n2",0,32,1,"bits",calc);
    rbTexte(e1,"Passerelle par défaut de A",P,"G",calc);
    var res2=E("div",{"class":"res",style:"margin-top:0"});e2.appendChild(res2);
    g2.appendChild(e1);g2.appendChild(e2);d.appendChild(g2);

    function calc(){
      wN.style.display=P.forme==="cidr"?"":"none";wM.style.display=P.forme==="dec"?"":"none";
      var ip=lit(P.ip),n;
      if(P.forme==="cidr"){n=Math.max(0,Math.min(32,Math.round(P.n)));}
      else{var mm=lit(P.masque);n=mm===null?null:bitsMasque(mm);}
      if(ip===null){res.innerHTML="<p style='margin:0'>Adresse invalide : quatre nombres de 0 à 255 "+
        "séparés par des points.</p>";bin.innerHTML="";}
      else if(n===null){res.innerHTML="<p style='margin:0'>Masque invalide : des 1 contigus puis des 0, "+
        "comme 255.255.255.0 ou 255.255.255.192.</p>";bin.innerHTML="";}
      else{
        var r=reseau(ip,n),part=n<31;
        var estNet=ip===r.net&&part,estBc=ip===r.bc&&part;
        res.innerHTML="<div class='gros'>"+
          "<span><b>Réseau</b><span>"+ecrit(r.net)+" /"+n+"</span></span>"+
          "<span><b>Masque</b><span>"+ecrit(r.m)+"</span></span>"+
          "<span><b>Diffusion</b><span>"+(part?ecrit(r.bc):"—")+"</span></span></div>"+
          "<div class='gros' style='margin-top:8px'>"+
          "<span><b>Premier hôte</b><span>"+(part?ecrit(r.prem):"—")+"</span></span>"+
          "<span><b>Dernier hôte</b><span>"+(part?ecrit(r.der):"—")+"</span></span>"+
          "<span><b>Hôtes possibles</b><span>"+fr(r.hotes,0)+"</span></span></div>"+
          "<p>"+(estNet?"<b>"+P.ip+" est l'adresse du réseau</b> : elle ne se donne à aucun appareil."
                :estBc?"<b>"+P.ip+" est l'adresse de diffusion</b> : elle ne se donne à aucun appareil."
                :part?"<b>"+P.ip+"</b> est une adresse d'appareil du réseau "+ecrit(r.net)+"/"+n+
                  " : "+(32-n)+" bit"+(32-n>1?"s":"")+" pour l'équipement, 2<sup>"+(32-n)+"</sup> − 2 = "+
                  fr(r.hotes,0)+" adresses utilisables, passerelle comprise."
                :"Un /31 ou un /32 n'a ni adresse de réseau ni diffusion au sens habituel : c'est une "+
                  "liaison point à point, ou une adresse seule.")+"</p>";
        var lig=[["Adresse",ip],["Masque",r.m],["Réseau",r.net],["Diffusion",r.bc]];
        bin.innerHTML="<table class='mono' style='font-size:13.5px;margin:0'><thead><tr><th></th>"+
          "<th>1er octet</th><th>2e</th><th>3e</th><th>4e</th><th>décimal</th></tr></thead><tbody>"+
          lig.map(function(l){return "<tr><td style='font-family:\"Bricolage Grotesque\",sans-serif'>"+l[0]+
            "</td>"+[0,1,2,3].map(function(o){return "<td style='letter-spacing:.06em'>"+octet(l[1],o,n)+"</td>";}).join("")+
            "<td>"+ecrit(l[1])+"</td></tr>";}).join("")+"</tbody></table>"+
          "<p style='font-size:13.5px;color:var(--encre2);margin:8px 0 0'><span style='color:var(--froid);"+
          "font-weight:600'>"+n+" bits de réseau</span>, identiques pour tous les appareils du réseau · "+
          "<span style='color:var(--chaud);font-weight:600'>"+(32-n)+" bits d'équipement</span>, propres à chacun. "+
          "Le trait marque la frontière ; le réseau garde les bits de réseau et met les autres à 0, la diffusion les met à 1.</p>";
      }
      /* deux appareils */
      var a=lit(P.A),b=lit(P.B),gw=lit(P.G),n2=Math.max(0,Math.min(32,Math.round(P.n2)));
      if(a===null||b===null||gw===null){
        res2.innerHTML="<p style='margin:0'>Une des trois adresses est invalide.</p>";return;}
      var ra=reseau(a,n2),rb=reseau(b,n2),h="";
      var meme=ra.net===rb.net;
      function mauvais(x,r){return n2<31&&(x===r.net||x===r.bc);}
      h="<div class='gros'><span><b>Réseau de A</b><span>"+ecrit(ra.net)+"/"+n2+"</span></span>"+
        "<span><b>Réseau de B</b><span>"+ecrit(rb.net)+"/"+n2+"</span></span></div>";
      if(mauvais(a,ra)||mauvais(b,rb)){
        h+="<p><b>"+(mauvais(a,ra)?P.A:P.B)+" n'est pas une adresse d'appareil</b> dans ce masque : c'est "+
           "l'adresse du réseau ou de diffusion. À corriger avant toute autre vérification.</p>";
      }else if(meme){
        h+="<p><b>Même réseau.</b> A et B partagent les "+n2+" premiers bits : ils se joignent directement "+
           "par le commutateur, à partir de leur adresse MAC. La passerelle ne sert pas pour cet échange"+
           (a===b?" — mais A et B portent la même adresse, ce qui est un conflit.":".")+"</p>";
      }else{
        var gOk=reseau(gw,n2).net===ra.net&&!mauvais(gw,ra);
        h+="<p><b>Réseaux différents.</b> A envoie donc à sa passerelle, et c'est le routeur qui transmet "+
           "vers "+ecrit(rb.net)+"/"+n2+". "+(gOk?"La passerelle "+P.G+" est bien dans le réseau de A : "+
           "l'échange est possible si le routeur l'autorise."
           :"<b>La passerelle "+P.G+" n'est pas dans le réseau de A</b> : A ne peut pas la joindre, "+
           "et l'échange est impossible. C'est le troisième réglage à vérifier, avec l'adresse et le masque.")+"</p>";
      }
      res2.innerHTML=h;
    }
    calc();
  }
};

/* ─────────── 4. le budget PoE d'un commutateur ───────────
   Deux vérifications, port par port puis au total, et la chute dans le câble :
   la puissance demandée au port est celle de l'appareil plus la perte Joule,
   avec le courant qui laisse cette puissance à l'appareil. */
OUTILS["budget-poe"]={
  titre:"Le budget PoE d'un commutateur : par port, au total, et au bout du câble",
  intro:"Choisissez la norme des ports, le budget du commutateur, puis les appareils "+
        "raccordés avec la longueur de leur câble. L'outil calcule ce que chaque port "+
        "fournit, pertes du câble comprises, et le compare à la norme puis au budget.",
  monte:function(d){
    var U0=50,RPAIRE=25;   /* 50 V au port, 25 Ω de boucle par paire et par 100 m */
    var NORMES={af:[15.4,2,"802.3af · 15,4 W"],at:[30,2,"802.3at · 30 W"],
                bt60:[60,4,"802.3bt · 60 W"],bt90:[90,4,"802.3bt · 90 W"]};
    var CAT=[["Caméra fixe",6],["Caméra dôme motorisée",20],["Point d'accès Wi-Fi",13],
             ["Poste téléphonique IP",4],["Écran ou tablette",12],["Autre appareil",10]];
    var P={norme:"at",ports:8,budget:120};
    var A=[[0,4,6,50],[1,1,20,80],[2,2,13,60]];   /* [type, quantité, W à l'appareil, m] */
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    c1.appendChild(rbChapeau("Le commutateur"));
    rbBoutons(c1,[["af",NORMES.af[2]],["at",NORMES.at[2]],["bt60",NORMES.bt60[2]],["bt90",NORMES.bt90[2]]],
      P,"norme",calc);
    rbNombre(c1,"Ports PoE",P,"ports",1,48,1,"ports",calc);
    curseur(c1,maj,P,"Budget PoE total","budget",30,800,10,0," W",calc);
    c2.appendChild(rbChapeau("Les appareils raccordés"));
    c2.appendChild(E("div",{"class":"entete-c",style:"grid-template-columns:1fr 56px 70px 70px 30px"},
      "<span>Appareil</span><span>Nombre</span><span>W</span><span>Câble m</span><span></span>"));
    var liste=E("div");c2.appendChild(liste);
    var ajout=E("div",{style:"display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"});
    var sel=E("select",{style:rbSel+";width:auto;flex:1"},CAT.map(function(c,i){
      return '<option value="'+i+'">'+c[0]+' · '+c[1]+' W</option>';}).join(""));
    var bt=E("button",{"class":"bt p",type:"button"},"Ajouter");
    bt.addEventListener("click",function(){if(A.length<8){A.push([+sel.value,1,CAT[+sel.value][1],50]);dessine();calc();}});
    ajout.appendChild(sel);ajout.appendChild(bt);c2.appendChild(ajout);
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function dessine(){
      liste.innerHTML=A.map(function(a,i){
        return '<div class="lignec" style="grid-template-columns:1fr 56px 70px 70px 30px">'+
          '<select data-i="'+i+'" data-k="0" style="'+rbSel+'">'+CAT.map(function(c,j){
            return '<option value="'+j+'"'+(j===a[0]?" selected":"")+'>'+c[0]+'</option>';}).join("")+'</select>'+
          '<input type="number" data-i="'+i+'" data-k="1" min="1" max="48" step="1" value="'+a[1]+'" style="width:56px">'+
          '<input type="number" data-i="'+i+'" data-k="2" min="1" max="90" step="0.5" value="'+a[2]+'" style="width:70px">'+
          '<input type="number" data-i="'+i+'" data-k="3" min="1" max="150" step="5" value="'+a[3]+'" style="width:70px">'+
          '<button class="xx" data-i="'+i+'" aria-label="Retirer" type="button">×</button></div>';}).join("");
      [].forEach.call(liste.querySelectorAll("select"),function(s){
        s.addEventListener("change",function(){var i=+this.getAttribute("data-i");
          A[i][0]=+this.value;A[i][2]=CAT[A[i][0]][1];dessine();calc();});});
      [].forEach.call(liste.querySelectorAll("input"),function(s){
        s.addEventListener("input",function(){var v=parseFloat(this.value);
          if(isFinite(v)&&v>0){A[+this.getAttribute("data-i")][+this.getAttribute("data-k")]=v;calc();}});});
      [].forEach.call(liste.querySelectorAll(".xx"),function(b){
        b.addEventListener("click",function(){A.splice(+this.getAttribute("data-i"),1);dessine();calc();});});
      ajout.style.display=A.length<8?"":"none";
    }
    function calc(){
      maj.forEach(function(f){f();});
      var N=NORMES[P.norme],pport=N[0],paires=N[1],rk=RPAIRE/paires;
      var tot=0,nb=0,defauts=0,lignes=[];
      A.forEach(function(a){
        var q=a[1],pd=a[2],L=a[3],r=rk*L/100,disc=U0*U0-4*r*pd,l;
        if(disc<0){lignes.push([CAT[a[0]][0]+" × "+q,pd,L,null,null,null,null,false,
          "le câble ne peut pas amener cette puissance : trop long pour cet appareil"]);defauts+=q;nb+=q;return;}
        var I=r>0?(U0-Math.sqrt(disc))/(2*r):pd/U0,ud=U0-r*I,perte=r*I*I,pp=pd+perte;
        var ok=pp<=pport&&L<=100;
        var why=L>100?"plus de 100 m : hors de la portée de l'Ethernet cuivre":
                pp>pport?"le port ne fournit que "+frs(pport,1)+" W : prendre un port de norme supérieure":
                "";
        lignes.push([CAT[a[0]][0]+" × "+q,pd,L,I,perte,pp,ud,ok,why]);
        tot+=q*pp;nb+=q;if(!ok)defauts+=q;
      });
      var restent=P.ports-nb,okPorts=restent>=0,okBudget=tot<=P.budget,okTout=okPorts&&okBudget&&defauts===0;
      var t="<table style='font-size:13.5px;margin:12px 0 0'><thead><tr><th>Appareil</th><th>À l'appareil</th>"+
        "<th>Câble</th><th>Courant</th><th>Perte câble</th><th>Au port</th><th>Verdict</th></tr></thead><tbody>";
      lignes.forEach(function(l){
        t+="<tr><td>"+l[0]+"</td><td class='mono'>"+frs(l[1],1)+" W</td><td class='mono'>"+fr(l[2],0)+" m</td>"+
          "<td class='mono'>"+(l[3]===null?"—":fr(l[3]*1000,0)+" mA")+"</td>"+
          "<td class='mono'>"+(l[4]===null?"—":frs(l[4],2)+" W")+"</td>"+
          "<td class='mono'>"+(l[5]===null?"—":frs(l[5],1)+" W")+"</td><td>"+rbVerdict(l[7],l[8])+"</td></tr>";});
      t+="</tbody></table>";
      res.innerHTML="<div class='gros'>"+
        "<span><b>Demandé aux ports</b><span>"+frs(tot,1)+" W</span></span>"+
        "<span><b>Budget</b><span>"+fr(P.budget,0)+" W</span></span>"+
        "<span><b>Ports utilisés</b><span>"+nb+" / "+P.ports+"</span></span>"+
        "<span><b>Ports restants</b><span style='color:var(--"+(okPorts?"vert":"chaud")+")'>"+
        (okPorts?restent:"il manque "+(-restent))+"</span></span>"+
        "<span><b>Commutateur</b><span style='color:var(--"+(okTout?"vert":"chaud")+")'>"+
        (okTout?"conforme":"non conforme")+"</span></span></div>"+t+
        "<p>"+(okTout?"Chaque port fournit ce que son appareil demande, pertes comprises, et la somme tient dans le budget."
          :((defauts?defauts+" appareil"+(defauts>1?"s":"")+" dépasse"+(defauts>1?"nt":"")+" ce qu'un port de cette norme fournit. ":"")+
            (!okBudget?"La somme dépasse le budget de "+frs(tot-P.budget,1)+" W : un commutateur peut avoir assez de ports sans avoir assez de puissance. ":"")+
            (!okPorts?"Il manque des ports : "+nb+" appareils pour "+P.ports+" ports.":"")))+
        (okTout&&P.budget-tot<0.15*P.budget?" La réserve est mince, moins de 15 % : un appareil de plus la consommera.":"")+"</p>"+
        "<p>Hypothèses : 50 V au port ; boucle de 25 Ω par paire et par 100 m, soit "+frs(rk,2)+
        " Ω par 100 m sur "+paires+" paires en parallèle ; le courant est celui qui laisse la puissance "+
        "demandée à l'appareil, la perte vaut R × I². Un commutateur qui réserve par classe compte la "+
        "puissance de la classe, non celle mesurée : le budget réel se lit dans sa notice.</p>";
    }
    dessine();calc();
  }
};
/* === OUTILS DOMOTIQUE : réseau et bus === */

/* ═══════════════════════════════════════════ LE BILAN D'UNE LIAISON OPTIQUE
   Seances A4 et A8. Le budget d'un module est l'ecart entre sa puissance emise
   minimale et la sensibilite de son recepteur ; les pertes de la liaison
   s'additionnent, et ce qui reste est la marge. Les valeurs sont celles du
   polycopie : OM3 3,5 dB/km, OS2 0,4 dB/km, 0,75 dB par connexion, 0,3 dB par
   epissure — et la liaison du gymnase, 380 m, deux connexions, deux epissures.
   Les budgets typiques sont ceux des modules IEEE 802.3 : SX 7,5 dB, LX 8 dB,
   10G-SR 2,6 dB, 10G-LR 6,2 dB. */
OUTILS["bilan-optique"]={
  titre:"Le bilan d'une liaison optique",
  intro:"Le budget du module, moins la fibre, les connexions et les épissures : "+
        "ce qui reste est la marge. Changez la fibre, la longueur ou le nombre de "+
        "raccordements : le bilan se refait, et la portée maximale suit.",
  monte:function(d){
    var FIBRES={OM3:{att:3.5,nom:"multimode OM3"},OS2:{att:0.4,nom:"monomode OS2"}};
    var CONN=0.75, EPIS=0.3;
    var P={fibre:"OM3",L:380,nc:2,ne:2,budget:7.5,marge:2};
    var maj=[];
    var seg=E("div",{"class":"segments",role:"group","aria-label":"Type de fibre"});
    [["OM3","Multimode OM3 · 3,5 dB/km"],["OS2","Monomode OS2 · 0,4 dB/km"]].forEach(function(m){
      var b=E("button",{type:"button","class":"seg"+(P.fibre===m[0]?" on":"")},m[1]);
      b.addEventListener("click",function(){
        P.fibre=m[0];
        [].forEach.call(seg.children,function(x){x.className="seg";});
        this.className="seg on";calc();});
      seg.appendChild(b);
    });
    d.appendChild(seg);
    var g=E("div",{"class":"g2",style:"margin-top:10px"}),c1=E("div"),c2=E("div");
    curseur(c1,maj,P,"Longueur de fibre","L",10,2000,10,0," m",calc);
    curseur(c1,maj,P,"Connexions, 0,75 dB au plus chacune","nc",0,8,1,0,"",calc);
    curseur(c1,maj,P,"Épissures, 0,3 dB au plus chacune","ne",0,8,1,0,"",calc);
    curseur(c2,maj,P,"Budget du module","budget",2,20,0.1,1," dB",calc);
    c2.appendChild(E("p",{style:"margin:4px 0 6px;font-size:13px;color:var(--encre2)"},
      "Il se lit sur la fiche du module : puissance émise minimale moins sensibilité "+
      "du récepteur. Valeurs typiques : 1000BASE-SX <b>7,5 dB</b> · 1000BASE-LX <b>8 dB</b> · "+
      "10GBASE-SR <b>2,6 dB</b> · 10GBASE-LR <b>6,2 dB</b>."));
    curseur(c2,maj,P,"Marge exigée par le cahier des charges","marge",0,6,0.5,1," dB",calc);
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);

    var W=760,H=182;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"La liaison optique, ses raccordements, et le partage du budget"});
    svg.style.marginTop="12px";
    d.appendChild(svg);
    var res=E("div",{"class":"res"});d.appendChild(res);

    function dessine(pf,pc,pe){
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var Y=58, XA=112, XB=648;
      function tiroir(x,nom){
        svg.appendChild(S("rect",{x:x,y:Y-22,width:96,height:44,rx:4,fill:V("carte2"),
          stroke:V("encre2"),"stroke-width":1.5}));
        svg.appendChild(S("text",{x:x+48,y:Y-6,"text-anchor":"middle","class":"s-tit",
          style:"fill:var(--encre2)"},"TIROIR"));
        svg.appendChild(S("text",{x:x+48,y:Y+12,"text-anchor":"middle","class":"s-nom"},nom));
      }
      tiroir(16,"côté A"); tiroir(648,"côté B");
      svg.appendChild(S("line",{x1:XA,y1:Y,x2:XB,y2:Y,
        stroke:V(P.fibre==="OM3"?"tiede":"froid"),"stroke-width":3}));
      svg.appendChild(S("text",{x:(XA+XB)/2,y:Y-14,"text-anchor":"middle","class":"s-lab"},
        fr(P.L,0)+" m de "+FIBRES[P.fibre].nom));
      function conn(x){svg.appendChild(S("rect",{x:x-6,y:Y-6,width:12,height:12,rx:1.5,
        fill:V("chaud"),stroke:V("carte"),"stroke-width":1.5}));}
      function epis(x){svg.appendChild(S("circle",{cx:x,cy:Y,r:5.5,fill:V("violet"),
        stroke:V("carte"),"stroke-width":1.5}));}
      /* les deux premieres connexions sont aux tiroirs ; le reste se repartit */
      var inner=[];
      if(P.nc>=1)conn(XA+8);
      if(P.nc>=2)conn(XB-8);
      for(var k=2;k<P.nc;k++)inner.push("c");
      for(var j=0;j<P.ne;j++)inner.push("e");
      inner.forEach(function(t,i){
        var x=XA+36+(XB-XA-72)*(i+1)/(inner.length+1);
        (t==="c"?conn:epis)(x);
      });
      /* legende des marques */
      svg.appendChild(S("rect",{x:XA,y:Y+28,width:10,height:10,rx:1.5,fill:V("chaud")}));
      svg.appendChild(S("text",{x:XA+16,y:Y+37,"class":"s-pet"},
        "connexion, "+frs(CONN,2)+" dB · "+P.nc+" × "));
      svg.appendChild(S("circle",{cx:XA+230,cy:Y+33,r:5,fill:V("violet")}));
      svg.appendChild(S("text",{x:XA+241,y:Y+37,"class":"s-pet"},
        "épissure, "+frs(EPIS,1)+" dB · "+P.ne+" × "));
      /* la barre : le budget partage entre les postes, et ce qui reste */
      var YB=134, HB=18, X0=16, X1=744;
      var tot=pf+pc+pe, ech=Math.max(P.budget,tot,0.1);
      function px(v){return (X1-X0)*v/ech;}
      var x=X0;
      [[pf,"tiede","fibre"],[pc,"chaud","connexions"],[pe,"violet","épissures"]].forEach(function(s){
        if(s[0]<=0)return;
        var w=px(s[0]);
        svg.appendChild(S("rect",{x:x,y:YB,width:w,height:HB,fill:V(s[1]),opacity:"0.85"}));
        if(w>78)svg.appendChild(S("text",{x:x+w/2,y:YB+13,"text-anchor":"middle",
          "class":"s-pet",style:"fill:var(--carte);stroke:none"},s[2]+" "+frs(s[0],2)+" dB"));
        x+=w;
      });
      var m=P.budget-tot;
      if(m>0){
        var wm=px(m);
        svg.appendChild(S("rect",{x:x,y:YB,width:wm,height:HB,fill:V("vert"),opacity:"0.3"}));
        if(wm>70)svg.appendChild(S("text",{x:x+wm/2,y:YB+13,"text-anchor":"middle",
          "class":"s-pet",style:"fill:var(--vert)"},"marge "+frs(m,2)+" dB"));
      }
      var xb=X0+px(P.budget);
      svg.appendChild(S("line",{x1:xb,y1:YB-8,x2:xb,y2:YB+HB+6,stroke:V("encre"),
        "stroke-width":2,"stroke-dasharray":"4 3"}));
      svg.appendChild(S("text",{x:Math.min(xb,X1-60),y:YB-12,"text-anchor":"middle","class":"s-lab"},
        "budget "+frs(P.budget,1)+" dB"));
      var xm=X0+px(Math.max(0,P.budget-P.marge));
      svg.appendChild(S("line",{x1:xm,y1:YB-4,x2:xm,y2:YB+HB+4,stroke:V("chaud"),"stroke-width":1.5}));
      svg.appendChild(S("text",{x:Math.min(xm,X1-70),y:YB+HB+18,"text-anchor":"middle",
        "class":"s-pet",style:"fill:var(--chaud)"},"pertes admises "+frs(P.budget-P.marge,1)+" dB"));
      svg.appendChild(S("text",{x:X0,y:YB-12,"class":"s-tit"},"LE BUDGET, POSTE PAR POSTE"));
    }

    function calc(){
      maj.forEach(function(x){x();});
      var att=FIBRES[P.fibre].att;
      var pf=att*P.L/1000, pc=P.nc*CONN, pe=P.ne*EPIS;
      var tot=pf+pc+pe, marge=P.budget-tot;
      dessine(pf,pc,pe);
      /* la portee : ce que la fibre peut encore consommer, une fois les
         raccordements et la marge exigee retires du budget */
      var reste=P.budget-P.marge-pc-pe;
      var Lmax=reste/att*1000;
      var verdict, coul;
      if(marge>=P.marge){
        verdict="<b>Conforme.</b> La marge restante couvre la marge exigée de "+frs(P.marge,1)+" dB.";
        coul="vert";
      }else if(marge>=0){
        verdict="<b>Fonctionne, mais non conforme.</b> Le récepteur reçoit assez de puissance, "+
          "mais la marge exigée n'est pas tenue : à la première connexion vieillie, la liaison décroche. "+
          "Fonctionner et être conforme ne sont pas la même chose.";
        coul="tiede";
      }else{
        verdict="<b>Budget dépassé de "+frs(-marge,2)+" dB.</b> Le récepteur ne reçoit pas assez "+
          "de puissance : changer de fibre, de module, ou réduire les raccordements.";
        coul="chaud";
      }
      var portee;
      if(reste<=0){
        portee="<b>Aucune longueur ne tient</b> à ce budget : les "+P.nc+" connexion"+(P.nc>1?"s":"")+
          " et les "+P.ne+" épissure"+(P.ne>1?"s":"")+" consomment déjà "+frs(pc+pe,2)+
          " dB sur les "+frs(P.budget-P.marge,1)+" dB admis.";
      }else{
        portee="<b>Portée maximale à ce budget : "+fr(Math.floor(Lmax),0)+" m</b> de "+
          FIBRES[P.fibre].nom+", avec les mêmes raccordements et la marge conservée — "+
          "("+frs(P.budget,1)+" − "+frs(P.marge,1)+" − "+frs(pc,2)+" − "+frs(pe,2)+") ÷ "+
          frs(att,1)+" dB/km.";
        if(P.fibre==="OM3"&&Lmax>300)portee+=" La fibre multimode a une seconde limite, "+
          "la dispersion : <b>300 m à 10 Gbit/s</b> en OM3, quel que soit le bilan.";
      }
      res.innerHTML="<div class='gros'>"+
        "<span><b>Fibre</b><span>"+frs(pf,2)+" dB</span></span>"+
        "<span><b>Connexions</b><span>"+frs(pc,2)+" dB</span></span>"+
        "<span><b>Épissures</b><span>"+frs(pe,2)+" dB</span></span>"+
        "<span><b>Pertes totales</b><span>"+frs(tot,2)+" dB</span></span>"+
        "<span><b>Marge restante</b><span style='color:var(--"+coul+")'>"+frs(marge,2)+" dB</span></span>"+
        "</div>"+
        "<p class='mono' style='font-size:13.5px'>Marge = "+frs(P.budget,1)+" − ("+
        frs(att,1)+" × "+frs(P.L/1000,3)+" + "+P.nc+" × "+frs(CONN,2)+" + "+P.ne+" × "+frs(EPIS,1)+
        ") = "+frs(marge,2)+" dB</p>"+
        "<p>"+verdict+"</p><p>"+portee+"</p>"+
        (tot>0&&P.L<=500&&(pc+pe)>pf?
          "<p>Sur cette longueur, <b>les raccordements pèsent plus que la fibre</b> : "+
          frs(pc+pe,2)+" dB contre "+frs(pf,2)+" dB.</p>":"");
    }
    calc();
  }
};

/* ═══════════════════════════════════════ CE QUE PESE UN APPEL, ET COMBIEN EN PASSENT
   Seance A9. Bloc 1 : le debit d'un appel dans un sens, D = R + 8·H/T — le
   codec, la duree du paquet, et le niveau ou l'on compte les en-tetes (40 o
   pour IP+UDP+RTP, 58 o avec la trame Ethernet, 62 o avec l'etiquette VLAN).
   Bloc 2 : la loi d'Erlang B, la probabilite qu'un appel trouve tous les
   canaux occupes, par la recurrence B(0)=1, B(k)=A·B(k-1)/(k+A·B(k-1)).
   Verifie en Python : A = 4,8 E et N = 11 donnent B = 0,645 %. */
function erlangB(A,N){
  var B=1;
  for(var k=1;k<=N;k++)B=A*B/(k+A*B);
  return B;
}
function canauxPour(A,cible){
  for(var n=1;n<=400;n++)if(erlangB(A,n)<=cible)return n;
  return NaN;
}
OUTILS["debit-appel"]={
  titre:"Ce que pèse un appel, et combien en passent",
  intro:"D'abord le débit d'un appel dans un sens : le codec, la durée du paquet et "+
        "les en-têtes que l'on compte. Puis la loi d'Erlang B : pour un trafic donné, "+
        "combien de canaux pour qu'un appel sur cent, au plus, trouve tout occupé.",
  monte:function(d){
    var CHAP="font-family:'Bricolage Grotesque',sans-serif;font-size:11px;font-weight:700;"+
             "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);margin:0 0 5px";
    var CODECS={"G.711":64,"G.729":8,"G.722":64};
    var NIVEAUX={ip:["paquet IP",40],eth:["trame Ethernet",58],vlan:["trame étiquetée VLAN",62]};
    var P={codec:"G.711",T:20,niv:"eth",lien:2,part:50,
           mode:"usagers",usagers:48,parU:0.10,A:4.8,N:12};
    var maj=[];
    function segments(par,titre,opts,cle){
      var w=E("div",{style:"margin:8px 0 6px"});
      w.appendChild(E("div",{style:CHAP},titre));
      var s=E("div",{"class":"segments",role:"group"});
      opts.forEach(function(o){
        var b=E("button",{type:"button","class":"seg"+(String(P[cle])===String(o[0])?" on":"")},o[1]);
        b.addEventListener("click",function(){
          P[cle]=o[0];
          [].forEach.call(s.children,function(x){x.className="seg";});
          this.className="seg on";calc();});
        s.appendChild(b);
      });
      w.appendChild(s);par.appendChild(w);
    }

    /* ── bloc 1 : le debit d'un appel ── */
    d.appendChild(E("h5",{style:"margin:0 0 4px;font-size:16px"},"1 · Le débit d'un appel, dans un sens"));
    var g1=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    segments(c1,"Codec",[["G.711","G.711 · 64 kbit/s"],["G.729","G.729 · 8 kbit/s"],["G.722","G.722 · 64 kbit/s"]],"codec");
    segments(c1,"Durée d'un paquet",[[10,"10 ms"],[20,"20 ms"],[30,"30 ms"]],"T");
    segments(c1,"Niveau où l'on compte les en-têtes",
      [["ip","Paquet IP · 40 o"],["eth","Trame Ethernet · 58 o"],["vlan","Avec étiquette VLAN · 62 o"]],"niv");
    curseur(c2,maj,P,"Débit du lien, dans chaque sens","lien",0.5,100,0.5,1," Mbit/s",calc);
    curseur(c2,maj,P,"Part du lien réservée à la voix","part",10,100,5,0," %",calc);
    g1.appendChild(c1);g1.appendChild(c2);d.appendChild(g1);
    var res1=E("div",{"class":"res"});d.appendChild(res1);

    /* ── bloc 2 : Erlang B ── */
    d.appendChild(E("h5",{style:"margin:22px 0 4px;font-size:16px"},"2 · La loi d'Erlang B : le trafic, les canaux, le blocage"));
    d.appendChild(E("p",{style:"margin:0 0 8px;font-size:14.5px;color:var(--encre2)"},
      "Un <b>erlang</b> est un canal occupé en permanence. Quarante-huit salariés qui "+
      "téléphonent chacun six minutes par heure font 48 × 0,10 = 4,8 E. La loi d'Erlang B "+
      "donne la probabilité qu'un appel arrive quand les N canaux sont tous pris."));
    var g2=E("div",{"class":"g2"}),c3=E("div"),c4=E("div");
    segments(c3,"Le trafic A",[["usagers","N usagers × trafic par usager"],["direct","A saisi directement"]],"mode");
    var bU=E("div"),bP=E("div"),bA=E("div");
    curseur(bU,maj,P,"Usagers","usagers",2,300,1,0,"",calc);
    curseur(bP,maj,P,"Trafic par usager","parU",0.02,0.5,0.01,2," E",calc);
    curseur(bA,maj,P,"Trafic A","A",0.2,80,0.1,1," E",calc);
    c3.appendChild(bU);c3.appendChild(bP);c3.appendChild(bA);
    curseur(c4,maj,P,"Canaux du trunk N","N",1,80,1,0,"",calc);
    c4.appendChild(E("p",{"class":"mono",style:"margin:6px 0 0;font-size:13px;color:var(--encre2)"},
      "B(0) = 1 · B(k) = A·B(k−1) / (k + A·B(k−1))"));
    g2.appendChild(c3);g2.appendChild(c4);d.appendChild(g2);
    var W=760,H=262;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Probabilité de blocage en fonction du nombre de canaux, échelle logarithmique"});
    svg.style.marginTop="10px";
    d.appendChild(svg);
    var res2=E("div",{"class":"res"});d.appendChild(res2);

    function graphe(A,N,n1,n2,n5){
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var X0=64,X1=730,Y0=30,Y1=214;
      var Nmax=Math.min(80,Math.max(N+4,(isFinite(n1)?n1:N)+3,8));
      var PLANCHER=1e-4;                       /* 0,01 % : le bas de l'echelle */
      function px(n){return X0+(X1-X0)*(n-1)/(Nmax-1);}
      function py(b){var v=Math.max(b,PLANCHER);return Y0+(Y1-Y0)*(Math.log10(1/v)/4);}
      [1,0.1,0.01,0.001,0.0001].forEach(function(v){
        svg.appendChild(S("line",{x1:X0,y1:py(v),x2:X1,y2:py(v),stroke:V("trait2"),"stroke-width":1}));
        svg.appendChild(S("text",{x:X0-8,y:py(v)+4,"text-anchor":"end","class":"s-pet"},
          v>=0.01?fr(v*100,0)+" %":frs(v*100,v>=0.001?1:2)+" %"));
      });
      var pas=Nmax>40?10:(Nmax>20?5:(Nmax>12?2:1));
      for(var n=1;n<=Nmax;n++){
        if((n-1)%pas!==0&&n!==Nmax)continue;
        svg.appendChild(S("text",{x:px(n),y:Y1+16,"text-anchor":"middle","class":"s-pet"},n));
      }
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+34,"text-anchor":"middle","class":"s-nom"},
        "canaux N — échelle du blocage logarithmique, une ligne par décade"));
      /* les trois cibles */
      [[0.05,"5 %",n5],[0.02,"2 %",n2],[0.01,"1 %",n1]].forEach(function(c){
        svg.appendChild(S("line",{x1:X0,y1:py(c[0]),x2:X1,y2:py(c[0]),stroke:V("tiede"),
          "stroke-width":1.2,"stroke-dasharray":"5 4"}));
        svg.appendChild(S("text",{x:X1+4,y:py(c[0])+4,"class":"s-pet",style:"fill:var(--tiede)"},c[1]));
        if(isFinite(c[2])&&c[2]<=Nmax){
          svg.appendChild(S("circle",{cx:px(c[2]),cy:py(erlangB(A,c[2])),r:3.5,fill:V("tiede")}));
        }
      });
      /* la courbe */
      var dd="";
      for(var k=1;k<=Nmax;k++){
        var b=erlangB(A,k);
        dd+=(k===1?"M":"L")+px(k).toFixed(1)+","+py(b).toFixed(1);
      }
      svg.appendChild(S("path",{d:dd,fill:"none",stroke:V("froid"),"stroke-width":2.5,
        "stroke-linejoin":"round"}));
      var bN=erlangB(A,N);
      if(N<=Nmax){
        svg.appendChild(S("circle",{cx:px(N),cy:py(bN),r:6,fill:V("chaud"),stroke:V("carte"),"stroke-width":2}));
        var tx=px(N), anc=tx>X1-140?"end":"start";
        svg.appendChild(S("text",{x:tx+(anc==="end"?-10:10),y:Math.max(Y0+12,py(bN)-10),
          "text-anchor":anc,"class":"s-lab"},"N = "+N+" · B = "+frs(bN*100,bN<0.001?3:2)+" %"));
      }
      svg.appendChild(S("text",{x:X0,y:16,"class":"s-tit"},"BLOCAGE POUR A = "+frs(A,1)+" E"));
    }

    function calc(){
      maj.forEach(function(x){x();});
      bU.style.display=bP.style.display=(P.mode==="usagers")?"":"none";
      bA.style.display=(P.mode==="usagers")?"none":"";
      /* bloc 1 */
      var R=CODECS[P.codec], T=P.T, H=NIVEAUX[P.niv][1];
      var voix=R*T/8, taille=voix+H, pps=1000/T;
      var D=R+8*H/T;                          /* kbit/s */
      var lienK=P.lien*1000*P.part/100;
      var appels=Math.floor(lienK/D);
      var lignes=Object.keys(CODECS).map(function(c){
        var Dc=CODECS[c]+8*H/T;
        return "<tr"+(c===P.codec?" style='font-weight:600'":"")+"><td>"+c+"</td><td class='mono'>"+
          frs(CODECS[c],0)+"</td><td class='mono'>"+frs(Dc,1)+"</td><td class='mono'>"+
          Math.floor(lienK/Dc)+"</td></tr>";
      }).join("");
      res1.innerHTML="<div class='gros'>"+
        "<span><b>Voix par paquet</b><span>"+fr(voix,0)+" o</span></span>"+
        "<span><b>"+NIVEAUX[P.niv][0]+"</b><span>"+fr(taille,0)+" o</span></span>"+
        "<span><b>Paquets par seconde</b><span>"+frs(pps,1)+"</span></span>"+
        "<span><b>Débit d'un appel</b><span>"+frs(D,1)+" kbit/s</span></span>"+
        "<span><b>Appels sur le lien</b><span>"+appels+"</span></span>"+
        "</div>"+
        "<p class='mono' style='font-size:13.5px'>D = R + 8·H / T = "+frs(R,0)+" + 8 × "+H+" / "+T+
        " = "+frs(D,1)+" kbit/s &nbsp;·&nbsp; "+frs(P.lien,1)+" Mbit/s × "+P.part+" % ÷ "+frs(D,1)+
        " = "+frs(lienK/D,1)+" → "+appels+" appel"+(appels>1?"s":"")+"</p>"+
        "<p>La voix ne pèse que <b>"+frs(100*R/D,0)+" %</b> de ce débit ; le reste est "+
        "de l'en-tête, répété à chaque paquet. "+
        (P.codec==="G.729"?"Le G.729 compresse la voix huit fois, mais pas les en-têtes : "+
          "sur le câble, l'appel n'est divisé que par "+frs((64+8*H/T)/D,1)+".":
          "Allonger le paquet réduit l'en-tête par seconde, mais ajoute autant de délai.")+"</p>"+
        "<table style='margin-top:8px;font-size:14px'><tr><th style='text-align:left'>Codec</th>"+
        "<th>Voix, kbit/s</th><th>Sur le câble, kbit/s</th><th>Appels sur le lien</th></tr>"+lignes+"</table>";
      /* bloc 2 */
      var A=(P.mode==="usagers")?P.usagers*P.parU:P.A;
      var N=P.N, B=erlangB(A,N);
      var n1=canauxPour(A,0.01), n2=canauxPour(A,0.02), n5=canauxPour(A,0.05);
      graphe(A,N,n1,n2,n5);
      var suite=[], k0=Math.max(1,N-7);
      for(var k=k0;k<=N;k++)suite.push("B("+k+") = "+frs(erlangB(A,k)*100,2)+" %");
      var besoin=N*D, tient=besoin<=lienK;
      res2.innerHTML="<div class='gros'>"+
        "<span><b>Trafic A</b><span>"+frs(A,2)+" E</span></span>"+
        "<span><b>Canaux N</b><span>"+N+"</span></span>"+
        "<span><b>Blocage B(A, N)</b><span style='color:var(--"+(B<=0.01?"vert":(B<=0.05?"tiede":"chaud"))+"')'>"+
          frs(B*100,B<0.001?3:2)+" %</span></span>"+
        "<span><b>Pour 1 %</b><span>"+n1+" canaux</span></span>"+
        "<span><b>Pour 2 %</b><span>"+n2+"</span></span>"+
        "<span><b>Pour 5 %</b><span>"+n5+"</span></span>"+
        "</div>"+
        (P.mode==="usagers"?"<p class='mono' style='font-size:13.5px'>A = "+P.usagers+" × "+frs(P.parU,2)+
          " = "+frs(A,2)+" E</p>":"")+
        "<p class='mono' style='font-size:13px;color:var(--encre2)'>"+(k0>1?"… · ":"")+suite.join(" · ")+"</p>"+
        "<p>Avec "+N+" canaux pour "+frs(A,2)+" E, <b>"+frs(B*100,B<0.001?3:2)+" % des appels</b> "+
        "trouvent le trunk saturé"+(B>0.05?" : c'est beaucoup, le client entendra une tonalité d'occupation.":
          (B>0.01?" — admis pour un usage courant, insuffisant pour une ligne d'urgence.":
          " : moins d'un appel sur cent, l'objectif usuel d'un bureau d'études."))+
        " Ajouter un canal divise le blocage bien plus que d'en retirer un ne l'augmente : la courbe descend de plus en plus vite.</p>"+
        "<p>Ces "+N+" canaux en "+P.codec+" demandent "+N+" × "+frs(D,1)+" = <b>"+fr(besoin,0)+" kbit/s</b> dans chaque sens, "+
        (tient?"ce que le lien réservé à la voix accepte ("+fr(lienK,0)+" kbit/s).":
          "plus que les "+fr(lienK,0)+" kbit/s réservés à la voix : <b>le trunk ne tiendra pas</b> tous ses canaux à la fois.")+"</p>";
    }
    calc();
  }
};

/* ═══════════════════════════════════════════ LA CHAINE FONCTIONNELLE
   Seances A1, A3 et B3. Deux jeux. Le premier range douze constituants tires
   au sort dans six familles ; il dit juste ou faux et rappelle la regle de la
   famille choisie, jamais la bonne case. Le second fait construire les deux
   chaines d'une fonction — acquerir, traiter, communiquer ; alimenter,
   distribuer, convertir, transmettre — et dit ou elles se rencontrent.
   Le vocabulaire est celui du referentiel et du corrige de la seance A3 :
   un module de sortie est un PRE-actionneur, le programme d'application
   traite, le bus communique, le feu clignotant du portail communique aussi.
   L'alimentation du bus est rangee dans « reseau » : le polycopie de la
   semaine 1, qui n'a pas cette case, la met dans « aucune ». */
var FAMILLES_CHAINE=[
  ["capteur","Capteur ou organe de commande",
   "Un capteur ou un organe de commande <b>acquiert</b> : il produit une information, "+
   "grandeur mesurée ou ordre donné par l'occupant, et ne commute aucune puissance."],
  ["pre","Pré-actionneur",
   "Le pré-actionneur reçoit un ordre en petite puissance et établit ou coupe la puissance : "+
   "<b>il est traversé par la puissance sans produire d'effet</b> dans le bâtiment."],
  ["act","Actionneur",
   "L'actionneur <b>convertit l'énergie en effet</b> dans le bâtiment : lumière, mouvement, "+
   "chaleur, ouverture, son."],
  ["centrale","Centrale",
   "La centrale <b>traite</b> : elle reçoit les informations, décide et envoie les ordres. "+
   "En KNX, aucun appareil ne porte ce nom : la fonction traiter est répartie dans les participants."],
  ["reseau","Réseau",
   "Le réseau <b>relie et transporte</b> : la ligne et son alimentation, les coupleurs, les "+
   "commutateurs, les passerelles. Il ne décide de rien et ne fait rien agir."],
  ["super","Supervision",
   "La supervision <b>regarde l'ensemble</b> : elle affiche les états, archive et alarme, "+
   "depuis un poste, un serveur ou une application. Elle ne fait pas agir directement."]
];
var BANQUE_CONSTITUANTS=[
  ["Détecteur de présence","capteur"],
  ["Télérupteur","pre"],
  ["Luminaire LED","act"],
  ["Poussoir bus","capteur","Il donne un ordre : un organe de commande, raccordé au bus."],
  ["Contacteur de chauffage","pre"],
  ["Moteur de volet roulant","act"],
  ["Sonde de température d'ambiance","capteur"],
  ["Variateur universel","pre","Il règle la puissance qui le traverse ; la lumière, c'est le luminaire qui la produit."],
  ["Alimentation bus 640 mA","reseau","Elle n'alimente aucun actionneur : elle appartient à l'infrastructure du bus, avec la ligne et ses coupleurs. Sur le polycopié de la semaine 1, sans case « réseau », elle allait dans « aucune »."],
  ["Lecteur de badge","capteur","Il acquiert une identité et la transmet ; il ne décide pas d'ouvrir."],
  ["Gâche électrique","act"],
  ["Coupleur de ligne","reseau"],
  ["Écran tactile mural","capteur","Il donne des ordres depuis la pièce ; il affiche aussi des états, mais il ne surveille pas le bâtiment."],
  ["Passerelle KNX/IP","reseau"],
  ["Caméra IP","capteur","Elle acquiert une image : un capteur, même raccordé en IP."],
  ["Sirène","act"],
  ["Centrale d'alarme intrusion","centrale"],
  ["Compteur d'énergie communicant","capteur","Il mesure une énergie et la communique : un capteur."],
  ["Commutateur Ethernet","reseau"],
  ["Automate de GTB","centrale"],
  ["Poste de supervision GTB","super"],
  ["Module de sortie KNX 4 relais","pre","Le fabricant l'appelle « actionneur » ; le référentiel, non : l'actionneur est le luminaire ou le moteur qu'il commande."],
  ["Interrupteur crépusculaire","capteur"],
  ["Anémomètre","capteur"],
  ["Tête thermoélectrique de radiateur","act","Elle ouvre la vanne : l'effet est un débit d'eau chaude dans le radiateur."],
  ["Relais 24 V","pre"],
  ["Routeur","reseau"],
  ["Application de pilotage sur smartphone","super"],
  ["Câble de bus TP1","reseau"],
  ["Contacteur jour-nuit","pre"],
  ["Moteur de portail","act"],
  ["Cellule photoélectrique","capteur"],
  ["Carte électronique du portail","centrale","Elle décide à partir des cellules et de la télécommande ; ses relais de puissance, eux, sont des pré-actionneurs."],
  ["Télécommande radio","capteur","Un organe de commande sans fil : elle donne l'ordre."],
  ["Serveur de visualisation KNX","super"],
  ["Détecteur de fumée","capteur"],
  ["Centrale SSI","centrale"],
  ["Enregistreur vidéo NVR","super","Il archive et affiche les images : supervision."],
  ["Électrovanne d'arrosage","act"]
];
var FONCTIONS_DEUX_CHAINES=[
  {nom:"Allumer l'estrade depuis un poussoir bus",
   info:["Poussoir bus","Programme d'application du module de sortie","Télégrammes sur le bus KNX"],
   energie:["Réseau 230 V et son disjoncteur","Relais du module de sortie","Luminaires LED"],
   effet:"l'estrade éclairée"},
  {nom:"Remonter les volets quand le vent forcit",
   info:["Anémomètre","Programme d'application du module volets","Télégrammes sur le bus KNX"],
   energie:["Réseau 230 V et son disjoncteur","Relais de montée et de descente du module volets",
            "Moteurs tubulaires","Réducteur et tube d'enroulement"],
   effet:"les volets remontés"},
  {nom:"Fermer le portail du parking",
   info:["Cellules photoélectriques","Carte électronique de commande","Feu clignotant"],
   energie:["Disjoncteur et arrivée 230 V","Relais de puissance de la carte","Moteur électrique",
            "Réducteur, pignon et crémaillère"],
   effet:"le portail fermé"}
];
OUTILS["chaine-fonctionnelle"]={
  titre:"Capteur, pré-actionneur, actionneur : la chaîne fonctionnelle",
  intro:"Douze constituants tirés au sort, six familles : choisissez un constituant, puis "+
        "sa famille. Le retour dit juste ou faux et rappelle la règle, jamais la case. "+
        "Le second jeu fait dessiner les deux chaînes d'une fonction, et dit où elles se rencontrent.",
  monte:function(d){
    var CHAP="font-family:'Bricolage Grotesque',sans-serif;font-size:11px;font-weight:700;"+
             "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);margin:0 0 6px";
    var FAM={};FAMILLES_CHAINE.forEach(function(f){FAM[f[0]]=f;});
    function melange(t){for(var i=t.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var x=t[i];t[i]=t[j];t[j]=x;}return t;}

    var seg=E("div",{"class":"segments",role:"group"});
    var zoneA=E("div",{style:"margin-top:12px"}), zoneB=E("div",{style:"margin-top:12px;display:none"});
    [["A","Classer douze constituants"],["B","Dessiner les deux chaînes"]].forEach(function(m,i){
      var b=E("button",{type:"button","class":"seg"+(i===0?" on":"")},m[1]);
      b.addEventListener("click",function(){
        [].forEach.call(seg.children,function(x){x.className="seg";});
        this.className="seg on";
        zoneA.style.display=m[0]==="A"?"":"none";zoneB.style.display=m[0]==="B"?"":"none";});
      seg.appendChild(b);
    });
    d.appendChild(seg);d.appendChild(zoneA);d.appendChild(zoneB);

    /* ── jeu 1 : le classement ── */
    var score=E("p",{style:"margin:0 0 8px;font-size:14.5px;color:var(--encre2)"},"");
    var pool=E("div",{style:"display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px"});
    var cases=E("div",{style:"display:flex;flex-wrap:wrap;gap:7px;margin:0 0 4px"});
    var retour=E("div",{"class":"res",style:"margin-top:10px"});
    var cmd=E("div",{style:"display:flex;gap:8px;margin:12px 0 0;flex-wrap:wrap"});
    var bNouv=E("button",{"class":"bt",type:"button"},"Nouvelle série");
    cmd.appendChild(bNouv);
    zoneA.appendChild(score);
    zoneA.appendChild(E("div",{style:CHAP},"Les constituants"));
    zoneA.appendChild(pool);
    zoneA.appendChild(E("div",{style:CHAP},"Les familles"));
    zoneA.appendChild(cases);
    zoneA.appendChild(retour);zoneA.appendChild(cmd);
    var serie=[], choix=-1, boutons=[], etat=[];   /* etat : "" | "faux" | "juste" ; premier = juste du premier coup */
    var premier=[];
    function tire(){
      /* un constituant par famille d'abord, puis six de plus : chaque serie
         montre les six cases au moins une fois */
      var parF={};BANQUE_CONSTITUANTS.forEach(function(c){(parF[c[1]]=parF[c[1]]||[]).push(c);});
      var pris={}, out=[];
      FAMILLES_CHAINE.forEach(function(f){
        var l=parF[f[0]]||[];if(!l.length)return;
        var c=l[Math.floor(Math.random()*l.length)];pris[c[0]]=1;out.push(c);
      });
      var reste=melange(BANQUE_CONSTITUANTS.filter(function(c){return !pris[c[0]];}));
      while(out.length<12&&reste.length)out.push(reste.shift());
      return melange(out);
    }
    function peintScore(){
      var justes=premier.filter(function(x){return x==="juste";}).length;
      var places=etat.filter(function(x){return x==="juste";}).length;
      var revoir=premier.filter(function(x){return x==="faux";}).length;
      score.innerHTML="<b>"+places+" / "+serie.length+"</b> placés · <b>"+justes+"</b> juste"+(justes>1?"s":"")+
        " du premier coup"+(revoir?" · <b>"+revoir+"</b> à revoir":"")+
        (places===serie.length?" — <b>série terminée</b>. Une nouvelle série tire douze autres constituants.":"");
    }
    function peintPool(){
      boutons.forEach(function(b,i){
        b.className="bt"+(i===choix?" p":"");
        b.disabled=etat[i]==="juste";
        b.style.opacity=etat[i]==="juste"?"0.45":"";
        b.textContent=(etat[i]==="juste"?"✓ ":"")+serie[i][0];
      });
    }
    function nouvelle(){
      serie=tire();choix=-1;boutons=[];etat=[];premier=[];
      pool.innerHTML="";
      serie.forEach(function(c,i){
        etat.push("");premier.push("");
        var b=E("button",{"class":"bt",type:"button"},c[0]);
        b.addEventListener("click",function(){choix=i;peintPool();
          retour.innerHTML="<p><b>"+c[0]+"</b> — choisissez sa famille.</p>";});
        boutons.push(b);pool.appendChild(b);
      });
      retour.innerHTML="<p>Choisissez un constituant, puis la famille où il va.</p>";
      peintPool();peintScore();
    }
    FAMILLES_CHAINE.forEach(function(f){
      var b=E("button",{"class":"bt",type:"button"},f[1]);
      b.addEventListener("click",function(){
        if(choix<0){retour.innerHTML="<p>Choisissez d'abord un constituant.</p>";return;}
        var c=serie[choix], ok=(c[1]===f[0]);
        if(ok){
          etat[choix]="juste";if(!premier[choix])premier[choix]="juste";
          retour.innerHTML="<p style='color:var(--vert)'><b>Juste.</b> "+c[0]+" : "+f[1].toLowerCase()+".</p>"+
            "<p>"+FAM[c[1]][2]+(c[2]?" "+c[2]:"")+"</p>";
          choix=-1;
        }else{
          etat[choix]="faux";if(!premier[choix])premier[choix]="faux";
          retour.innerHTML="<p style='color:var(--chaud)'><b>Faux.</b> "+c[0]+" n'est pas "+
            (f[0]==="capteur"?"un capteur ni un organe de commande":
             f[0]==="pre"?"un pré-actionneur":f[0]==="act"?"un actionneur":
             f[0]==="centrale"?"une centrale":f[0]==="reseau"?"un élément du réseau":"un élément de supervision")+".</p>"+
            "<p>"+f[2]+"</p><p>Posez-vous la question : produit-il une information, laisse-t-il passer la puissance, "+
            "produit-il un effet, décide-t-il, transporte-t-il, ou regarde-t-il ? Puis réessayez.</p>";
        }
        peintPool();peintScore();
      });
      cases.appendChild(b);
    });
    bNouv.addEventListener("click",nouvelle);
    nouvelle();

    /* ── jeu 2 : les deux chaines ── */
    var FONC=["ACQUÉRIR","TRAITER","COMMUNIQUER"], FENE=["ALIMENTER","DISTRIBUER","CONVERTIR","TRANSMETTRE"];
    var ch=E("div",{"class":"champ"});ch.appendChild(E("label",{},"La fonction"));
    var vF=E("span",{"class":"v"},"");ch.appendChild(vF);
    var selF=E("select",{},FONCTIONS_DEUX_CHAINES.map(function(f,i){return "<option value='"+i+"'>"+f.nom+"</option>";}).join(""));
    ch.appendChild(selF);zoneB.appendChild(ch);
    zoneB.appendChild(E("p",{style:"margin:8px 0;font-size:14.5px;color:var(--encre2)"},
      "Cliquez une étiquette : elle prend la prochaine case libre de la chaîne en cours. "+
      "Cliquez une case remplie pour la vider. L'information se remplit d'abord, l'énergie ensuite."));
    var segCh=E("div",{"class":"segments",role:"group"});
    var actif="info";
    [["info","Je remplis la chaîne d'information"],["energie","Je remplis la chaîne d'énergie"]].forEach(function(m,i){
      var b=E("button",{type:"button","class":"seg"+(i===0?" on":"")},m[1]);
      b.addEventListener("click",function(){actif=m[0];peintSeg();});
      segCh.appendChild(b);
    });
    function peintSeg(){[].forEach.call(segCh.children,function(x,i){x.className="seg"+((i===0)===(actif==="info")?" on":"");});}
    zoneB.appendChild(segCh);
    var poolB=E("div",{style:"display:flex;flex-wrap:wrap;gap:7px;margin:12px 0"});
    var rangI=E("div",{style:"margin:10px 0 0"}), rangE=E("div",{style:"margin:10px 0 0"});
    var cmdB=E("div",{style:"display:flex;gap:8px;margin:12px 0 0;flex-wrap:wrap"});
    var bVer=E("button",{"class":"bt p",type:"button"},"Vérifier les deux chaînes");
    var bRaz=E("button",{"class":"bt",type:"button"},"Tout remettre");
    cmdB.appendChild(bVer);cmdB.appendChild(bRaz);
    var svgB=S("svg",{viewBox:"0 0 760 300",role:"img","aria-label":"Les deux chaînes telles que vous les avez dessinées"});
    svgB.style.marginTop="12px";
    var resB=E("div",{"class":"res"});
    zoneB.appendChild(E("div",{style:CHAP+";margin-top:12px"},"Les étiquettes"));
    zoneB.appendChild(poolB);zoneB.appendChild(rangI);zoneB.appendChild(rangE);
    zoneB.appendChild(cmdB);zoneB.appendChild(svgB);zoneB.appendChild(resB);
    var F=null, etiq=[], slotsI=[], slotsE=[], verdictB=null;
    function slots(rang,titre,fonctions,tab,coul){
      rang.innerHTML="";
      rang.appendChild(E("div",{style:CHAP+";color:var(--"+coul+")"},titre));
      var l=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;align-items:stretch"});
      fonctions.forEach(function(fn,i){
        var s=E("div",{style:"flex:1 1 140px;min-height:58px;border:1.5px dashed var(--trait);border-radius:8px;"+
          "padding:6px 9px;cursor:pointer;background:var(--carte)"});
        s.appendChild(E("div",{style:"font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.12em;color:var(--"+coul+")"},fn));
        var t=E("div",{style:"font-size:14px;margin-top:3px"},"");
        s.appendChild(t);
        s.addEventListener("click",function(){
          if(tab[i]!==null){tab[i]=null;verdictB=null;peintB();}
          else{actif=(tab===slotsI)?"info":"energie";peintSeg();}
        });
        l.appendChild(s);tab.push(null);tab["el"+i]=s;tab["tx"+i]=t;
      });
      rang.appendChild(l);
    }
    function charge(){
      F=FONCTIONS_DEUX_CHAINES[+selF.value];vF.textContent="→ "+F.effet;
      etiq=melange(F.info.concat(F.energie).map(function(x){return x;}));
      slotsI=[];slotsE=[];verdictB=null;actif="info";peintSeg();
      slots(rangI,"Chaîne d'information",FONC,slotsI,"froid");
      slots(rangE,"Chaîne d'énergie",F.energie.length===4?FENE:FENE.slice(0,3),slotsE,"chaud");
      resB.innerHTML="<p>Remplissez les deux chaînes, puis vérifiez.</p>";
      peintB();
    }
    function place(lbl){
      var tab=actif==="info"?slotsI:slotsE, autre=actif==="info"?slotsE:slotsI;
      var i=tab.indexOf(null);
      if(i<0){i=autre.indexOf(null);if(i<0)return;tab=autre;actif=actif==="info"?"energie":"info";}
      tab[i]=lbl;verdictB=null;
      if(tab.indexOf(null)<0&&actif==="info"&&slotsE.indexOf(null)>=0)actif="energie";
      peintSeg();peintB();
    }
    function peintB(){
      var poses={};slotsI.concat(slotsE).forEach(function(x){if(x)poses[x]=1;});
      poolB.innerHTML="";
      etiq.forEach(function(lbl){
        if(poses[lbl])return;
        var b=E("button",{"class":"bt",type:"button"},lbl);
        b.addEventListener("click",function(){place(lbl);});
        poolB.appendChild(b);
      });
      if(!poolB.children.length)poolB.appendChild(E("span",{style:"font-size:14px;color:var(--encre2)"},"Toutes les étiquettes sont posées."));
      [[slotsI,F.info],[slotsE,F.energie]].forEach(function(p){
        var tab=p[0],att=p[1];
        for(var i=0;i<att.length;i++){
          var el=tab["el"+i], tx=tab["tx"+i];
          tx.textContent=tab[i]||"";
          var coul="var(--trait)", style="dashed";
          if(tab[i]){style="solid";coul="var(--encre2)";}
          if(verdictB&&tab[i]){coul=tab[i]===att[i]?"var(--vert)":"var(--chaud)";}
          el.style.border="1.5px "+style+" "+coul;
        }
      });
      dessineB();
    }
    function coupe(t,n){
      var mots=t.split(" "),lignes=[],cur="";
      mots.forEach(function(m){if((cur+" "+m).trim().length>n){lignes.push(cur.trim());cur=m;}else cur+=" "+m;});
      if(cur.trim())lignes.push(cur.trim());return lignes;
    }
    function dessineB(){
      while(svgB.firstChild)svgB.removeChild(svgB.firstChild);
      var W=760, YI=40, YE=180, HB=78;
      function rangee(tab,att,y,coulR,fonctions){
        var n=att.length, marge=14, gap=16, l=(W-2*marge-gap*(n-1))/n;
        for(var i=0;i<n;i++){
          var x=marge+i*(l+gap), c=coulR;
          if(verdictB&&tab[i])c=(tab[i]===att[i])?"vert":"chaud";
          svgB.appendChild(S("rect",{x:x,y:y,width:l,height:HB,rx:3,fill:V(c),opacity:"0.12"}));
          svgB.appendChild(S("rect",{x:x,y:y,width:l,height:HB,rx:3,fill:"none",stroke:V(c),"stroke-width":"2",
            "stroke-dasharray":tab[i]?"":"5 4"}));
          svgB.appendChild(S("text",{x:x+l/2,y:y+19,"text-anchor":"middle","class":"s-tit",style:"fill:var(--"+c+")"},fonctions[i]));
          coupe(tab[i]||"…",Math.floor(l/6.4)).slice(0,3).forEach(function(m,k){
            svgB.appendChild(S("text",{x:x+l/2,y:y+38+k*14,"text-anchor":"middle","class":"s-nom"},m));
          });
          if(i<n-1){
            var x2=x+l+gap, ym=y+HB/2;
            svgB.appendChild(S("line",{x1:x+l,y1:ym,x2:x2-7,y2:ym,stroke:V(coulR),"stroke-width":"2.5"}));
            svgB.appendChild(S("path",{d:"M"+x2+","+ym+"L"+(x2-9)+","+(ym-5)+"L"+(x2-9)+","+(ym+5)+"Z",fill:V(coulR)}));
          }
        }
        return {l:l,gap:gap,marge:marge};
      }
      svgB.appendChild(S("text",{x:14,y:24,"class":"s-tit",style:"fill:var(--froid)"},"CHAÎNE D'INFORMATION — elle transporte la décision"));
      var gI=rangee(slotsI,F.info,YI,"froid",FONC);
      svgB.appendChild(S("text",{x:14,y:YE-14,"class":"s-tit",style:"fill:var(--chaud)"},"CHAÎNE D'ÉNERGIE — elle transporte la puissance → "+F.effet));
      var gE=rangee(slotsE,F.energie,YE,"chaud",F.energie.length===4?FENE:FENE.slice(0,3));
      if(verdictB&&verdictB.ok){
        /* la rencontre : de COMMUNIQUER vers DISTRIBUER, en equerre dans le couloir */
        var xc=gI.marge+2*(gI.l+gI.gap)+gI.l/2, xd=gE.marge+(gE.l+gE.gap)+gE.l/2, ym=(YI+HB+YE)/2;
        svgB.appendChild(S("path",{d:"M"+xc+","+(YI+HB)+"L"+xc+","+ym+"L"+xd+","+ym+"L"+xd+","+(YE-8),
          fill:"none",stroke:V("vert"),"stroke-width":"2.5","stroke-linejoin":"round"}));
        svgB.appendChild(S("path",{d:"M"+xd+","+YE+"L"+(xd-5)+","+(YE-9)+"L"+(xd+5)+","+(YE-9)+"Z",fill:V("vert")}));
        svgB.appendChild(S("text",{x:(xc+xd)/2,y:ym-6,"text-anchor":"middle","class":"s-nom",style:"fill:var(--vert)"},"ordres — les deux chaînes se rencontrent ici"));
      }
      svgB.appendChild(S("text",{x:W/2,y:290,"text-anchor":"middle","class":"s-nom"},
        verdictB&&verdictB.ok?"Elles se rejoignent au pré-actionneur : la fonction distribuer.":
        "Le dessin suit vos cases. Vérifiez pour le colorer."));
    }
    function verifie(){
      var vides=slotsI.indexOf(null)>=0||slotsE.indexOf(null)>=0;
      if(vides){resB.innerHTML="<p>Il reste des cases vides : posez toutes les étiquettes avant de vérifier.</p>";return;}
      var jI=0,jE=0,mauvaiseChaine=0;
      F.info.forEach(function(a,i){if(slotsI[i]===a)jI++;if(F.energie.indexOf(slotsI[i])>=0)mauvaiseChaine++;});
      F.energie.forEach(function(a,i){if(slotsE[i]===a)jE++;if(F.info.indexOf(slotsE[i])>=0)mauvaiseChaine++;});
      var ok=(jI===F.info.length&&jE===F.energie.length);
      verdictB={ok:ok};
      var h="";
      if(ok){
        h="<p style='color:var(--vert)'><b>Les deux chaînes tiennent.</b></p>"+
          "<p>Elles se rencontrent à <b>"+F.energie[1]+"</b> : il reçoit l'ordre porté par « "+F.info[2]+" » "+
          "et laisse passer la puissance vers « "+F.energie[2]+" ». C'est le <b>pré-actionneur</b>, la fonction "+
          "distribuer — presque toujours là que l'épreuve interroge.</p>"+
          (+selF.value===2?"<p>Le feu clignotant transforme bien de l'énergie en lumière, mais sa fonction est "+
            "d'informer les personnes du mouvement : il appartient à la chaîne d'information.</p>":"")+
          (+selF.value===0?"<p>Pas de fonction transmettre pour un éclairage : la lumière est l'effet lui-même, sans organe mécanique entre le luminaire et la salle.</p>":"");
      }else{
        h="<p style='color:var(--chaud)'><b>Ça ne tient pas encore.</b> Chaîne d'information : "+jI+" sur "+F.info.length+
          " à leur place · chaîne d'énergie : "+jE+" sur "+F.energie.length+" à leur place"+
          (mauvaiseChaine?" · "+mauvaiseChaine+" étiquette"+(mauvaiseChaine>1?"s":"")+" dans la mauvaise chaîne":"")+".</p>"+
          "<p>Rappel : l'information part de ce qui <b>acquiert</b> et finit par ce qui <b>communique</b> ; "+
          "l'énergie part de la <b>source</b> et finit par ce qui <b>agit</b>. Le seul constituant traversé par la "+
          "puissance qui reçoive un ordre est le pré-actionneur, fonction distribuer. Les cases rouges sont à revoir ; "+
          "cliquez-les pour les vider.</p>";
      }
      resB.innerHTML=h;peintB();
    }
    bVer.addEventListener("click",verifie);
    bRaz.addEventListener("click",charge);
    selF.addEventListener("change",charge);
    charge();
  }
};

/* ═══════════════════════════════════════════ LA CARTE DU REFERENTIEL
   Fiche referentiel du site de domotique. Le site ecrit referentiel.js :
   window.REFERENTIEL = { savoirs:[{code,intitule,niveau,famille}],
                          pages:[{id,url,titre,groupe,savoirs:[codes],
                                  exos:[{id,savoir,type}]}] }.
   L'outil le croise avec les marques du navigateur — fed.<site>.lu, un objet
   id de page → horodatage, et fed.<site>.exo, un objet id d'exercice →
   « juste » ou un autre etat — et rend une table par famille : niveau DBC,
   pages qui enseignent le savoir, exercices justes, couverture. Comme la
   carte des prerequis, il ne vit que sur le site : en page autonome, il le
   dit et s'arrete. Rien ne sort du navigateur. */
OUTILS["carte-referentiel"]={
  titre:"Les dix-sept savoirs du référentiel, et où vous en êtes",
  intro:"Une ligne par savoir : son niveau attendu, les pages qui l'enseignent, "+
        "les exercices déjà justes sur cet appareil. La couverture se remplit "+
        "à mesure que les pages sont marquées lues et les exercices réussis.",
  monte:function(d){
    var socle=document.querySelector("[data-site]");
    var res=E("div",{"class":"res"});
    if(!socle){
      res.innerHTML="<p>La carte ne vit que sur le site de classe : elle lit la liste des savoirs et des pages publiées, que seule la construction du site connaît.</p>";
      d.appendChild(res);return;
    }
    var site=socle.getAttribute("data-site");
    var CLE_LU="fed."+site+".lu", CLE_EX="fed."+site+".exo";
    function lit(cle){try{return JSON.parse(localStorage.getItem(cle)||"{}")||{};}catch(e){return {};}}
    var sc=document.createElement("script");
    sc.src="../referentiel.js";
    sc.onload=function(){dessine(window.REFERENTIEL||{});};
    sc.onerror=function(){res.innerHTML="<p>La carte n'a pas pu être chargée : reconstruire le site.</p>";d.appendChild(res);};
    document.head.appendChild(sc);

    function pastilles(n){
      var h="";
      for(var i=1;i<=3;i++)h+="<span style='display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:3px;"+
        "background:var(--"+(n&&i<=n?(n>=3?"chaud":"encre"):"trait2")+")'></span>";
      return "<span title='niveau "+(n||"—")+"' style='white-space:nowrap'>"+h+"</span>";
    }
    function court(t){var s=(t||"").split(" — ")[0];return s.length>28?s.slice(0,27)+"…":s;}

    function dessine(R){
      var savoirs=R.savoirs||[], pages=R.pages||[];
      if(!savoirs.length){res.innerHTML="<p>Aucun savoir déclaré : le site n'a pas écrit son référentiel.</p>";d.appendChild(res);return;}
      var pagesDe={}, exosDe={}, exosTotal=0;
      pages.forEach(function(p){
        (p.savoirs||[]).forEach(function(c){(pagesDe[c]=pagesDe[c]||[]).push(p);});
        (p.exos||[]).forEach(function(x){exosTotal++;if(x.savoir)(exosDe[x.savoir]=exosDe[x.savoir]||[]).push(x);});
      });
      /* les familles, dans l'ordre où le site les nomme */
      var familles=[], parF={};
      savoirs.forEach(function(s){var f=s.famille||"Autres savoirs";if(!parF[f]){parF[f]=[];familles.push(f);}parF[f].push(s);});
      var tete=E("div",{"class":"res"});
      d.appendChild(tete);
      d.appendChild(E("p",{style:"margin:12px 0 4px;font-size:13.5px;color:var(--encre2)"},
        "Niveau attendu par le référentiel : "+pastilles(1)+" 1, information · "+pastilles(2)+
        " 2, expression · "+pastilles(3)+" 3, maîtrise d'outils."));
      var corps=E("div");d.appendChild(corps);
      var pied=E("div",{style:"margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"});
      var bRaz=E("button",{"class":"bt",type:"button"},"Réinitialiser mes marques sur cet appareil");
      bRaz.addEventListener("click",function(){
        if(!window.confirm("Effacer les marques « lu » et les états d'exercices de ce site sur cet appareil ? "+
          "Cela concerne toutes les pages du site, pas seulement cette carte. Rien d'autre n'est touché."))return;
        try{localStorage.removeItem(CLE_LU);localStorage.removeItem(CLE_EX);}catch(e){}
        peint();
      });
      pied.appendChild(bRaz);
      pied.appendChild(E("span",{style:"font-size:13.5px;color:var(--encre2)"},
        "Tout reste dans ce navigateur, sur cet appareil : personne d'autre ne voit ces marques, et un autre appareil ne les connaît pas."));
      d.appendChild(pied);

      var TD="padding:6px 8px;border-bottom:1px solid var(--trait2);vertical-align:top;font-size:14px";
      var TH="padding:4px 8px;text-align:left;font-family:'Bricolage Grotesque',sans-serif;font-size:11px;"+
             "font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--encre2)";
      function peint(){
        var lu=lit(CLE_LU), ex=lit(CLE_EX);
        var commences=0, pagesLues=0, justes=0;
        pages.forEach(function(p){if(lu[p.id])pagesLues++;(p.exos||[]).forEach(function(x){if(ex[x.id]==="juste")justes++;});});
        corps.innerHTML="";
        familles.forEach(function(f){
          corps.appendChild(E("h5",{style:"margin:18px 0 6px;font-size:16px"},f));
          var env=E("div",{style:"overflow-x:auto"});
          var h="<table style='border-collapse:collapse;width:100%;min-width:640px'><tr>"+
            "<th style='"+TH+"'>Code</th><th style='"+TH+"'>Savoir</th><th style='"+TH+"'>Niveau</th>"+
            "<th style='"+TH+"'>Pages</th><th style='"+TH+"'>Exercices</th><th style='"+TH+";min-width:110px'>Couverture</th></tr>";
          parF[f].forEach(function(s){
            var pl=pagesDe[s.code]||[], xl=exosDe[s.code]||[];
            var nLu=pl.filter(function(p){return lu[p.id];}).length;
            var nJ=xl.filter(function(x){return ex[x.id]==="juste";}).length;
            var nT=xl.filter(function(x){return ex[x.id]&&ex[x.id]!=="juste";}).length;
            var parts=[];if(pl.length)parts.push(nLu/pl.length);if(xl.length)parts.push(nJ/xl.length);
            var couv=parts.length?parts.reduce(function(a,b){return a+b;},0)/parts.length:0;
            if(nLu||nJ||nT)commences++;
            var chips=pl.length?pl.map(function(p){
              var on=!!lu[p.id];
              return "<a href='../"+p.url+"' title='"+(p.titre||"").replace(/'/g,"&#39;")+"' style='display:inline-block;margin:2px 4px 2px 0;"+
                "padding:1px 8px;border-radius:99px;font-size:12.5px;text-decoration:none;border:1px solid var(--"+(on?"vert":"trait")+");"+
                "color:var(--"+(on?"vert":"encre2")+")'>"+(on?"✓ ":"")+court(p.titre)+"</a>";
            }).join(""):"<span style='color:var(--encre2);font-size:13px'>à venir</span>";
            var exo=xl.length?"<span class='mono'>"+nJ+" / "+xl.length+"</span> juste"+(nJ>1?"s":"")+(nT?" · "+nT+" à revoir":""):
              "<span style='color:var(--encre2);font-size:13px'>aucun</span>";
            h+="<tr><td style='"+TD+"' class='mono'>"+s.code+"</td><td style='"+TD+"'>"+(s.intitule||"")+"</td>"+
              "<td style='"+TD+"'>"+pastilles(s.niveau)+"</td><td style='"+TD+"'>"+chips+"</td><td style='"+TD+"'>"+exo+"</td>"+
              "<td style='"+TD+"'><div style='display:flex;align-items:center;gap:8px'><div style='flex:1;height:8px;background:var(--trait2);border-radius:4px;overflow:hidden'>"+
              "<div style='width:"+Math.round(100*couv)+"%;height:100%;background:var(--vert)'></div></div>"+
              "<span class='mono' style='font-size:12px;color:var(--encre2)'>"+Math.round(100*couv)+" %</span></div></td></tr>";
          });
          env.innerHTML=h+"</table>";corps.appendChild(env);
        });
        tete.innerHTML="<div class='gros'>"+
          "<span><b>Savoirs commencés</b><span>"+commences+" / "+savoirs.length+"</span></span>"+
          "<span><b>Pages lues</b><span>"+pagesLues+" / "+pages.length+"</span></span>"+
          "<span><b>Exercices justes</b><span>"+justes+" / "+exosTotal+"</span></span>"+
          "</div><p>"+(commences?"Un savoir est « commencé » dès qu'une de ses pages est marquée lue ou qu'un de ses exercices a été tenté. ":
          "Rien n'est encore marqué sur cet appareil : le bouton « Marquer comme lu » de chaque page et les exercices rempliront cette carte. ")+
          "La couverture d'un savoir moyenne la part de pages lues et la part d'exercices justes.</p>";
      }
      window.addEventListener("storage",peint);
      document.addEventListener("exo",peint);
      document.addEventListener("lu",peint);
      peint();
    }
  }
};

/* === OUTILS DOMOTIQUE : liaisons, mesures, référentiel === */

/* ───────────────────────────────── montage des outils */
[].forEach.call(document.querySelectorAll(".outil[data-outil]"),function(el){
  var o=OUTILS[el.getAttribute("data-outil")];
  if(!o){el.innerHTML="<div class='dedans'>Outil inconnu : "+
    el.getAttribute("data-outil")+"</div>";return;}
  el.innerHTML="";
  var t=E("div",{"class":"tete-outil"});
  t.appendChild(E("p",{"class":"k"},"Outil"));
  t.appendChild(E("h4",{},o.titre));
  if(o.chaine)t.appendChild(E("p",{"class":"chaine"},"↳ "+o.chaine));
  t.appendChild(E("p",{},o.intro));
  el.appendChild(t);
  var d=E("div",{"class":"dedans"});
  el.appendChild(d);
  o.monte(d, el);
});

/* les schemas se montent apres les outils : ils lisent l'etat partage */
[].forEach.call(document.querySelectorAll("[data-schema]"),function(el){
  var f=SCHEMAS[el.getAttribute("data-schema")];
  if(!f){el.innerHTML="Schéma inconnu : "+el.getAttribute("data-schema");return;}
  f(el);
});

/* ─────────────────────────────────────────────── le bilan d'une epreuve
   Sur une page qui se declare « epreuve: oui », un bandeau compte ce qui est
   fait. Il ne donne AUCUNE reponse — juste combien de questions ont ete
   validees et combien restent. Le compte se refait a chaque evenement « exo »
   emis par exoNote, et au chargement, car les reponses precedentes sont dans
   le localStorage de l'appareil.
   Rien ici ne remonte nulle part : c'est le meme stockage que le suivi de
   lecture, et il ne sort pas du navigateur. */
(function(){
  var page=document.querySelector('.page[data-epreuve]');
  if(!page)return;
  var exos=[].slice.call(document.querySelectorAll(".exo"));
  if(!exos.length)return;

  var bandeau=E("div",{"class":"bilan-epreuve",id:"bilan-epreuve"});
  var jauge=E("i",{}); jauge.appendChild(E("b",{}));
  var texte=E("span",{"class":"compte"},"");
  bandeau.appendChild(jauge); bandeau.appendChild(texte);

  /* pose juste avant le premier exercice : au-dessus du sujet, pas en tete
     de page ou il serait lu avant meme d'avoir vu une question */
  var premier=exos[0], hote=premier;
  while(hote.parentNode&&hote.parentNode!==page)hote=hote.parentNode;
  page.insertBefore(bandeau,hote);

  function refaire(){
    var t=exoLu(),justes=0,vus=0;
    exos.forEach(function(ex){
      var e=t[ex.getAttribute("data-exo")];
      if(e==="juste")justes++; else if(e)vus++;
    });
    var reste=exos.length-justes-vus;
    jauge.firstChild.style.width=Math.round(100*justes/exos.length)+"%";
    texte.textContent=exos.length+" questions · "+justes+" juste"+(justes>1?"s":"")
      +(vus?" · "+vus+" à revoir":"")+(reste?" · "+reste+" non traitée"
      +(reste>1?"s":""):" · terminé");
  }
  document.addEventListener("exo",refaire);
  refaire();
})();

/* le composeur de paroi peut être monté après le bilan : on repasse une fois */
if(OUTILS.bilan._recalc)OUTILS.bilan._recalc();
})();
