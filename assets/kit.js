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
  var t=s.replace(/\s/g,"").replace(",",".");   /* \s couvre U+00A0 et U+202F */
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
SCHEMAS["paroi-coupe"]=function(el){
  var W=724,H=318,X0=112,X1=606,Y0=52,Y1=206,FILM=24;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Coupe d'une paroi et profil de température"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);   /* apres la legende de l'auteur */

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var C=(ETAT.couches&&ETAT.couches.length)?ETAT.couches:[
      {nom:"Plaque de plâtre",lam:0.25,e:1.3,R:0.052},
      {nom:"Polystyrène",lam:0.035,e:10,R:2.857},
      {nom:"Parpaing creux",lam:1.05,e:20,R:0.190},
      {nom:"Enduit ciment",lam:1.15,e:1.5,R:0.013}];
    var rsi=0.13, rse=0.04;
    var rtot=rsi+rse; C.forEach(function(c){rtot+=c.R;});
    var ti=20, te=0, dt=ti-te;

    /* largeurs : epaisseurs a l'echelle, avec un minimum lisible */
    var dispo=X1-X0-2*FILM, som=0;
    C.forEach(function(c){som+=c.e;});
    var l=C.map(function(c){return Math.max(7,dispo*c.e/som);});
    var tot=0; l.forEach(function(x){tot+=x;});
    l=l.map(function(x){return x*dispo/tot;});

    function y(theta){return Y1-(theta-te)/dt*(Y1-Y0);}

    /* les deux films d'air superficiels */
    [[X0,FILM,"chaud"],[X1-FILM,FILM,"froid"]].forEach(function(f){
      svg.appendChild(S("rect",{x:f[0],y:Y0,width:f[1],height:Y1-Y0,
        fill:V(f[2]),opacity:"0.10"}));
    });

    /* les couches */
    var x=X0+FILM, bornes=[X0,X0+FILM];
    C.forEach(function(c,i){
      var iso=c.lam<0.06;
      svg.appendChild(S("rect",{x:x,y:Y0,width:l[i],height:Y1-Y0,
        fill:V(iso?"vert":"trait"),opacity:iso?"0.20":"0.13"}));
      svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1+8,
        stroke:V("trait"),"stroke-width":"1"}));
      if(l[i]>=15){
        var yn=Y1-10;
        var t=S("text",{x:x+l[i]/2,y:yn,"text-anchor":"start",
          "class":"s-nom",transform:"rotate(-90 "+(x+l[i]/2)+" "+yn+")"},
          c.nom.length>17?c.nom.slice(0,16)+"…":c.nom);
        svg.appendChild(t);
      }
      if(l[i]>=26)
        svg.appendChild(S("text",{x:x+l[i]/2,y:Y1+24,"text-anchor":"middle",
          "class":"s-pet"},frs(c.e,1)+" cm"));
      x+=l[i]; bornes.push(x);
    });
    bornes.push(X1);
    svg.appendChild(S("line",{x1:X1-FILM,y1:Y0,x2:X1-FILM,y2:Y1+8,
      stroke:V("trait"),"stroke-width":"1"}));

    /* le profil : la chute dans une couche est proportionnelle a sa resistance */
    var cum=0, pts=[[X0,y(ti)]];
    cum+=rsi; pts.push([X0+FILM,y(ti-dt*cum/rtot)]);
    C.forEach(function(c,i){
      cum+=c.R; pts.push([bornes[i+2],y(ti-dt*cum/rtot)]);
    });
    pts.push([X1,y(te)]);
    svg.appendChild(S("polyline",{points:pts.map(function(p){
      return p[0].toFixed(1)+","+p[1].toFixed(1);}).join(" "),
      fill:"none",stroke:V("chaud"),"stroke-width":"3","stroke-linejoin":"round"}));
    pts.forEach(function(p){
      svg.appendChild(S("circle",{cx:p[0],cy:p[1],r:"3.5",fill:V("chaud")}));
    });

    /* cadre et reperes */
    svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
      stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:X0-10,y:y(ti)+4,"text-anchor":"end","class":"s-lab"},
      "20 °C"));
    svg.appendChild(S("text",{x:X1+10,y:y(te)+4,"text-anchor":"start","class":"s-lab"},
      "0 °C"));
    svg.appendChild(S("text",{x:X0-10,y:Y0-14,"text-anchor":"end","class":"s-pet"},
      "intérieur"));
    svg.appendChild(S("text",{x:X1+10,y:Y0-14,"text-anchor":"start","class":"s-pet"},
      "extérieur"));
    svg.appendChild(S("text",{x:(X0+X1)/2,y:Y0-14,"text-anchor":"middle","class":"s-tit"},
      "PROFIL DE TEMPÉRATURE DANS LA PAROI"));
    svg.appendChild(S("text",{x:X0+FILM/2,y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      "Rsi"));
    svg.appendChild(S("text",{x:X1-FILM/2,y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      "Rse"));

    /* ce que le dessin montre, en toutes lettres */
    var pire=null;
    C.forEach(function(c){if(!pire||c.R>pire.R)pire=c;});
    lg.innerHTML="La pente est raide là où la résistance est grande. Ici <b>"+
      fr(100*pire.R/rtot,0)+" % de la chute</b> se fait dans une seule couche, "+
      pire.nom.toLowerCase()+" — et presque rien dans le reste du mur.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};

/* ─────────── l'echelle des conductivites ─────────── */
SCHEMAS["lambda-echelle"]=function(el){
  var W=680,H=204,X0=60,X1=620,Y=100;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Échelle des conductivités thermiques"});
  var min=Math.log10(0.02), max=Math.log10(200);
  function x(v){return X0+(Math.log10(v)-min)/(max-min)*(X1-X0);}
  svg.appendChild(S("rect",{x:X0,y:Y-9,width:x(0.05)-X0,height:18,
    fill:V("vert"),opacity:"0.22"}));
  svg.appendChild(S("text",{x:(X0+x(0.05))/2,y:Y-19,"text-anchor":"middle",
    "class":"s-tit",fill:V("vert")},"LES ISOLANTS"));
  svg.appendChild(S("line",{x1:X0,y1:Y,x2:X1,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  [0.02,0.1,1,10,100].forEach(function(v){
    svg.appendChild(S("line",{x1:x(v),y1:Y-7,x2:x(v),y2:Y+7,
      stroke:V("encre2"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x(v),y:Y+26,"text-anchor":"middle","class":"s-pet"},
      frs(v,v<1?2:0)));
  });
  svg.appendChild(S("text",{x:X0,y:Y+68,"text-anchor":"start","class":"s-pet"},
    "λ en W/(m·K) — échelle logarithmique"));
  [[0.025,"Polyuréthane",1],[0.038,"Laine minérale",0],[0.15,"Bois",1],
   [0.45,"Brique creuse",0],[1.65,"Béton",1],[50,"Acier",0]].forEach(function(m){
    var h=m[2]?-1:1, xx=x(m[0]);
    svg.appendChild(S("line",{x1:xx,y1:Y+h*8,x2:xx,y2:Y+h*30,
      stroke:V("trait"),"stroke-width":"1"}));
    svg.appendChild(S("circle",{cx:xx,cy:Y,r:"4",fill:V(m[0]<0.06?"vert":"froid")}));
    svg.appendChild(S("text",{x:xx,y:Y+h*40+(h<0?0:4),"text-anchor":"middle",
      "class":"s-nom"},m[1]));
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Du polyuréthane à l'acier, <b>un facteur 2 000</b>. C'est pourquoi l'échelle "+
    "est logarithmique : sur une échelle ordinaire, tous les isolants seraient "+
    "collés au zéro."));
};


/* ─────────── les trois modes de transfert ─────────── */
SCHEMAS["trois-modes"]=function(el){
  var W=720,H=330,XM=352,EP=64,Y0=54,Y1=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Conduction, convection et rayonnement sur une paroi"});

  /* les deux ambiances */
  svg.appendChild(S("rect",{x:0,y:Y0,width:XM,height:Y1-Y0,fill:V("chaud"),opacity:"0.07"}));
  svg.appendChild(S("rect",{x:XM+EP,y:Y0,width:W-XM-EP,height:Y1-Y0,
    fill:V("froid"),opacity:"0.09"}));
  svg.appendChild(S("text",{x:16,y:Y0-14,"class":"s-pet"},"INTÉRIEUR 20 °C"));
  svg.appendChild(S("text",{x:W-16,y:Y0-14,"text-anchor":"end","class":"s-pet"},
    "EXTÉRIEUR 0 °C"));

  /* la paroi */
  svg.appendChild(S("rect",{x:XM,y:Y0,width:EP,height:Y1-Y0,fill:V("trait"),
    opacity:"0.22"}));
  svg.appendChild(S("rect",{x:XM,y:Y0,width:EP,height:Y1-Y0,fill:"none",
    stroke:V("trait"),"stroke-width":"1.5"}));
  /* les hachures restent DANS la paroi : k borne aux deux extremites */
  for(var k=1;Y0+k*18+8<=Y1;k++)
    svg.appendChild(S("line",{x1:XM,y1:Y0+k*18+8,x2:XM+EP,y2:Y0+k*18-8,
      stroke:V("trait"),"stroke-width":"1",opacity:"0.6"}));

  function fleche(x1,y1,x2,y2,coul,ep){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-9*Math.cos(a),y2:y2-9*Math.sin(a),
      stroke:V(coul),"stroke-width":ep||2.5,"stroke-linecap":"round"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-11*Math.cos(a-0.42))+","+(y2-11*Math.sin(a-0.42))+
      "L"+(x2-11*Math.cos(a+0.42))+","+(y2-11*Math.sin(a+0.42))+"Z",fill:V(coul)}));
  }

  /* 1. conduction : a travers la matiere */
  [88,148,208].forEach(function(y){
    fleche(XM+6,y,XM+EP-6,y,"chaud",3);
  });
  svg.appendChild(S("text",{x:XM+EP/2,y:Y0-14,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"CONDUCTION"));

  /* 2. convection : l'air qui bouge le long de la paroi, et celui qui s'en va */
  svg.appendChild(S("path",{d:"M300,222 C262,222 262,150 300,150 C336,150 336,86 300,86",
    fill:"none",stroke:V("froid"),"stroke-width":"2.5","stroke-dasharray":"6 4"}));
  fleche(304,88,286,74,"froid",2.5);
  svg.appendChild(S("text",{x:258,y:250,"text-anchor":"middle","class":"s-tit",
    fill:V("froid")},"CONVECTION"));
  /* la bouche de ventilation traverse la paroi */
  svg.appendChild(S("rect",{x:XM-4,y:98,width:EP+8,height:26,fill:V("carte"),
    stroke:V("froid"),"stroke-width":"2"}));
  fleche(XM+EP+10,111,XM+EP+52,111,"froid",2.5);
  svg.appendChild(S("text",{x:XM+EP+58,y:115,"class":"s-nom",fill:V("froid")},
    "air extrait"));

  /* 3. rayonnement : sans support, du corps chaud vers la paroi froide */
  svg.appendChild(S("rect",{x:96,y:130,width:26,height:76,rx:3,fill:V("chaud"),
    opacity:"0.30",stroke:V("chaud"),"stroke-width":"2"}));
  svg.appendChild(S("text",{x:109,y:224,"text-anchor":"middle","class":"s-nom"},
    "radiateur"));
  [150,168,186].forEach(function(y){
    var d="M130,"+y, x=130;
    for(var i=0;i<5;i++){
      d+=" q9,-7 18,0 q9,7 18,0";
      x+=36;
    }
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V("tiede"),"stroke-width":"2"}));
    fleche(x-4,y,x+14,y,"tiede",2);
  });
  svg.appendChild(S("text",{x:212,y:126,"text-anchor":"middle","class":"s-tit",
    fill:V("tiede")},"RAYONNEMENT"));

  svg.appendChild(S("text",{x:W/2,y:H-16,"text-anchor":"middle","class":"s-nom"},
    "Le coefficient U englobe les trois : un seul nombre pour trois phénomènes."));
  el.appendChild(svg);
};

/* ─────────── les degres-jours, ville par ville ─────────── */
SCHEMAS["dju-villes"]=function(el){
  var W=700,H=260,X0=118,X1=572,Y0=26;   /* place pour l etiquette a droite */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Degrés-jours unifiés par ville"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var choisie=ETAT.ville===undefined?0:ETAT.ville;
    var mx=0; VILLES.forEach(function(v){if(v[1]>mx)mx=v[1];});
    var h=26, pas=(H-Y0-24)/VILLES.length;
    VILLES.forEach(function(v,i){
      var y=Y0+i*pas, l=(X1-X0)*v[1]/mx, sel=(i===choisie);
      svg.appendChild(S("text",{x:X0-12,y:y+h/2+4,"text-anchor":"end",
        "class":sel?"s-lab":"s-nom"},v[0]));
      svg.appendChild(S("rect",{x:X0,y:y,width:l,height:h,rx:2,
        fill:V(sel?"chaud":"froid"),opacity:sel?"0.85":"0.28"}));
      svg.appendChild(S("text",{x:X0+l+9,y:y+h/2+4,"class":"s-pet"},
        fr(v[1],0)+" DJU"));
    });
    var v=VILLES[choisie];
    lg.innerHTML="À bâtiment identique, la consommation de chauffage suit les "+
      "degrés-jours. <b>"+v[0]+"</b> en compte "+fr(v[1],0)+" ; Briançon en compte "+
      fr(3800/v[1],1)+" fois plus.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};


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
SCHEMAS["dpe-etiquette"]=function(el){
  var W=700,H=372,Y0=64,HB=34,PAS=42;
  var saisie=E("div",{style:"display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px"});
  var etat={cep:180,ges:35};
  [["cep","Consommation","kWh/m²·an",0,600],
   ["ges","Émissions","kg CO₂/m²·an",0,150]].forEach(function(f){
    var w=E("label",{style:"display:flex;align-items:center;gap:7px;font-size:14.5px"});
    w.appendChild(E("span",{},f[1]));
    var i=E("input",{type:"number",min:f[3],max:f[4],step:"1",value:etat[f[0]]});
    i.addEventListener("input",function(){
      var v=parseFloat(this.value);
      if(isFinite(v)){etat[f[0]]=Math.max(f[3],Math.min(f[4],v));dessine();}});
    w.appendChild(i);
    w.appendChild(E("span",{"class":"mono",style:"color:var(--encre2);font-size:12.5px"},f[2]));
    saisie.appendChild(w);
  });
  el.appendChild(saisie);
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Double étiquette du DPE, énergie et climat"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  function classe(val,cle){
    for(var i=0;i<DPE.length;i++)if(val<DPE[i][cle])return i;
    return 6;
  }
  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var ie=classe(etat.cep,"cep"), ig=classe(etat.ges,"ges");
    var pire=Math.max(ie,ig);
    [[48,"ÉNERGIE","kWh/m²·an","e","cep",ie],
     [408,"CLIMAT","kg CO₂/m²·an","g","ges",ig]].forEach(function(col){
      var x0=col[0];
      svg.appendChild(S("text",{x:x0,y:26,"class":"s-tit"},col[1]));
      svg.appendChild(S("text",{x:x0,y:46,"class":"s-pet"},col[2]));
      DPE.forEach(function(d,i){
        var y=Y0+i*PAS, l=130+i*22, sel=(i===col[5]);
        svg.appendChild(S("path",{d:"M"+x0+","+y+"h"+(l-18)+"l18,"+(HB/2)+
          "l-18,"+(HB/2)+"H"+x0+"Z",fill:d[col[3]],
          stroke:sel?V("encre"):"none","stroke-width":sel?"2.5":"0"}));
        var clair=(col[3]==="e")?(i>=2&&i<=4):(i<=2);
        svg.appendChild(S("text",{x:x0+14,y:y+HB/2+6,"class":"s-lab",
          fill:clair?"#1a1a1a":"#ffffff"},d.c));
        var borne=i===0?("< "+DPE[0][col[4]])
          :i===6?("> "+DPE[5][col[4]])
          :(DPE[i-1][col[4]]+" à "+d[col[4]]);
        svg.appendChild(S("text",{x:x0+l-26,y:y+HB/2+5,"text-anchor":"end",
          "class":"s-pet",fill:clair?"#333333":"#f4f4f4"},borne));
        if(sel)svg.appendChild(S("text",{x:x0+l+14,y:y+HB/2+5,"class":"s-lab"},"◀"));
      });
    });
    lg.innerHTML="Consommation en <b>"+DPE[ie].c+"</b>, émissions en <b>"+DPE[ig].c+
      "</b> : le logement est classé <b>"+DPE[pire].c+"</b>. "+
      "<b>La plus mauvaise des deux l'emporte</b>"+
      (pire===ig&&ig>ie?" — ici c'est le carbone qui déclasse, pas l'isolation."
       :pire===ie&&ie>ig?" — ici c'est la consommation."
       :" — les deux tombent dans la même classe.")+
      (pire>=5?" Au-delà de F, on parle de passoire thermique.":"");
  }
  dessine();
};

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
SCHEMAS["zonage-surete"]=function(el){
  var W=760,H=316;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Protection p\u00e9rim\u00e9trique et volum\u00e9trique sur un plan"});
  /* le local */
  svg.appendChild(S("rect",{x:26,y:40,width:470,height:232,fill:V("encre2"),
    opacity:"0.06"}));
  svg.appendChild(S("rect",{x:26,y:40,width:470,height:232,fill:"none",
    stroke:V("encre"),"stroke-width":"2.5"}));
  svg.appendChild(S("line",{x1:256,y1:40,x2:256,y2:172,stroke:V("encre"),
    "stroke-width":"2.5"}));
  /* perimetrique : le contour surveille */
  svg.appendChild(S("rect",{x:36,y:50,width:450,height:212,fill:"none",
    stroke:V("froid"),"stroke-width":"2","stroke-dasharray":"7 5"}));
  svg.appendChild(S("text",{x:44,y:68,"class":"s-lab"},
    "P\u00c9RIM\u00c9TRIQUE"));
  /* les ouvertures surveillees */
  function contact(x,y){
    svg.appendChild(S("rect",{x:x-6,y:y-6,width:12,height:12,rx:2,fill:V("froid")}));
  }
  contact(140,40); contact(360,40); contact(26,160); contact(200,272); contact(496,120);
  /* volumetrique : le cone d'un detecteur */
  svg.appendChild(S("path",{d:"M330,190L216,262L444,262Z",fill:V("tiede"),
    opacity:"0.20"}));
  svg.appendChild(S("path",{d:"M330,190L216,262L444,262Z",fill:"none",
    stroke:V("tiede"),"stroke-width":"1.6"}));
  svg.appendChild(S("circle",{cx:330,cy:190,r:6,fill:V("tiede")}));
  svg.appendChild(S("text",{x:330,y:180,"text-anchor":"middle","class":"s-lab"},"VOLUM\u00c9TRIQUE"));
  svg.appendChild(S("text",{x:140,y:110,"class":"s-nom"},"zone 1 \u2014 bureaux"));
  svg.appendChild(S("text",{x:300,y:110,"class":"s-nom"},"zone 2 \u2014 stock"));
  svg.appendChild(S("text",{x:60,y:232,"class":"s-nom"},"zone 3 \u2014 accueil"));
  /* legende */
  var L=[["froid","contact d'ouverture \u2014 on surveille l'enveloppe"],
         ["tiede","d\u00e9tecteur de mouvement \u2014 on surveille le volume"],
         ["chaud","le zonage d\u00e9coupe \u2014 on arme une zone, pas tout"]];
  L.forEach(function(r,i){
    var y=64+i*46;
    svg.appendChild(S("rect",{x:528,y:y-9,width:12,height:12,rx:2,fill:V(r[0])}));
    r[1].split(" \u2014 ").forEach(function(m,k){
      svg.appendChild(S("text",{x:548,y:y+k*17,"class":k?"s-nom":"s-lab"},m));
    });
  });
  svg.appendChild(S("text",{x:528,y:238,"class":"s-nom"},
    "Le p\u00e9rim\u00e9trique arr\u00eate avant l'entr\u00e9e."));
  svg.appendChild(S("text",{x:528,y:256,"class":"s-nom"},
    "Le volum\u00e9trique constate apr\u00e8s."));
  svg.appendChild(S("text",{x:528,y:280,"class":"s-nom",fill:V("chaud")},
    "L'analyse de risques dit lequel,"));
  svg.appendChild(S("text",{x:528,y:298,"class":"s-nom",fill:V("chaud")},
    "et o\u00f9. Jamais le catalogue."));
  el.appendChild(svg);
};

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
SCHEMAS["monotone-puissance"]=function(el){
  var W=760,H=330, X0=78,X1=520,Y0=30,Y1=262, HMAX=180, PMIN=85, PMAX=125;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Monotone de puissance d'un b\u00e2timent et puissance souscrite"});
  function x(h){return X0+(X1-X0)*h/HMAX;}
  function y(p){return Y1-(Y1-Y0)*(p-PMIN)/(PMAX-PMIN);}
  var PTS=[[0,120],[6,115],[15,110],[32,105],[60,100],[105,95],[170,90]];
  /* la surface des depassements, sous la courbe et au-dessus de 110 */
  svg.appendChild(S("path",{d:"M"+x(0)+","+y(110)+"L"+x(0)+","+y(120)+"L"+x(6)+","+y(115)+
    "L"+x(15)+","+y(110)+"Z",fill:V("chaud"),opacity:"0.28"}));
  /* grille */
  [90,100,110,120].forEach(function(p){
    svg.appendChild(S("line",{x1:X0,y1:y(p),x2:X1,y2:y(p),stroke:V("trait2"),"stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-8,y:y(p)+4,"text-anchor":"end","class":"s-nom"},p+" kVA"));
  });
  [0,50,100,150].forEach(function(h){
    svg.appendChild(S("text",{x:x(h),y:Y1+18,"text-anchor":"middle","class":"s-nom"},h+" h"));
  });
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("encre2"),"stroke-width":"1.5"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X0,y2:Y1,stroke:V("encre2"),"stroke-width":"1.5"}));
  svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+40,"text-anchor":"middle","class":"s-nom"},
    "heures de l'hiver pendant lesquelles la puissance d\u00e9passe la valeur lue"));
  /* la monotone */
  var d="";
  PTS.forEach(function(p,i){d+=(i?"L":"M")+x(p[0])+","+y(p[1]);});
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"3"}));
  PTS.forEach(function(p){svg.appendChild(S("circle",{cx:x(p[0]),cy:y(p[1]),r:4,fill:V("froid")}));});
  /* la souscription */
  svg.appendChild(S("line",{x1:X0,y1:y(110),x2:X1,y2:y(110),stroke:V("chaud"),"stroke-width":"2.5",
    "stroke-dasharray":"8 5"}));
  svg.appendChild(S("text",{x:X1-4,y:y(110)-8,"text-anchor":"end","class":"s-lab"},"souscrit : 110 kVA"));
  svg.appendChild(S("text",{x:x(15)+10,y:y(113)+2,"class":"s-nom",fill:V("chaud")},"15 h de d\u00e9passement"));
  /* ce que chaque cote coute */
  var R=[["un kVA de plus","31,08 \u20ac par an"],["une heure de d\u00e9passement","12,79 \u20ac"],
         ["\u00e9quilibre","2,43 h par kVA"]];
  R.forEach(function(r,i){
    var yy=70+i*62;
    svg.appendChild(S("text",{x:548,y:yy,"class":"s-nom"},r[0]));
    svg.appendChild(S("text",{x:548,y:yy+20,"class":"s-lab"},r[1]));
  });
  svg.appendChild(S("text",{x:548,y:268,"class":"s-nom",fill:V("chaud")},"L'ampleur du d\u00e9passement"));
  svg.appendChild(S("text",{x:548,y:286,"class":"s-nom",fill:V("chaud")},"ne compte pas : seule"));
  svg.appendChild(S("text",{x:548,y:304,"class":"s-nom",fill:V("chaud")},"sa dur\u00e9e se paie."));
  el.appendChild(svg);
};

/* ─────────── trois courants, et ce qui revient par le neutre ─────────── */
SCHEMAS["phaseurs-neutre"]=function(el){
  var W=760,H=320, OX=210, OY=270, K=2.5;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Somme des trois courants de phase et courant de neutre"});
  function fl(x1,y1,x2,y2,coul,ep){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-9*Math.cos(a),y2:y2-9*Math.sin(a),
      stroke:V(coul),"stroke-width":ep||"3"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-12*Math.cos(a-0.38))+","+(y2-12*Math.sin(a-0.38))+
      "L"+(x2-12*Math.cos(a+0.38))+","+(y2-12*Math.sin(a+0.38))+"Z",fill:V(coul)}));
  }
  function vec(I,deg){var r=deg*Math.PI/180;return [I*K*Math.cos(r),-I*K*Math.sin(r)];}
  var v1=vec(60,90), v2=vec(35,-30), v3=vec(30,210);
  var p1=[OX+v1[0],OY+v1[1]], p2=[p1[0]+v2[0],p1[1]+v2[1]], p3=[p2[0]+v3[0],p2[1]+v3[1]];
  fl(OX,OY,p1[0],p1[1],"froid");
  fl(p1[0],p1[1],p2[0],p2[1],"tiede");
  fl(p2[0],p2[1],p3[0],p3[1],"vert");
  fl(OX,OY,p3[0],p3[1],"chaud","4");
  svg.appendChild(S("circle",{cx:OX,cy:OY,r:4,fill:V("encre")}));
  svg.appendChild(S("text",{x:OX-12,y:(OY+p1[1])/2,"text-anchor":"end","class":"s-lab"},"I1 = 60 A"));
  svg.appendChild(S("text",{x:(p1[0]+p2[0])/2+12,y:(p1[1]+p2[1])/2-6,"class":"s-lab"},"I2 = 35 A"));
  svg.appendChild(S("text",{x:(p2[0]+p3[0])/2+14,y:(p2[1]+p3[1])/2+18,"class":"s-lab"},"I3 = 30 A"));
  svg.appendChild(S("text",{x:OX+24,y:OY-20,"class":"s-lab"},"IN = 27,8 A"));
  svg.appendChild(S("text",{x:OX-150,y:OY+34,"class":"s-nom"},
    "Les trois courants mis bout \u00e0 bout : ce qui ne se referme pas revient par le neutre."));
  /* le cas equilibre, a droite */
  var cx=560, cy=175;
  svg.appendChild(S("text",{x:cx,y:40,"text-anchor":"middle","class":"s-tit"},"PHASES \u00c9QUILIBR\u00c9ES"));
  var q1=[cx,cy-100], q2=[q1[0]+86.6,q1[1]+50], q3=[q2[0]-86.6,q2[1]+50];
  fl(cx,cy,q1[0],q1[1],"froid"); fl(q1[0],q1[1],q2[0],q2[1],"tiede"); fl(q2[0],q2[1],q3[0],q3[1],"vert");
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:5,fill:V("chaud")}));
  svg.appendChild(S("text",{x:cx,y:cy+50,"text-anchor":"middle","class":"s-nom"},"le triangle se referme :"));
  svg.appendChild(S("text",{x:cx,y:cy+68,"text-anchor":"middle","class":"s-lab"},"IN = 0"));
  el.appendChild(svg);
};

/* ─────────── le batiment en ecorche ─────────── */
SCHEMAS["batiment-ecorche"]=function(el){
  var W=900,H=470;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Coupe d'un bâtiment et part de chaque poste de déperdition"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  /* ou part chaque poste, et vers ou : [x1,y1,x2,y2, ancrage du texte] */
  var OU={
    "Toiture":              [450,124,450, 58,"ma"],
    "Murs":                 [654,196,762,196,"la"],
    "Fenêtres":             [236,214,146,214,"ra"],
    "Plancher":             [450,352,450,404,"ma"],
    "Pont thermique plancher":[650,344,714,392,"ma"],
    "Ponts de menuiseries": [236,262,168,324,"ma"],
    "Air neuf":             [598,132,714, 74,"la"]
  };
  var XG=236,XD=654,YH=124,YB=352,EP=16;

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var P=ETAT.postes&&ETAT.postes.length?ETAT.postes:
      [["Murs",702],["Fenêtres",473],["Toiture",437],["Plancher",277],
       ["Pont thermique plancher",445],["Ponts de menuiseries",78],["Air neuf",1002]];
    var tot=0,mx=0;
    P.forEach(function(p){tot+=p[1];if(p[1]>mx)mx=p[1];});

    /* le dehors, le dedans, le vide sanitaire */
    svg.appendChild(S("rect",{x:0,y:0,width:W,height:H,fill:V("froid"),opacity:"0.05"}));
    svg.appendChild(S("rect",{x:XG,y:YH,width:XD-XG,height:YB-YH,
      fill:V("chaud"),opacity:"0.08"}));
    svg.appendChild(S("text",{x:(XG+XD)/2,y:YH+30,"text-anchor":"middle","class":"s-pet"},
      "INTÉRIEUR 19 °C"));
    svg.appendChild(S("rect",{x:XG,y:YB+EP,width:XD-XG,height:36,fill:V("trait"),
      opacity:"0.14"}));
    svg.appendChild(S("text",{x:(XG+XD)/2,y:YB+EP+23,"text-anchor":"middle","class":"s-pet"},
      "VIDE SANITAIRE 8 °C"));
    svg.appendChild(S("text",{x:22,y:34,"class":"s-pet"},"EXTÉRIEUR −7 °C"));

    /* l'enveloppe, en coupe */
    function paroi(x,y,l,h){
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,fill:V("encre2"),opacity:"0.30"}));
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,fill:"none",stroke:V("encre2"),
        "stroke-width":"1.5"}));
    }
    paroi(XG-EP,YH-EP,XD-XG+2*EP,EP);        /* toiture */
    paroi(XG-EP,YB,XD-XG+2*EP,EP);           /* plancher */
    paroi(XG-EP,YH,EP,YB-YH);                /* mur gauche */
    paroi(XD,YH,EP,YB-YH);                   /* mur droit */
    /* la fenetre interrompt le mur gauche */
    svg.appendChild(S("rect",{x:XG-EP,y:190,width:EP,height:52,fill:V("froid"),
      opacity:"0.45"}));
    svg.appendChild(S("rect",{x:XG-EP,y:190,width:EP,height:52,fill:"none",
      stroke:V("froid"),"stroke-width":"1.5"}));
    /* la bouche d'air neuf traverse le mur droit */
    svg.appendChild(S("rect",{x:XD,y:140,width:EP,height:22,fill:V("carte")}));
    svg.appendChild(S("rect",{x:XD,y:140,width:EP,height:22,fill:"none",
      stroke:V("encre2"),"stroke-width":"1.5"}));

    /* une fleche par poste, epaisseur proportionnelle a sa part */
    P.slice().sort(function(a,b){return a[1]-b[1];}).forEach(function(p){
      var o=OU[p[0]];if(!o)return;
      var part=tot>0?p[1]/tot:0, ep=3+13*(p[1]/(mx||1));
      var a=Math.atan2(o[3]-o[1],o[2]-o[0]);
      var fort=(p[1]===mx);
      svg.appendChild(S("line",{x1:o[0],y1:o[1],x2:o[2]-11*Math.cos(a),
        y2:o[3]-11*Math.sin(a),stroke:V("chaud"),"stroke-width":ep,
        "stroke-linecap":"round",opacity:fort?"1":"0.55"}));
      svg.appendChild(S("path",{d:"M"+o[2]+","+o[3]+
        "L"+(o[2]-15*Math.cos(a-0.42))+","+(o[3]-15*Math.sin(a-0.42))+
        "L"+(o[2]-15*Math.cos(a+0.42))+","+(o[3]-15*Math.sin(a+0.42))+"Z",
        fill:V("chaud"),opacity:fort?"1":"0.55"}));
      var anc=o[4]==="la"?"start":o[4]==="ra"?"end":"middle";
      var dx=o[4]==="la"?13:o[4]==="ra"?-13:0;
      var dy=o[4]!=="ma"?-4:(o[3]<o[1]?-24:22);
      svg.appendChild(S("text",{x:o[2]+dx,y:o[3]+dy,"text-anchor":anc,
        "class":fort?"s-lab":"s-nom"},p[0]));
      svg.appendChild(S("text",{x:o[2]+dx,y:o[3]+dy+16,"text-anchor":anc,
        "class":"s-pet"},fr(p[1],0)+" W · "+fr(100*part,0)+" %"));
    });

    var tri=P.slice().sort(function(a,b){return b[1]-a[1];});
    lg.innerHTML="Le poste le plus lourd est <b>"+tri[0][0].toLowerCase()+"</b> ("+
      fr(100*tri[0][1]/tot,0)+" %). Avec <b>"+tri[1][0].toLowerCase()+"</b>, les deux "+
      "premiers pèsent <b>"+fr(100*(tri[0][1]+tri[1][1])/tot,0)+" %</b> du total — "+
      "c'est ce classement, et non le total, qui dit où mettre l'argent.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};


/* ─────────── le diagramme de l'air humide ─────────── */
SCHEMAS["air-humide"]=function(el){
  var W=720,H=416,X0=64,X1=650,Y0=28,Y1=326;
  var TMIN=-5,TMAX=45,RMAX=25;
  var P={t:20,hr:50,evo:false};

  var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:18px;align-items:center;"+
    "margin-bottom:12px"});
  [["t","Température sèche",-5,45,0.5,"°C"],
   ["hr","Humidité relative",5,100,1,"%"]].forEach(function(f){
    var w=E("div",{style:"flex:1 1 220px"});
    var l=E("div",{style:"display:flex;justify-content:space-between;font-size:14.5px"});
    l.appendChild(E("span",{},f[1]));
    var v=E("span",{"class":"mono",style:"font-weight:600"},"");
    l.appendChild(v);w.appendChild(l);
    var i=E("input",{type:"range",min:f[2],max:f[3],step:f[4],value:P[f[0]],
      style:"width:100%;accent-color:var(--froid)"});
    i.addEventListener("input",function(){P[f[0]]=parseFloat(this.value);dessine();});
    w.appendChild(i);barre.appendChild(w);
    f.maj=function(){v.textContent=frs(P[f[0]],f[0]==="hr"?0:1)+" "+f[5];};
    P["maj_"+f[0]]=f.maj;
  });
  var bt=E("button",{"class":"bt",type:"button"},"Les quatre évolutions");
  bt.addEventListener("click",function(){
    P.evo=!P.evo;this.className="bt"+(P.evo?" p":"");dessine();});
  barre.appendChild(bt);
  el.appendChild(barre);

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Diagramme de l'air humide"});
  el.appendChild(svg);
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  el.appendChild(lect);

  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(r){return Y1-Math.min(r,RMAX)/RMAX*(Y1-Y0);}

  function dessine(){
    P.maj_t();P.maj_hr();
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var t,r;
    /* la grille */
    for(t=TMIN;t<=TMAX;t+=5){
      svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:px(t),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
        String(t)));
    }
    for(r=0;r<=RMAX;r+=5){
      svg.appendChild(S("line",{x1:X0,y1:py(r),x2:X1,y2:py(r),stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:X0-9,y:py(r)+4,"text-anchor":"end","class":"s-pet"},
        String(r)));
    }
    svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+62,"text-anchor":"middle","class":"s-pet"},
      "température sèche θ  (°C)"));
    var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
      transform:"translate(18,"+((Y0+Y1)/2)+") rotate(-90)"});
    lab.textContent="humidité absolue r  (g/kg)";
    svg.appendChild(lab);

    /* les courbes d'humidite relative, puis la saturation */
    function courbe(hr,coul,ep,tir){
      var d="",k=0,tf=TMIN;
      for(t=TMIN;t<=TMAX;t+=0.5){
        var rr=rDe(t,hr);if(rr>RMAX)break;
        d+=(k++?"L":"M")+px(t).toFixed(1)+","+py(rr).toFixed(1);tf=t;
      }
      if(k<2)return null;
      var a={d:d,fill:"none",stroke:V(coul),"stroke-width":ep};
      if(tir)a["stroke-dasharray"]="3 4";
      svg.appendChild(S("path",a));
      return tf;
    }
    [20,40,60,80].forEach(function(hr){
      var tf=courbe(hr,"trait",1,true);
      if(tf!==null)svg.appendChild(S("text",{x:px(tf)-4,y:py(rDe(tf,hr))-6,
        "text-anchor":"end","class":"s-pet",fill:V("trait")},hr+" %"));
    });
    var ts=courbe(100,"froid",2.5,false);
    if(ts!==null)svg.appendChild(S("text",{x:px(ts)-4,y:py(rDe(ts,100))-8,
      "text-anchor":"end","class":"s-pet",fill:V("froid")},"saturation φ = 100 %"));

    /* le point, et la construction du point de rosee */
    var rp=rDe(P.t,P.hr), tr=rosee(P.t,P.hr);
    var xp=px(P.t), yp=py(rp);
    svg.appendChild(S("line",{x1:xp,y1:yp,x2:xp,y2:Y1,stroke:V("encre2"),
      "stroke-width":"1","stroke-dasharray":"4 4"}));
    svg.appendChild(S("line",{x1:X0,y1:yp,x2:xp,y2:yp,stroke:V("encre2"),
      "stroke-width":"1","stroke-dasharray":"4 4"}));
    if(tr>=TMIN){
      svg.appendChild(S("line",{x1:px(tr),y1:yp,x2:px(tr),y2:Y1,stroke:V("eau"),
        "stroke-width":"2","stroke-dasharray":"5 4"}));
      svg.appendChild(S("circle",{cx:px(tr),cy:yp,r:"5",fill:V("eau")}));
      svg.appendChild(S("text",{x:px(tr),y:Y1+36,"text-anchor":"middle","class":"s-lab",
        fill:V("eau")},frs(tr,1)+" °C"));
      svg.appendChild(S("text",{x:px(tr)-8,y:yp-10,"text-anchor":"end","class":"s-nom",
        fill:V("eau")},"point de rosée"));
    }

    /* les quatre evolutions elementaires */
    if(P.evo){
      function fle(t2,r2,coul,nom,dy,cote){
        var x2=px(t2),y2=py(r2);
        var a=Math.atan2(y2-yp,x2-xp);
        svg.appendChild(S("line",{x1:xp,y1:yp,x2:x2-8*Math.cos(a),y2:y2-8*Math.sin(a),
          stroke:V(coul),"stroke-width":"2.5"}));
        svg.appendChild(S("path",{d:"M"+x2+","+y2+
          "L"+(x2-10*Math.cos(a-0.4))+","+(y2-10*Math.sin(a-0.4))+
          "L"+(x2-10*Math.cos(a+0.4))+","+(y2-10*Math.sin(a+0.4))+"Z",fill:V(coul)}));
        svg.appendChild(S("text",{x:x2+(cote?11:0),y:y2+(cote?4:dy),
          "text-anchor":cote?"start":"middle","class":"s-nom",fill:V(coul)},nom));
      }
      fle(Math.min(P.t+9,TMAX-1),rp,"chaud","chauffage sec",-10);
      fle(Math.max(P.t-8,tr,TMIN+1),rp,"froid","refroidissement",20);
      var rv=Math.min(rp+4.5,rDe(P.t,100));
      fle(P.t,rv,"eau","vapeur",0,true);
      var ra=rp+4.5, ta=tDeH(enth(P.t,rp),ra);
      fle(ta,ra,"vert","adiabatique",-10);
    }

    svg.appendChild(S("circle",{cx:xp,cy:yp,r:"7",fill:V("encre")}));
    svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
      stroke:V("trait"),"stroke-width":"1.5"}));

    /* la lecture, en clair */
    var h=enth(P.t,rp), tw=bulbeH(P.t,rp);
    lect.innerHTML="<div class='gros'>"+
      "<span><b>Humidité absolue</b><span>"+frs(rp,2)+" g/kg</span></span>"+
      "<span><b>Point de rosée</b><span>"+frs(tr,1)+" °C</span></span>"+
      "<span><b>Bulbe humide</b><span>"+frs(tw,1)+" °C</span></span>"+
      "<span><b>Enthalpie</b><span>"+frs(h,1)+" kJ/kg</span></span>"+
      "<span><b>Volume spéc.</b><span>"+frs(volSpec(P.t,rp),3)+" m³/kg</span></span>"+
      "</div><p>Une paroi dont la surface intérieure descend sous <b>"+frs(tr,1)+
      " °C</b> se couvre de buée. C'est la seule chose que le point de rosée dit — "+
      "et c'est celle que l'épreuve demande.</p>";
  }
  dessine();
};


/* --------- dispersion : deux series de meme moyenne ---------
   Ajoute le 3 septembre 2026 pour la sequence 1 de maths-PC. Aucun schema du
   kit ne montrait une dispersion, et c'est tout le propos de la sequence :
   deux installations de meme moyenne, l'une reglee, l'autre qui oscille. */
SCHEMAS["dispersion"]=function(el){
  var W=720,H=340,X0=96,X1=664,TMIN=43,TMAX=47,CONS=45,TOL=0.5;
  var A=[44.8,45.2,44.9,45.1,45.0,44.9,45.1,45.0];
  var B=[43.5,46.4,44.2,45.8,45.0,44.1,46.2,44.8];
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux regulations de meme moyenne, de dispersions tres differentes"});
  function px(t){return X0+(X1-X0)*(t-TMIN)/(TMAX-TMIN);}

  [{n:"RÉGULATION A",s:A,y:118,c:"froid",
    m:"écart-type 0,13 °C · 0 relevé hors tolérance"},
   {n:"RÉGULATION B",s:B,y:262,c:"chaud",
    m:"écart-type 1,05 °C · 6 relevés sur 8 hors tolérance"}
  ].forEach(function(r){
    svg.appendChild(S("rect",{x:px(CONS-TOL),y:r.y-58,width:px(CONS+TOL)-px(CONS-TOL),
      height:70,fill:V("trait"),opacity:"0.13"}));
    svg.appendChild(S("line",{x1:px(CONS),y1:r.y-64,x2:px(CONS),y2:r.y+6,
      stroke:V("trait"),"stroke-width":"1.5","stroke-dasharray":"5 4"}));
    svg.appendChild(S("line",{x1:X0,y1:r.y,x2:X1,y2:r.y,stroke:V("trait"),
      "stroke-width":"1.5"}));
    for(var t=TMIN;t<=TMAX+1e-9;t++){
      svg.appendChild(S("line",{x1:px(t),y1:r.y-5,x2:px(t),y2:r.y+5,
        stroke:V("trait"),"stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:px(t),y:r.y+22,"text-anchor":"middle",
        "class":"s-pet"},t+" °C"));
    }
    var vus={};
    r.s.forEach(function(v){
      var k=v.toFixed(2),n=vus[k]||0;vus[k]=n+1;
      svg.appendChild(S("circle",{cx:px(v),cy:r.y-9-16*n,r:6,fill:V(r.c)}));
    });
    svg.appendChild(S("text",{x:X0,y:r.y-70,"class":"s-tit",fill:V(r.c)},r.n));
    svg.appendChild(S("text",{x:X1,y:r.y-70,"text-anchor":"end","class":"s-nom"},r.m));
  });
  svg.appendChild(S("text",{x:px(CONS),y:326,"text-anchor":"middle","class":"s-pet"},
    "consigne 45 °C · tolérance CCTP ± 0,5 °C · les deux séries ont pour moyenne 45,00 °C"));
  el.appendChild(svg);
};

/* ═══════════════════════════════════════════════════ OUTILS */
var OUTILS={};

/* ─────────── 1. convertisseur d'unités ─────────── */
OUTILS.unites={
  titre:"Convertisseur d'unités",
  intro:"Les quatre familles du rituel. Entrez une valeur : les équivalences suivent.",
  monte:function(d){
    var FAM=[
      {n:"Débit",u:[["m³/h",1],["L/h",1000],["L/s",1/3.6],["m³/s",1/3600]],v:2},
      {n:"Puissance",u:[["W",1],["kW",0.001],["MW",1e-6]],v:1500},
      {n:"Énergie",u:[["kWh",1],["Wh",1000],["MJ",3.6],["kJ",3600]],v:1},
      {n:"Pression",u:[["bar",1],["Pa",100000],["kPa",100],["mCE",10.2]],v:1.5}
    ];
    FAM.forEach(function(f,i){
      var bloc=E("div",{style:"margin-bottom:14px"});
      bloc.appendChild(E("div",{"class":"chapeau",
        style:"font-family:'Bricolage Grotesque',sans-serif;font-size:11px;font-weight:700;"+
              "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);margin-bottom:6px"},f.n));
      var ligne=E("div",{style:"display:flex;flex-wrap:wrap;gap:8px;align-items:center"});
      var champs=[];
      f.u.forEach(function(u,j){
        var w=E("label",{style:"display:flex;align-items:center;gap:5px;font-size:14px"});
        var inp=E("input",{type:"number",step:"any",value:frs(f.v*u[1],3)});
        inp.style.width="92px";
        inp.addEventListener("input",function(){
          var v=parseFloat(this.value.replace(",","."));
          if(!isFinite(v))return;
          var base=v/u[1];
          champs.forEach(function(c,k){
            if(k!==j)c.value=frs(base*f.u[k][1],3);});
        });
        champs.push(inp);
        w.appendChild(inp);w.appendChild(E("span",{"class":"mono",
          style:"color:var(--encre2);font-size:13px"},u[0]));
        ligne.appendChild(w);
      });
      bloc.appendChild(ligne);
      d.appendChild(bloc);
    });
    d.appendChild(E("p",{style:"font-size:14.5px;color:var(--encre2);margin:4px 0 0"},
      "Rappel qui ne se convertit pas : un <b>écart</b> en degrés Celsius vaut le même "+
      "écart en kelvins. De 70 à 50 °C, c'est 20 °C et c'est 20 K."));
  }
};

/* ─────────── le diviseur de tension et la resistance de LED ───────────
   Premier outil ecrit pour une classe de bac pro CIEL. Il ne remplace aucun
   calcul : il permet d'en essayer dix en dix secondes, ce qu'une feuille ne
   permet pas — et de VOIR que la tension se partage proportionnellement aux
   resistances, au lieu de le lire. */
OUTILS.diviseur={
  titre:"Diviseur de tension, et résistance de LED",
  intro:"Deux dipôles en série sous une même alimentation. Bougez les valeurs : "+
        "la tension se partage, et le courant est le même partout.",
  monte:function(d){
    var P={E:5,R1:150,R2:100,mode:"deux"};

    var seg=E("div",{"class":"segments",role:"group"});
    [["deux","Deux résistances"],["led","Une LED et sa résistance"]].forEach(function(m){
      var b=E("button",{type:"button","class":"seg"+(P.mode===m[0]?" on":""),},m[1]);
      b.addEventListener("click",function(){
        P.mode=m[0];
        [].forEach.call(seg.children,function(x){x.className="seg";});
        this.className="seg on";calcule();});
      seg.appendChild(b);
    });
    d.appendChild(seg);

    var ch={};
    function champ(cle,nom,unite,pas){
      var w=E("label",{style:"display:flex;align-items:center;gap:6px;font-size:14.5px;"+
        "margin:9px 0"});
      w.appendChild(E("span",{style:"min-width:150px"},nom));
      var i=E("input",{type:"number",step:pas,value:String(P[cle])});
      i.style.width="96px";
      i.addEventListener("input",function(){
        var v=parseFloat(this.value.replace(",","."));
        if(isFinite(v))
          {P[cle]=v;calcule();}
      });
      w.appendChild(i);
      w.appendChild(E("span",{"class":"mono",style:"color:var(--encre2);font-size:13px"},unite));
      ch[cle]=w;d.appendChild(w);
    }
    champ("E","Tension d'alimentation","V","any");
    champ("R1","Résistance R1 (série)","Ω","any");
    champ("R2","Résistance R2","Ω","any");

    var res=E("div",{"class":"res",style:"margin-top:12px"});
    d.appendChild(res);

    function calcule(){
      var E0=P.E,R1=P.R1,R2=P.R2,html="";
      ch.R2.style.display=(P.mode==="led")?"none":"flex";
      if(P.mode==="deux"){
        if(R1+R2<=0){res.innerHTML="Entrez des résistances positives.";return;}
        var I=E0/(R1+R2), U1=I*R1, U2=I*R2;
        html="<b>I = "+frs(I*1000,2)+" mA</b> — le même dans les deux, ils sont en série."+
          "<br><b>U1 = "+frs(U1,2)+" V</b> et <b>U2 = "+frs(U2,2)+" V</b>"+
          "<br>Contrôle : U1 + U2 = "+frs(U1+U2,2)+" V, soit la tension d'alimentation."+
          "<br>La tension se partage <b>proportionnellement aux résistances</b> : "+
          "R1 vaut "+frs(100*R1/(R1+R2),0)+" % du total, et prend "+
          frs(100*U1/E0,0)+" % de la tension.";
      }else{
        /* une LED : 2 V a ses bornes, on cherche ce que doit prendre la resistance */
        var Uled=2, Iv=(E0-Uled)/R1;
        if(R1<=0){res.innerHTML="Entrez une résistance positive.";return;}
        html="Une LED témoin garde <b>2 V</b> à ses bornes quoi qu'il arrive.<br>"+
          "La résistance encaisse donc <b>"+frs(E0-Uled,2)+" V</b>, et le courant vaut "+
          "<b>"+frs(Iv*1000,1)+" mA</b>.";
        if(Iv*1000>20) html+="<br><b>Au-delà des 20 mA admis</b> : la LED grille. "+
          "Il faut une résistance plus grande.";
        else if(Iv*1000<5) html+="<br>Moins de 5 mA : la LED s'allumera faiblement.";
        else html+="<br>Entre 5 et 20 mA : la LED est correctement alimentée.";
        html+="<br>Sans résistance du tout, plus rien ne limite le courant — "+
          "c'est ce qui la détruit.";
      }
      res.innerHTML=html;
    }
    calcule();
  }
};

/* ─────────── 2. puissance transportée ─────────── */
OUTILS.reseau={
  titre:"Ce qu'un réseau transporte",
  intro:"P = Q × 1 163 × ΔT pour l'eau, P = Q × 0,34 × ΔT pour l'air. "+
        "Les deux constantes sont ρ·Cp/3600 : le même calcul, deux fluides.",
  monte:function(d){
    var g=E("div",{"class":"g2"});
    var col1=E("div"),col2=E("div");
    var st={mode:"P",Q:2,dt:20,P:20};
    function champ(par,id,lab,min,max,pas,dec,unite,cle){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");
      c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:st[cle]});
      i.addEventListener("input",function(){st[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      return function(){v.textContent=frs(st[cle],dec)+" "+unite;};
    }
    var seg=E("div",{style:"display:flex;gap:0;margin-bottom:12px"});
    ["P","Q"].forEach(function(m){
      var b=E("button",{"class":"bt"+(m===st.mode?" p":""),type:"button"},
        m==="P"?"Je cherche la puissance":"Je cherche le débit");
      b.style.borderRadius=m==="P"?"4px 0 0 4px":"0 4px 4px 0";
      b.addEventListener("click",function(){
        st.mode=m;
        [].forEach.call(seg.children,function(o,k){
          o.className="bt"+((k===0?"P":"Q")===m?" p":"");});
        maj();calc();});
      seg.appendChild(b);
    });
    col1.appendChild(seg);
    var mQ=champ(col1,"q","Débit d'eau",0.1,20,0.1,1,"m³/h","Q");
    var mP=champ(col1,"p","Puissance à transporter",1,200,1,0,"kW","P");
    var mT=champ(col1,"t","Écart départ / retour",2,40,1,0,"K","dt");
    var res=E("div",{"class":"res"});col2.appendChild(res);
    var note=E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},"");
    col2.appendChild(note);
    function maj(){
      col1.children[1].style.display=st.mode==="P"?"":"none";
      col1.children[2].style.display=st.mode==="Q"?"":"none";
    }
    function calc(){
      mQ();mP();mT();
      var h="";
      if(st.mode==="P"){
        var pe=st.Q*1163*st.dt/1000, pa=st.Q*0.34*st.dt/1000;
        h="<div class='gros'><span><b>Avec de l'eau</b><span>"+frs(pe,1)+" kW</span></span>"+
          "<span><b>Avec de l'air</b><span>"+frs(pa,2)+" kW</span></span></div>";
        note.innerHTML="Le même débit de "+frs(st.Q,1)+" m³/h transporte <b>"+
          fr(pe/pa,0)+" fois</b> plus de puissance en eau qu'en air.";
      }else{
        var qe=st.P*1000/(1163*st.dt), qa=st.P*1000/(0.34*st.dt);
        h="<div class='gros'><span><b>Débit d'eau</b><span>"+frs(qe,2)+" m³/h</span></span>"+
          "<span><b>Débit d'air</b><span>"+fr(qa,0)+" m³/h</span></span></div>";
        note.innerHTML="Pour "+frs(st.P,0)+" kW sous "+frs(st.dt,0)+" K : <b>"+
          fr(qe*1000,0)+" litres d'eau</b> par heure, ou <b>"+fr(qa,0)+" m³ d'air</b>. "+
          "C'est pour ça qu'on chauffe à l'eau et qu'on ventile à l'air.";
      }
      res.innerHTML=h;
    }
    g.appendChild(col1);g.appendChild(col2);d.appendChild(g);
    maj();calc();
  }
};

/* ─────────── 3. composeur de paroi ─────────── */
var MAT=[
 ["Enduit ciment",1.15],["Enduit plâtre",0.25],["Plaque de plâtre BA13",0.25],
 ["Béton",1.65],["Béton armé",2.50],["Parpaing creux",1.05],["Brique creuse",0.45],
 ["Brique pleine",0.85],["Pierre calcaire",1.40],["Bois massif",0.15],
 ["Laine minérale",0.038],["Laine de bois",0.040],["Ouate de cellulose",0.039],
 ["Polystyrène expansé",0.035],["Polystyrène extrudé",0.030],["Polyuréthane",0.025],
 ["Verre",1.00],["Acier",50],["Lame d'air non ventilée",null]
];
OUTILS.paroi={
  titre:"Composeur de paroi",
  intro:"Empilez les couches de l'intérieur vers l'extérieur, comme sur votre relevé — "+
        "la première ligne est celle qu'on touche depuis la pièce. Au départ, un mur "+
        "courant en isolation par l'intérieur ; ce n'est pas celui de l'activité.",
  monte:function(d){
    /* interieur -> exterieur : BA13, isolant, parpaing, enduit */
    var C=[[2,1.3],[13,10],[5,20],[0,1.5]], RSI=0.13, RSE=0.04, cible=0.25;
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var ent=E("div",{"class":"entete-c"},
      "<span>Couche</span><span>Conductivité</span><span>Épaisseur cm</span><span></span>");
    var liste=E("div");
    var ajout=E("div",{style:"display:flex;gap:8px;margin-top:11px;flex-wrap:wrap"});
    var sel=E("select",{},MAT.map(function(m,i){
      return '<option value="'+i+'">'+m[0]+(m[1]===null?"":"  λ = "+frs(m[1],m[1]<0.1?3:2))+
             '</option>';}).join(""));
    sel.value="10";
    var bt=E("button",{"class":"bt p",type:"button"},"Ajouter la couche");
    bt.addEventListener("click",function(){C.push([+sel.value,8]);dessine();calc();});
    ajout.appendChild(sel);ajout.appendChild(bt);
    var chc=E("div",{"class":"champ",style:"margin-top:13px"});
    chc.appendChild(E("label",{},"U visé par la réglementation"));
    var vc=E("span",{"class":"v"},"0,25 W/(m²·K)");chc.appendChild(vc);
    var ic=E("input",{type:"range",min:"0.10",max:"0.60",step:"0.01",value:"0.25"});
    ic.addEventListener("input",function(){cible=+this.value;
      vc.textContent=frs(cible,2)+" W/(m²·K)";calc();});
    chc.appendChild(ic);
    c1.appendChild(ent);c1.appendChild(liste);c1.appendChild(ajout);c1.appendChild(chc);
    var res=E("div",{"class":"res"}),barres=E("div",{"class":"barres"});
    c2.appendChild(res);c2.appendChild(barres);
    c2.appendChild(E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},
      "Chaque barre est la part de la couche dans la résistance totale. Dans une paroi "+
      "isolée, une seule couche fait presque tout le travail."));

    function rLame(e){return e<0.7?0.11:e<1.8?0.15:0.18;}
    function rC(c){var m=MAT[c[0]];return m[1]===null?rLame(c[1]):(c[1]/100)/m[1];}
    function dessine(){
      liste.innerHTML=C.map(function(c,i){
        var m=MAT[c[0]];
        return '<div class="lignec"><select data-i="'+i+'">'+MAT.map(function(mm,j){
          return '<option value="'+j+'"'+(j===c[0]?" selected":"")+'>'+mm[0]+'</option>';
        }).join("")+'</select><span class="rr">λ '+
        (m[1]===null?"lame d’air":frs(m[1],m[1]<0.1?3:2))+'</span>'+
        '<input type="number" data-i="'+i+'" min="0.2" max="80" step="0.5" value="'+c[1]+'">'+
        '<button class="xx" data-i="'+i+'" aria-label="Retirer">×</button></div>';
      }).join("");
      [].forEach.call(liste.querySelectorAll("select"),function(s){
        s.addEventListener("change",function(){
          C[+this.getAttribute("data-i")][0]=+this.value;dessine();calc();});});
      [].forEach.call(liste.querySelectorAll("input"),function(s){
        s.addEventListener("input",function(){
          var v=parseFloat(this.value);
          if(isFinite(v)&&v>0){C[+this.getAttribute("data-i")][1]=v;calc();}});});
      [].forEach.call(liste.querySelectorAll(".xx"),function(b){
        b.addEventListener("click",function(){
          if(C.length<=1)return;
          C.splice(+this.getAttribute("data-i"),1);dessine();calc();});});
    }
    function calc(){
      var rs=C.map(rC), rt=RSI+RSE+rs.reduce(function(a,b){return a+b;},0), u=1/rt;
      ETAT.u_mur=u;
      ETAT.couches=C.map(function(c,i){
        return {nom:MAT[c[0]][0],lam:MAT[c[0]][1],e:c[1],R:rs[i]};});
      SCHEMA_MAJ.forEach(function(f){f();});
      var manque=1/cible-rt;
      res.innerHTML="<div class='gros'><span><b>R total</b><span>"+frs(rt,2)+
        " m²·K/W</span></span><span><b>U</b><span>"+frs(u,3)+"</span></span></div>"+
        "<p>"+(u<=cible?"Cette paroi tient l'objectif de "+frs(cible,2)+"."
        :"Il manque <b>"+frs(manque,2)+" m²·K/W</b> — soit <b>"+fr(manque*0.038*100,0)+
         " cm</b> de laine minérale à ajouter.")+"</p>";
      var L=[["Superficielle intérieure",RSI,"var(--chaud)"]]
        .concat(C.map(function(c,i){
          return [MAT[c[0]][0]+" · "+frs(c[1],1)+" cm",rs[i],
            MAT[c[0]][1]!==null&&MAT[c[0]][1]<0.06?"var(--vert)":"var(--froid)"];}))
        .concat([["Superficielle extérieure",RSE,"var(--froid)"]]);
      var mx=Math.max.apply(null,L.map(function(x){return x[1];}));
      barres.innerHTML=L.map(function(x){
        return '<div class="barre"><span class="l">'+x[0]+'</span><span class="b" style="width:'+
          (100*x[1]/mx)+'%;background:'+x[2]+'"></span><span class="p">'+frs(x[1],2)+
          ' · '+fr(100*x[1]/rt,0)+' %</span></div>';}).join("");
      suivant("bilan");
    }
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    dessine();calc();
  }
};

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
OUTILS.energie={
  titre:"Besoin annuel et temps de retour",
  intro:"Le besoin de la saison, la facture, et ce que rapporte un scénario de travaux.",
  chaine:"le GV vient du bilan de déperditions",
  monte:function(d){
    var P={ville:0,ap:25,prix:0.25,trav:3000,gain:15};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var cv=E("div",{"class":"champ"});
    cv.appendChild(E("label",{},"Ville"));
    var vv=E("span",{"class":"v"},"");cv.appendChild(vv);
    var sv=E("select",{},VILLES.map(function(v,i){
      return '<option value="'+i+'">'+v[0]+" — "+v[1]+" DJU</option>";}).join(""));
    sv.addEventListener("change",function(){P.ville=+this.value;calc();});
    cv.appendChild(sv);c1.appendChild(cv);
    maj.push(function(){vv.textContent=VILLES[P.ville][1]+" DJU";});
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=(dec===0?fr(P[cle],0):frs(P[cle],dec))+unite;});
    }
    ch(c1,"Apports gratuits","ap",0,45,1,0," %");
    ch(c1,"Prix du kWh","prix",0.03,0.40,0.005,3," €");
    ch(c2,"Coût des travaux envisagés","trav",500,30000,100,0," €");
    ch(c2,"Gain sur les déperditions","gain",1,60,1,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var r1=E("div",{"class":"res",style:"margin-top:16px"});
    var r2=E("div",{"class":"res",style:"margin-top:11px"});
    d.appendChild(r1);d.appendChild(r2);
    function calc(){
      maj.forEach(function(f){f();});
      ETAT.ville=P.ville;
      SCHEMA_MAJ.forEach(function(f){f();});
      var dju=VILLES[P.ville][1];
      var brut=ETAT.gv*dju*24/1000, net=brut*(1-P.ap/100);
      var ratio=ETAT.surface>0?net/ETAT.surface:0, fact=net*P.prix;
      var cl=ratio<50?["A ou B","var(--vert)"]:ratio<90?["C","var(--vert)"]:
             ratio<150?["D","var(--tiede)"]:ratio<230?["E","var(--tiede)"]:
             ratio<330?["F","var(--chaud)"]:["G","var(--chaud)"];
      r1.innerHTML="<div class='gros'><span><b>Besoin net</b><span>"+fr(net,0)+
        " kWh</span></span><span><b>Ratio</b><span>"+fr(ratio,0)+
        " kWh/(m²·an)</span></span><span><b>Facture</b><span>"+fr(fact,0)+
        " €</span></span></div><p>Besoin brut "+fr(brut,0)+" kWh, dont "+P.ap+
        " % d'apports gratuits. Classe <b style='color:"+cl[1]+"'>"+cl[0]+
        "</b> — <em>en énergie utile</em>, ce qui n'est pas l'échelle du DPE.</p>";
      var eco=net*(P.gain/100)*P.prix, tr=eco>0?P.trav/eco:Infinity;
      r2.innerHTML="<div class='gros'><span><b>Économie annuelle</b><span>"+fr(eco,0)+
        " €/an</span></span><span><b>Temps de retour</b><span>"+
        (isFinite(tr)?frs(tr,1)+" ans":"—")+"</span></span></div><p>"+
        (!isFinite(tr)?"Aucune économie."
         :tr<8?"<b>Moins de huit ans</b> : un maître d'ouvrage engage sans hésiter."
         :tr<20?"Entre huit et vingt ans : la décision dépend du prix de l'énergie retenu."
         :"<b>Plus de vingt ans</b> : indéfendable sur le seul argument financier. "+
          "Il faut un autre motif — confort, obligation, valeur du bien.")+"</p>";
    }
    OUTILS.energie._recalc=calc;
    calc();
  }
};


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
OUTILS["lire-unite"]={
  titre:"Lire une unité",
  intro:"Une unité contient sa formule. Chaque « par » dit ce qu'il faut "+
        "remultiplier pour revenir à des watts. Cliquez-en une.",
  monte:function(d,el){
    var filtre=el&&el.getAttribute("data-filtre");
    var L=filtre?UNITES.filter(function(x){
      return filtre.split(",").indexOf(x.k)>=0;}):UNITES;
    var chips=E("div",{style:"display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px"});
    var carte=E("div",{"class":"res"});
    d.appendChild(chips);d.appendChild(carte);
    function montre(i){
      [].forEach.call(chips.children,function(b,k){
        b.className="bt"+(k===i?" p":"");});
      var x=L[i];
      carte.innerHTML=
        "<div style='font-family:\"IBM Plex Mono\",monospace;font-size:23px;"+
        "font-weight:600;margin-bottom:2px'>"+x.u+"</div>"+
        "<div class='gro' style='font-weight:600;font-size:16.5px;margin-bottom:10px'>"+
        x.n+"</div>"+
        "<p><b>Se lit</b> « "+x.lit+" »</p>"+
        "<p><b>Mesure</b> "+x.m+"</p>"+
        "<p><b>La formule qu'elle contient</b> "+x.f+"</p>"+
        "<p><b>Ordres de grandeur</b> "+x.o+"</p>";
      [].forEach.call(carte.querySelectorAll("p b:first-child"),function(b){
        b.style.cssText="font-family:'Bricolage Grotesque',sans-serif;font-size:10.5px;"+
          "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
          "display:block;margin-bottom:1px";
      });
    }
    L.forEach(function(x,i){
      var b=E("button",{"class":"bt",type:"button"},x.p||x.u);
      b.style.fontFamily='"IBM Plex Mono",monospace';
      b.addEventListener("click",function(){montre(i);});
      chips.appendChild(b);
    });
    montre(0);
  }
};


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
OUTILS.pertes={
  titre:"Pertes de charge d'un circuit",
  intro:"Le débit vient de la puissance, la vitesse du diamètre, la perte "+
        "linéique du frottement. Les singularités se convertissent en mètres "+
        "de tube droit.",
  monte:function(d){
    var P={p:12,dt:20,tube:4,L:24,n:[6,4,2,4,4]};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec)+unite;});
    }
    ch(c1,"Puissance des émetteurs","p",1,40,0.5,1," kW");
    ch(c1,"Écart départ / retour","dt",5,30,1,0," K");
    var ct=E("div",{"class":"champ"});
    ct.appendChild(E("label",{},"Tube cuivre"));
    var vt=E("span",{"class":"v"},"");ct.appendChild(vt);
    var st=E("select",{},TUBES.map(function(x,i){
      return '<option value="'+i+'"'+(i===P.tube?" selected":"")+'>'+x[0]+
             " — intérieur "+x[1]+" mm</option>";}).join(""));
    st.addEventListener("change",function(){P.tube=+this.value;calc();});
    ct.appendChild(st);c1.appendChild(ct);
    maj.push(function(){vt.textContent=TUBES[P.tube][1]+" mm";});
    ch(c1,"Longueur droite","L",2,200,1,0," m");

    c2.appendChild(E("div",{style:"font-family:'Bricolage Grotesque',sans-serif;"+
      "font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;"+
      "color:var(--encre2);margin-bottom:4px"},"Singularités du circuit"));
    SINGU.forEach(function(s,i){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},s[0]));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var inp=E("input",{type:"range",min:0,max:20,step:1,value:P.n[i]});
      inp.addEventListener("input",function(){P.n[i]=parseFloat(this.value);calc();});
      c.appendChild(inp);c2.appendChild(c);
      maj.push(function(){
        v.textContent=P.n[i]+" × "+frs(s[1]*TUBES[P.tube][1],1)+" m";});
    });
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:16px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var dmm=TUBES[P.tube][1];
      var Q=debit(P.p,P.dt), v=vitesse(Q,dmm), j=lineique(Q,dmm);
      var Leq=0;
      SINGU.forEach(function(s,i){Leq+=P.n[i]*s[1]*dmm;});
      var Lt=P.L+Leq, dp=j*Lt;
      ETAT.k_reseau=Q>0?(dp/9810)/(Q*Q):2.5;
      ETAT.q_besoin=Q;
      var okv=v<=1.0, okj=j<=200;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Débit</b><span>"+frs(Q,2)+" m³/h</span></span>"+
        "<span><b>Vitesse</b><span>"+frs(v,2)+" m/s</span></span>"+
        "<span><b>Perte linéique</b><span>"+fr(j,0)+" Pa/m</span></span>"+
        "<span><b>Longueur équivalente</b><span>"+frs(Leq,1)+" m</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Longueur totale</b><span>"+frs(Lt,1)+" m</span></span>"+
        "<span><b>Perte de charge</b><span>"+fr(dp,0)+" Pa</span></span>"+
        "<span><b>soit</b><span>"+frs(dp/9810,2)+" mCE</span></span>"+
        "</div><p>"+
        (okv&&okj?"<b>Les deux critères sont tenus</b> : vitesse sous 1 m/s, perte "+
          "linéique sous 200 Pa/m."
         :"<b>"+(!okv&&!okj?"Les deux critères sont dépassés"
           :!okv?"La vitesse dépasse 1 m/s":"La perte linéique dépasse 200 Pa/m")+
          "</b> — bruit et consommation du circulateur. Prendre le tube au-dessus.")+
        " Les singularités valent <b>"+fr(100*Leq/Lt,0)+" %</b> de la longueur "+
        "totale : ce n'est jamais un détail.</p>";
      suivant("point-fonctionnement");
    }
    calc();
    OUTILS.pertes._recalc=calc;
  }
};

/* ─────────── 2. point de fonctionnement ─────────── */
var POMPES=[["Vitesse I",2.0,1.8],["Vitesse II",3.0,2.2],["Vitesse III",4.0,2.6]];
OUTILS["point-fonctionnement"]={
  titre:"Le point de fonctionnement",
  intro:"La courbe du réseau monte comme le carré du débit. Celle du circulateur "+
        "descend. Elles se croisent en un seul point, et c'est là que "+
        "l'installation travaille — qu'on le veuille ou non.",
  chaine:"la résistance du réseau vient des pertes de charge",
  monte:function(d){
    var P={k:2.5,besoin:0.52,auto:true};
    var W=680,H=380,X0=64,X1=640,Y0=24,Y1=310,QMAX=3,HMAX=5;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Point de fonctionnement d'un circulateur"});
    var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:18px;align-items:center;"+
      "margin-bottom:10px"});
    var maj=[];
    function ch(lab,cle,min,max,pas,dec,unite){
      var w=E("div",{style:"flex:1 1 230px"});
      var l=E("div",{style:"display:flex;justify-content:space-between;font-size:14.5px"});
      l.appendChild(E("span",{},lab));
      var v=E("span",{"class":"mono",style:"font-weight:600"},"");
      l.appendChild(v);w.appendChild(l);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle],
        style:"width:100%"});
      i.addEventListener("input",function(){
        P[cle]=parseFloat(this.value);if(cle==="k")P.auto=false;dessine();});
      w.appendChild(i);barre.appendChild(w);
      maj.push(function(){v.textContent=frs(P[cle],dec)+unite;});
    }
    ch("Résistance du réseau k","k",0.3,12,0.1,1,"");
    ch("Débit nécessaire","besoin",0.1,2,0.01,2," m³/h");
    d.appendChild(barre);d.appendChild(svg);
    var lect=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(lect);

    function px(q){return X0+q/QMAX*(X1-X0);}
    function py(h){return Y1-h/HMAX*(Y1-Y0);}

    function dessine(){
      if(P.auto&&ETAT.k_reseau)P.k=Math.max(0.3,Math.min(12,ETAT.k_reseau));
      if(ETAT.q_besoin)P.besoin=Math.max(0.1,Math.min(2,ETAT.q_besoin));
      maj.forEach(function(f){f();});
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var q,i;
      for(q=0;q<=QMAX;q+=0.5){
        svg.appendChild(S("line",{x1:px(q),y1:Y0,x2:px(q),y2:Y1,stroke:V("trait2"),
          "stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(q),y:Y1+18,"text-anchor":"middle",
          "class":"s-pet"},frs(q,1)));
      }
      for(i=0;i<=HMAX;i++){
        svg.appendChild(S("line",{x1:X0,y1:py(i),x2:X1,y2:py(i),stroke:V("trait2"),
          "stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-9,y:py(i)+4,"text-anchor":"end","class":"s-pet"},
          String(i)));
      }
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+40,"text-anchor":"middle",
        "class":"s-pet"},"débit Q  (m³/h)"));
      var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
        transform:"translate(18,"+((Y0+Y1)/2)+") rotate(-90)"});
      lab.textContent="hauteur manométrique  (mCE)";
      svg.appendChild(lab);

      /* les trois courbes de circulateur */
      var inter=[];
      POMPES.forEach(function(p,i2){
        var H0=p[1], qm=p[2], a=H0/(qm*qm), dd="",k2=0;
        for(q=0;q<=qm;q+=0.02){
          var h=H0-a*q*q;if(h<0)break;
          dd+=(k2++?"L":"M")+px(q).toFixed(1)+","+py(h).toFixed(1);
        }
        svg.appendChild(S("path",{d:dd,fill:"none",stroke:V("froid"),
          "stroke-width":"2","opacity":String(0.45+0.25*i2)}));
        var qi=Math.sqrt(H0/(P.k+a)), hi=P.k*qi*qi;
        inter.push([p[0],qi,hi]);
        svg.appendChild(S("text",{x:px(0)+9,y:py(H0)-7,"text-anchor":"start",
          "class":"s-pet",fill:V("froid")},p[0]));
      });

      /* la courbe du reseau */
      var dr="",k3=0;
      for(q=0;q<=QMAX;q+=0.02){
        var h2=P.k*q*q;if(h2>HMAX)break;
        dr+=(k3++?"L":"M")+px(q).toFixed(1)+","+py(h2).toFixed(1);
      }
      svg.appendChild(S("path",{d:dr,fill:"none",stroke:V("chaud"),"stroke-width":"3"}));
      svg.appendChild(S("text",{x:px(Math.sqrt(HMAX/P.k))+8,y:Y0+16,
        "class":"s-nom",fill:V("chaud")},"réseau  Δp = k Q²"));

      /* les trois points de fonctionnement */
      inter.forEach(function(x){
        svg.appendChild(S("circle",{cx:px(x[1]),cy:py(x[2]),r:"6",fill:V("encre")}));
      });

      /* le debit necessaire */
      svg.appendChild(S("line",{x1:px(P.besoin),y1:Y0,x2:px(P.besoin),y2:Y1,
        stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"6 4"}));
      svg.appendChild(S("text",{x:px(P.besoin)+8,y:Y1-8,"class":"s-nom",fill:V("vert")},
        "débit nécessaire"));
      svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
        stroke:V("trait"),"stroke-width":"1.5"}));

      var mieux=null;
      inter.forEach(function(x){if(!mieux||Math.abs(x[1]-P.besoin)<Math.abs(mieux[1]-P.besoin))mieux=x;});
      lect.innerHTML="<div class='gros'>"+inter.map(function(x){
        return "<span><b>"+x[0]+"</b><span>"+frs(x[1],2)+" m³/h</span></span>";
      }).join("")+"</div><p>Le débit nécessaire est de <b>"+frs(P.besoin,2)+
        " m³/h</b>. La vitesse la plus proche est <b>"+mieux[0].replace("Vitesse","vitesse")+
        "</b>, qui en donne "+frs(mieux[1],2)+
        (mieux[1]>P.besoin*1.15
         ? " — soit <b>"+fr(100*(mieux[1]/P.besoin-1),0)+" % de trop</b>. "+
           "Trop de débit, c'est du bruit, un ΔT écrasé et un circulateur qui "+
           "consomme pour rien : il faut brider au robinet ou changer de pompe."
         : ". L'écart reste acceptable.")+"</p>";
    }
    dessine();
    OUTILS["point-fonctionnement"]._recalc=dessine;
  }
};

/* ─────────── 3. eau chaude sanitaire ─────────── */
/* litres puises par heure, internat de 40 eleves — total 1 632 L par jour */
var PROFIL=[0,0,0,0,0,32,128,224,160,64,32,32,48,32,32,32,48,96,192,256,128,64,32,0];
OUTILS.emetteur={
  titre:"Ce qu'émet un radiateur selon le régime",
  intro:"La puissance de catalogue est donnée pour un écart de 50 K. Déplacez "+
        "le régime d'eau et regardez ce qu'il en reste.",
  monte:function(d){
    var P={pn:1680,td:70,tr:55,ta:20,n:1.3,besoin:4200};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Puissance de catalogue, à ΔT 50 K","pn",500,4000,20,0," W");
    ch(c1,"Départ d'eau","td",30,90,1,0," °C");
    ch(c1,"Retour d'eau","tr",20,80,1,0," °C");
    ch(c2,"Air du local","ta",15,24,1,0," °C");
    ch(c2,"Exposant n","n",1,1.4,0.05,2,"");
    ch(c2,"Besoin du local","besoin",500,10000,100,0," W");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=680,H=150,X0=40,X1=640,Y0=40;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Facteur d'émission selon le régime"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var tm=(P.td+P.tr)/2-P.ta;
      var ok=P.tr<P.td && tm>0;
      var f=ok?Math.pow(tm/50,P.n):0;
      var phi=P.pn*f;
      var nb=phi>0?Math.ceil(P.besoin/phi):0;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      /* jauge 0 - 120 % */
      var L=X1-X0;
      svg.appendChild(S("rect",{x:X0,y:Y0,width:L,height:30,rx:6,fill:V("froid"),opacity:"0.12",
        stroke:V("trait")}));
      var l=Math.min(1.2,f)/1.2*L;
      svg.appendChild(S("rect",{x:X0,y:Y0,width:l,height:30,rx:6,
        fill:V(f>=0.99?"chaud":f>=0.5?"vert":"froid"),opacity:"0.85"}));
      [0,0.25,0.5,0.75,1].forEach(function(t){
        var x=X0+t/1.2*L;
        svg.appendChild(S("line",{x1:x,y1:Y0+30,x2:x,y2:Y0+38,stroke:V("trait"),
          "stroke-width":"1.5"}));
        svg.appendChild(S("text",{x:x,y:Y0+56,"text-anchor":"middle","class":"s-pet"},
          fr(100*t,0)+" %"));
      });
      var xc=X0+1/1.2*L;
      svg.appendChild(S("text",{x:xc,y:Y0-12,"text-anchor":"middle","class":"s-nom"},
        "catalogue"));
      svg.appendChild(S("text",{x:X0,y:Y0+90,"class":"s-nom"},
        "puissance émise, en part de la valeur de catalogue"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Écart moyen ΔTm</b><span>"+(ok?frs(tm,1)+" K":"—")+"</span></span>"+
        "<span><b>Facteur</b><span>"+(ok?frs(f,2):"—")+"</span></span>"+
        "<span><b>Puissance émise</b><span>"+(ok?fr(phi,0)+" W":"—")+"</span></span>"+
        "<span><b>Émetteurs pour le besoin</b><span>"+(ok?String(nb):"—")+"</span></span>"+
        "</div><p>"+(!ok
        ? "<b>Le retour doit être plus froid que le départ</b>, et l'eau plus chaude "+
          "que le local : sinon rien n'est émis."
        : f>=0.99
        ? "On est au régime de catalogue ou au-dessus : le radiateur donne ce que "+
          "la fiche annonce."
        : "À ce régime, le radiateur n'émet que <b>"+fr(100*f,0)+" %</b> de sa "+
          "valeur de catalogue. Pour couvrir "+fr(P.besoin,0)+" W, il en faut <b>"+
          nb+"</b> — contre "+Math.ceil(P.besoin/P.pn)+" au régime de catalogue.")+
        "</p>";
    }
    calc();
  }
};

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
OUTILS.cop={
  titre:"Le COP selon les deux températures",
  intro:"Deux températures fixent le rectangle. Rapprochez-les, et regardez le COP "+
        "monter — c'est toute la raison du régime basse température.",
  monte:function(d){
    var P={te:-10,tc:40,eta:70,pabs:166};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Température d'évaporation","te",-25,10,1,0," °C");
    ch(c1,"Température de condensation","tc",25,65,1,0," °C");
    ch(c2,"Part de la limite de Carnot atteinte","eta",40,80,5,0," %");
    ch(c2,"Puissance du compresseur","pabs",100,5000,10,0," W");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=680,H=300,X0=48,X1=660,Y0=22,Y1=262;
    var HMIN=150,HMAX=450,PMIN=0.8,PMAX=25;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Cycle sur le diagramme enthalpique"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function px(h){return X0+(X1-X0)*(h-HMIN)/(HMAX-HMIN);}
    function py(p){return Y1-(Y1-Y0)*Math.log(p/PMIN)/Math.log(PMAX/PMIN);}

    function calc(){
      maj.forEach(function(f){f();});
      var ok=P.tc>P.te+5;
      var Tc=P.tc+273.15,Te=P.te+273.15;
      var carnot=Tc/(Tc-Te), cop=carnot*P.eta/100;
      var se=sat134(P.te), sc=sat134(P.tc);
      var h1=se.hv,h3=sc.hl,h2=(cop*h1-h3)/(cop-1);
      var phic=cop*P.pabs, phie=phic-P.pabs;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      /* grille legere */
      [1,2,5,10,20].forEach(function(p){
        svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait"),
          "stroke-width":"0.8",opacity:"0.5"}));
        svg.appendChild(S("text",{x:X0-6,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
          String(p)));
      });
      [200,300,400].forEach(function(h){
        svg.appendChild(S("line",{x1:px(h),y1:Y0,x2:px(h),y2:Y1,stroke:V("trait"),
          "stroke-width":"0.8",opacity:"0.5"}));
        svg.appendChild(S("text",{x:px(h),y:Y1+16,"text-anchor":"middle","class":"s-pet"},
          String(h)));
      });
      svg.appendChild(S("text",{x:X1,y:Y1+30,"text-anchor":"end","class":"s-pet"},"h en kJ/kg"));
      svg.appendChild(S("text",{x:X0,y:Y0-8,"class":"s-pet"},"p en bar"));
      /* cloche */
      var dl="",dv="";
      SAT134.forEach(function(r,i){
        dl+=(i?"L":"M")+px(r[2]).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
        dv+=(i?"L":"M")+px(r[3]).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
      });
      svg.appendChild(S("path",{d:dl,fill:"none",stroke:V("encre"),"stroke-width":"2"}));
      svg.appendChild(S("path",{d:dv,fill:"none",stroke:V("encre"),"stroke-width":"2"}));
      if(ok){
        var pts=[[h1,se.p],[h2,sc.p],[h3,sc.p],[h3,se.p]];
        var dc="";
        pts.forEach(function(q,i){dc+=(i?"L":"M")+px(q[0]).toFixed(1)+" "+py(q[1]).toFixed(1)+" ";});
        svg.appendChild(S("path",{d:dc+"Z",fill:V("chaud"),"fill-opacity":"0.08",
          stroke:V("chaud"),"stroke-width":"2.5"}));
        pts.forEach(function(q,i){
          svg.appendChild(S("circle",{cx:px(q[0]),cy:py(q[1]),r:9,fill:V("carte"),
            stroke:V("chaud"),"stroke-width":"2.5"}));
          svg.appendChild(S("text",{x:px(q[0]),y:py(q[1])+4,"text-anchor":"middle",
            "class":"s-pet",fill:V("chaud")},String(i+1)));
        });
      }
      res.innerHTML="<div class='gros'>"+
        "<span><b>Basse pression</b><span>"+(ok?frs(se.p,1)+" bar":"—")+"</span></span>"+
        "<span><b>Haute pression</b><span>"+(ok?frs(sc.p,1)+" bar":"—")+"</span></span>"+
        "<span><b>COP de Carnot</b><span>"+(ok?frs(carnot,1):"—")+"</span></span>"+
        "<span><b>COP de la machine</b><span>"+(ok?frs(cop,1):"—")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Chaleur livrée</b><span>"+(ok?fr(phic,0)+" W":"—")+"</span></span>"+
        "<span><b>Prise dehors, gratuite</b><span>"+(ok?fr(phie,0)+" W":"—")+"</span></span>"+
        "</div><p>"+(!ok
        ? "<b>La condensation doit être nettement plus chaude que l'évaporation</b> : "+
          "sinon la machine n'a rien à pomper."
        : "Pour "+fr(P.pabs,0)+" W payés au compresseur, la machine livre <b>"+
          fr(phic,0)+" W</b> au condenseur. Les "+fr(phie,0)+" W de différence viennent "+
          "de la source froide. Écart entre les sources : <b>"+fr(P.tc-P.te,0)+
          " K</b> — c'est lui qui fixe le COP.")+"</p>";
    }
    calc();
  }
};

OUTILS.ventilation={
  titre:"Ce que coûte l'air neuf d'un local",
  intro:"Comptez les occupants, choisissez le débit réglementaire, et regardez ce "+
        "que la ventilation coûte — puis ce qu'en récupèrent le double flux et la "+
        "régulation à la demande.",
  monte:function(d){
    var P={n:42,q:30,ti:19,te:-7,dju:2400,heures:2000,mini:12,eps:0};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Occupants","n",1,200,1,0,"");
    ch(c1,"Débit par personne","q",18,60,1,0," m³/h");
    ch(c1,"Température extérieure de base","te",-15,5,1,0," °C");
    ch(c1,"Consigne intérieure","ti",16,22,1,0," °C");
    ch(c2,"Degrés-jours du lieu","dju",800,4000,50,0," DJU");
    ch(c2,"Heures d'occupation par an","heures",0,8760,100,0," h");
    ch(c2,"Débit minimal, local vide","mini",0,100,1,0," %");
    ch(c2,"Efficacité du récupérateur","eps",0,95,5,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=680,H=190,X0=180,X1=640,Y0=24;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Énergie annuelle de chauffage de l'air neuf"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function calc(){
      maj.forEach(function(f){f();});
      var Q=P.n*P.q, dT=Math.max(0,P.ti-P.te);
      var phi=0.34*Q*dT;
      var Qmoy=(P.heures*Q+(8760-P.heures)*Q*P.mini/100)/8760;
      var E0=0.34*Q*24*P.dju/1000;           /* permanent, sans recuperation */
      var E1=0.34*Qmoy*24*P.dju/1000;        /* a la demande */
      var E2=E1*(1-P.eps/100);               /* plus recuperateur */
      var phiRec=phi*P.eps/100;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var lignes=[["ventilé en permanence",E0,"froid"],
                  ["à la demande",E1,"tiede"],
                  ["à la demande + récupérateur",E2,"chaud"]];
      var mx=Math.max(E0,1);
      lignes.forEach(function(l,i){
        var y=Y0+i*52, w=(X1-X0)*l[1]/mx;
        svg.appendChild(S("text",{x:X0-10,y:y+22,"text-anchor":"end","class":"s-pet"},l[0]));
        svg.appendChild(S("rect",{x:X0,y:y,width:Math.max(w,2),height:32,rx:5,
          fill:V(l[2]),opacity:"0.8"}));
        svg.appendChild(S("text",{x:X0+Math.max(w,2)+8,y:y+22,"class":"s-nom"},
          fr(l[1],0)+" kWh"));
      });
      res.innerHTML="<div class='gros'>"+
        "<span><b>Débit du local</b><span>"+fr(Q,0)+" m³/h</span></span>"+
        "<span><b>Puissance à la base</b><span>"+fr(phi,0)+" W</span></span>"+
        "<span><b>Récupéré</b><span>"+fr(phiRec,0)+" W</span></span>"+
        "<span><b>Reste à chauffer</b><span>"+fr(phi-phiRec,0)+" W</span></span>"+
        "</div><p>"+(P.eps===0&&P.heures>=8760
        ? "Ventilé en permanence, sans récupération : c'est le cas de référence. "+
          "Baissez les heures d'occupation, puis montez l'efficacité du récupérateur."
        : "Par rapport au cas permanent sans récupération, cette configuration "+
          "divise l'énergie de l'air neuf par <b>"+frs(E0/Math.max(E2,1),1)+
          "</b>. Les deux leviers se multiplient : chacun retire sa part de ce qui reste.")+
        "</p>";
    }
    calc();
  }
};

OUTILS.evolution={
  titre:"Une évolution sur le diagramme, et son bilan",
  intro:"Partez d'un air, choisissez l'organe qu'il traverse, et lisez ce qu'il "+
        "coûte : la puissance vient toujours de la différence d'enthalpie.",
  monte:function(d){
    var P={t1:-7,hr1:90,Q:1260,type:"chauffe",t2:19,hr2:40,tb:19,hrb:40,part:70};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
      return c;
    }
    ch(c1,"Air d'entrée — température","t1",-15,40,0.5,1," °C");
    ch(c1,"Air d'entrée — humidité relative","hr1",5,100,1,0," %");
    ch(c1,"Débit","Q",100,10000,20,0," m³/h");
    var sel=E("div",{"class":"champ"});
    sel.appendChild(E("label",{},"L'organe traversé"));
    var s=E("select",{style:"width:100%;font:inherit;padding:8px;border-radius:8px;"+
      "border:1px solid var(--trait);background:var(--carte);color:var(--encre)"});
    [["chauffe","batterie chaude — vers une température"],
     ["froid","batterie froide — vers une température, condense sous la rosée"],
     ["vapeur","humidificateur vapeur — vers une humidité relative"],
     ["adiab","humidificateur adiabatique — vers une humidité relative"],
     ["melange","mélange avec un second air"]].forEach(function(o){
      s.appendChild(E("option",{value:o[0]},o[1]));});
    s.value=P.type;
    s.addEventListener("change",function(){P.type=this.value;calc();});
    sel.appendChild(s);c2.appendChild(sel);
    var cT=ch(c2,"Température visée","t2",-10,45,0.5,1," °C");
    var cH=ch(c2,"Humidité relative visée","hr2",5,100,1,0," %");
    var cB1=ch(c2,"Second air — température","tb",-15,40,0.5,1," °C");
    var cB2=ch(c2,"Second air — humidité relative","hrb",5,100,1,0," %");
    var cB3=ch(c2,"Part du second air, en masse","part",0,100,5,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=720,H=400,X0=56,X1=690,Y0=20,Y1=340,TMIN=-15,TMAX=45,RMAX=25;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Évolution sur le diagramme"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
    function py(r){return Y1-Math.min(r,RMAX)/RMAX*(Y1-Y0);}
    function rDeH(h,t){return (h-1.006*t)/(2.501+0.00183*t);}

    function calc(){
      maj.forEach(function(f){f();});
      cT.style.display=(P.type==="chauffe"||P.type==="froid")?"":"none";
      cH.style.display=(P.type==="vapeur"||P.type==="adiab")?"":"none";
      [cB1,cB2,cB3].forEach(function(c){c.style.display=P.type==="melange"?"":"none";});
      var r1=rDe(P.t1,P.hr1), h1=enth(P.t1,r1), v=volSpec(P.t1,r1);
      var qm=P.Q/3600/v;
      var t2,r2,chemin=[],note="";
      if(P.type==="chauffe"){t2=Math.max(P.t2,P.t1);r2=r1;chemin=[[P.t1,r1],[t2,r2]];
        note="Chauffer ne change pas r : le point glisse vers la droite.";}
      else if(P.type==="froid"){
        t2=Math.min(P.t2,P.t1);var tr=rosee(P.t1,P.hr1);
        if(t2>=tr){r2=r1;chemin=[[P.t1,r1],[t2,r2]];note="Au-dessus de la rosée, "+
          "l'air se refroidit sans condenser : r ne change pas.";}
        else{r2=rDe(t2,100);chemin=[[P.t1,r1],[tr,r1]];
          for(var t=tr;t>t2;t-=0.5)chemin.push([t,rDe(t,100)]);chemin.push([t2,r2]);
          note="Passé la rosée, "+frs(tr,1)+" °C, l'air suit la courbe de saturation : "+
          "l'eau condense sur la batterie — "+frs((r1-r2)*qm*3.6,1)+" kg par heure.";}
      }
      else if(P.type==="vapeur"){t2=P.t1;r2=Math.max(r1,rDe(P.t1,P.hr2));chemin=[[P.t1,r1],[t2,r2]];
        note="La vapeur ajoute de l'eau à température presque constante : verticale. "+
          "Eau à vaporiser : "+frs((r2-r1)*qm*3.6,1)+" kg par heure.";}
      else if(P.type==="adiab"){
        var h=h1;t2=P.t1;
        for(var tt=P.t1;tt>-15;tt-=0.1){var rr=rDeH(h,tt);if(hrDe(tt,rr)>=P.hr2){t2=tt;break;}t2=tt;}
        r2=rDeH(h,t2);chemin=[[P.t1,r1],[t2,r2]];
        note="L'eau s'évapore en prenant sa chaleur à l'air : h constante, l'air se "+
          "refroidit de "+frs(P.t1-t2,1)+" K. Il faudra le réchauffer ensuite.";}
      else{
        var rb=rDe(P.tb,P.hrb),x=P.part/100;
        t2=(1-x)*P.t1+x*P.tb;r2=(1-x)*r1+x*rb;chemin=[[P.t1,r1],[P.tb,rb]];
        note="Le mélange est sur le segment entre les deux airs, à "+fr(P.part,0)+
          " % du chemin vers le second. r et h se moyennent en masse.";}
      var h2=enth(t2,r2), dh=h2-h1, Pw=qm*dh;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var tg=TMIN;tg<=TMAX;tg+=5){
        svg.appendChild(S("line",{x1:px(tg),y1:Y0,x2:px(tg),y2:Y1,stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(tg),y:Y1+16,"text-anchor":"middle","class":"s-pet"},String(tg)));}
      for(var rg=0;rg<=RMAX;rg+=5){
        svg.appendChild(S("line",{x1:X0,y1:py(rg),x2:X1,y2:py(rg),stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:X1+6,y:py(rg)+4,"class":"s-pet"},String(rg)));}
      [20,40,60,80,100].forEach(function(hr){
        var dd="",k=0;
        for(var t=TMIN;t<=TMAX;t+=0.5){var rr=rDe(t,hr);if(rr>RMAX)break;
          dd+=(k++?"L":"M")+px(t).toFixed(1)+","+py(rr).toFixed(1);}
        svg.appendChild(S("path",{d:dd,fill:"none",stroke:V(hr===100?"froid":"trait"),
          "stroke-width":hr===100?"2.5":"1","stroke-dasharray":hr===100?"":"3 4"}));});
      var dc="";chemin.forEach(function(q,i){dc+=(i?"L":"M")+px(q[0]).toFixed(1)+","+py(q[1]).toFixed(1);});
      svg.appendChild(S("path",{d:dc,fill:"none",stroke:V(P.type==="melange"?"trait":"chaud"),
        "stroke-width":"3","stroke-dasharray":P.type==="melange"?"6 4":""}));
      var pts=[[P.t1,r1,"1"],[t2,r2,"2"]];
      if(P.type==="melange")pts.push([P.tb,rDe(P.tb,P.hrb),"B"]);
      pts.forEach(function(q){
        svg.appendChild(S("circle",{cx:px(q[0]),cy:py(q[1]),r:9,fill:V("carte"),stroke:V("chaud"),"stroke-width":"2.5"}));
        svg.appendChild(S("text",{x:px(q[0]),y:py(q[1])+4,"text-anchor":"middle","class":"s-pet",fill:V("chaud")},q[2]));});
      svg.appendChild(S("text",{x:X0,y:Y1+36,"class":"s-pet"},"θ en °C — r en g/kg à droite"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Air d'entrée</b><span>"+frs(r1,1)+" g/kg · "+frs(h1,1)+" kJ/kg</span></span>"+
        "<span><b>Air de sortie</b><span>"+frs(t2,1)+" °C · "+fr(hrDe(t2,r2),0)+" % · "+frs(r2,1)+" g/kg · "+frs(h2,1)+" kJ/kg</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Débit massique</b><span>"+frs(qm,3)+" kg/s</span></span>"+
        "<span><b>Δh</b><span>"+frs(dh,1)+" kJ/kg</span></span>"+
        "<span><b>Puissance</b><span>"+(Math.abs(Pw)<0.05?"—":frs(Math.abs(Pw),2)+" kW "+(Pw>0?"fournis":"retirés"))+"</span></span>"+
        "</div><p>"+note+"</p>";
    }
    calc();
  }
};

OUTILS.regulation={
  titre:"Tout ou rien ou proportionnel — la température d'un local",
  intro:"Un local, un chauffage, un régulateur. Changez le différentiel ou la bande "+
        "proportionnelle, et regardez la température : c'est le compromis de tout réglage.",
  monte:function(d){
    var P={mode:"tor",cons:20,diff:1,xp:2,text:0,P:9};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
      return c;
    }
    var sel=E("div",{"class":"champ"});
    sel.appendChild(E("label",{},"Le régulateur"));
    var s=E("select",{style:"width:100%;font:inherit;padding:8px;border-radius:8px;"+
      "border:1px solid var(--trait);background:var(--carte);color:var(--encre)"});
    [["tor","tout ou rien, avec différentiel"],["p","proportionnel, bande Xp"]].forEach(function(o){
      s.appendChild(E("option",{value:o[0]},o[1]));});
    s.addEventListener("change",function(){P.mode=this.value;calc();});
    sel.appendChild(s);c1.appendChild(sel);
    ch(c1,"Consigne","cons",16,24,0.5,1," °C");
    var cD=ch(c1,"Différentiel","diff",0.2,4,0.2,1," K");
    var cX=ch(c1,"Bande proportionnelle Xp","xp",0.5,8,0.5,1," K");
    ch(c2,"Température extérieure","text",-10,15,1,0," °C");
    ch(c2,"Puissance du chauffage","P",3,15,0.5,1," kW");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=720,H=300,X0=50,X1=690,Y0=20,Y1=230;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Température du local au fil du temps"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function calc(){
      maj.forEach(function(f){f();});
      cD.style.display=P.mode==="tor"?"":"none";cX.style.display=P.mode==="p"?"":"none";
      var T=P.cons-3,C=0.8,G=0.25,u=0,pas=0.5,comm=0,prev=null,mn=99,mx=-99,pts=[],tmax=180;
      for(var t=0;t<=tmax;t+=pas){
        if(P.mode==="tor"){if(T<P.cons-P.diff/2)u=1;else if(T>P.cons+P.diff/2)u=0;}
        else u=Math.min(1,Math.max(0,(P.cons+P.xp/2-T)/P.xp));
        if(prev!==null&&u!==prev&&t>60)comm++;prev=u;
        if(t>60){mn=Math.min(mn,T);mx=Math.max(mx,T);}
        pts.push([t,T,u]);
        T+=(P.P*u-G*(T-P.text))/C*(pas/60);
      }
      var TMIN=P.cons-4,TMAX=P.cons+3;
      function px(t){return X0+(X1-X0)*t/tmax;}
      function py(T){return Y1-(Y1-Y0)*(Math.min(Math.max(T,TMIN),TMAX)-TMIN)/(TMAX-TMIN);}
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var k=Math.ceil(TMIN);k<=TMAX;k++){
        svg.appendChild(S("line",{x1:X0,y1:py(k),x2:X1,y2:py(k),stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-6,y:py(k)+4,"text-anchor":"end","class":"s-pet"},k+" °C"));}
      for(var m=0;m<=tmax;m+=30){
        svg.appendChild(S("text",{x:px(m),y:Y1+16,"text-anchor":"middle","class":"s-pet"},m+" min"));}
      svg.appendChild(S("line",{x1:X0,y1:py(P.cons),x2:X1,y2:py(P.cons),stroke:V("encre2"),
        "stroke-width":"1.5","stroke-dasharray":"5 4"}));
      var dd="";pts.forEach(function(q,i){dd+=(i?"L":"M")+px(q[0]).toFixed(1)+","+py(q[1]).toFixed(1);});
      svg.appendChild(S("path",{d:dd,fill:"none",stroke:V("chaud"),"stroke-width":"2.5"}));
      pts.forEach(function(q){if(q[2]>0.5)svg.appendChild(S("line",{x1:px(q[0]),y1:Y1+28,x2:px(q[0]),y2:Y1+40,
        stroke:V("chaud"),"stroke-width":"2",opacity:String(0.3+0.7*q[2])}));});
      svg.appendChild(S("text",{x:X1,y:Y1+52,"text-anchor":"end","class":"s-pet"},"chauffage en marche, ou son taux"));
      var ecart=P.cons-(mn+mx)/2;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Température établie</b><span>"+frs(mn,1)+" à "+frs(mx,1)+" °C</span></span>"+
        "<span><b>Amplitude</b><span>"+frs(mx-mn,1)+" K</span></span>"+
        (P.mode==="tor"?"<span><b>Commutations par heure</b><span>"+fr(comm/2,0)+"</span></span>"
                       :"<span><b>Erreur statique</b><span>"+frs(ecart,1)+" K</span></span>")+
        "</div><p>"+(P.mode==="tor"
        ? "Deux seuils à "+frs(P.cons-P.diff/2,1)+" et "+frs(P.cons+P.diff/2,1)+" °C. Un différentiel "+
          "étroit tient la température, mais use le contacteur ; un brûleur ne doit pas démarrer plus de "+
          "six fois par heure."
        : "La commande est proportionnelle à l'écart, sur "+frs(P.xp,1)+" K. Elle a besoin d'un écart "+
          "pour exister : la température se stabilise sous la consigne. C'est l'erreur statique, que "+
          "l'action intégrale rattrape.")+"</p>";
    }
    calc();
  }
};

OUTILS["loi-eau"]={
  titre:"La loi d'eau — pente, parallèle, et ce que demande vraiment le radiateur",
  intro:"La courbe exacte vient de l'émission du radiateur ; la droite est ce que "+
        "règle l'automate. Déplacez la température extérieure, puis la pente et le parallèle.",
  monte:function(d){
    var P={te:5,base:-5,tdep:70,tret:55,cons:19,pente:2.1,par:0,n:1.3,amb:19};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Température extérieure du moment","te",-15,20,0.5,1," °C");
    ch(c1,"Température extérieure de base","base",-15,0,1,0," °C");
    ch(c1,"Régime à la base — départ","tdep",40,90,1,0," °C");
    ch(c1,"Régime à la base — retour","tret",30,75,1,0," °C");
    ch(c2,"Pente réglée sur l'automate","pente",0.5,4,0.1,1,"");
    ch(c2,"Parallèle réglé","par",-10,15,1,0," K");
    ch(c2,"Exposant de l'émetteur n","n",1,1.4,0.05,2,"");
    ch(c2,"Local témoin — température mesurée","amb",15,23,0.5,1," °C");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=720,H=330,X0=60,X1=690,Y0=20,Y1=270,TEMIN=-15,TEMAX=20,TDMIN=15,TDMAX=90;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Courbe de chauffe"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function exact(te){
      var f=Math.max(0,(P.cons-te)/(P.cons-P.base));
      var dtmb=(P.tdep+P.tret)/2-P.cons;
      return P.cons+dtmb*Math.pow(f,1/P.n)+(P.tdep-P.tret)/2*f;
    }
    function lin(te){return P.cons+P.pente*(P.cons-te)+P.par;}
    function px(te){return X0+(X1-X0)*(te-TEMIN)/(TEMAX-TEMIN);}
    function py(T){return Y1-(Y1-Y0)*(Math.min(Math.max(T,TDMIN),TDMAX)-TDMIN)/(TDMAX-TDMIN);}
    function calc(){
      maj.forEach(function(f){f();});
      if(P.tret>=P.tdep)P.tret=P.tdep-5;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var T=20;T<=90;T+=10){
        svg.appendChild(S("line",{x1:X0,y1:py(T),x2:X1,y2:py(T),stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-6,y:py(T)+4,"text-anchor":"end","class":"s-pet"},T+" °C"));}
      for(var te=-15;te<=20;te+=5){
        svg.appendChild(S("line",{x1:px(te),y1:Y0,x2:px(te),y2:Y1,stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(te),y:Y1+16,"text-anchor":"middle","class":"s-pet"},te+" °C"));}
      svg.appendChild(S("text",{x:X1,y:Y1+32,"text-anchor":"end","class":"s-pet"},"température extérieure → température de départ"));
      var de="",dl="";
      for(var t=TEMIN,k=0;t<=TEMAX;t+=0.5,k++){
        de+=(k?"L":"M")+px(t).toFixed(1)+","+py(exact(t)).toFixed(1);
        dl+=(k?"L":"M")+px(t).toFixed(1)+","+py(Math.max(P.cons,lin(t))).toFixed(1);}
      svg.appendChild(S("path",{d:de,fill:"none",stroke:V("chaud"),"stroke-width":"3"}));
      svg.appendChild(S("path",{d:dl,fill:"none",stroke:V("froid"),"stroke-width":"2.5","stroke-dasharray":"7 4"}));
      var tx=exact(P.te),tl=Math.max(P.cons,lin(P.te));
      svg.appendChild(S("line",{x1:px(P.te),y1:Y0,x2:px(P.te),y2:Y1,stroke:V("encre2"),"stroke-width":"1","stroke-dasharray":"4 4"}));
      svg.appendChild(S("circle",{cx:px(P.te),cy:py(tx),r:7,fill:V("chaud")}));
      svg.appendChild(S("circle",{cx:px(P.te),cy:py(tl),r:7,fill:V("carte"),stroke:V("froid"),"stroke-width":"2.5"}));
      svg.appendChild(S("text",{x:X0+8,y:Y0+14,"class":"s-nom",fill:V("chaud")},"exacte, d'après l'émetteur"));
      svg.appendChild(S("text",{x:X0+8,y:Y0+32,"class":"s-nom",fill:V("froid")},"droite réglée : pente et parallèle"));
      var corr=3*(P.cons-P.amb);
      res.innerHTML="<div class='gros'>"+
        "<span><b>Départ nécessaire</b><span>"+frs(tx,1)+" °C</span></span>"+
        "<span><b>Départ réglé</b><span>"+frs(tl,1)+" °C</span></span>"+
        "<span><b>Écart</b><span>"+frs(tl-tx,1)+" K</span></span>"+
        "<span><b>Avec influence d'ambiance, k = 3</b><span>"+frs(tl+corr,1)+" °C</span></span>"+
        "</div><p>"+(Math.abs(tl-tx)<1.5
        ? "La droite colle à la courbe à cette température : le réglage est bon ici."
        : tl>tx ? "La droite donne <b>"+frs(tl-tx,1)+" K de trop</b> : la chaudière condense moins, les "+
                  "robinets thermostatiques rattrapent en fermant."
                : "La droite donne <b>"+frs(tx-tl,1)+" K de moins</b> que ce que demande le radiateur : "+
                  "le local ne tient pas sa consigne à cette température extérieure.")+
        (Math.abs(corr)>0.1?" Le local témoin à "+frs(P.amb,1)+" °C corrige le départ de "+frs(corr,1)+" K.":"")+
        "</p>";
    }
    calc();
  }
};

OUTILS.points={
  titre:"Compter les points, choisir les modules",
  intro:"Cochez les points de l'installation. L'outil les compte par nature, ajoute la "+
        "réserve, et propose les modules — puis vérifie qu'aucun point ne reste sans borne.",
  monte:function(d){
    var LISTE=[["Marche / arrêt ventilateur soufflage","DO"],["Vitesse ventilateur soufflage","AO"],
      ["Marche / arrêt ventilateur extraction","DO"],["Vitesse ventilateur extraction","AO"],
      ["Défaut ventilateur soufflage","DI"],["Défaut ventilateur extraction","DI"],
      ["Température de soufflage","AI"],["Température d'air neuf","AI"],["Température de reprise","AI"],
      ["CO₂ de la salle","AI"],["Commande batterie électrique","AO"],["Filtre soufflage encrassé","DI"],
      ["Filtre extraction encrassé","DI"],["Registre air neuf, commande","DO"],["Registre air neuf, retour d'état","DI"],
      ["Thermostat antigel","DI"],["Bipasse récupérateur, commande","DO"],["Compteur électrique, impulsions","DI"],
      ["Humidité de reprise","AI"],["Commande humidificateur","AO"],["Pression réseau de soufflage","AI"],
      ["V3V batterie eau chaude","AO"],["Circulateur batterie, marche","DO"],["Pressostat antigel eau","DI"]];
    var CAT={UC:{nom:"UC-16 — 8 UI, 4 DO, 4 AO",UI:8,DO:4,AO:4,prix:900},
             DI:{nom:"EXT-8DI",n:8,prix:180},UI:{nom:"EXT-8UI",n:8,prix:320},
             DO:{nom:"EXT-8DO",n:8,prix:220},AO:{nom:"EXT-4AO",n:4,prix:260}};
    var P={res:20,coches:LISTE.map(function(l,i){return i<18;})};
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var liste=E("div",{style:"columns:2;column-gap:18px;font-size:14.5px"});
    LISTE.forEach(function(l,i){
      var lab=E("label",{style:"display:block;padding:3px 0;break-inside:avoid;cursor:pointer"});
      var cb=E("input",{type:"checkbox"});cb.checked=P.coches[i];
      cb.addEventListener("change",function(){P.coches[i]=this.checked;calc();});
      lab.appendChild(cb);lab.appendChild(document.createTextNode(" "+l[0]+" "));
      lab.appendChild(E("span",{"class":"mono",style:"opacity:.7"},l[1]));
      liste.appendChild(lab);});
    d.appendChild(liste);
    var c=E("div",{"class":"champ",style:"margin-top:10px"});
    c.appendChild(E("label",{},"Réserve"));
    var v=E("span",{"class":"v"},"");c.appendChild(v);
    var i=E("input",{type:"range",min:0,max:50,step:5,value:P.res});
    i.addEventListener("input",function(){P.res=parseFloat(this.value);calc();});
    c.appendChild(i);d.appendChild(c);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function calc(){
      v.textContent=fr(P.res,0)+" %";
      var n={DI:0,AI:0,DO:0,AO:0};
      LISTE.forEach(function(l,i){if(P.coches[i])n[l[1]]++;});
      var r={};for(var k in n)r[k]=Math.ceil(n[k]*(1+P.res/100));
      /* UC : 8 UI pour AI puis DI, 4 DO, 4 AO ; puis extensions */
      var ui=CAT.UC.UI, restAI=Math.max(0,r.AI-ui), uiRest=Math.max(0,ui-r.AI);
      var restDI=Math.max(0,r.DI-uiRest);
      var restDO=Math.max(0,r.DO-CAT.UC.DO), restAO=Math.max(0,r.AO-CAT.UC.AO);
      var mods=[[CAT.UC.nom,1,CAT.UC.prix]];
      var nUI=Math.ceil(restAI/8), nDI=Math.ceil(Math.max(0,restDI-Math.max(0,nUI*8-restAI))/8);
      var nDO=Math.ceil(restDO/8), nAO=Math.ceil(restAO/4);
      if(nUI)mods.push([CAT.UI.nom,nUI,CAT.UI.prix*nUI]);
      if(nDI)mods.push([CAT.DI.nom,nDI,CAT.DI.prix*nDI]);
      if(nDO)mods.push([CAT.DO.nom,nDO,CAT.DO.prix*nDO]);
      if(nAO)mods.push([CAT.AO.nom,nAO,CAT.AO.prix*nAO]);
      var total=0;mods.forEach(function(m){total+=m[2];});
      var tot=n.DI+n.AI+n.DO+n.AO;
      res.innerHTML="<div class='gros'>"+
        "<span><b>DI</b><span>"+n.DI+" → "+r.DI+"</span></span>"+
        "<span><b>AI</b><span>"+n.AI+" → "+r.AI+"</span></span>"+
        "<span><b>DO</b><span>"+n.DO+" → "+r.DO+"</span></span>"+
        "<span><b>AO</b><span>"+n.AO+" → "+r.AO+"</span></span>"+
        "<span><b>Total</b><span>"+tot+" points</span></span>"+
        "</div><table style='margin-top:10px;width:100%;font-size:14.5px'><tr><th style='text-align:left'>Module</th><th>Qté</th><th style='text-align:right'>€ HT</th></tr>"+
        mods.map(function(m){return "<tr><td>"+m[0]+"</td><td style='text-align:center'>"+m[1]+"</td><td style='text-align:right'>"+fr(m[2],0)+"</td></tr>";}).join("")+
        "<tr><td><b>Total</b></td><td></td><td style='text-align:right'><b>"+fr(total,0)+"</b></td></tr></table>"+
        "<p>Les entrées universelles de l'unité centrale prennent d'abord les AI, puis les DI qui restent. "+
        "Chaque nature est couverte avec sa réserve : aucun point sans borne.</p>";
    }
    calc();
  }
};

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

SCHEMAS["sous-station-ecs"]=function(el){
  var W=1060,H=480;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Sous-station de chauffage urbain avec ballon primaire et "+
                 "production d'eau chaude sanitaire instantanée"});
  var grp={};SS_RESEAUX.forEach(function(r){grp[r.k]=[];});
  var actif=null;

  function add(e,k){svg.appendChild(e);if(k)grp[k].push(e);return e;}
  function tube(x1,y1,x2,y2,k,coul,ep){
    return add(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul||"encre2"),
      "stroke-width":ep||3.5,"stroke-linecap":"round"}),k);
  }
  function nom(x,y,t,anc,coul,cls){
    return add(S("text",{x:x,y:y,"text-anchor":anc||"start",
      "class":cls||"s-nom",fill:V(coul||"encre2")},t));
  }
  function bulle(x,y,t,k,coul){
    add(S("circle",{cx:x,cy:y,r:"13",fill:V("carte"),stroke:V(coul||"encre2"),
      "stroke-width":"1.5"}),k);
    add(S("text",{x:x,y:y+4,"text-anchor":"middle","class":"s-rep",
      fill:V(coul||"encre2")},t),k);
  }
  function pompe(x,y,k,coul,sens){
    add(S("circle",{cx:x,cy:y,r:"14",fill:V("carte"),stroke:V(coul),
      "stroke-width":"2.5"}),k);
    var d=(sens==="haut")
      ? "M "+(x-7)+" "+(y+5)+" L "+x+" "+(y-8)+" L "+(x+7)+" "+(y+5)+" Z"
      : "M "+(x-5)+" "+(y-7)+" L "+(x+8)+" "+y+" L "+(x-5)+" "+(y+7)+" Z";
    add(S("path",{d:d,fill:V(coul)}),k);
  }
  function vanne(x,y,k,coul,troisvoies){
    add(S("path",{d:"M "+(x-11)+" "+(y-9)+" L "+(x-11)+" "+(y+9)+" L "+(x+11)+" "+
      (y-9)+" L "+(x+11)+" "+(y+9)+" Z",fill:V("carte"),stroke:V(coul),
      "stroke-width":"2.5"}),k);
    if(troisvoies)add(S("path",{d:"M "+(x-9)+" "+(y+13)+" L "+(x+9)+" "+(y+13)+
      " L "+x+" "+(y+2)+" Z",fill:V("carte"),stroke:V(coul),"stroke-width":"2.5"}),k);
    add(S("rect",{x:x-7,y:y-24,width:14,height:11,rx:2,fill:V("carte"),
      stroke:V(coul),"stroke-width":"2"}),k);
  }
  function echangeur(x,y,k1,k2,titre){
    add(S("rect",{x:x-19,y:y-52,width:38,height:104,rx:3,fill:V("carte"),
      stroke:V("encre2"),"stroke-width":"2.5"}));
    for(var i=0;i<5;i++)add(S("line",{x1:x-13+i*6.5,y1:y-45,x2:x-13+i*6.5,y2:y+45,
      stroke:V("encre2"),"stroke-width":"1.5"}));
    nom(x,y+96,titre,"middle");
  }

  var YD=250, YR=345;                 /* collecteurs depart et retour */
  var XE=150;                         /* echangeur de la sous-station */

  /* ---------- 1 · le primaire, reseau de chaleur urbain ---------- */
  tube(18,YD,XE-19,YD,"urbain","chaud");
  tube(XE-19,YR,18,YR,"urbain","chaud");
  add(S("path",{d:"M 30 "+(YD-9)+" L 46 "+YD+" L 30 "+(YD+9)+" Z",
    fill:V("chaud")}),"urbain");
  add(S("path",{d:"M 46 "+(YR-9)+" L 30 "+YR+" L 46 "+(YR+9)+" Z",
    fill:V("chaud")}),"urbain");
  nom(18,YD-42,"ARRIVÉE RÉSEAU","start","chaud","s-tit");
  nom(18,YD-24,"moins de 110 °C","start","chaud");
  nom(18,YR+30,"retour réseau","start","chaud");
  bulle(96,YD,"T11","urbain","chaud");
  bulle(96,YR,"T12","urbain","chaud");
  vanne(126,YR,"urbain","chaud",false);
  nom(126,YR+30,"V11","middle","chaud");
  echangeur(XE,(YD+YR)/2,null,null,"échangeur");

  /* ---------- les collecteurs, communs ---------- */
  add(S("rect",{x:XE+19,y:YD-9,width:400,height:18,rx:9,fill:V("carte2"),
    stroke:V("trait"),"stroke-width":"2"}));
  add(S("rect",{x:XE+19,y:YR-9,width:400,height:18,rx:9,fill:V("carte2"),
    stroke:V("trait"),"stroke-width":"2"}));
  nom(XE+30,YD-20,"collecteur départ  70 °C");
  nom(XE+150,YR+26,"collecteur retour");
  bulle(XE+40,YD-58,"T13");
  tube(XE+40,YD-45,XE+40,YD-9,null,"trait2",2);

  /* ---------- 2 · le chauffage du batiment ---------- */
  var XC=300, XCR=430;
  tube(XC,YD-9,XC,205,"chauffage","tiede");
  vanne(XC,190,"chauffage","tiede",true);
  tube(XC,178,XC,148,"chauffage","tiede");
  pompe(XC,134,"chauffage","tiede","haut");
  tube(XC,120,XC,86,"chauffage","tiede");
  bulle(XC,74,"T21","chauffage","tiede");
  tube(XC,62,XC,44,"chauffage","tiede");
  tube(XC,44,XCR,44,"chauffage","tiede");
  add(S("rect",{x:XC+22,y:24,width:86,height:40,rx:3,fill:V("carte"),
    stroke:V("tiede"),"stroke-width":"2.5"}),"chauffage");
  for(var i=0;i<4;i++)add(S("line",{x1:XC+32+i*22,y1:29,x2:XC+32+i*22,y2:59,
    stroke:V("tiede"),"stroke-width":"1.5"}),"chauffage");
  nom(XC+65,80,"émetteurs","middle","tiede");
  tube(XCR,44,XCR,YR-9,"chauffage","tiede");
  tube(XCR,190,XC+11,190,"chauffage","tiede");
  nom(XC-22,196,"V21","end","tiede");
  nom(XC-22,140,"P21","end","tiede");
  nom(XCR+12,320,"retour chauffage","start","tiede");

  /* ---------- 3 · la charge du ballon primaire ---------- */
  var XB=620, XB2=706, YB1=196, YB2=372;
  tube(500,YD+9,500,300,"charge","vert");
  tube(500,300,568,300,"charge","vert");
  pompe(582,300,"charge","vert");
  tube(596,300,XB,300,"charge","vert");
  nom(582,332,"P22","middle","vert");
  add(S("rect",{x:XB,y:YB1,width:XB2-XB,height:YB2-YB1,rx:12,fill:V("carte"),
    stroke:V("encre2"),"stroke-width":"2.5"}));
  nom((XB+XB2)/2,YB1-14,"BALLON PRIMAIRE","middle","encre2","s-tit");
  bulle((XB+XB2)/2,YB1+34,"T22");
  bulle((XB+XB2)/2,YB2-34,"T23");
  nom((XB+XB2)/2,288,"eau de","middle");
  nom((XB+XB2)/2,304,"chauffage","middle");
  tube(XB,YB2-24,569,YB2-24,"charge","vert");

  /* ---------- 4 · le primaire de production ECS ---------- */
  var XV=770, XE2=880;
  tube(XB2,232,XV,232,"primecs","violet");
  vanne(XV,232,"primecs","violet",true);
  nom(XV,200,"V22","middle","violet");
  tube(XV,245,XV,288,"primecs","violet");
  pompe(XV,302,"primecs","violet");
  nom(XV-34,308,"P23","end","violet");
  tube(XV,316,XV,338,"primecs","violet");
  tube(XV,338,XE2-19,338,"primecs","violet");
  echangeur(XE2,296,null,null,"échangeur ECS");
  tube(XE2-19,254,XV+40,254,"primecs","violet");
  tube(XV+40,254,XV+40,398,"primecs","violet");
  tube(XV+40,398,XB2-20,398,"primecs","violet");
  tube(XB2-20,398,XB2-20,YB2,"primecs","violet");

  /* ---------- 5 · les reseaux sanitaires ---------- */
  var XS=960;
  tube(XE2+19,254,W-30,254,"sanitaire","froid");
  add(S("path",{d:"M "+(W-46)+" 245 L "+(W-26)+" 254 L "+(W-46)+" 263 Z",
    fill:V("froid")}),"sanitaire");
  nom(W-30,230,"distribution ECS 60 °C","end","froid");
  bulle(XS-20,288,"T24","sanitaire","froid");
  tube(XS-20,275,XS-20,254,"sanitaire","froid",2);

  tube(XE2+19,338,XS,338,"sanitaire","froid");
  tube(XS,338,XS,430,"sanitaire","froid");
  tube(XS,430,W-20,430,"sanitaire","froid");
  add(S("path",{d:"M "+(W-40)+" 421 L "+(W-58)+" 430 L "+(W-40)+" 439 Z",
    fill:V("froid")}),"sanitaire");
  nom(W-20,456,"arrivée d'eau froide 10 °C","end","froid");
  tube(XS,390,W-20,390,"sanitaire","froid");
  pompe(XS+42,390,"sanitaire","froid");
  add(S("path",{d:"M "+(W-40)+" 381 L "+(W-58)+" 390 L "+(W-40)+" 399 Z",
    fill:V("froid")}),"sanitaire");
  nom(W-20,364,"P24 · bouclage ECS","end","froid");

  el.appendChild(svg);

  /* ---------- les cinq boutons de surlignage ---------- */
  var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin-top:12px"});
  var carte=E("div",{"class":"res",style:"margin-top:10px"});
  function montre(k){
    actif=(actif===k?null:k);
    SS_RESEAUX.forEach(function(r){
      var on=(actif===null||actif===r.k);
      grp[r.k].forEach(function(e){e.setAttribute("opacity",on?"1":"0.12");});
    });
    [].forEach.call(barre.children,function(b,i){
      b.style.opacity=(actif===null||actif===SS_RESEAUX[i].k)?"1":"0.45";
      b.style.fontWeight=(actif===SS_RESEAUX[i].k)?"600":"400";
    });
    var r=null;SS_RESEAUX.forEach(function(x){if(x.k===actif)r=x;});
    carte.innerHTML=r
      ? "<p><b style='color:"+V(r.c)+"'>"+r.n+"</b> — "+r.d+"</p>"
      : "<p>Les cinq réseaux sont affichés. Cliquez-en un pour l'isoler, "+
        "cliquez-le à nouveau pour tout revoir. <b>Les collecteurs restent en "+
        "gris</b> : ils sont communs à deux réseaux, et c'est justement là "+
        "qu'un tracé se discute.</p>";
  }
  SS_RESEAUX.forEach(function(r){
    var b=E("button",{type:"button",style:"font:inherit;font-size:13px;cursor:pointer;"+
      "padding:5px 11px;border-radius:99px;background:var(--carte);"+
      "border:1.5px solid "+V(r.c)+";color:"+V(r.c)},r.n);
    b.addEventListener("click",function(){montre(r.k);});
    barre.appendChild(b);
  });
  var hote=el.parentNode||el;
  hote.appendChild(barre);hote.appendChild(carte);
  montre(null);
};

/* ─────────── sous-station : puissance souscrite et abonnement ─────────── */
OUTILS["sous-station"]={
  titre:"Sous-station : quelle puissance souscrire ?",
  intro:"Un réseau de chaleur facture la puissance souscrite toute l'année, "+
        "consommée ou non. Le ballon primaire sert à en souscrire moins. "+
        "Les valeurs de départ ne sont pas celles de l'activité.",
  monte:function(d){
    var P={nd:8,q:4,tc:60,tf:12,dur:12,surf:1800,dep:30,sur:10,dtp:20,r2:64};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Douches simultanées","nd",2,20,1,0,"");
    ch(c1,"Débit par douche","q",3,8,0.5,1," L/min");
    ch(c1,"Température d'ECS","tc",50,65,1,0," °C");
    ch(c1,"Température d'eau froide","tf",5,20,1,0," °C");
    ch(c1,"Durée de la pointe","dur",5,30,1,0," min");
    ch(c2,"Surface chauffée","surf",500,5000,100,0," m²");
    ch(c2,"Déperditions de base","dep",15,60,1,0," W/m²");
    ch(c2,"Surdimensionnement","sur",0,20,1,0," %");
    ch(c2,"Régime primaire du ballon","dtp",10,30,1,0," K");
    ch(c2,"Prix de l'abonnement r2","r2",40,90,1,0," €/kW");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var dt=P.tc-P.tf;
      var vh=P.nd*P.q*60;                       /* litres par heure */
      var Pecs=vh*1.163*dt/1000;                /* kW en pointe */
      var Pch=P.surf*P.dep*(1+P.sur/100)/1000;  /* kW de chauffage */
      var sans=Pecs+Pch, avec=Pch;
      var TVA=1.055;
      var Rsans=sans*P.r2*TVA, Ravec=avec*P.r2*TVA;
      var Estock=Pecs*P.dur*60;                 /* kJ */
      var trech=Estock/Pch/60;                  /* minutes */
      var vol=Estock/(4.18*P.dtp);              /* litres de ballon primaire */
      res.innerHTML="<div class='gros'>"+
        "<span><b>Pointe d'ECS</b><span>"+frs(Pecs,0)+" kW</span></span>"+
        "<span><b>Chauffage</b><span>"+frs(Pch,0)+" kW</span></span>"+
        "<span><b>Sans ballon</b><span>"+frs(sans,0)+" kW souscrits</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Abonnement sans ballon</b><span>"+fr(Rsans,0)+" € TTC/an</span></span>"+
        "<span><b>Avec ballon</b><span>"+fr(Ravec,0)+" € TTC/an</span></span>"+
        "<span><b>Écart</b><span>"+fr(Rsans-Ravec,0)+" € TTC/an</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Énergie à stocker</b><span>"+fr(Estock,0)+" kJ</span></span>"+
        "<span><b>Volume du ballon</b><span>"+fr(vol,0)+" L</span></span>"+
        "<span><b>Temps de recharge</b><span>"+frs(trech,0)+" min</span></span>"+
        "</div><p>La pointe dure "+fr(P.dur,0)+" min et la recharge "+
        frs(trech,0)+" min : le chauffage est interrompu <b>"+
        frs(P.dur+trech,0)+" min</b> au pire. "+
        (Pecs>Pch
         ? "Ici la pointe d'ECS dépasse le chauffage — c'est elle qui "+
           "dimensionnerait la sous-station sans le ballon."
         : "Ici le chauffage domine : le ballon rapporte moins, et il faut "+
           "vérifier qu'il se justifie encore.")+"</p>";
    }
    calc();
  }
};

/* ─── pompe a chaleur : ce qui entre, ce qui sort, a l'echelle ─── */
SCHEMAS["pac-bilan"]=function(el){
  var W=880,H=430;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Bilan d'une pompe a chaleur : trois unites prises dehors, "+
                 "une unite de travail, quatre unites rendues"});
  function tit(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"middle",
    "class":cls||"s-tit",fill:V(c||"encre2")},t));}
  function nom(x,y,t,c,a){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"middle",
    "class":"s-nom",fill:V(c||"encre2")},t));}
  function bande(x,y,w,h,c,op){svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,
    rx:3,fill:V(c),opacity:op||"0.85"}));}

  /* la machine */
  svg.appendChild(S("rect",{x:330,y:120,width:220,height:190,rx:8,fill:V("carte"),
    stroke:V("encre2"),"stroke-width":"2.5"}));
  tit(440,152,"POMPE À CHALEUR");
  var org=[["évaporateur","froid",182],["compresseur","chaud",212],
           ["condenseur","chaud",242],["détendeur","encre2",272]];
  org.forEach(function(o){
    svg.appendChild(S("circle",{cx:356,cy:o[2]-5,r:"4",fill:V(o[1])}));
    nom(372,o[2],o[0],o[1],"start");
  });

  /* Qf : trois unites prises a la source froide */
  var U=26;                                   /* une unite d'energie = 26 px */
  bande(60,196,140,3*U,"froid","0.55");
  svg.appendChild(S("path",{d:"M 200 196 L 240 "+(196+1.5*U)+" L 200 "+(196+3*U)+" Z",
    fill:V("froid"),opacity:"0.55"}));
  tit(130,184,"3 unités","froid",null,"s-lab");
  nom(130,196+3*U+22,"prises dehors, gratuites","froid");
  nom(130,196+3*U+42,"air, sol, nappe, eaux grises","froid");
  svg.appendChild(S("line",{x1:240,y1:196+1.5*U,x2:330,y2:215,stroke:V("froid"),
    "stroke-width":"3","stroke-dasharray":"5 4"}));

  /* W : une unite achetee */
  bande(400,44,80,U,"chaud","0.9");
  tit(440,34,"1 unité","chaud",null,"s-lab");
  nom(440,44+U+20,"électricité achetée","chaud");
  svg.appendChild(S("line",{x1:440,y1:44+U,x2:440,y2:120,stroke:V("chaud"),
    "stroke-width":"3","stroke-dasharray":"5 4"}));

  /* Qc : quatre unites rendues */
  bande(680,183,140,4*U,"vert","0.7");
  svg.appendChild(S("path",{d:"M 640 183 L 680 183 L 680 "+(183+4*U)+" L 640 "+
    (183+4*U)+" Z",fill:V("vert"),opacity:"0.7"}));
  svg.appendChild(S("line",{x1:550,y1:215,x2:640,y2:196+1.5*U,stroke:V("vert"),
    "stroke-width":"3","stroke-dasharray":"5 4"}));
  tit(750,171,"4 unités","vert",null,"s-lab");
  nom(750,183+4*U+22,"rendues au bâtiment","vert");

  /* la lecture */
  svg.appendChild(S("line",{x1:60,y1:370,x2:820,y2:370,stroke:V("trait"),
    "stroke-width":"1.5"}));
  tit(440,398,"COP = 4 unités rendues / 1 unité achetée = 4","encre2",null,"s-lab");
  nom(440,420,"Rien n'est créé : 3 + 1 = 4. La machine déplace, elle ne fabrique pas.");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les rectangles sont <b>à l'échelle</b> : la même hauteur vaut la même énergie. "+
    "C'est la figure à dessiner au tableau quand un étudiant dit « c'est impossible »."));
};

/* ─── batterie froide : l'ADP et le facteur de bipasse ─── */
SCHEMAS["bipasse-batterie"]=function(el){
  var W=880,H=470;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Construction de l'ADP et du facteur de bipasse d'une batterie froide"});
  function nom(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"start",
    "class":cls||"s-nom",fill:V(c||"encre2")},t));}
  /* --- repere psychrometrique reduit --- */
  var X0=380,X1=830,Y0=50,Y1=380, TMIN=5,TMAX=30, RMAX=14;
  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(r){return Y1-r/RMAX*(Y1-Y0);}
  function pvs(t){return 610.94*Math.exp(17.625*t/(t+243.04));}
  function rsat(t){var p=pvs(t);return 622*p/(101325-p);}
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  svg.appendChild(S("line",{x1:X1,y1:Y0,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  for(var t=5;t<=30;t+=5){
    svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),"stroke-width":"1"}));
    nom(px(t),Y1+18,String(t),"encre2","middle","s-pet");
  }
  for(var r=2;r<=14;r+=2){
    svg.appendChild(S("line",{x1:X0,y1:py(r),x2:X1,y2:py(r),stroke:V("trait2"),"stroke-width":"1"}));
    nom(X1+8,py(r)+4,String(r),"encre2","start","s-pet");
  }
  nom((X0+X1)/2,Y1+40,"température sèche, °C","encre2","middle","s-pet");
  nom(X1,Y0-12,"r, g/kg","encre2","end","s-pet");
  var d="",k=0;
  for(var tt=5;tt<=30.01;tt+=0.5){var rr=rsat(tt);if(rr>RMAX)break;
    d+=(k++?" L ":"M ")+px(tt)+" "+py(rr);}
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"3.5"}));
  nom(px(19)+6,py(rsat(19))-10,"saturation 100 %","froid","start","s-pet");

  /* les trois points : M entree, S sortie, A l'ADP */
  /* l'ADP se pose sur la courbe, il ne s'approxime pas : le point de la
     construction doit tomber sur la saturation au pixel pres. */
  var M=[27,11.1], Sx=[16,8.6], A=[8.6,rsat(8.6)];
  function pt(P,lab,coul,dx,dy,anc){
    svg.appendChild(S("circle",{cx:px(P[0]),cy:py(P[1]),r:"8",fill:V("carte"),
      stroke:V(coul),"stroke-width":"3.5"}));
    nom(px(P[0])+dx,py(P[1])+dy,lab,coul,anc||"start","s-lab");
  }
  /* l'evolution reelle, pleine ; son prolongement vers l'ADP, en pointilles */
  svg.appendChild(S("line",{x1:px(M[0]),y1:py(M[1]),x2:px(Sx[0]),y2:py(Sx[1]),
    stroke:V("chaud"),"stroke-width":"3.5"}));
  svg.appendChild(S("line",{x1:px(Sx[0]),y1:py(Sx[1]),x2:px(A[0]),y2:py(A[1]),
    stroke:V("chaud"),"stroke-width":"2","stroke-dasharray":"6 5"}));
  pt(M,"M  entrée batterie","chaud",-14,-14,"end");
  pt(Sx,"S  sortie réelle","froid",14,-14);
  pt(A,"ADP","vert",-14,18,"end");
  nom(px(A[0])+16,py(A[1])+34,"température de surface","vert","start","s-pet");
  nom(px(21),py(9.0)+26,"la droite pointe vers l'ADP","encre2","middle","s-pet");

  /* --- la coupe de batterie, a gauche --- */
  svg.appendChild(S("rect",{x:60,y:140,width:70,height:158,rx:3,fill:V("carte"),
    stroke:V("froid"),"stroke-width":"2.5"}));
  for(var i=0;i<6;i++)svg.appendChild(S("line",{x1:68+i*11,y1:146,x2:68+i*11,y2:292,
    stroke:V("froid"),"stroke-width":"1.5"}));
  nom(95,320,"batterie froide","froid","middle");
  nom(95,338,"8 rangs","encre2","middle","s-pet");
  /* l'air entre par une seule veine, puis SE PARTAGE : sans la fourche, on
     croit a deux airs differents entrant dans la batterie. */
  var YH=175, YB=262;
  svg.appendChild(S("path",{d:"M 10 218 L 34 218",stroke:V("chaud"),"stroke-width":"7"}));
  svg.appendChild(S("path",{d:"M 34 "+YH+" L 34 "+YB,stroke:V("chaud"),"stroke-width":"5"}));
  svg.appendChild(S("path",{d:"M 34 "+YH+" L 60 "+YH,stroke:V("chaud"),"stroke-width":"7"}));
  svg.appendChild(S("path",{d:"M 34 "+YB+" L 60 "+YB,stroke:V("chaud"),"stroke-width":"7",
    opacity:"0.45"}));
  nom(10,204,"M","chaud","start","s-lab");
  /* ce qui touche les ailettes en ressort sature ; le reste passe sans rien voir.
     Les deux veines vont jusqu'au point de melange : une ligne interrompue sous
     son libelle donnait l'impression de deux circuits sans rapport. */
  svg.appendChild(S("path",{d:"M 130 "+YH+" L 290 "+YH,stroke:V("vert"),"stroke-width":"7"}));
  svg.appendChild(S("path",{d:"M 130 "+YB+" L 290 "+YB,stroke:V("chaud"),"stroke-width":"7",
    opacity:"0.45"}));
  nom(150,YH-40,"saturé à l'ADP","vert","start","s-pet");
  nom(150,YH-22,"la part traitée","encre2","start","s-pet");
  nom(150,YB+26,"inchangé","chaud","start","s-pet");
  nom(150,YB+44,"la part bipassée","encre2","start","s-pet");
  /* et les deux se recombinent : c'est le point de sortie */
  svg.appendChild(S("path",{d:"M 290 "+YH+" L 320 218",stroke:V("vert"),"stroke-width":"4"}));
  svg.appendChild(S("path",{d:"M 290 "+YB+" L 320 218",stroke:V("chaud"),"stroke-width":"4",
    opacity:"0.45"}));
  svg.appendChild(S("circle",{cx:322,cy:218,r:"7",fill:V("froid")}));
  nom(318,206,"S","froid","end","s-lab");
  nom(14,364,"S est le mélange des deux — il n'est jamais saturé","encre2","start","s-pet");

  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le point de sortie n'est <b>jamais</b> sur la courbe de saturation : c'est le "+
    "mélange de l'air traité, saturé à l'ADP, et de l'air passé entre les ailettes "+
    "sans rien changer. Le facteur de bipasse est la part du second."));
};

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

SCHEMAS["nature-travail"]=function(el){
  barres(el,{
    titre:"Ce que l'épreuve demande de faire — 227 consignes, sessions 2018 à 2026",
    source:"Survolez une ligne. Comptage par question, non pondéré par les points.",
    max:100,
    lignes:[
      {n:"Extraire du dossier",v:40,unite:" %",detail:"91 consignes",
       aide:"indiquer, donner, identifier, préciser, citer, lister, relever, "+
            "rechercher, nommer, repérer"},
      {n:"Justifier, expliquer",v:23,unite:" %",detail:"53 consignes",
       aide:"justifier, expliquer, conclure, montrer, décrire, argumenter, comparer"},
      {n:"Produire un graphique",v:18,unite:" %",detail:"40 consignes",
       aide:"compléter, représenter, surligner, tracer, positionner, dessiner"},
      {n:"Calculer",v:17,unite:" %",detail:"39 consignes",accent:true,
       aide:"déterminer, calculer, vérifier, estimer, évaluer — moins d'un "+
            "cinquième du travail, et souvent l'essentiel du temps de formation"},
      {n:"Proposer, choisir",v:2,unite:" %",detail:"4 consignes",
       aide:"proposer — marginal, mais toujours en fin de partie"}
    ]});
};

SCHEMAS["poids-themes"]=function(el){
  barres(el,{
    titre:"Poids des thèmes — cumul des temps conseillés, sessions 2024 à 2026",
    source:"Survolez une ligne. 645 minutes cumulées sur trois sessions.",
    max:150,
    lignes:[
      {n:"Régulation et GTB",v:140,unite:" min",detail:"22 %",accent:true,
       aide:"présent à chaque session — et c'est le cœur de métier de l'option C"},
      {n:"Traitement d'air, CTA",v:125,unite:" min",detail:"19 %",accent:true,
       aide:"présent à chaque session — et donné comme le plus redouté"},
      {n:"Hydraulique, ECS",v:120,unite:" min",detail:"19 %",accent:true,
       aide:"présent à chaque session — sous-station, réseaux, eau chaude sanitaire"},
      {n:"Production, froid",v:115,unite:" min",detail:"18 %",
       aide:"absent en 2026 : le seul grand thème qui puisse sauter une session"},
      {n:"Thermique du bâtiment",v:85,unite:" min",detail:"13 %",
       aide:"absent en 2025, mais 65 minutes à lui seul en 2026"},
      {n:"Analyse de dossier",v:30,unite:" min",detail:"5 %",
       aide:"une partie dédiée en 2025 — ailleurs, la compétence est diffuse"},
      {n:"Photovoltaïque, EnR",v:30,unite:" min",detail:"5 %",
       aide:"nouveau en 2026 ; à surveiller sur les prochaines sessions"}
    ]});
};

/* ═══════════════════════════════════════════════════ SCHEMAS — CAP
   Consolidation maths. Rien de thermique ici : ce sont les six images qui
   manquaient aux fiches, et qu'aucun polycopie ne portait. Elles servent
   plusieurs fiches chacune — la barre des fractions revient en proportion,
   la droite graduee en lecture de graphique. */

/* ─────────── le tableau des rangs, et la virgule qui glisse ─────────── */
SCHEMAS["virgule-rangs"]=function(el){
  var W=724,H=250,X0=64,CW=88,Y0=64,RH=52;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Tableau des rangs : multiplier par 10 décale les chiffres d'une colonne"});
  var rangs=["centaines","dizaines","unités","dixièmes","centièmes"];
  var i;
  for(i=0;i<5;i++){
    var x=X0+i*CW;
    svg.appendChild(S("rect",{x:x,y:Y0,width:CW,height:RH*2,fill:"none",
      stroke:V("trait"),"stroke-width":"1"}));
    svg.appendChild(S("text",{x:x+CW/2,y:Y0-14,"text-anchor":"middle","class":"s-tit"},
      rangs[i].toUpperCase()));
  }
  /* la virgule tombe entre unites et dixiemes */
  var xv=X0+3*CW;
  svg.appendChild(S("line",{x1:xv,y1:Y0-4,x2:xv,y2:Y0+RH*2+4,stroke:V("chaud"),
    "stroke-width":"2.5"}));
  svg.appendChild(S("text",{x:xv,y:Y0+RH*2+24,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"LA VIRGULE NE BOUGE PAS"));

  function pose(rang,chiffre,ligne,couleur){
    svg.appendChild(S("text",{x:X0+rang*CW+CW/2,y:Y0+ligne*RH+RH/2+8,
      "text-anchor":"middle","class":"s-lab",fill:V(couleur),
      style:"font-size:24px"},chiffre));
  }
  /* ligne 1 : 3,45 */
  pose(2,"3",0,"encre"); pose(3,"4",0,"encre"); pose(4,"5",0,"encre");
  svg.appendChild(S("text",{x:X0-12,y:Y0+RH/2+8,"text-anchor":"end","class":"s-nom"},
    "3,45"));
  /* ligne 2 : 34,5 — chaque chiffre a saute d'une colonne vers la gauche */
  pose(1,"3",1,"froid"); pose(2,"4",1,"froid"); pose(3,"5",1,"froid");
  svg.appendChild(S("text",{x:X0-12,y:Y0+RH+RH/2+8,"text-anchor":"end","class":"s-nom",
    fill:V("froid")},"34,5"));
  for(i=2;i<5;i++){
    var xa=X0+i*CW+CW/2, xb=xa-CW;
    svg.appendChild(S("path",{d:"M "+(xa-14)+" "+(Y0+RH-8)+" q -"+(CW/2)+" 16 -"+
      (CW-28)+" 0",fill:"none",stroke:V("froid"),"stroke-width":"1.5",
      "marker-end":"url(#fl-cap)"}));
  }
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-cap",viewBox:"0 0 10 10",refX:"9",refY:"5",
    markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("froid")}));
  defs.appendChild(mk); svg.appendChild(defs);
  svg.appendChild(S("text",{x:X0+5*CW+34,y:Y0+RH+RH/2+8,"text-anchor":"start","class":"s-nom",
    fill:V("froid")},"× 10"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Multiplier par 10, c'est faire monter <b>chaque chiffre d'une colonne</b>. "+
    "Comme il est plus rapide de déplacer un seul signe que trois chiffres, on "+
    "bouge la virgule dans l'autre sens — mais c'est le même mouvement."));
};

/* ─────────── poser : les virgules l'une sous l'autre ─────────── */
SCHEMAS["poser-virgules"]=function(el){
  var W=724,H=230;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux soustractions posées, l'une alignée sur la virgule, l'autre sur la droite"});
  function bloc(x0,titre,coul,a,b,res,xv,barre){
    svg.appendChild(S("text",{x:x0+96,y:30,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    svg.appendChild(S("rect",{x:x0,y:44,width:250,height:H-70,rx:"8",fill:"none",
      stroke:V(coul),"stroke-width":"1.5",opacity:"0.55"}));
    svg.appendChild(S("line",{x1:x0+xv,y1:56,x2:x0+xv,y2:H-40,stroke:V(coul),
      "stroke-width":"1.5","stroke-dasharray":"4 4"}));
    [a,b].forEach(function(t,i){
      svg.appendChild(S("text",{x:x0+220,y:92+i*36,"text-anchor":"end","class":"s-lab",
        style:"font-size:22px"},t));
    });
    svg.appendChild(S("line",{x1:x0+40,y1:140,x2:x0+220,y2:140,stroke:V("encre2"),
      "stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x0+220,y:176,"text-anchor":"end","class":"s-lab",
      fill:V(coul),style:"font-size:22px"},res));
    if(barre){
      svg.appendChild(S("line",{x1:x0+150,y1:158,x2:x0+224,y2:190,stroke:V("chaud"),
        "stroke-width":"2.5"}));
      svg.appendChild(S("line",{x1:x0+224,y1:158,x2:x0+150,y2:190,stroke:V("chaud"),
        "stroke-width":"2.5"}));
    }
  }
  bloc(40,"ALIGNÉ SUR LA VIRGULE","vert","40,0","−  3,6","36,4",148,false);
  bloc(420,"ALIGNÉ SUR LA DROITE","chaud","40","−  3,6","?",210,true);
  svg.appendChild(S("text",{x:88,y:H-14,"text-anchor":"start","class":"s-pet",
    fill:V("vert")},"le zéro ajouté occupe la colonne"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "40 s'écrit <b>40,0</b> avant d'être posé. Le zéro n'ajoute aucune valeur : "+
    "il occupe une colonne, pour que le calcul tombe juste."));
};

/* ─────────── decomposer un produit : le rectangle ─────────── */
SCHEMAS["decomposer"]=function(el){
  var W=724,H=304,X0=120,Y0=54,U=32;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"12 fois 15 vu comme deux rectangles, 12 fois 10 et 12 fois 5"});
  var h=12*U/2, w10=10*U, w5=5*U;
  svg.appendChild(S("rect",{x:X0,y:Y0,width:w10,height:h,fill:V("froid"),
    opacity:"0.18",stroke:V("froid"),"stroke-width":"1.5"}));
  svg.appendChild(S("rect",{x:X0+w10,y:Y0,width:w5,height:h,fill:V("vert"),
    opacity:"0.18",stroke:V("vert"),"stroke-width":"1.5"}));
  svg.appendChild(S("text",{x:X0+w10/2,y:Y0+h/2+8,"text-anchor":"middle",
    "class":"s-lab",fill:V("froid"),style:"font-size:26px"},"120"));
  svg.appendChild(S("text",{x:X0+w10+w5/2,y:Y0+h/2+8,"text-anchor":"middle",
    "class":"s-lab",fill:V("vert"),style:"font-size:26px"},"60"));
  svg.appendChild(S("text",{x:X0+w10/2,y:Y0-14,"text-anchor":"middle","class":"s-nom"},
    "10"));
  svg.appendChild(S("text",{x:X0+w10+w5/2,y:Y0-14,"text-anchor":"middle","class":"s-nom"},
    "5"));
  svg.appendChild(S("text",{x:X0-16,y:Y0+h/2+5,"text-anchor":"end","class":"s-nom"},
    "12"));
  svg.appendChild(S("text",{x:X0,y:Y0+h+40,"text-anchor":"start","class":"s-lab",
    style:"font-size:20px"},"12 × 15   =   12 × 10   +   12 × 5   =   120 + 60   =   180"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le rectangle entier fait 12 sur 15. On le coupe en deux morceaux faciles, "+
    "et <b>on recolle</b> : c'est l'étape qu'on oublie le plus souvent."));
};

/* ─────────── la barre des fractions ─────────── */
SCHEMAS["fractions-barre"]=function(el){
  var W=724,H=312,X0=100,LB=520,Y0=48,BH=42,EC=22;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une barre de 80 partagée en moitiés, en quarts et en tiers"});
  function bande(y,n,etiq,coul,valeurs){
    var i;
    for(i=0;i<n;i++){
      svg.appendChild(S("rect",{x:X0+i*LB/n,y:y,width:LB/n,height:BH,
        fill:V(coul),opacity:i%2?"0.14":"0.26",stroke:V(coul),"stroke-width":"1.2"}));
      svg.appendChild(S("text",{x:X0+(i+0.5)*LB/n,y:y+BH/2+6,"text-anchor":"middle",
        "class":"s-lab"},valeurs));
    }
    svg.appendChild(S("text",{x:X0-16,y:y+BH/2+5,"text-anchor":"end","class":"s-nom"},
      etiq));
  }
  svg.appendChild(S("rect",{x:X0,y:Y0,width:LB,height:BH,fill:V("encre2"),
    opacity:"0.10",stroke:V("encre2"),"stroke-width":"1.2"}));
  svg.appendChild(S("text",{x:X0+LB/2,y:Y0+BH/2+7,"text-anchor":"middle","class":"s-lab",
    style:"font-size:20px"},"80"));
  svg.appendChild(S("text",{x:X0-16,y:Y0+BH/2+5,"text-anchor":"end","class":"s-nom"},
    "le tout"));
  bande(Y0+BH+EC,2,"moitiés","froid","40");
  bande(Y0+2*(BH+EC),4,"quarts","vert","20");
  bande(Y0+3*(BH+EC),3,"tiers","violet","26,7");
  svg.appendChild(S("text",{x:X0,y:Y0+3*(BH+EC)+BH+22,"text-anchor":"start",
    "class":"s-pet",fill:V("violet")},"les tiers ne tombent jamais ronds"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Trois quarts, ce sont <b>trois cases sur quatre</b> — soit le tout moins un "+
    "quart. La bande des tiers ne tombe pas ronde, et c'est normal."));
};

/* ─────────── la droite graduee : 0,75 contre 0,8 ─────────── */
SCHEMAS["droite-graduee"]=function(el){
  var W=724,H=200,X0=70,X1=660,Y=100;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Droite graduée de 0,70 à 0,90, avec 0,75 et 0,80 placés"});
  function x(v){return X0+(v-0.70)/0.20*(X1-X0);}
  svg.appendChild(S("line",{x1:X0,y1:Y,x2:X1,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  var i;
  for(i=0;i<=20;i++){
    var v=0.70+i*0.01, gros=(i%5===0);
    svg.appendChild(S("line",{x1:x(v),y1:Y-(gros?11:6),x2:x(v),y2:Y+(gros?11:6),
      stroke:V(gros?"encre2":"trait"),"stroke-width":gros?"1.6":"1"}));
    if(gros)svg.appendChild(S("text",{x:x(v),y:Y+32,"text-anchor":"middle",
      "class":"s-pet"},frs(v,2)));
  }
  [[0.75,"0,75","chaud",-1],[0.80,"0,8","froid",1]].forEach(function(p){
    svg.appendChild(S("circle",{cx:x(p[0]),cy:Y,r:"7",fill:V(p[2])}));
    var yy=Y+(p[3]<0?-46:66);   /* en dessous : sous les graduations */
    svg.appendChild(S("line",{x1:x(p[0]),y1:Y+p[3]*10,x2:x(p[0]),y2:yy-p[3]*8,
      stroke:V(p[2]),"stroke-width":"1.4"}));
    svg.appendChild(S("text",{x:x(p[0]),y:yy+(p[3]<0?0:6),"text-anchor":"middle",
      "class":"s-lab",fill:V(p[2]),style:"font-size:20px"},p[1]));
  });
  svg.appendChild(S("text",{x:X1,y:Y-46,"text-anchor":"end","class":"s-tit",
    fill:V("froid")},"0,8 EST À DROITE, DONC PLUS GRAND"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "0,8 s'écrit aussi <b>0,80</b>. Sur la droite, il n'y a plus à discuter : "+
    "il est après 0,75, donc il est plus grand — malgré ses deux chiffres de moins."));
};

/* ─────────── arrondir : trois sens, une seule regle du 5 ─────────── */
SCHEMAS["arrondir-sens"]=function(el){
  var W=724,H=250,X0=140,X1=580,Y=86;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"24,3 entre 24 et 25, et les trois sens d'arrondi"});
  svg.appendChild(S("line",{x1:X0-40,y1:Y,x2:X1+40,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  [[X0,"24"],[X1,"25"]].forEach(function(b){
    svg.appendChild(S("line",{x1:b[0],y1:Y-12,x2:b[0],y2:Y+12,stroke:V("encre2"),
      "stroke-width":"2"}));
    svg.appendChild(S("text",{x:b[0],y:Y-22,"text-anchor":"middle","class":"s-lab",
      style:"font-size:19px"},b[1]));
  });
  var xv=X0+0.3*(X1-X0);
  svg.appendChild(S("circle",{cx:xv,cy:Y,r:"7",fill:V("chaud")}));
  svg.appendChild(S("text",{x:xv,y:Y-24,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"24,3"));
  var lignes=[["au plus proche","24","vert",1],
              ["pour COMMANDER","25","froid",2],
              ["ce qui TIENT dedans","24","violet",3]];
  lignes.forEach(function(l){
    var y=Y+22+l[3]*38, cible=(l[1]==="24")?X0:X1;
    svg.appendChild(S("line",{x1:xv,y1:y,x2:cible,y2:y,stroke:V(l[2]),
      "stroke-width":"2","marker-end":"url(#fl-ar)"}));
    svg.appendChild(S("text",{x:xv+(cible>xv?14:-14),y:y-8,
      "text-anchor":cible>xv?"start":"end","class":"s-nom",fill:V(l[2])},l[0]));
    svg.appendChild(S("text",{x:cible+(cible>xv?16:-16),y:y+5,
      "text-anchor":cible>xv?"start":"end","class":"s-lab",fill:V(l[2])},l[1]));
  });
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-ar",viewBox:"0 0 10 10",refX:"9",refY:"5",
    markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("encre2")}));
  defs.appendChild(mk); svg.appendChild(defs);
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "La règle du 5 donne le nombre le plus proche. <b>Elle ne dit pas ce qu'il "+
    "faut faire</b> : c'est la situation qui décide, et une commande s'arrondit "+
    "toujours au-dessus."));
};

/* ─────────── priorites : les memes touches, deux resultats ─────────── */
SCHEMAS["priorites"]=function(el){
  var W=724,H=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"12 + 8 divisé par 4, avec et sans parenthèses"});
  function ligne(y,touches,ordre,res,coul,note){
    var x=70,i;
    touches.forEach(function(t,k){
      var l=t.length*15+22;
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:44,rx:"6",
        fill:V("carte2"),stroke:V("trait"),"stroke-width":"1"}));
      svg.appendChild(S("text",{x:x+l/2,y:y+29,"text-anchor":"middle","class":"s-lab",
        style:"font-size:20px"},t));
      if(ordre[k]){
        svg.appendChild(S("circle",{cx:x+l/2,cy:y-14,r:"11",fill:V(coul)}));
        svg.appendChild(S("text",{x:x+l/2,y:y-10,"text-anchor":"middle","class":"s-tit",
          fill:V("fond")},ordre[k]));
      }
      x+=l+8;
    });
    svg.appendChild(S("text",{x:x+18,y:y+29,"text-anchor":"start","class":"s-lab",
      fill:V(coul),style:"font-size:22px"},"= "+res));
    svg.appendChild(S("text",{x:70,y:y+66,"text-anchor":"start","class":"s-pet",
      fill:V(coul)},note));
  }
  ligne(52,["12","+","8","÷","4"],["","","","1",""],"14","chaud",
    "la machine divise d'abord : 8 ÷ 4 = 2, puis 12 + 2");
  ligne(160,["(","12","+","8",")","÷","4"],["","","1","","","2",""],"5","vert",
    "les parenthèses passent devant : 12 + 8 = 20, puis 20 ÷ 4");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les mêmes touches, dans le même ordre. <b>Seules les parenthèses changent</b>, "+
    "et le résultat passe de 14 à 5."));
};

/* ─────────── B · milli, unité, kilo ─────────── */
SCHEMAS["echelle-prefixes"]=function(el){
  var W=724,H=236,Y=104;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Milli, unité et kilo, séparés par des facteurs mille"});
  var cases=[[122,"milli","mA · mm · mL","froid"],[362,"l'unité","A · m · L","encre"],
             [602,"kilo","kΩ · kg · km","chaud"]];
  cases.forEach(function(c){
    svg.appendChild(S("rect",{x:c[0]-92,y:Y-42,width:184,height:84,rx:"10",
      fill:V("carte2"),stroke:V(c[3]),"stroke-width":"1.8"}));
    svg.appendChild(S("text",{x:c[0],y:Y-8,"text-anchor":"middle","class":"s-lab",
      fill:V(c[3]),style:"font-size:21px"},c[1]));
    svg.appendChild(S("text",{x:c[0],y:Y+22,"text-anchor":"middle","class":"s-pet"},c[2]));
  });
  var defs=S("defs",{});
  ["fl-pre-h","fl-pre-b"].forEach(function(id,i){
    var mk=S("marker",{id:id,viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
      markerHeight:"6",orient:"auto-start-reverse"});
    mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V(i?"froid":"chaud")}));
    defs.appendChild(mk);
  });
  svg.appendChild(defs);
  [[122,362],[362,602]].forEach(function(p){
    var m=(p[0]+p[1])/2;
    svg.appendChild(S("path",{d:"M "+(p[0]+96)+" "+(Y-26)+" q "+((p[1]-p[0])/2-48)+" -34 "+
      (p[1]-p[0]-192)+" 0",fill:"none",stroke:V("chaud"),"stroke-width":"2",
      "marker-end":"url(#fl-pre-h)"}));
    svg.appendChild(S("text",{x:m,y:Y-52,"text-anchor":"middle","class":"s-nom",
      fill:V("chaud")},"÷ 1 000"));
    svg.appendChild(S("path",{d:"M "+(p[1]-96)+" "+(Y+26)+" q -"+((p[1]-p[0])/2-48)+" 34 -"+
      (p[1]-p[0]-192)+" 0",fill:"none",stroke:V("froid"),"stroke-width":"2",
      "marker-end":"url(#fl-pre-b)"}));
    svg.appendChild(S("text",{x:m,y:Y+70,"text-anchor":"middle","class":"s-nom",
      fill:V("froid")},"× 1 000"));
  });
  svg.appendChild(S("text",{x:W/2,y:H-12,"text-anchor":"middle","class":"s-pet"},
    "250 mA = 0,250 A   ·   1,8 kΩ = 1 800 Ω"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Un seul facteur à retenir : <b>mille</b>. Vers la droite le nombre <b>rétrécit</b> "+
    "— 250 mA font 0,250 A ; vers la gauche il <b>grandit</b> — 1,8 kΩ font 1 800 Ω."));
};

/* ─────────── B · l'escalier des longueurs ─────────── */
SCHEMAS["escalier-longueurs"]=function(el){
  var W=724,H=250,Y=118,X=[110,290,470,650];
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Mètre, décimètre, centimètre, millimètre : un facteur dix à chaque marche"});
  var noms=["m","dm","cm","mm"];
  noms.forEach(function(n,i){
    svg.appendChild(S("rect",{x:X[i]-46,y:Y-30,width:92,height:60,rx:"8",
      fill:V("carte2"),stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:X[i],y:Y+10,"text-anchor":"middle","class":"s-lab",
      style:"font-size:24px"},n));
  });
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-lon",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
    markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("froid")}));
  defs.appendChild(mk); svg.appendChild(defs);
  for(var i=0;i<3;i++){
    svg.appendChild(S("path",{d:"M "+(X[i]+50)+" "+(Y-18)+" q 44 -30 88 0",fill:"none",
      stroke:V("froid"),"stroke-width":"2","marker-end":"url(#fl-lon)"}));
    svg.appendChild(S("text",{x:(X[i]+X[i+1])/2,y:Y-42,"text-anchor":"middle",
      "class":"s-nom",fill:V("froid")},"× 10"));
  }
  svg.appendChild(S("path",{d:"M "+(X[0])+" "+(Y+40)+" q 270 62 540 0",fill:"none",
    stroke:V("chaud"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("text",{x:W/2,y:H-16,"text-anchor":"middle","class":"s-nom",
    fill:V("chaud")},"du mètre au millimètre : × 1 000, en une fois"));
  svg.appendChild(S("text",{x:X[0],y:Y-58,"text-anchor":"middle","class":"s-pet"},"2,45"));
  svg.appendChild(S("text",{x:X[3],y:Y-58,"text-anchor":"middle","class":"s-pet"},"2 450"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Quatre marches, <b>un facteur dix à chaque fois</b>. Sauter directement du mètre "+
    "au millimètre, c'est franchir trois marches d'un coup : × 1 000."));
};

/* ─────────── B · le mètre carré, découpé pour de vrai ─────────── */
SCHEMAS["carre-cm"]=function(el){
  var W=724,H=330,C=246,X0=180,Y0=44,N=10;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un mètre carré découpé en cent carrés de un décimètre de côté"});
  var p=C/N,i;
  svg.appendChild(S("rect",{x:X0,y:Y0,width:C,height:C,fill:V("froid"),opacity:"0.10",
    stroke:V("froid"),"stroke-width":"2.5"}));
  for(i=1;i<N;i++){
    svg.appendChild(S("line",{x1:X0+i*p,y1:Y0,x2:X0+i*p,y2:Y0+C,stroke:V("froid"),
      "stroke-width":"0.8",opacity:"0.75"}));
    svg.appendChild(S("line",{x1:X0,y1:Y0+i*p,x2:X0+C,y2:Y0+i*p,stroke:V("froid"),
      "stroke-width":"0.8",opacity:"0.75"}));
  }
  /* une case mise en avant : 1 dm² = 100 cm² */
  svg.appendChild(S("rect",{x:X0,y:Y0,width:p,height:p,fill:V("chaud"),opacity:"0.5"}));
  svg.appendChild(S("line",{x1:X0+p,y1:Y0+p/2,x2:X0+C+70,y2:Y0-6,stroke:V("chaud"),
    "stroke-width":"1.2"}));
  svg.appendChild(S("text",{x:X0+C+76,y:Y0-2,"text-anchor":"start","class":"s-nom",
    fill:V("chaud")},"1 dm² = 100 cm²"));
  svg.appendChild(S("text",{x:X0+C+76,y:Y0+24,"text-anchor":"start","class":"s-pet"},
    "et il y en a cent"));
  svg.appendChild(S("text",{x:X0+C/2,y:Y0-16,"text-anchor":"middle","class":"s-nom"},
    "1 m = 100 cm"));
  svg.appendChild(S("text",{x:X0-14,y:Y0+C/2+5,"text-anchor":"end","class":"s-nom"},
    "1 m"));
  svg.appendChild(S("text",{x:X0+C/2,y:Y0+C+34,"text-anchor":"middle","class":"s-lab",
    fill:V("froid"),style:"font-size:21px"},"1 m² = 100 × 100 = 10 000 cm²"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le côté est multiplié par 100, mais l'aire l'est <b>deux fois</b> : une fois en "+
    "longueur, une fois en largeur. D'où les <b>quatre zéros</b>, et non deux."));
};

/* ─────────── B · le mètre cube et le litre ─────────── */
SCHEMAS["cube-litre"]=function(el){
  var W=724,H=320,ox=250,oy=250,A=170,F=64;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un mètre cube contient mille cubes d'un décimètre, soit mille litres"});
  function P(x,y,z){return [ox+x*A+y*F*0.62, oy-z*A-y*F*0.5];}
  var s=[P(0,0,0),P(1,0,0),P(1,0,1),P(0,0,1)],
      t=[P(0,1,1),P(1,1,1),P(1,1,0)];
  function poly(pts,f,o){
    svg.appendChild(S("polygon",{points:pts.map(function(q){return q.join(",");}).join(" "),
      fill:V(f),opacity:o,stroke:V("froid"),"stroke-width":"1.6"}));
  }
  poly([s[3],t[0],t[1],s[2]],"froid","0.10");        /* dessus */
  poly([s[1],t[2],t[1],s[2]],"froid","0.16");        /* cote droit */
  poly(s,"froid","0.22");                            /* face */
  var i;
  for(i=1;i<10;i++){
    var a=P(i/10,0,0),b=P(i/10,0,1);
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("froid"),
      "stroke-width":"0.6",opacity:"0.7"}));
    var c=P(0,0,i/10),d=P(1,0,i/10);
    svg.appendChild(S("line",{x1:c[0],y1:c[1],x2:d[0],y2:d[1],stroke:V("froid"),
      "stroke-width":"0.6",opacity:"0.7"}));
  }
  var q=[P(0,0,0),P(0.1,0,0),P(0.1,0,0.1),P(0,0,0.1)];
  poly(q,"chaud","0.55");
  svg.appendChild(S("text",{x:ox+A+96,y:oy-A/2-16,"text-anchor":"start","class":"s-lab",
    style:"font-size:21px"},"1 m³ = 1 000 dm³"));
  svg.appendChild(S("text",{x:ox+A+96,y:oy-A/2+14,"text-anchor":"start","class":"s-lab",
    fill:V("froid"),style:"font-size:21px"},"1 m³ = 1 000 L"));
  svg.appendChild(S("text",{x:ox+A+96,y:oy-A/2+48,"text-anchor":"start","class":"s-nom",
    fill:V("chaud")},"1 dm³ = 1 litre"));
  svg.appendChild(S("text",{x:ox+A/2,y:oy+28,"text-anchor":"middle","class":"s-nom"},
    "1 m"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Dix cubes en longueur, dix en largeur, dix en hauteur : <b>mille au total</b>. "+
    "Et le petit cube d'un décimètre de côté, c'est exactement <b>un litre</b>."));
};

/* ─────────── B · l'heure, en minutes et en décimal ─────────── */
SCHEMAS["heure-decimale"]=function(el){
  var W=724,H=250,X0=90,LB=544,Y=100,BH=52;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une heure en minutes et la même en heures décimales"});
  var i;
  for(i=0;i<4;i++){
    svg.appendChild(S("rect",{x:X0+i*LB/4,y:Y,width:LB/4,height:BH,
      fill:V("froid"),opacity:i%2?"0.12":"0.22",stroke:V("froid"),"stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:X0+(i+0.5)*LB/4,y:Y+BH/2+6,"text-anchor":"middle",
      "class":"s-lab"},"15 min"));
  }
  var reps=[[0,"0 min","0 h"],[1,"15 min","0,25 h"],[2,"30 min","0,5 h"],
            [3,"45 min","0,75 h"],[4,"60 min","1 h"]];
  reps.forEach(function(r){
    var x=X0+r[0]*LB/4;
    svg.appendChild(S("line",{x1:x,y1:Y-10,x2:x,y2:Y+BH+10,stroke:V("encre2"),
      "stroke-width":"1.4"}));
    svg.appendChild(S("text",{x:x,y:Y-20,"text-anchor":"middle","class":"s-pet"},r[1]));
    svg.appendChild(S("text",{x:x,y:Y+BH+32,"text-anchor":"middle","class":"s-lab",
      fill:V("vert")},r[2]));
  });
  svg.appendChild(S("text",{x:X0,y:H-24,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"30 min ne s'écrit jamais 0,30 h"));
  svg.appendChild(S("line",{x1:X0+266,y1:H-40,x2:X0+340,y2:H-18,stroke:V("chaud"),
    "stroke-width":"2.5"}));
  svg.appendChild(S("line",{x1:X0+340,y1:H-40,x2:X0+266,y2:H-18,stroke:V("chaud"),
    "stroke-width":"2.5"}));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Une heure vaut <b>60</b> minutes, pas 100. La demi-heure s'écrit donc <b>0,5 h</b>, "+
    "et le quart d'heure <b>0,25 h</b> — jamais 0,30 ni 0,15."));
};

/* ─────────── B · des km/h aux m/s ─────────── */
SCHEMAS["kmh-ms"]=function(el){
  var W=724,H=240,X0=90,X1=650,YA=76,YB=176,VMAX=130;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux axes parallèles : les kilomètres-heure et les mètres par seconde"});
  function x(v){return X0+v/VMAX*(X1-X0);}
  [[YA,"km/h","chaud"],[YB,"m/s","froid"]].forEach(function(a){
    svg.appendChild(S("line",{x1:X0,y1:a[0],x2:X1,y2:a[0],stroke:V("encre2"),
      "stroke-width":"2"}));
    svg.appendChild(S("text",{x:X0-14,y:a[0]+5,"text-anchor":"end","class":"s-nom",
      fill:V(a[2])},a[1]));
  });
  [[18,5],[36,10],[72,20],[90,25],[126,35]].forEach(function(p){
    var xx=x(p[0]);
    svg.appendChild(S("line",{x1:xx,y1:YA-8,x2:xx,y2:YA+8,stroke:V("chaud"),
      "stroke-width":"1.6"}));
    svg.appendChild(S("line",{x1:xx,y1:YB-8,x2:xx,y2:YB+8,stroke:V("froid"),
      "stroke-width":"1.6"}));
    svg.appendChild(S("line",{x1:xx,y1:YA+10,x2:xx,y2:YB-10,stroke:V("trait"),
      "stroke-width":"1","stroke-dasharray":"3 3"}));
    svg.appendChild(S("text",{x:xx,y:YA-16,"text-anchor":"middle","class":"s-lab"},
      String(p[0])));
    svg.appendChild(S("text",{x:xx,y:YB+28,"text-anchor":"middle","class":"s-lab",
      fill:V("froid")},String(p[1])));
  });
  svg.appendChild(S("text",{x:W/2,y:(YA+YB)/2+6,"text-anchor":"middle","class":"s-lab",
    fill:V("vert"),style:"font-size:20px"},"÷ 3,6"));
  svg.appendChild(S("text",{x:X0,y:H-14,"text-anchor":"start","class":"s-pet"},
    "90 km/h, c'est 25 m/s : en une seconde, un camion parcourt un quart de terrain de handball"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Un seul nombre à retenir : <b>3,6</b>. Des km/h vers les m/s on divise, dans "+
    "l'autre sens on multiplie — et <b>36 km/h = 10 m/s</b> sert de repère."));
};

/* ─────────── C · le tableau de proportionnalité et son coefficient ─────────── */
SCHEMAS["tableau-propo"]=function(el){
  var W=724,H=250,X0=126,CW=96,Y0=62,RH=54;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un tableau de proportionnalité et son coefficient"});
  var haut=["0","1","5","20","50"], bas=["0","2,40","12","48","120"];
  var i;
  for(i=0;i<5;i++){
    var x=X0+i*CW, z=(i===0);
    [0,1].forEach(function(r){
      svg.appendChild(S("rect",{x:x,y:Y0+r*RH,width:CW,height:RH,
        fill:V(z?"vert":"carte2"),opacity:z?"0.18":"1",
        stroke:V("trait"),"stroke-width":"1.2"}));
      svg.appendChild(S("text",{x:x+CW/2,y:Y0+r*RH+RH/2+7,"text-anchor":"middle",
        "class":"s-lab",style:"font-size:19px"},r?bas[i]:haut[i]));
    });
  }
  svg.appendChild(S("text",{x:X0-14,y:Y0+RH/2+5,"text-anchor":"end","class":"s-nom"},
    "longueur (m)"));
  svg.appendChild(S("text",{x:X0-14,y:Y0+RH+RH/2+5,"text-anchor":"end","class":"s-nom"},
    "prix (€)"));
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-pro",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
    markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("froid")}));
  defs.appendChild(mk); svg.appendChild(defs);
  for(i=1;i<5;i++){
    var xx=X0+i*CW+CW-16;
    svg.appendChild(S("line",{x1:xx,y1:Y0+RH-10,x2:xx,y2:Y0+RH+12,stroke:V("froid"),
      "stroke-width":"1.6","marker-end":"url(#fl-pro)"}));
  }
  svg.appendChild(S("text",{x:X0+5*CW+16,y:Y0+RH+6,"text-anchor":"start","class":"s-lab",
    fill:V("froid"),style:"font-size:20px"},"× 2,40"));
  svg.appendChild(S("text",{x:X0+CW/2,y:Y0+2*RH+28,"text-anchor":"middle","class":"s-nom",
    fill:V("vert")},"la colonne qui prouve tout"));
  svg.appendChild(S("text",{x:X0,y:Y0+2*RH+56,"text-anchor":"start","class":"s-pet"},
    "pour zéro mètre, on paie zéro euro — sinon ce n'est pas de la proportionnalité"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Un seul coefficient, <b>le même dans toutes les colonnes</b>. C'est la définition, "+
    "et la colonne du zéro suffit souvent à démasquer une fausse proportionnalité."));
};

/* ─────────── C · forfait plus part variable ─────────── */
SCHEMAS["forfait-variable"]=function(el){
  var W=724,H=330,X0=112,X1=590,Y0=36,Y1=262,JMAX=10,EMAX=1000;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux offres de location : une proportionnelle, une avec forfait"});
  function x(j){return X0+j/JMAX*(X1-X0);}
  function y(e){return Y1-e/EMAX*(Y1-Y0);}
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1+18,y2:Y1,stroke:V("encre2"),
    "stroke-width":"1.8"}));
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X0,y2:Y0-8,stroke:V("encre2"),
    "stroke-width":"1.8"}));
  var j;
  for(j=0;j<=JMAX;j+=2){
    svg.appendChild(S("line",{x1:x(j),y1:Y1,x2:x(j),y2:Y1+6,stroke:V("encre2"),
      "stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:x(j),y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      String(j)));
  }
  [0,250,500,750,1000].forEach(function(e){
    svg.appendChild(S("line",{x1:X0-6,y1:y(e),x2:X0,y2:y(e),stroke:V("encre2"),
      "stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:X0-12,y:y(e)+4,"text-anchor":"end","class":"s-pet"},
      String(e)));
  });
  svg.appendChild(S("text",{x:X1+22,y:Y1+24,"text-anchor":"end","class":"s-nom"},"jours"));
  svg.appendChild(S("text",{x:X0-12,y:Y0-14,"text-anchor":"end","class":"s-nom"},"€"));
  /* A : 90 €/jour, passe par l'origine */
  svg.appendChild(S("line",{x1:x(0),y1:y(0),x2:x(10),y2:y(900),stroke:V("vert"),
    "stroke-width":"2.6"}));
  /* B : 150 € puis 60 €/jour */
  svg.appendChild(S("line",{x1:x(0),y1:y(150),x2:x(10),y2:y(750),stroke:V("chaud"),
    "stroke-width":"2.6"}));
  svg.appendChild(S("circle",{cx:x(0),cy:y(150),r:"6",fill:V("chaud")}));
  svg.appendChild(S("text",{x:x(0)+14,y:y(150)-10,"text-anchor":"start","class":"s-nom",
    fill:V("chaud")},"150 € avant d'avoir commencé"));
  svg.appendChild(S("circle",{cx:x(0),cy:y(0),r:"6",fill:V("vert")}));
  /* le croisement, a 5 jours et 450 € */
  svg.appendChild(S("line",{x1:x(5),y1:y(450),x2:x(5),y2:Y1,stroke:V("trait"),
    "stroke-width":"1","stroke-dasharray":"4 3"}));
  svg.appendChild(S("circle",{cx:x(5),cy:y(450),r:"6",fill:V("froid")}));
  svg.appendChild(S("text",{x:x(5)+12,y:y(450)+22,"text-anchor":"start","class":"s-nom",
    fill:V("froid")},"5 jours : même prix"));
  svg.appendChild(S("text",{x:X1+26,y:y(900)+6,"text-anchor":"start","class":"s-lab",
    fill:V("vert")},"A"));
  svg.appendChild(S("text",{x:X1+26,y:y(750)+6,"text-anchor":"start","class":"s-lab",
    fill:V("chaud")},"B"));
  svg.appendChild(S("text",{x:X0,y:H-14,"text-anchor":"start","class":"s-pet"},
    "A — 90 €/jour, sans frais   ·   B — 150 € de forfait, puis 60 €/jour"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les deux droites montent régulièrement. <b>Une seule part de zéro</b> — et c'est "+
    "elle, et elle seule, qui est proportionnelle."));
};

/* ─────────── C · une remise puis une TVA ─────────── */
SCHEMAS["pourcentage-barre"]=function(el){
  var W=724,H=304,X0=140,LB=440,Y=[54,124,194],BH=44;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"2 400 euros, moins quinze pour cent, puis plus vingt pour cent de TVA"});
  function barre(y,val,ref,coul,etiq,montant){
    var w=LB*val/ref;
    svg.appendChild(S("rect",{x:X0,y:y,width:w,height:BH,fill:V(coul),opacity:"0.24",
      stroke:V(coul),"stroke-width":"1.6"}));
    svg.appendChild(S("text",{x:X0+w/2,y:y+BH/2+7,"text-anchor":"middle","class":"s-lab",
      style:"font-size:19px"},montant));
    svg.appendChild(S("text",{x:X0-14,y:y+BH/2+5,"text-anchor":"end","class":"s-nom"},etiq));
    return w;
  }
  var REF=2448;
  barre(Y[0],2400,REF,"encre2","au départ","2 400 €");
  var w1=barre(Y[1],2040,REF,"vert","− 15 %","2 040 €");
  var w2=barre(Y[2],2448,REF,"chaud","+ 20 % de TVA","2 448 €");
  /* le repere du depart, reporte sur la derniere barre */
  var wd=LB*2400/REF;
  svg.appendChild(S("line",{x1:X0+wd,y1:Y[0],x2:X0+wd,y2:Y[2]+BH+16,stroke:V("encre2"),
    "stroke-width":"1.2","stroke-dasharray":"5 4"}));
  svg.appendChild(S("text",{x:X0,y:Y[2]+BH+34,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:18px"},"48 € de plus qu'au départ, soit + 2 %"));
  svg.appendChild(S("text",{x:X0,y:H-12,"text-anchor":"start","class":"s-pet"},
    "0,85 × 1,20 = 1,02 — les deux pourcentages ne s'annulent pas"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Une remise de 15 % puis une TVA de 20 % ne se compensent pas : <b>on finit "+
    "au-dessus du prix de départ</b>. Les pourcentages se multiplient, ils ne s'ajoutent pas."));
};

/* ─────────── C · ce que pèse un mètre cube ─────────── */
SCHEMAS["masse-volumique"]=function(el){
  var W=724,H=290,ox=[150,362,574],oy=196,A=92,F=38;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un mètre cube de terre, de sable et de gravier, et leurs masses"});
  var mat=[["terre","1,4 t","vert"],["sable","1,5 t","tiede"],["gravier","1,6 t","chaud"]];
  mat.forEach(function(m,k){
    var X=ox[k];
    function P(x,y,z){return [X+x*A+y*F*0.62, oy-z*A-y*F*0.5];}
    function poly(pts,o){
      svg.appendChild(S("polygon",{points:pts.map(function(q){return q.join(",");}).join(" "),
        fill:V(m[2]),opacity:o,stroke:V(m[2]),"stroke-width":"1.5"}));
    }
    poly([P(0,0,1),P(0,1,1),P(1,1,1),P(1,0,1)],"0.16");
    poly([P(1,0,0),P(1,1,0),P(1,1,1),P(1,0,1)],"0.26");
    poly([P(0,0,0),P(1,0,0),P(1,0,1),P(0,0,1)],"0.38");
    svg.appendChild(S("text",{x:X+A/2,y:oy-A/2+8,"text-anchor":"middle","class":"s-lab",
      style:"font-size:22px"},m[1]));
    svg.appendChild(S("text",{x:X+A/2,y:oy+30,"text-anchor":"middle","class":"s-nom"},m[0]));
  });
  svg.appendChild(S("text",{x:W/2,y:34,"text-anchor":"middle","class":"s-tit"},
    "CE QUE PÈSE UN MÈTRE CUBE"));
  svg.appendChild(S("text",{x:W/2,y:H-40,"text-anchor":"middle","class":"s-lab",
    fill:V("froid"),style:"font-size:19px"},"masse = volume × masse volumique"));
  svg.appendChild(S("text",{x:W/2,y:H-14,"text-anchor":"middle","class":"s-pet"},
    "un camion à 13 t de charge utile ne prend que 8,1 m³ de gravier"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Trois cubes identiques, trois masses différentes. <b>C'est le volume qui remplit "+
    "la benne, mais c'est la masse qui la limite</b> — et les deux ne se rencontrent presque jamais."));
};

/* ─────────── D · croiser une ligne et une colonne ─────────── */
SCHEMAS["croiser-tableau"]=function(el){
  var W=724,H=290,X0=190,CW=136,Y0=64,RH=52;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un tarif à double entrée, et la case au croisement de la ligne et de la colonne"});
  var cols=["10 m","25 m","50 m"], lignes=["16 mm","20 mm","25 mm"];
  var prix=[[34,85,170],[42,105,210],[56,140,280]];
  var i,j;
  for(j=0;j<3;j++)
    svg.appendChild(S("text",{x:X0+j*CW+CW/2,y:Y0-16,"text-anchor":"middle","class":"s-nom"},
      cols[j]));
  for(i=0;i<3;i++){
    svg.appendChild(S("text",{x:X0-104,y:Y0+i*RH+RH/2+5,"text-anchor":"end","class":"s-nom"},
      lignes[i]));
    for(j=0;j<3;j++){
      var vise=(i===1&&j===1), sur=(i===1||j===1);
      svg.appendChild(S("rect",{x:X0+j*CW,y:Y0+i*RH,width:CW,height:RH,
        fill:V(vise?"chaud":(sur?"froid":"carte2")),opacity:vise?"0.42":(sur?"0.14":"1"),
        stroke:V("trait"),"stroke-width":"1.2"}));
      svg.appendChild(S("text",{x:X0+j*CW+CW/2,y:Y0+i*RH+RH/2+7,"text-anchor":"middle",
        "class":"s-lab",style:"font-size:19px"},prix[i][j]+" €"));
    }
  }
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-cro",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
    markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("chaud")}));
  defs.appendChild(mk); svg.appendChild(defs);
  svg.appendChild(S("line",{x1:X0-96,y1:Y0+RH+RH/2,x2:X0-16,y2:Y0+RH+RH/2,
    stroke:V("chaud"),"stroke-width":"2","marker-end":"url(#fl-cro)"}));
  svg.appendChild(S("line",{x1:X0+CW+CW/2,y1:Y0-46,x2:X0+CW+CW/2,y2:Y0-24,
    stroke:V("chaud"),"stroke-width":"2","marker-end":"url(#fl-cro)"}));
  svg.appendChild(S("text",{x:X0+3*CW+18,y:Y0+RH+RH/2+6,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"105 €"));
  svg.appendChild(S("text",{x:X0-140,y:Y0+3*RH+34,"text-anchor":"start","class":"s-pet"},
    "25 m de gaine de 20 mm : la ligne, puis la colonne, puis la case"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Une case ne se lit jamais seule : <b>elle vaut par sa ligne et par sa colonne</b>. "+
    "Relire les deux en-têtes avant d'écrire le nombre, c'est tout le travail."));
};

/* ─────────── D · l'échelle d'un plan ─────────── */
SCHEMAS["echelle-plan"]=function(el){
  var W=724,H=286,X0=110,X1=630,YA=88,YB=170;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un plan au centième : un centimètre sur le plan vaut un mètre en vrai"});
  var N=10,p=(X1-X0)/N,i;
  [[YA,"sur le plan","froid","cm"],[YB,"en vrai","chaud","m"]].forEach(function(a){
    svg.appendChild(S("line",{x1:X0,y1:a[0],x2:X1,y2:a[0],stroke:V("encre2"),
      "stroke-width":"2"}));
    svg.appendChild(S("text",{x:X0-14,y:a[0]+5,"text-anchor":"end","class":"s-nom",
      fill:V(a[2])},a[1]));
    svg.appendChild(S("text",{x:X1+14,y:a[0]+5,"text-anchor":"start","class":"s-nom"},a[3]));
  });
  for(i=0;i<=N;i++){
    var x=X0+i*p;
    [YA,YB].forEach(function(y){
      svg.appendChild(S("line",{x1:x,y1:y-8,x2:x,y2:y+8,stroke:V("encre2"),
        "stroke-width":i%5?"1":"1.8"}));
    });
    if(i%5===0){
      svg.appendChild(S("text",{x:x,y:YA-16,"text-anchor":"middle","class":"s-pet"},
        String(i)));
      svg.appendChild(S("text",{x:x,y:YB+26,"text-anchor":"middle","class":"s-pet"},
        String(i)));
    }
    svg.appendChild(S("line",{x1:x,y1:YA+10,x2:x,y2:YB-10,stroke:V("trait"),
      "stroke-width":"0.8","stroke-dasharray":"3 3"}));
  }
  /* le segment de 4,5 cm, mis en avant */
  var xa=X0+4.5*p;
  svg.appendChild(S("rect",{x:X0,y:YA-5,width:xa-X0,height:10,fill:V("froid"),
    opacity:"0.5"}));
  svg.appendChild(S("rect",{x:X0,y:YB-5,width:xa-X0,height:10,fill:V("chaud"),
    opacity:"0.5"}));
  /* les deux etiquettes sur une ligne a part : posees sur les regles, elles
     tombaient sur les graduations */
  svg.appendChild(S("text",{x:X0,y:YB+56,"text-anchor":"start","class":"s-lab",
    style:"font-size:19px"},"le segment surligné :"));
  svg.appendChild(S("text",{x:X0+186,y:YB+56,"text-anchor":"start","class":"s-lab",
    fill:V("froid"),style:"font-size:19px"},"4,5 cm sur le plan"));
  svg.appendChild(S("text",{x:X0+372,y:YB+56,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"→   4,50 m en vrai"));
  svg.appendChild(S("text",{x:W/2,y:34,"text-anchor":"middle","class":"s-tit"},
    "ÉCHELLE 1/100 — UN CENTIMÈTRE POUR UN MÈTRE"));
  svg.appendChild(S("text",{x:X0,y:H-12,"text-anchor":"start","class":"s-pet"},
    "au 1/50, la même règle du bas irait deux fois moins loin : 4,5 cm ne vaudraient que 2,25 m"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Deux règles côte à côte, graduées différemment. <b>Le réel est toujours le plus "+
    "grand</b> — si votre conversion le rapetisse, vous avez divisé au lieu de multiplier."));
};

/* ─────────── E · défaire les opérations dans l'ordre inverse ─────────── */
SCHEMAS["defaire-operations"]=function(el){
  var W=724,H=280,BW=104,BH=52,GAP=54;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un programme de calcul et son programme inverse"});
  var defs=S("defs",{});
  [["fl-al","froid"],["fl-re","chaud"]].forEach(function(m){
    var mk=S("marker",{id:m[0],viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
      markerHeight:"6",orient:"auto-start-reverse"});
    mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V(m[1])}));
    defs.appendChild(mk);
  });
  svg.appendChild(defs);
  function rangee(y,cases,ops,coul,mk,titre){
    var X0=120,i;
    svg.appendChild(S("text",{x:X0-16,y:y+BH/2+5,"text-anchor":"end","class":"s-tit",
      fill:V(coul)},titre));
    for(i=0;i<cases.length;i++){
      var x=X0+i*(BW+GAP);
      svg.appendChild(S("rect",{x:x,y:y,width:BW,height:BH,rx:"8",fill:V("carte2"),
        stroke:V(coul),"stroke-width":"1.8"}));
      svg.appendChild(S("text",{x:x+BW/2,y:y+BH/2+8,"text-anchor":"middle","class":"s-lab",
        style:"font-size:23px"},cases[i]));
      if(i<ops.length){
        svg.appendChild(S("line",{x1:x+BW+6,y1:y+BH/2,x2:x+BW+GAP-6,y2:y+BH/2,
          stroke:V(coul),"stroke-width":"2","marker-end":"url(#"+mk+")"}));
        svg.appendChild(S("text",{x:x+BW+GAP/2,y:y+BH/2-12,"text-anchor":"middle",
          "class":"s-nom",fill:V(coul)},ops[i]));
      }
    }
  }
  rangee(70,["x","25 x","140"],["× 25","+ 40"],"froid","fl-al","À L'ALLER");
  rangee(186,["140","100","4"],["− 40","÷ 25"],"chaud","fl-re","AU RETOUR");
  svg.appendChild(S("text",{x:120,y:H-12,"text-anchor":"start","class":"s-pet"},
    "on défait dans l'ordre inverse : ce qui a été ajouté en dernier s'enlève en premier"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Résoudre, c'est <b>remonter le programme à l'envers</b>. On enlève d'abord ce qui a "+
    "été ajouté en dernier — le forfait — et on divise seulement après."));
};

/* ─────────── F · les trois morceaux d'une réponse ─────────── */
SCHEMAS["phrase-reponse"]=function(el){
  var W=724,H=236,Y=104;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une phrase de réponse et ses trois morceaux obligatoires"});
  svg.appendChild(S("text",{x:48,y:38,"text-anchor":"start","class":"s-tit"},
    "UNE RÉPONSE COMPLÈTE, ET SES TROIS MORCEAUX"));
  el.appendChild(svg);   /* dans le DOM avant de mesurer */
  var mots=[["Le prix total de la tranchée","froid","ce qu'on a cherché"],
            ["est de","encre2",""],
            ["81,60","vert","le nombre"],
            ["€.","chaud","l'unité"]];
  /* Les largeurs se MESURENT : estimees au nombre de caracteres, les mots se
     chevauchaient. Meme regle que pour les barres du diagramme des themes. */
  var x=48;
  mots.forEach(function(m){
    var tx=S("text",{x:x,y:Y,"text-anchor":"start","class":"s-lab",
      fill:V(m[1]==="encre2"?"encre2":"encre"),style:"font-size:21px"},m[0]);
    svg.appendChild(tx);
    var w=tx.getComputedTextLength?tx.getComputedTextLength():m[0].length*11;
    if(m[2]){
      var r=S("rect",{x:x-7,y:Y-26,width:w+14,height:38,rx:"6",
        fill:V(m[1]),opacity:"0.16"});
      svg.insertBefore(r,tx);
      svg.appendChild(S("line",{x1:x+w/2,y1:Y+20,x2:x+w/2,y2:Y+48,
        stroke:V(m[1]),"stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:x+w/2,y:Y+68,"text-anchor":"middle","class":"s-nom",
        fill:V(m[1])},m[2]));
    }
    x+=w+14;
  });
  svg.appendChild(S("text",{x:48,y:H-16,"text-anchor":"start","class":"s-pet"},
    "« 81,6 » tout seul n'est pas une réponse : c'est un nombre trouvé sur une calculatrice"));
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Trois morceaux, et il en manque presque toujours un. <b>L'unité est celui qu'on "+
    "oublie le plus</b> — et c'est aussi celui qui coûte le plus de points."));
};






/* ─── PAC : le point de bivalence, et le piege de la puissance ─── */
SCHEMAS["bivalence"]=function(el){
  var W=880,H=440, X0=90,X1=790,Y0=50,Y1=350;
  var TMIN=-10,TMAX=18, PMAX=18;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Puissance disponible d'une pompe a chaleur et besoin du batiment "+
                 "en fonction de la temperature exterieure"});
  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(v){return Y1-v/PMAX*(Y1-Y0);}
  function nom(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"start",
    "class":cls||"s-nom",fill:V(c||"encre2")},t));}
  var dep=function(t){return 0.60*(19-t);};       /* deperditions, kW */
  var pac=function(t){return 9.6+0.34*(t+7);};    /* puissance PAC, kW */

  /* grille */
  for(var t=-10;t<=18;t+=4){
    svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
      "stroke-width":"1"}));
    nom(px(t),Y1+20,String(t),"encre2","middle","s-pet");
  }
  for(var v=0;v<=18;v+=3){
    svg.appendChild(S("line",{x1:X0,y1:py(v),x2:X1,y2:py(v),stroke:V("trait2"),
      "stroke-width":"1"}));
    nom(X0-10,py(v)+4,String(v),"encre2","end","s-pet");
  }
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X0,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  nom((X0+X1)/2,Y1+44,"température extérieure, °C","encre2","middle","s-pet");
  nom(X0,Y0-14,"puissance, kW","encre2","start","s-pet");

  /* le point de bivalence : dep(t) = pac(t) */
  var tb=(19*0.60-9.6-0.34*7)/(0.60+0.34);
  var pb=dep(tb);

  /* la zone d'appoint, a gauche de la bivalence */
  var z="M "+px(TMIN)+" "+py(dep(TMIN))+" L "+px(tb)+" "+py(pb)+
        " L "+px(tb)+" "+py(pac(tb))+" L "+px(TMIN)+" "+py(pac(TMIN))+" Z";
  svg.appendChild(S("path",{d:z,fill:V("chaud"),opacity:"0.18"}));

  function droite(f,coul,ep){
    svg.appendChild(S("line",{x1:px(TMIN),y1:py(f(TMIN)),x2:px(TMAX),y2:py(f(TMAX)),
      stroke:V(coul),"stroke-width":ep||3.5,"stroke-linecap":"round"}));
  }
  droite(dep,"chaud");
  droite(pac,"froid");
  nom(px(-9),py(dep(-9))-14,"besoin du bâtiment","chaud");
  nom(px(14),py(pac(14))-14,"puissance de la PAC","froid","end");

  /* le point de bivalence */
  svg.appendChild(S("line",{x1:px(tb),y1:py(pb),x2:px(tb),y2:Y1,stroke:V("vert"),
    "stroke-width":"2","stroke-dasharray":"5 4"}));
  svg.appendChild(S("circle",{cx:px(tb),cy:py(pb),r:"8",fill:V("carte"),
    stroke:V("vert"),"stroke-width":"3.5"}));
  nom(px(tb)+16,py(pb)-18,"point de bivalence","vert");
  nom(px(tb)+16,py(pb)+2,frs(tb,1)+" °C · "+frs(pb,1)+" kW","vert",null,"s-lab");

  /* la lecture, sous le graphe */
  nom(px(-6),(py(dep(-6))+py(pac(-6)))/2+5,"appoint","chaud","middle","s-lab");
  nom(W/2,H-14,"À la température de base, l'appoint fournit "+
    frs(dep(-7)-pac(-7),1)+" kW sur "+frs(dep(-7),1)+
    " — soit "+frs(100*(dep(-7)-pac(-7))/dep(-7),0)+" % de la puissance.",
    "encre2","middle");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>Le piège est là</b> : cette part énorme de la <i>puissance</i> ne représente "+
    "que quelques pour cent de l'<i>énergie</i> annuelle, parce que les heures les "+
    "plus froides sont rares. Dimensionner une PAC sur la puissance de base la rend "+
    "surdimensionnée les onze douzièmes de l'année."));
};

/* ─── echangeur : co-courant contre contre-courant, et le DTLM ─── */
SCHEMAS["contre-courant"]=function(el){
  var W=880,H=420;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Profils de temperature d'un echangeur en co-courant et en "+
                 "contre-courant, et construction du DTLM"});
  function nom(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"start",
    "class":cls||"s-nom",fill:V(c||"encre2")},t));}
  function panneau(X0,X1,Y0,Y1,titre,ch,fr,dtlm,sensFroid){
    nom((X0+X1)/2,Y0-24,titre,"encre2","middle","s-tit");
    svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X0,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
    var TMIN=10,TMAX=90;
    function py(t){return Y1-(t-TMIN)/(TMAX-TMIN)*(Y1-Y0);}
    svg.appendChild(S("line",{x1:X0,y1:py(ch[0]),x2:X1,y2:py(ch[1]),stroke:V("chaud"),
      "stroke-width":"3.5","stroke-linecap":"round"}));
    svg.appendChild(S("line",{x1:X0,y1:py(fr[0]),x2:X1,y2:py(fr[1]),stroke:V("froid"),
      "stroke-width":"3.5","stroke-linecap":"round"}));
    nom(X0+6,py(ch[0])-14,frs(ch[0],1)+" °C","chaud");
    nom(X1-6,py(ch[1])-14,frs(ch[1],1)+" °C","chaud","end");
    nom(X0+6,py(fr[0])+22,frs(fr[0],1)+" °C","froid");
    nom(X1-6,py(fr[1])+22,frs(fr[1],1)+" °C","froid","end");
    /* les deux ecarts aux extremites */
    [[X0+26,ch[0],fr[0],"Δ1"],[X1-26,ch[1],fr[1],"Δ2"]].forEach(function(e){
      svg.appendChild(S("line",{x1:e[0],y1:py(e[1]),x2:e[0],y2:py(e[2]),
        stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"4 3"}));
      var ym=(py(e[1])+py(e[2]))/2, ec=Math.abs(py(e[1])-py(e[2]));
      nom(e[0]+6,ec>30?ym+4:Math.max(py(e[1]),py(e[2]))+42,
          e[3]+" = "+frs(Math.abs(e[1]-e[2]),1)+" K","vert",null,"s-pet");
    });
    /* les deux sens de circulation, sous les courbes : en contre-courant le
       froid va de la droite vers la gauche, et rien d'autre ne le dit */
    [[Y1-16,1,"chaud"],[Y1-2,sensFroid||1,"froid"]].forEach(function(f){
      var xa=X0+70, xb=X1-70;
      if(f[1]<0){var t=xa;xa=xb;xb=t;}
      svg.appendChild(S("line",{x1:xa,y1:f[0],x2:xb,y2:f[0],stroke:V(f[2]),
        "stroke-width":"1.5",opacity:"0.55"}));
      svg.appendChild(S("path",{d:"M "+xb+" "+f[0]+" l "+(f[1]<0?9:-9)+" -4 l 0 8 Z",
        fill:V(f[2]),opacity:"0.55"}));
    });
    nom((X0+X1)/2,Y1+26,"le long de l'échangeur","encre2","middle","s-pet");
    nom((X0+X1)/2,Y1+50,"ΔTlog = "+dtlm+" K","encre2","middle","s-lab");
  }
  function dtlm(a,b){return frs((a-b)/Math.log(a/b),1);}
  /* Meme surface, memes debits, memes entrees : NUT = 2 et debits equilibres.
     Le contre-courant sort a 40/60, le co-courant a 50,6/49,4. */
  panneau(70,400,70,300,"CO-COURANT",[80,50.6],[20,49.4],dtlm(60,1.2));
  panneau(490,820,70,300,"CONTRE-COURANT",[80,40],[60,20],dtlm(20,20.0001),-1);
  nom(W/2,H-46,"Même surface, mêmes débits, mêmes entrées : le contre-courant "+
    "transfère 33 % de plus.","encre2","middle");
  nom(W/2,H-22,"Lui seul permet à l'eau froide de sortir plus chaude que l'eau "+
    "chaude — impossible en co-courant.","encre2","middle");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>ΔTlog = (Δ1 − Δ2) / ln(Δ1/Δ2)</b>. Quand les deux écarts sont égaux, la "+
    "formule devient indéterminée et l'écart logarithmique vaut simplement cet "+
    "écart commun — c'est le cas du contre-courant équilibré, à droite."));
};

/* ─── les quatre domaines du site, pour l'en-tete de l'accueil ─── */
SCHEMAS["quatre-domaines"]=function(el){
  var W=360,H=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les quatre domaines : la chaleur, l'eau, l'air, la régulation"});
  var cases=[
    {x:0,  y:0,  k:"echangeur",c:"chaud", n:"la chaleur"},
    {x:186,y:0,  k:"pompe",    c:"froid", n:"l'eau"},
    {x:0,  y:128,k:"filtre",   c:"vert",  n:"l'air"},
    {x:186,y:128,k:"sonde",    c:"tiede", n:"la régulation"}
  ];
  cases.forEach(function(o){
    svg.appendChild(S("rect",{x:o.x+1,y:o.y+1,width:172,height:106,rx:6,
      fill:V("carte"),stroke:V(o.c),"stroke-width":"1.5",opacity:"0.9"}));
    /* le symbole du kit, transplante et centre */
    var g=S("g",{transform:"translate("+(o.x+54)+","+(o.y+22)+") scale(1.05)"});
    var sym=symbole(o.k,o.c);
    [].slice.call(sym.childNodes).forEach(function(c){g.appendChild(c);});
    svg.appendChild(g);
    svg.appendChild(S("text",{x:o.x+86,y:o.y+92,"text-anchor":"middle",
      "class":"s-tit",fill:V(o.c)},o.n.toUpperCase()));
  });
  el.appendChild(svg);
};

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
OUTILS["latent-sensible"] = {
  titre:"Pourquoi un fluide qui bout, et pas de l'eau",
  intro:"Un kilogramme d'eau qui se refroidit, contre un kilogramme de fluide "+
        "qui s'évapore. Changez l'écart de température de l'eau : il faudrait "+
        "le pousser très loin pour rattraper le changement d'état.",
  monte:function(d){
    var P={f:"R134a", dt:5, phi:10};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Refroidissement de l'eau","dt",2,40,1,0," K",function(){calc();});
    curseur(c2,maj,P,"Puissance à transporter","phi",1,200,1,0," kW",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=190;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Ce qu'un kilogramme transporte, eau contre fluide"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var lv = lvF(P.f, 0);
      var eau = 4.185 * P.dt;
      var rap = lv / eau;
      var qmf = P.phi / lv;          /* kg/s de fluide */
      var qme = P.phi / eau;         /* kg/s d'eau */
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=250, X1=650, MAX=Math.max(lv, eau, 60);
      function bar(y, val, nom, coul, det){
        var w = Math.max(4, (X1-X0)*val/MAX);
        svg.appendChild(S("text",{x:X0-14,y:y+18,"text-anchor":"end","class":"s-nom"},nom));
        svg.appendChild(S("rect",{x:X0,y:y,width:w,height:26,rx:"4",
          fill:V(coul),opacity:"0.75"}));
        svg.appendChild(S("text",{x:X0+w+12,y:y+19,"class":"s-lab"},
          fr(val,0)+" kJ"));
        svg.appendChild(S("text",{x:X0-14,y:y+36,"text-anchor":"end","class":"s-pet"},det));
      }
      bar(40, eau, "1 kg d'eau", "froid", "en se refroidissant de "+fr(P.dt,0)+" K");
      bar(112, lv, "1 kg de "+P.f, FLUIDES[P.f].coul, "en s'évaporant, à 0 °C");
      svg.appendChild(S("text",{x:24,y:22,"class":"s-tit"},
        "CE QU'UN KILOGRAMME EMPORTE"));

      res.innerHTML = "<div class='gros'>"+
        "<span><b>Chaleur latente du "+P.f+"</b><span>"+fr(lv,0)+" kJ/kg</span></span>"+
        "<span><b>L'eau, sur "+fr(P.dt,0)+" K</b><span>"+fr(eau,0)+" kJ/kg</span></span>"+
        "<span><b>Rapport</b><span>× "+frs(rap,1)+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Débit de fluide</b><span>"+frs(qmf*3600,0)+" kg/h</span></span>"+
        "<span><b>Débit d'eau</b><span>"+frs(qme*3600,0)+" kg/h</span></span>"+
        "</div><p>Pour "+fr(P.phi,0)+" kW, il faut faire circuler <b>"+
        frs(qmf*3600,0)+" kg de "+P.f+" par heure</b> contre "+frs(qme*3600,0)+
        " kg d'eau. "+(rap>=8
          ? "Le changement d'état transporte <b>"+frs(rap,1)+" fois plus</b> par "+
            "kilogramme : c'est toute la raison d'employer un fluide qui bout."
          : "En poussant l'écart de l'eau aussi loin, on se rapproche — mais "+
            "40 K sur un circuit d'eau glacée n'existe pas.")+"</p>";
    }
    calc();
  }
};

/* ─────────── une pression, une temperature ─────────── */
OUTILS["saturation-fluides"] = {
  titre:"Le manomètre est un thermomètre",
  intro:"Tant que le liquide et sa vapeur coexistent, la pression fixe la "+
        "température. Déplacez la température : chaque fluide répond par sa "+
        "propre pression, et c'est ce que lit le manifold.",
  monte:function(d){
    var P={t:0};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    curseur(c1,maj,P,"Température de saturation","t",-40,60,1,0," °C",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=300,X0=54,X1=600,Y0=22,Y1=232;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Pression de saturation des fluides selon la température"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);
    function px(t){return X0+(X1-X0)*(t+40)/100;}
    function py(p){return Y1-(Y1-Y0)*Math.log(p/0.4)/Math.log(90/0.4);}

    function calc(){
      maj.forEach(function(x){x();});
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      [0.5,1,2,5,10,20,50].forEach(function(p){
        svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:X0-8,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
          frs(p,p<1?1:0)));
      });
      [-40,-20,0,20,40,60].forEach(function(t){
        svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:px(t),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
          String(t)));
      });
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+38,"text-anchor":"middle","class":"s-nom"},
        "température de saturation, en °C"));
      svg.appendChild(S("text",{x:X0-4,y:Y0-8,"class":"s-nom"},"pression absolue, en bar"));
      /* la courbe de chaque fluide, plus son etiquette a droite */
      var etq=[];
      NOMS_FLUIDES.forEach(function(n){
        var f=FLUIDES[n], pts=[], tmax=Math.min(60,f.tc-1);
        for (var t=-40;t<=tmax;t+=2) pts.push(px(t).toFixed(1)+","+py(psatF(n,t)).toFixed(1));
        svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",
          stroke:V(f.coul),"stroke-width":"2.4","stroke-linejoin":"round"}));
        etq.push({n:n, y:py(psatF(n,tmax)), x:px(tmax), c:f.coul});
      });
      /* on ecarte les etiquettes qui se superposent, de haut en bas */
      etq.sort(function(a,b){return a.y-b.y;});
      for (var i=1;i<etq.length;i++)
        if (etq[i].y - etq[i-1].y < 16) etq[i].y = etq[i-1].y + 16;
      etq.forEach(function(e){
        svg.appendChild(S("text",{x:e.x+10,y:e.y+4,"class":"s-lab",fill:V(e.c)},e.n));
      });
      /* le point courant sur chaque courbe */
      var lignes="";
      NOMS_FLUIDES.forEach(function(n){
        var f=FLUIDES[n];
        if (P.t > f.tc) {
          lignes += "<tr><td><b>"+n+"</b></td><td colspan='2'>au-dessus de son "+
                    "point critique, "+frs(f.tc,0)+" °C : il n'y a plus de "+
                    "liquide, donc plus de saturation</td></tr>";
          return;
        }
        var p=psatF(n,P.t);
        svg.appendChild(S("circle",{cx:px(P.t),cy:py(p),r:"5",fill:V(f.coul),
          stroke:V("carte"),"stroke-width":"1.5"}));
        lignes += "<tr><td><b>"+n+"</b></td><td>"+frs(p,2)+" bar abs.</td><td>"+
                  frs(p-1.013,2)+" bar au manomètre</td></tr>";
      });
      svg.appendChild(S("line",{x1:px(P.t),y1:Y0,x2:px(P.t),y2:Y1,stroke:V("encre"),
        "stroke-width":"1.4","stroke-dasharray":"5 4"}));
      res.innerHTML = "<table><tr><th>Fluide</th><th>Pression absolue</th>"+
        "<th>Ce que lit le manomètre</th></tr>"+lignes+"</table>"+
        "<p>À <b>"+fr(P.t,0)+" °C</b>, chaque fluide a <b>une</b> pression et une "+
        "seule. C'est pourquoi un manomètre gradué en pression porte aussi une "+
        "échelle de température, et pourquoi une simple lecture suffit à savoir "+
        "à quelle température le fluide bout dans l'évaporateur.</p>";
    }
    calc();
  }
};

/* ─────────── le cycle, en le deformant ─────────── */
OUTILS["cycle-frigo"] = {
  titre:"Le cycle, et ce que chaque réglage lui fait",
  intro:"Les quatre points se placent tout seuls dès qu'on donne deux "+
        "températures. Écartez-les, et regardez le taux de compression monter "+
        "pendant que le COP tombe.",
  monte:function(d){
    var P={f:"R134a", t0:-10, tk:40, sc:5, sr:5, phi:10};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Température d'évaporation","t0",-35,15,1,0," °C",function(){calc();});
    curseur(c1,maj,P,"Température de condensation","tk",20,60,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Surchauffe à l'aspiration","sc",0,15,1,0," K",function(){calc();});
    curseur(c2,maj,P,"Sous-refroidissement","sr",0,12,1,0," K",function(){calc();});
    curseur(c2,maj,P,"Puissance frigorifique","phi",1,100,1,0," kW",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=310,X0=52,X1=612,Y0=24,Y1=250;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Cycle frigorifique sur le diagramme pression-enthalpie"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var trans = P.tk >= f.tc - 0.5;
      var ok = (P.tk > P.t0 + 5) && !trans;
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      /* l'echelle suit le fluide : l'ammoniac ne tient pas dans celle du R134a */
      var HMIN=1e9, HMAX=-1e9, PMIN=1e9, PMAX=-1e9;
      f.p.forEach(function(r){
        var s=satF(P.f,r[0]);
        HMIN=Math.min(HMIN,s.hl); HMAX=Math.max(HMAX,s.hv);
        PMIN=Math.min(PMIN,r[1]); PMAX=Math.max(PMAX,r[1]);
      });
      HMAX += (HMAX-HMIN)*0.18;  HMIN -= (HMAX-HMIN)*0.04;
      PMIN *= 0.8; PMAX *= 1.25;
      function px(h){return X0+(X1-X0)*(h-HMIN)/(HMAX-HMIN);}
      function py(p){return Y1-(Y1-Y0)*Math.log(p/PMIN)/Math.log(PMAX/PMIN);}

      /* grille */
      var dec=[1,2,5,10,20,50,100].filter(function(p){return p>=PMIN&&p<=PMAX;});
      dec.forEach(function(p){
        svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:X0-8,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
          String(p)));
      });
      svg.appendChild(S("text",{x:X0-4,y:Y0-8,"class":"s-pet"},"p en bar"));
      svg.appendChild(S("text",{x:X1,y:Y1+34,"text-anchor":"end","class":"s-pet"},
        "h en kJ/kg"));

      /* la cloche */
      var dl="", dv="";
      f.p.forEach(function(r,i){
        var s=satF(P.f,r[0]);
        dl+=(i?"L":"M")+px(s.hl).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
        dv+=(i?"L":"M")+px(s.hv).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
      });
      svg.appendChild(S("path",{d:dl,fill:"none",stroke:V("encre"),"stroke-width":"2"}));
      svg.appendChild(S("path",{d:dv,fill:"none",stroke:V("encre"),"stroke-width":"2"}));

      var msg="", chiffres="";
      if (ok) {
        var e=satF(P.f,P.t0), c=satF(P.f,P.tk);
        var h1=e.hv + f.cpv*P.sc;
        var h3=c.hl - f.cpl*P.sr;
        var q0=h1-h3;
        var tau=c.p/e.p;
        var T1=P.t0+P.sc+273.15;
        var wis=f.cpv*T1*(Math.pow(tau,(f.gam-1)/f.gam)-1);
        var w=wis/0.70;                       /* rendement isentropique 0,70 */
        var h2=h1+w;
        var qk=h2-h3;
        var cop=qk/w, eer=q0/w;
        var carnot=(P.tk+273.15)/(P.tk-P.t0);
        var qm=P.phi/q0;                      /* kg/s */
        var pel=P.phi/eer;

        var pts=[[h1,e.p],[h2,c.p],[h3,c.p],[h3,e.p]];
        var dc="";
        pts.forEach(function(q,i){dc+=(i?"L":"M")+px(q[0]).toFixed(1)+" "+py(q[1]).toFixed(1)+" ";});
        svg.appendChild(S("path",{d:dc+"Z",fill:V(f.coul),"fill-opacity":"0.10",
          stroke:V(f.coul),"stroke-width":"2.5","stroke-linejoin":"round"}));
        pts.forEach(function(q,i){
          svg.appendChild(S("circle",{cx:px(q[0]),cy:py(q[1]),r:"9",fill:V("carte"),
            stroke:V(f.coul),"stroke-width":"2.5"}));
          svg.appendChild(S("text",{x:px(q[0]),y:py(q[1])+4,"text-anchor":"middle",
            "class":"s-pet",fill:V(f.coul)},String(i+1)));
        });
        chiffres = "<div class='gros'>"+
          "<span><b>Basse pression</b><span>"+frs(e.p,2)+" bar</span></span>"+
          "<span><b>Haute pression</b><span>"+frs(c.p,2)+" bar</span></span>"+
          "<span><b>Taux de compression</b><span>"+frs(tau,1)+"</span></span>"+
          "</div><div class='gros' style='margin-top:8px'>"+
          "<span><b>Production frigorifique</b><span>"+fr(q0,0)+" kJ/kg</span></span>"+
          "<span><b>Travail du compresseur</b><span>"+fr(w,0)+" kJ/kg</span></span>"+
          "<span><b>Rejet au condenseur</b><span>"+fr(qk,0)+" kJ/kg</span></span>"+
          "</div><div class='gros' style='margin-top:8px'>"+
          "<span><b>EER, en froid</b><span>"+frs(eer,2)+"</span></span>"+
          "<span><b>COP, en chaud</b><span>"+frs(cop,2)+"</span></span>"+
          "<span><b>Part de Carnot</b><span>"+fr(100*cop/carnot,0)+" %</span></span>"+
          "</div><div class='gros' style='margin-top:8px'>"+
          "<span><b>Débit de fluide</b><span>"+frs(qm*3600,0)+" kg/h</span></span>"+
          "<span><b>Puissance absorbée</b><span>"+frs(pel,2)+" kW</span></span>"+
          "</div>";
        msg = "<p>Le taux de compression vaut <b>"+frs(tau,1)+"</b>. Au-delà de 8, "+
              "un compresseur à piston chauffe, son rendement volumétrique s'écroule "+
              "et il faut passer à deux étages. "+
              (tau>8 ? "<b>C'est le cas ici.</b>" :
               "Ici, un seul étage suffit.")+
              " Chaque kelvin gagné sur l'évaporation vaut 2 à 3 % de COP, et "+
              "chaque kelvin perdu sur la condensation autant.</p>";
      } else if (trans) {
        msg = "<p><b>Le "+P.f+" ne condense plus au-dessus de "+frs(f.tc,0)+" °C</b> : "+
              "c'est sa température critique. Au-delà, il n'existe plus de "+
              "palier liquide-vapeur, la machine travaille en <b>transcritique</b> "+
              "et le condenseur devient un simple refroidisseur de gaz. C'est le "+
              "fonctionnement normal du CO₂, et il demande un autre organe de "+
              "détente.</p>";
      } else {
        msg = "<p><b>La condensation doit rester nettement plus chaude que "+
              "l'évaporation.</b> Sinon la machine n'a plus rien à pomper.</p>";
      }
      res.innerHTML = chiffres + msg;
    }
    calc();
  }
};

/* ─────────── la charge, le local, et la limite ─────────── */
OUTILS["charge-local"] = {
  titre:"Combien de fluide un local supporte",
  intro:"Une fuite complète met toute la charge dans le volume du local. La "+
        "norme EN 378 fixe pour chaque fluide une limite pratique, en kilos par "+
        "mètre cube. Comparez.",
  monte:function(d){
    var P={f:"R134a", m:8, v:60};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Charge de l'installation","m",0.5,80,0.5,1," kg",function(){calc();});
    curseur(c2,maj,P,"Volume du local","v",5,600,5,0," m³",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=150;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Concentration atteinte comparée à la limite pratique"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var conc=P.m/P.v;
      var r=conc/f.lp;
      var mmax=f.lp*P.v;
      var vmin=P.m/f.lp;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=40,X1=640,Y=64,HB=30;
      var ech=Math.max(conc, f.lp)*1.25;
      svg.appendChild(S("text",{x:X0,y:28,"class":"s-tit"},"CONCENTRATION SI TOUT S'ÉCHAPPE"));
      svg.appendChild(S("rect",{x:X0,y:Y,width:X1-X0,height:HB,rx:"4",
        fill:V("trait2"),opacity:"0.35"}));
      var wc=Math.min(X1-X0,(X1-X0)*conc/ech);
      svg.appendChild(S("rect",{x:X0,y:Y,width:Math.max(3,wc),height:HB,rx:"4",
        fill:V(r>1?"chaud":"vert"),opacity:"0.8"}));
      var xl=X0+(X1-X0)*f.lp/ech;
      svg.appendChild(S("line",{x1:xl,y1:Y-12,x2:xl,y2:Y+HB+12,stroke:V("encre"),
        "stroke-width":"2.4"}));
      svg.appendChild(S("text",{x:xl,y:Y-18,"text-anchor":"middle","class":"s-lab"},
        "limite pratique"));
      svg.appendChild(S("text",{x:X0,y:Y+HB+28,"class":"s-pet"},
        frs(conc,3)+" kg/m³ atteints"));
      svg.appendChild(S("text",{x:X1,y:Y+HB+28,"text-anchor":"end","class":"s-pet"},
        "limite "+P.f+" : "+frs(f.lp,3)+" kg/m³"));

      var verdict = r<=1
        ? "<b>Sous la limite.</b> Une fuite totale resterait sous la concentration "+
          "que la norme admet dans un local occupé."
        : "<b>Au-dessus de la limite, d'un facteur "+frs(r,1)+".</b> Il faut un "+
          "local technique dédié, une ventilation mécanique et une détection, ou "+
          "réduire la charge.";
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Concentration atteinte</b><span>"+frs(conc,3)+" kg/m³</span></span>"+
        "<span><b>Limite pratique</b><span>"+frs(f.lp,3)+" kg/m³</span></span>"+
        "<span><b>Classe de sécurité</b><span>"+f.classe+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Charge maximale ici</b><span>"+frs(mmax,1)+" kg</span></span>"+
        "<span><b>Volume minimal</b><span>"+fr(vmin,0)+" m³</span></span>"+
        "<span><b>Équivalent CO₂</b><span>"+fr(P.m*f.gwp/1000,1)+" t</span></span>"+
        "</div><p>"+verdict+" Le "+P.f+" est classé <b>"+f.classe+"</b> : "+
        (f.classe.charAt(0)==="A" ? "faible toxicité" : "toxicité plus élevée")+
        (f.classe.indexOf("3")>0 ? ", et <b>très inflammable</b>."
         : f.classe.indexOf("2L")>0 ? ", et <b>faiblement inflammable</b>."
         : ", non inflammable.")+"</p>";
    }
    calc();
  }
};

/* ─────────── le circuit et ses organes annexes ─────────── */
SCHEMAS["circuit-frigo"] = function(el){
  var W=1000,H=420;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Circuit frigorifique complet : quatre organes principaux et les organes annexes"});
  el.appendChild(svg);
  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function tube(x1,y1,x2,y2,coul,ep){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":ep||3.2,"stroke-linecap":"round"}));
  }
  function boite(x,y,w,h,t,coul,det){
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"5",fill:V("carte")}));
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"5",fill:V(coul),
      opacity:"0.16",stroke:V(coul),"stroke-width":"1.8"}));
    txt(x+w/2,y+h/2+(det?-2:5),t,"s-nom");
    if(det) txt(x+w/2,y+h/2+16,det,"s-pet");
  }
  function rond(cx,cy,r,t,coul){
    svg.appendChild(S("circle",{cx:cx,cy:cy,r:r,fill:V("carte"),
      stroke:V(coul),"stroke-width":"1.8"}));
    txt(cx,cy+4,t,"s-pet",null,coul);
  }

  var YH=118, YB=306, XL=96, XR=884;

  /* les deux zones de pression, posees avant les traits */
  svg.appendChild(S("rect",{x:60,y:74,width:880,height:92,rx:"8",
    fill:V("chaud"),opacity:"0.07"}));
  svg.appendChild(S("rect",{x:60,y:262,width:880,height:92,rx:"8",
    fill:V("froid"),opacity:"0.07"}));
  txt(72,66,"HAUTE PRESSION","s-tit","start","chaud");
  txt(72,376,"BASSE PRESSION","s-tit","start","froid");

  /* la ligne haute : refoulement, condenseur, liquide */
  tube(XL,YH,XR,YH,"chaud");
  boite(470,YH-30,150,60,"CONDENSEUR","chaud","le fluide se liquéfie");
  rond(300,YH,17,"SH","chaud");
  txt(300,YH-28,"séparateur","s-pet");
  txt(300,YH+34,"d'huile","s-pet");
  rond(706,YH,17,"BL","chaud");
  txt(706,YH-28,"bouteille","s-pet");
  txt(706,YH+34,"de liquide","s-pet");
  rond(790,YH,17,"FD","chaud");
  txt(790,YH+34,"déshydrateur","s-pet");

  /* la descente a droite : rouge au-dessus du detendeur, bleu en dessous.
     Le detendeur EST la frontiere : la couleur doit changer sur lui. */
  tube(XR,YH,XR,194,"chaud",3.2);
  tube(XR,250,XR,YB,"froid",3.2);
  boite(XR-72,196,144,52,"DÉTENDEUR","vert","la pression chute");

  /* la ligne basse : evaporateur, aspiration */
  tube(XR,YB,XL,YB,"froid");
  boite(400,YB-30,150,60,"ÉVAPORATEUR","froid","le fluide bout");
  rond(322,YB,17,"BA","froid");
  txt(322,YB+34,"bouteille anti-coups","s-pet");

  /* la montee a gauche : bleu a l aspiration, rouge au refoulement.
     Le compresseur est l autre frontiere. */
  tube(XL,YB,XL,246,"froid",3.2);
  tube(XL,178,XL,YH,"chaud",3.2);
  svg.appendChild(S("circle",{cx:XL,cy:212,r:"32",fill:V("carte"),
    stroke:V("encre"),"stroke-width":"2.2"}));
  svg.appendChild(S("path",{d:"M "+(XL-12)+" 198 L "+(XL+14)+" 212 L "+(XL-12)+" 226 Z",
    fill:V("encre"),opacity:"0.85"}));
  txt(XL,168,"COMPRESSEUR","s-nom");
  txt(XL,262,"il élève la pression","s-pet");

  /* les securites */
  rond(178,YH,15,"HP","chaud");
  rond(178,YB,15,"BP","froid");
  txt(178,YH-26,"pressostat","s-pet");
  txt(178,YB+32,"pressostat","s-pet");

  /* les quatre reperes du cycle */
  [[140,YB,"1"],[140,YH,"2"],[650,YH,"3"],[XR,268,"4"]]
    .forEach(function(q){
      svg.appendChild(S("circle",{cx:q[0],cy:q[1],r:"11",fill:V("encre")}));
      txt(q[0],q[1]+4,q[2],"s-pet",null,"carte");
    });

  var lg=E("p",{"class":"leg-schema"},
    "<b>Quatre organes font le cycle</b> : compresseur, condenseur, détendeur, "+
    "évaporateur. Tout le reste protège la machine ou son huile. La ligne rouge "+
    "est à la haute pression, la bleue à la basse : <b>le détendeur et le "+
    "compresseur sont les deux seules frontières</b> entre elles.");
  (el.parentNode||el).appendChild(lg);
};


/* ─────────── l'embleme d'en-tete : la boucle en petit ─────────── */
SCHEMAS["frigo-embleme"]=function(el){
  var W=300,H=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"La boucle frigorifique : condenseur en haut à la haute pression, "+
                 "évaporateur en bas à la basse pression, compresseur et détendeur "+
                 "aux deux frontières"});
  el.appendChild(svg);

  var XL=54, XR=246, YH=54, YB=196;
  function trait(x1,y1,x2,y2,coul){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":"4","stroke-linecap":"round"}));
  }
  function txt(x,y,t,cls,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":"middle","class":cls||"s-pet",
      fill:V(coul||"encre2")},t));
  }
  /* une pointe qui donne le sens de circulation */
  function pointe(x,y,dx,dy,coul){
    var px=-dy, py=dx;
    svg.appendChild(S("path",{d:"M "+(x+9*dx)+" "+(y+9*dy)+
      " L "+(x-5*dx+6*px)+" "+(y-5*dy+6*py)+
      " L "+(x-5*dx-6*px)+" "+(y-5*dy-6*py)+" Z",fill:V(coul)}));
  }

  /* la boucle, coupee la ou se trouve un organe */
  trait(XL,YH,112,YH,"chaud");   trait(188,YH,XR,YH,"chaud");
  trait(XR,YH,XR,111,"chaud");   trait(XR,139,XR,YB,"froid");
  trait(XR,YB,188,YB,"froid");   trait(112,YB,XL,YB,"froid");
  trait(XL,YB,XL,149,"froid");   trait(XL,101,XL,YH,"chaud");

  pointe(88,YH,1,0,"chaud");     /* le haut part vers la droite */
  pointe(XR,170,0,1,"froid");    /* la droite descend */
  pointe(88,YB,-1,0,"froid");    /* le bas revient vers la gauche */
  pointe(XL,80,0,-1,"chaud");    /* la gauche remonte */

  /* les deux echangeurs */
  function echangeur(cy,coul){
    svg.appendChild(S("rect",{x:112,y:cy-13,width:76,height:26,rx:"4",
      fill:V("carte")}));
    svg.appendChild(S("rect",{x:112,y:cy-13,width:76,height:26,rx:"4",
      fill:V(coul),opacity:"0.20",stroke:V(coul),"stroke-width":"2.2"}));
    for(var i=1;i<=3;i++)
      svg.appendChild(S("line",{x1:112+i*19,y1:cy-8,x2:112+i*19,y2:cy+8,
        stroke:V(coul),"stroke-width":"1.6"}));
  }
  echangeur(YH,"chaud");
  echangeur(YB,"froid");

  /* le compresseur, et le detendeur : les deux frontieres de pression */
  svg.appendChild(S("circle",{cx:XL,cy:125,r:"24",fill:V("carte"),
    stroke:V("encre"),"stroke-width":"2.4"}));
  svg.appendChild(S("path",{d:"M "+(XL-8)+" 113 L "+(XL+11)+" 125 L "+(XL-8)+" 137 Z",
    fill:V("encre"),opacity:"0.85"}));
  svg.appendChild(S("path",{d:"M "+(XR-13)+" 111 L "+(XR+13)+" 139 M "+
    (XR+13)+" 111 L "+(XR-13)+" 139 M "+(XR-13)+" 111 L "+(XR-13)+" 139 M "+
    (XR+13)+" 111 L "+(XR+13)+" 139",
    stroke:V("vert"),"stroke-width":"2.4",fill:"none","stroke-linejoin":"round"}));

  txt(150,30,"HAUTE PRESSION","s-pet","chaud");
  txt(150,86,"condenseur","s-pet");
  txt(150,170,"évaporateur","s-pet");
  txt(150,228,"BASSE PRESSION","s-pet","froid");
};

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
OUTILS["bilan-chambre-froide"] = {
  titre:"Le bilan frigorifique d'une chambre froide",
  intro:"Sept postes, et le plus gros n'est presque jamais celui qu'on croit. "+
        "Déplacez le volume, la consigne, l'isolant, le tonnage : regardez la "+
        "part de chacun se retourner.",
  monte:function(d){
    var P={v:60, tc:2, te:25, e:100, ton:1.5, den:"Fruits et légumes",
           tent:15, marche:16};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    curseur(c1,maj,P,"Volume de la chambre","v",5,600,5,0," m³",function(){calc();});
    curseur(c1,maj,P,"Température de consigne","tc",-25,8,1,0," °C",function(){calc();});
    curseur(c1,maj,P,"Épaisseur d'isolant","e",60,200,10,0," mm",function(){calc();});
    curseur(c1,maj,P,"Température du local","te",15,35,1,0," °C",function(){calc();});
    maj.push(choixListe(c2,P,"den",NOMS_DENREES,"Denrée entreposée",
      function(){calc();},function(n){return DENREES[n].resp?"respire":"inerte";}));
    curseur(c2,maj,P,"Entrées par jour","ton",0,10,0.5,1," t",function(){calc();});
    curseur(c2,maj,P,"Température d'entrée","tent",-18,30,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Marche du groupe","marche",12,22,1,0," h/j",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=250;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Les sept postes du bilan frigorifique"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var D = DENREES[P.den];
      var a = Math.pow(P.v, 1/3), S6 = 6*a*a, sol = a*a;   /* chambre cubique */
      var U = 1/(0.13 + (P.e/1000)/0.023 + 0.04);
      var dt = P.te - P.tc;

      /* 1. parois */
      var q1 = U*S6*dt/1000;
      /* 2. renouvellement d'air : n par 24 h, table usuelle 70/racine(V) */
      var n = 70/Math.sqrt(P.v) * (P.tc<0 ? 0.6 : 1);
      var rho = 353/(P.tc+273.15);
      var dh = Math.max(0, hAir(P.te,0.60) - hAir(P.tc,0.90));
      var q2 = n*P.v*rho*dh/86400;
      /* 3. denrees : sensible au-dessus, latent, sensible au-dessous */
      var m = P.ton*1000, E=0;
      var t1 = Math.max(P.tent, D.tc), t2 = Math.max(P.tc, D.tc);
      if (P.tent > t2) E += m*D.cp1*(t1-t2);
      if (P.tc < D.tc && P.tent > D.tc) { E += m*D.lf; E += m*D.cp2*(D.tc-P.tc); }
      else if (P.tc < D.tc) E += m*D.cp2*(Math.min(P.tent,D.tc)-P.tc);
      var q3 = E/86400;
      /* 4. respiration */
      var q4 = D.resp*P.ton*Math.pow(2,(P.tc-5)/10)/1000;
      /* 5. personnel : 2 personnes, 2 h par jour */
      var q5 = 2*(270-6*P.tc)*2/24/1000;
      /* 6. eclairage : 6 W/m2 de sol, 4 h par jour */
      var q6 = 6*sol*4/24/1000;
      var partiel = q1+q2+q3+q4+q5+q6;
      /* 7. moteurs de ventilateurs, et degivrage en negatif */
      var q7 = partiel*(0.05 + (P.tc<0 ? 0.03 : 0));
      var tot = partiel+q7;
      var maj10 = tot*1.10;
      var inst = maj10*24/P.marche;

      var postes=[["Parois",q1],["Renouvellement d'air",q2],["Denrées",q3],
                  ["Respiration",q4],["Personnel",q5],["Éclairage",q6],
                  ["Ventilateurs, dégivrage",q7]];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=200,X1=590,Y=34,HL=29;
      var mx=Math.max.apply(null,postes.map(function(p){return p[1];}))||1;
      svg.appendChild(S("text",{x:20,y:20,"class":"s-tit"},"LES SEPT POSTES, EN kW"));
      postes.forEach(function(p,i){
        var y=Y+i*HL, w=Math.max(2,(X1-X0)*p[1]/mx);
        svg.appendChild(S("text",{x:X0-12,y:y+14,"text-anchor":"end","class":"s-nom"},p[0]));
        svg.appendChild(S("rect",{x:X0,y:y,width:w,height:19,rx:"3",
          fill:V(p[1]/tot>0.3?"chaud":"froid"),opacity:"0.78"}));
        svg.appendChild(S("text",{x:X0+w+10,y:y+14,"class":"s-lab"},
          frs(p[1],2)+"  "+fr(100*p[1]/tot,0)+" %"));
      });
      var chef = postes.slice().sort(function(x,y){return y[1]-x[1];})[0];
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Surface déperditive</b><span>"+fr(S6,0)+" m²</span></span>"+
        "<span><b>U des panneaux</b><span>"+frs(U,3)+" W/(m²·K)</span></span>"+
        "<span><b>Renouvellements</b><span>"+frs(n,1)+" /jour</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Besoin sur 24 h</b><span>"+frs(tot,2)+" kW</span></span>"+
        "<span><b>Avec 10 % de marge</b><span>"+frs(maj10,2)+" kW</span></span>"+
        "<span><b>À installer, "+fr(P.marche,0)+" h/j</b><span>"+frs(inst,2)+" kW</span></span>"+
        "</div><p><b>Le poste dominant est « "+chef[0].toLowerCase()+" », à "+
        fr(100*chef[1]/tot,0)+" %.</b> "+
        (chef[0]==="Parois"
          ? "Chambre peu chargée : c'est l'enveloppe qui commande, et l'isolant est le bon levier."
          : chef[0]==="Denrées"
          ? "Chambre de refroidissement : c'est la marchandise qui commande, pas les parois. Épaissir l'isolant n'y changerait presque rien."
          : "Poste inhabituel en tête : vérifiez les données avant de dimensionner.")+
        " La puissance à installer se calcule sur les <b>"+fr(P.marche,0)+
        " heures de marche</b>, pas sur 24 : le groupe doit rattraper ses arrêts "+
        "de dégivrage.</p>";
    }
    calc();
  }
};

/* ─────────── le cycle bi-etage, contre le mono-etage ─────────── */
OUTILS["cycle-bietage"] = {
  titre:"Un étage ou deux, et la température de refoulement",
  intro:"Descendez l'évaporation. Le taux de compression monte, et la "+
        "température de refoulement avec lui — c'est elle, pas le COP, qui "+
        "impose le second étage.",
  monte:function(d){
    var P={f:"R134a", t0:-30, tk:40, sc:5};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Température d'évaporation","t0",-45,-5,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Température de condensation","tk",25,50,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Surchauffe","sc",0,12,1,0," K",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=220;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Températures de refoulement comparées, un étage et deux"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f], k=(f.gam-1)/f.gam, ETA=0.70;
      var ok = P.tk > P.t0+10 && P.tk < f.tc-1;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!ok) {
        res.innerHTML = "<p><b>Écart impossible pour ce fluide.</b> La "+
          "condensation doit dépasser l'évaporation d'au moins 10 K et rester "+
          "sous la température critique, "+frs(f.tc,0)+" °C.</p>";
        return;
      }
      var p0=psatF(P.f,P.t0), pk=psatF(P.f,P.tk), pi=Math.sqrt(p0*pk);
      /* la temperature intermediaire, par recherche sur la table */
      var ti=P.t0; for (var t=P.t0; t<=P.tk; t+=0.1) if (psatF(P.f,t)<=pi) ti=t;
      var T1=P.t0+P.sc+273.15, Ti=ti+273.15;
      var tau=pk/p0, tau1=pi/p0, tau2=pk/pi;
      /* mono-etage */
      var wM=f.cpv*T1*(Math.pow(tau,k)-1)/ETA;
      var trefM=(T1*Math.pow(tau,k)-273.15) + (wM-f.cpv*T1*(Math.pow(tau,k)-1))/f.cpv;
      var e0=satF(P.f,P.t0), ek=satF(P.f,P.tk), ei=satF(P.f,ti);
      var h1=e0.hv+f.cpv*P.sc;
      var q0M=h1-ek.hl, eerM=q0M/wM;
      /* bi-etage, bouteille intermediaire a injection totale */
      var w1=f.cpv*T1*(Math.pow(tau1,k)-1)/ETA;
      var w2=f.cpv*Ti*(Math.pow(tau2,k)-1)/ETA;
      var tref1=(T1*Math.pow(tau1,k)-273.15)+(w1-f.cpv*T1*(Math.pow(tau1,k)-1))/f.cpv;
      var tref2=(Ti*Math.pow(tau2,k)-273.15)+(w2-f.cpv*Ti*(Math.pow(tau2,k)-1))/f.cpv;
      var h2bp=h1+w1;
      var ratio=(h2bp-ei.hl)/(ei.hv-ek.hl);          /* debit HP / debit BP */
      var q0B=h1-ei.hl;
      var eerB=q0B/(w1+ratio*w2);
      var gain=100*(eerB/eerM-1);

      /* deux colonnes de temperature de refoulement */
      var X=[190,430], LIM=110;
      var Y0=54, Y1=180, TMAX=Math.max(160, trefM+15);
      function py(t){return Y1-(Y1-Y0)*t/TMAX;}
      svg.appendChild(S("text",{x:20,y:26,"class":"s-tit"},
        "TEMPÉRATURE DE REFOULEMENT"));
      svg.appendChild(S("line",{x1:120,y1:py(LIM),x2:600,y2:py(LIM),
        stroke:V("chaud"),"stroke-width":"2","stroke-dasharray":"6 4"}));
      svg.appendChild(S("text",{x:606,y:py(LIM)+4,"class":"s-pet",fill:V("chaud")},
        "limite 110 °C"));
      [[X[0],trefM,"un seul étage"],[X[1],Math.max(tref1,tref2),"deux étages"]]
        .forEach(function(c){
          var h=Math.max(3,Y1-py(c[1]));
          svg.appendChild(S("rect",{x:c[0]-46,y:py(c[1]),width:92,height:h,rx:"4",
            fill:V(c[1]>LIM?"chaud":"vert"),opacity:"0.8"}));
          /* la valeur rentre dans la barre des qu'il y a la place : posee
             au-dessus, elle vient s'ecrire sur la ligne de limite */
          var dedans = h >= 34;
          svg.appendChild(S("text",{x:c[0],y:py(c[1])+(dedans?21:-10),
            "text-anchor":"middle","class":"s-lab",
            fill:V(dedans?"carte":"encre")},fr(c[1],0)+" °C"));
          svg.appendChild(S("text",{x:c[0],y:Y1+20,"text-anchor":"middle",
            "class":"s-nom"},c[2]));
        });
      svg.appendChild(S("line",{x1:120,y1:Y1,x2:600,y2:Y1,stroke:V("trait"),
        "stroke-width":"1.5"}));

      /* le modele en gaz parfait est cale sur la plage d'enseignement :
         au-dela de 180 °C estimes il ne vaut plus rien, on le dit */
      var horsPlage = trefM > 180;
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Taux total</b><span>"+frs(tau,1)+"</span></span>"+
        "<span><b>Pression intermédiaire</b><span>"+frs(pi,2)+" bar</span></span>"+
        "<span><b>Température intermédiaire</b><span>"+fr(ti,0)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Refoulement, 1 étage</b><span>"+fr(trefM,0)+" °C</span></span>"+
        "<span><b>Refoulement, 2 étages</b><span>"+fr(Math.max(tref1,tref2),0)+" °C</span></span>"+
        "<span><b>Débit HP / débit BP</b><span>"+frs(ratio,2)+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>EER, 1 étage</b><span>"+frs(eerM,2)+"</span></span>"+
        "<span><b>EER, 2 étages</b><span>"+frs(eerB,2)+"</span></span>"+
        "<span><b>Gain</b><span>"+(gain>=0?"+":"")+fr(gain,0)+" %</span></span>"+
        "</div><p>"+(horsPlage
          ? "<b>Estimation hors plage.</b> Au-dela de 180 °C, le calcul en gaz "+
            "parfait surestime largement le refoulement : retenez que ce point "+
            "de fonctionnement est impraticable en un seul étage, pas le nombre "+
            "affiché."
          : trefM>LIM
          ? "<b>Le mono-étage refoule à "+fr(trefM,0)+" °C : au-delà de 110 °C "+
            "l'huile se dégrade et les clapets souffrent.</b> Le second étage "+
            "ramène le refoulement à "+fr(Math.max(tref1,tref2),0)+" °C, et il "+
            "gagne au passage "+fr(gain,0)+" % d'efficacité. C'est la "+
            "température, pas le COP, qui a imposé la décision."
          : "Le mono-étage tient : "+fr(trefM,0)+" °C au refoulement, sous la "+
            "limite de 110 °C. Le bi-étage ne rapporterait que "+fr(gain,0)+
            " % — pas de quoi doubler le compresseur et ajouter une bouteille.")+
        "</p>";
    }
    calc();
  }
};

/* ─────────── TEWI : ce que la machine pese vraiment ─────────── */
OUTILS["tewi"] = {
  titre:"TEWI — la fuite contre la consommation",
  intro:"Le fluide qui s'échappe compte, l'électricité consommée aussi. Le "+
        "TEWI additionne les deux sur la vie de la machine, et dit lequel "+
        "domine.",
  monte:function(d){
    var P={f:"R410A", m:12, fuite:6, vie:15, recup:80, conso:24000, beta:60};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Charge de fluide","m",1,200,1,0," kg",function(){calc();});
    curseur(c1,maj,P,"Taux de fuite annuel","fuite",0,20,0.5,1," %",function(){calc();});
    curseur(c1,maj,P,"Durée de vie","vie",5,25,1,0," ans",function(){calc();});
    curseur(c2,maj,P,"Récupération en fin de vie","recup",0,95,5,0," %",function(){calc();});
    curseur(c2,maj,P,"Consommation annuelle","conso",1000,200000,1000,0," kWh",function(){calc();});
    curseur(c2,maj,P,"Contenu carbone du kWh","beta",20,500,10,0," g",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=150;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Part directe et part indirecte du TEWI"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var fuites = f.gwp*P.m*(P.fuite/100)*P.vie;               /* kg CO2e */
      var finvie = f.gwp*P.m*(1-P.recup/100);
      var direct = fuites+finvie;
      var indirect = P.vie*P.conso*P.beta/1000;
      var tot = direct+indirect;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=30,X1=650,Y=52,HB=34;
      var wd = tot>0 ? (X1-X0)*direct/tot : 0;
      svg.appendChild(S("text",{x:X0,y:30,"class":"s-tit"},
        "TEWI SUR "+fr(P.vie,0)+" ANS"));
      svg.appendChild(S("rect",{x:X0,y:Y,width:X1-X0,height:HB,rx:"4",
        fill:V("froid"),opacity:"0.55"}));
      svg.appendChild(S("rect",{x:X0,y:Y,width:Math.max(2,wd),height:HB,rx:"4",
        fill:V("chaud"),opacity:"0.85"}));
      svg.appendChild(S("text",{x:X0+6,y:Y+HB+22,"class":"s-pet",fill:V("chaud")},
        "direct, le fluide : "+fr(100*direct/tot,0)+" %"));
      svg.appendChild(S("text",{x:X1-6,y:Y+HB+22,"text-anchor":"end","class":"s-pet",
        fill:V("froid")},"indirect, l'électricité : "+fr(100*indirect/tot,0)+" %"));

      res.innerHTML = "<div class='gros'>"+
        "<span><b>GWP du "+P.f+"</b><span>"+fr(f.gwp,0)+"</span></span>"+
        "<span><b>Fuites sur la vie</b><span>"+fr(fuites/1000,1)+" t CO₂e</span></span>"+
        "<span><b>Fin de vie</b><span>"+fr(finvie/1000,1)+" t CO₂e</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Part directe</b><span>"+fr(direct/1000,1)+" t</span></span>"+
        "<span><b>Part indirecte</b><span>"+fr(indirect/1000,1)+" t</span></span>"+
        "<span><b>TEWI total</b><span>"+fr(tot/1000,1)+" t CO₂e</span></span>"+
        "</div><p>"+(direct>indirect
          ? "<b>Ici c'est le fluide qui domine.</b> Changer pour un fluide à bas "+
            "GWP rapporterait plus que tous les gains de rendement possibles."
          : "<b>Ici c'est l'électricité qui domine, à "+fr(100*indirect/tot,0)+
            " %.</b> Un point de COP gagné pèse alors plus qu'une étanchéité "+
            "parfaite — et c'est le cas courant sur un réseau électrique peu "+
            "carboné.")+" Le contenu carbone du kWh est le paramètre qui "+
        "retourne la conclusion : essayez 20 g, puis 400.</p>";
    }
    calc();
  }
};

/* ─────────── le protocole de refroidissement ─────────── */
OUTILS["temps-refroidissement"] = {
  titre:"Descendre une denrée en température",
  intro:"L'énergie à retirer se lit en trois morceaux : avant la congélation, "+
        "pendant, et après. Le palier ne se voit pas au thermomètre et coûte "+
        "pourtant le plus cher.",
  monte:function(d){
    var P={den:"Viande fraîche", m:300, t1:63, t2:3, pui:6};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixListe(c1,P,"den",NOMS_DENREES,"Denrée",function(){calc();},
      function(n){return "congèle à "+frs(DENREES[n].tc,1)+" °C";}));
    curseur(c1,maj,P,"Masse à traiter","m",10,3000,10,0," kg",function(){calc();});
    curseur(c2,maj,P,"Température de départ","t1",-10,90,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Température visée","t2",-30,20,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Puissance disponible","pui",0.5,60,0.5,1," kW",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=260,X0=60,X1=630,Y0=30,Y1=200;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Descente en température, avec le palier de congélation"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var D=DENREES[P.den];
      if (P.t2 >= P.t1) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        res.innerHTML="<p><b>La température visée doit être sous celle de départ.</b></p>";
        return;
      }
      var m=P.m;
      var hautT1=Math.max(P.t1,D.tc), hautT2=Math.max(P.t2,D.tc);
      var Es = (P.t1>D.tc) ? m*D.cp1*(hautT1-hautT2) : 0;
      var El = (P.t2<D.tc && P.t1>D.tc) ? m*D.lf : 0;
      var Eb = (P.t2<D.tc) ? m*D.cp2*(Math.min(P.t1,D.tc)-P.t2) : 0;
      var tot=Es+El+Eb;                               /* kJ */
      var h=tot/(P.pui*3600);                          /* heures */
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la courbe : temps en abscisse, temperature en ordonnee */
      var TMAX=Math.max(P.t1,10), TMIN=Math.min(P.t2,-5);
      function px(x){return X0+(X1-X0)*x/Math.max(tot,1);}
      function py(t){return Y1-(Y1-Y0)*(t-TMIN)/(TMAX-TMIN);}
      var pts=[[0,P.t1],[Es,hautT2]];
      if (El>0) pts.push([Es+El, D.tc]);
      if (Eb>0) pts.push([Es+El+Eb, P.t2]);
      svg.appendChild(S("polyline",{points:pts.map(function(q){
        return px(q[0]).toFixed(1)+","+py(q[1]).toFixed(1);}).join(" "),
        fill:"none",stroke:V("froid"),"stroke-width":"3.2","stroke-linejoin":"round"}));
      if (El>0){
        svg.appendChild(S("rect",{x:px(Es),y:Y0,width:px(Es+El)-px(Es),height:Y1-Y0,
          fill:V("chaud"),opacity:"0.10"}));
        svg.appendChild(S("text",{x:(px(Es)+px(Es+El))/2,y:Y0+16,
          "text-anchor":"middle","class":"s-pet",fill:V("chaud")},"palier de congélation"));
      }
      svg.appendChild(S("line",{x1:X0,y1:py(0),x2:X1,y2:py(0),stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:X0-8,y:py(0)+4,"text-anchor":"end","class":"s-pet"},"0 °C"));
      svg.appendChild(S("text",{x:X0-8,y:py(P.t1)+4,"text-anchor":"end","class":"s-pet"},
        fr(P.t1,0)+" °C"));
      svg.appendChild(S("text",{x:X0-8,y:py(P.t2)+4,"text-anchor":"end","class":"s-pet"},
        fr(P.t2,0)+" °C"));
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+34,"text-anchor":"middle","class":"s-nom"},
        "énergie retirée, de gauche à droite"));

      var reg = (P.t1>=63 && P.t2<=10);
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Avant congélation</b><span>"+fr(Es/1000,0)+" MJ</span></span>"+
        "<span><b>Palier</b><span>"+fr(El/1000,0)+" MJ</span></span>"+
        "<span><b>Après congélation</b><span>"+fr(Eb/1000,0)+" MJ</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Énergie totale</b><span>"+fr(tot/3600,0)+" kWh</span></span>"+
        "<span><b>Durée</b><span>"+frs(h,1)+" h</span></span>"+
        "<span><b>Part du palier</b><span>"+fr(100*El/tot,0)+" %</span></span>"+
        "</div><p>"+(El>0
          ? "<b>Le palier pèse "+fr(100*El/tot,0)+" % de l'énergie</b> et le "+
            "thermomètre n'y bouge pas : c'est là que se perdent les protocoles "+
            "réglés au chronomètre plutôt qu'à la sonde à cœur."
          : "Pas de congélation ici : toute l'énergie est sensible, et la "+
            "descente est régulière.")+
        (reg ? " <b>Refroidissement rapide :</b> la réglementation demande de "+
               "passer de +63 à +10 °C en moins de deux heures ; il en faut "+
               frs(h,1)+" avec cette puissance — "+
               (h<=2 ? "c'est tenu." : "<b>c'est trop long.</b>") : "")+"</p>";
    }
    calc();
  }
};

/* ─────────── le retour d'huile dans une colonne montante ─────────── */
OUTILS["retour-huile"] = {
  titre:"La vitesse qui ramène l'huile",
  intro:"L'huile sort du compresseur et doit y revenir. Dans une colonne "+
        "montante, seule la vitesse de la vapeur la remonte. Réduisez la "+
        "puissance : la vitesse tombe, et l'huile reste en bas.",
  monte:function(d){
    var P={f:"R134a", phi:20, t0:-10, tk:40, dia:22, charge:100};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Puissance frigorifique","phi",1,120,1,0," kW",function(){calc();});
    curseur(c1,maj,P,"Taux de charge du compresseur","charge",30,100,5,0," %",function(){calc();});
    curseur(c2,maj,P,"Température d'évaporation","t0",-35,10,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Diamètre intérieur","dia",10,80,1,0," mm",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=170;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Vitesse de la vapeur aspirée, comparée au minimum d'entraînement"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);
    var VMIN=6, VMAX=15;         /* montante : entrainement 6 m/s, bruit 15 */

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var e=satF(P.f,P.t0), k=satF(P.f,P.tk);
      var q0=e.hv+f.cpv*5-k.hl;                       /* kJ/kg, surchauffe 5 K */
      var qm=P.phi*(P.charge/100)/q0;                 /* kg/s */
      var rhov=psatF(P.f,P.t0)*1e5*f.M/(8314*(P.t0+273.15+5));
      var Sec=Math.PI*Math.pow(P.dia/1000,2)/4;
      var v=qm/(rhov*Sec);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=40,X1=640,Y=60,HB=30,ECH=Math.max(VMAX*1.15,v*1.1);
      svg.appendChild(S("text",{x:X0,y:32,"class":"s-tit"},
        "VITESSE DANS LA COLONNE MONTANTE"));
      svg.appendChild(S("rect",{x:X0,y:Y,width:X1-X0,height:HB,rx:"4",
        fill:V("trait2"),opacity:"0.35"}));
      var xa=X0+(X1-X0)*VMIN/ECH, xb=X0+(X1-X0)*VMAX/ECH;
      svg.appendChild(S("rect",{x:xa,y:Y,width:xb-xa,height:HB,
        fill:V("vert"),opacity:"0.22"}));
      var w=Math.min(X1-X0,(X1-X0)*v/ECH);
      svg.appendChild(S("rect",{x:X0,y:Y+6,width:Math.max(3,w),height:HB-12,rx:"3",
        fill:V(v<VMIN?"chaud":(v>VMAX?"chaud":"vert")),opacity:"0.9"}));
      [[xa,"6 m/s"],[xb,"15 m/s"]].forEach(function(c){
        svg.appendChild(S("line",{x1:c[0],y1:Y-10,x2:c[0],y2:Y+HB+10,
          stroke:V("encre"),"stroke-width":"2"}));
        svg.appendChild(S("text",{x:c[0],y:Y-16,"text-anchor":"middle","class":"s-pet"},c[1]));
      });
      svg.appendChild(S("text",{x:X0,y:Y+HB+26,"class":"s-lab"},frs(v,1)+" m/s"));

      res.innerHTML = "<div class='gros'>"+
        "<span><b>Production massique</b><span>"+fr(q0,0)+" kJ/kg</span></span>"+
        "<span><b>Débit de fluide</b><span>"+frs(qm*3600,0)+" kg/h</span></span>"+
        "<span><b>Masse volumique vapeur</b><span>"+frs(rhov,1)+" kg/m³</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Vitesse obtenue</b><span>"+frs(v,1)+" m/s</span></span>"+
        "<span><b>Minimum d'entraînement</b><span>6 m/s</span></span>"+
        "<span><b>Verdict</b><span>"+(v<VMIN?"insuffisant":(v>VMAX?"trop rapide":"correct"))+
        "</span></span></div><p>"+(v<VMIN
          ? "<b>Sous 6 m/s, la vapeur ne remonte plus l'huile</b> : elle "+
            "s'accumule dans l'évaporateur, le carter se vide et le compresseur "+
            "grippe. On réduit le diamètre, ou l'on double la colonne pour que "+
            "la vitesse tienne à charge réduite."
          : v>VMAX
          ? "<b>Au-delà de 15 m/s</b>, le bruit et la perte de charge deviennent "+
            "inacceptables : il faut monter d'un diamètre."
          : "La vitesse est dans la plage : l'huile remonte, sans bruit excessif. "+
            "<b>Vérifiez maintenant à charge partielle</b> — une machine qui "+
            "module à 50 % voit sa vitesse tomber de moitié.")+"</p>";
    }
    calc();
  }
};

/* ─────────── la chambre froide et ses apports ─────────── */
SCHEMAS["chambre-froide"] = function(el){
  var W=900,H=380;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les sept apports de chaleur d'une chambre froide"});
  el.appendChild(svg);
  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function fleche(x1,y1,x2,y2,coul){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":"2.6","stroke-linecap":"round"}));
    var dx=x2-x1,dy=y2-y1,n=Math.sqrt(dx*dx+dy*dy);dx/=n;dy/=n;
    var px=-dy,py=dx;
    svg.appendChild(S("path",{d:"M "+x2+" "+y2+" L "+(x2-11*dx+6*px)+" "+
      (y2-11*dy+6*py)+" L "+(x2-11*dx-6*px)+" "+(y2-11*dy-6*py)+" Z",fill:V(coul)}));
  }
  /* la chambre */
  var X0=300,X1=600,Y0=110,Y1=280;
  svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,rx:"6",
    fill:V("froid"),opacity:"0.12",stroke:V("froid"),"stroke-width":"3"}));
  svg.appendChild(S("rect",{x:X0+10,y:Y0+10,width:X1-X0-20,height:Y1-Y0-20,rx:"4",
    fill:"none",stroke:V("froid"),"stroke-width":"1","stroke-dasharray":"4 4"}));
  txt((X0+X1)/2,(Y0+Y1)/2-6,"CHAMBRE FROIDE","s-tit","middle","froid");
  txt((X0+X1)/2,(Y0+Y1)/2+16,"l'isolant est entre les deux traits","s-pet");

  /* les sept apports, quatre a gauche, trois a droite */
  var gauche=[["Parois","à travers l'isolant",150],
              ["Renouvellement d'air","à chaque ouverture",196],
              ["Denrées","ce qu'elles apportent en entrant",242],
              ["Respiration","fruits et légumes seulement",288]];
  gauche.forEach(function(p,i){
    var y=p[2];
    txt(24,y-4,p[0],"s-nom","start","chaud");
    txt(24,y+13,p[1],"s-pet","start");
    fleche(250,y,X0-6,y,"chaud");
  });
  var droite=[["Personnel","250 à 400 W par personne",150],
              ["Éclairage","6 W par m² de sol",196],
              ["Ventilateurs et dégivrage","5 à 8 % du reste",242]];
  droite.forEach(function(p){
    var y=p[2];
    txt(876,y-4,p[0],"s-nom","end","chaud");
    txt(876,y+13,p[1],"s-pet","end");
    fleche(650,y,X1+6,y,"chaud");
  });
  /* l'evaporateur, qui retire tout cela */
  svg.appendChild(S("rect",{x:X0+90,y:Y0+16,width:120,height:24,rx:"3",
    fill:V("carte"),stroke:V("froid"),"stroke-width":"1.8"}));
  for (var i=1;i<=4;i++)
    svg.appendChild(S("line",{x1:X0+90+i*24,y1:Y0+20,x2:X0+90+i*24,y2:Y0+36,
      stroke:V("froid"),"stroke-width":"1.4"}));
  txt((X0+X1)/2,Y0+56,"l'évaporateur retire la somme","s-pet","middle","froid");
  txt((X0+X1)/2,340,"La puissance à installer se calcule sur les heures de marche, pas sur 24 heures.","s-nom");

  var lg=E("p",{"class":"leg-schema"},
    "<b>Sept postes, et leur hiérarchie se retourne selon l'usage.</b> Une "+
    "chambre de conservation est dominée par ses parois ; une chambre de "+
    "refroidissement, par les denrées qui y entrent chaudes. Épaissir "+
    "l'isolant de la seconde ne servirait presque à rien.");
  (el.parentNode||el).appendChild(lg);
};


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
OUTILS["journee-chambre-froide"] = {
  titre:"Une journée de chambre froide, en une minute",
  intro:"Appuyez sur Lire. La porte s'ouvre, une livraison entre à sept heures, "+
        "le groupe démarre et s'arrête. Regardez l'air, puis la marchandise : ils "+
        "ne réagissent pas à la même vitesse, et c'est toute l'histoire.",
  monte:function(d){
    var DEF={v:60, tc:2, e:100, te:25, ton:1.5, tent:15, ouv:30, pinst:3, stock:2,
             den:"Fruits et légumes"};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    /* les scenarios du cours : chaque heure de la page en appelle un par son nom */
    var SCEN=[
      ["Libre", null],
      ["1 · La nuit seule",        {ouv:0, ton:0}],
      ["2 · Les portes seules",    {ouv:80, ton:0}],
      ["3 · La livraison",         {}],
      ["4 · Chambre négative",     {tc:-20, den:"Viande fraîche", ton:1, tent:-5,
                                    stock:3, pinst:4, e:150}],
      ["5 · Groupe trop petit",    {pinst:1.5}],
      ["6 · Groupe généreux",      {pinst:8}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===3?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    /* un curseur bouge a la main : on repasse en libre, sans relancer */
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    curseur(c1,maj,P,"Volume de la chambre","v",10,400,10,0," m³",touche,reg);
    curseur(c1,maj,P,"Consigne","tc",-22,8,1,0," °C",touche,reg);
    curseur(c1,maj,P,"Isolant","e",60,200,10,0," mm",touche,reg);
    curseur(c1,maj,P,"Puissance du groupe","pinst",1,20,0.5,1," kW",touche,reg);
    curseur(c1,maj,P,"Stock en chambre","stock",0.5,10,0.5,1," t",touche,reg);
    maj.push(choixListe(c2,P,"den",NOMS_DENREES,"Denrée",touche,
      function(n){return DENREES[n].resp?"respire":"inerte";},reg));
    curseur(c2,maj,P,"Livraison de 7 h","ton",0,6,0.5,1," t",touche,reg);
    curseur(c2,maj,P,"Température de la livraison","tent",-18,30,1,0," °C",touche,reg);
    curseur(c2,maj,P,"Ouvertures de porte","ouv",0,80,5,0," /jour",touche,reg);
    curseur(c2,maj,P,"Température du local","te",15,35,1,0," °C",touche,reg);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    /* les commandes de lecture : lire, avancer d'une heure, recommencer */
    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bHeure=E("button",{"class":"bt",type:"button"},"+ 1 h");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bHeure); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=330, X0=44,X1=428,Y0=28,Y1=224, XB=482,XB1=664;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Températures de l'air et de la marchandise sur vingt-quatre heures"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var S_={}, anim=null, acc=0, dernier=0;
    var POSTES=["Parois","Porte","Livraison","Respiration","Personnel","Éclairage",
                "Ventilateurs","Dégivrage"];

    function reset(){
      maj.forEach(function(x){x();});
      if (anim) { cancelAnimationFrame(anim); anim=null; bLire.textContent="Lire"; }
      var D=DENREES[P.den];
      S_={m:0, Tair:P.tc, Tg:P.tc, mg:P.stock*1000, comp:false, degiv:0,
          run:0, hors:0, E:{}, trA:[], trG:[], cmp:[], D:D, tmax:P.tc+14,
          livre:false};
      POSTES.forEach(function(p){S_.E[p]=0;});
      /* le calendrier des ouvertures : reparties de 6 h a 18 h, 2 min chacune */
      S_.porte=new Array(1440);
      for (var i=0;i<1440;i++) S_.porte[i]=false;
      if (P.ouv>0){
        var pas=720/P.ouv;
        for (var k=0;k<P.ouv;k++){
          var t=Math.round(360+k*pas);
          for (var j=0;j<2;j++) if (t+j<1440) S_.porte[t+j]=true;
        }
      }
      /* la livraison compte des son entree : c'est la chaleur qu'il faudra sortir */
      S_.E["Livraison"]=P.ton*1000*D.cp1*Math.max(0,P.tent-P.tc)/3600;
      dessine(); acc=0;
    }

    function pas(){
      var m=S_.m; if (m>=1440) return;
      var D=S_.D, h=m/60;
      var a=Math.pow(P.v,1/3), S6=6*a*a, sol=a*a;
      var U=1/(0.13+(P.e/1000)/0.023+0.04);
      var Cair=1000+1.3*P.v, Cg=Math.max(1,S_.mg*D.cp1);
      /* la livraison de sept heures : melange a la marchandise en stock */
      if (m===420 && P.ton>0 && !S_.livre){
        var md=P.ton*1000;
        S_.Tg=(S_.mg*S_.Tg+md*P.tent)/(S_.mg+md); S_.mg+=md; S_.livre=true;
      }
      /* degivrage : 20 min toutes les 6 h, groupe a l'arret */
      var deg=(m%360)<20;
      var present=(h>=8&&h<10)||(h>=14&&h<16);
      var ecl=h>=6&&h<18;
      var rho=353/(S_.Tair+273.15);
      var dh=Math.max(0,hAir(P.te,0.60)-hAir(S_.Tair,0.90));
      var q={};
      q["Parois"]=U*S6*(P.te-S_.Tair)/1000;
      q["Porte"]=S_.porte[m]?0.3*P.v*rho*dh/120:0;
      q["Personnel"]=present?2*(0.27-0.006*S_.Tair):0;
      q["Éclairage"]=ecl?6*sol/1000:0;
      q["Ventilateurs"]=0.06*P.pinst;
      q["Dégivrage"]=(deg&&P.tc<0)?2:0;
      q["Respiration"]=D.resp*(S_.mg/1000)*Math.pow(2,(S_.Tg-5)/10)/1000;
      /* thermostat sur l'air, avec un differentiel de 1 K */
      if (deg) S_.comp=false;
      else if (!S_.comp && S_.Tair>P.tc+1) S_.comp=true;
      else if (S_.comp && S_.Tair<P.tc-1) S_.comp=false;
      var qEvap=S_.comp?-P.pinst:0;
      var qGA=0.6*(S_.Tg-S_.Tair);
      S_.Tair+=(q["Parois"]+q["Porte"]+q["Personnel"]+q["Éclairage"]+q["Ventilateurs"]+
                q["Dégivrage"]+qEvap+qGA)*60/Cair;
      S_.Tg+=(-qGA+q["Respiration"])*60/Cg;
      for (var k in q) if (k!=="Livraison") S_.E[k]+=q[k]/60;
      S_.q=q; S_.qGA=qGA;
      if (S_.comp) S_.run++;
      if (S_.Tair>P.tc+2) S_.hors++;
      S_.trA.push(S_.Tair); S_.trG.push(S_.Tg); S_.cmp.push(S_.comp?(deg?2:1):(deg?2:0));
      S_.tmax=Math.max(S_.tmax,S_.Tg+2,S_.Tair+2);
      S_.m++;
    }

    function px(m){return X0+(X1-X0)*m/1440;}
    function py(t){var lo=P.tc-4, hi=S_.tmax; return Y1-(Y1-Y0)*(t-lo)/(hi-lo);}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
        "class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }

    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la grille des heures */
      [0,6,12,18,24].forEach(function(hh){
        svg.appendChild(S("line",{x1:px(hh*60),y1:Y0,x2:px(hh*60),y2:Y1,
          stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(hh*60),Y1+34,hh+" h");
      });
      /* la bande de consigne */
      svg.appendChild(S("rect",{x:X0,y:py(P.tc+1),width:X1-X0,height:py(P.tc-1)-py(P.tc+1),
        fill:V("vert"),opacity:"0.12"}));
      txt(X0-8,py(P.tc)+4,fr(P.tc,0)+" °C","s-pet","end");
      txt(X0-8,py(S_.tmax)+4,fr(S_.tmax,0)+" °C","s-pet","end");
      /* les ouvertures de porte, en tirets sur le haut */
      for (var i=0;i<1440;i+=2) if (S_.porte[i])
        svg.appendChild(S("line",{x1:px(i),y1:Y0-8,x2:px(i),y2:Y0-2,
          stroke:V("encre2"),"stroke-width":"1.2"}));
      txt(X0,Y0-12,"portes","s-pet","start");
      /* la livraison */
      if (P.ton>0){
        svg.appendChild(S("line",{x1:px(420),y1:Y0,x2:px(420),y2:Y1,
          stroke:V("chaud"),"stroke-width":"1.4","stroke-dasharray":"5 4"}));
        txt(px(420)+5,Y0+12,"livraison","s-pet","start","chaud");
      }
      /* les deux traces */
      function trace(arr,coul,ep){
        if (arr.length<2) return;
        var pts=[];
        for (var i=0;i<arr.length;i++) pts.push(px(i).toFixed(1)+","+py(arr[i]).toFixed(1));
        svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V(coul),
          "stroke-width":ep,"stroke-linejoin":"round"}));
      }
      trace(S_.trG,"vert",2.4);
      trace(S_.trA,"froid",2.4);
      /* le groupe : une barre sous le graphe */
      var yb=Y1+8;
      for (var i=0;i<S_.cmp.length;i++){
        if (S_.cmp[i]===0) continue;
        svg.appendChild(S("rect",{x:px(i),y:yb,width:Math.max(0.5,px(i+1)-px(i)),height:10,
          fill:V(S_.cmp[i]===2?"tiede":"froid")}));
      }
      txt(X1+6,yb+9,"groupe","s-pet","start");
      /* le curseur du temps */
      if (S_.m>0 && S_.m<1440)
        svg.appendChild(S("line",{x1:px(S_.m),y1:Y0,x2:px(S_.m),y2:Y1+18,
          stroke:V("encre"),"stroke-width":"1.6"}));
      /* legende */
      svg.appendChild(S("line",{x1:X0,y1:Y1+48,x2:X0+22,y2:Y1+48,stroke:V("froid"),"stroke-width":"3"}));
      txt(X0+28,Y1+52,"air","s-pet","start");
      svg.appendChild(S("line",{x1:X0+70,y1:Y1+48,x2:X0+92,y2:Y1+48,stroke:V("vert"),"stroke-width":"3"}));
      txt(X0+98,Y1+52,"marchandise","s-pet","start");
      /* les postes, a droite, en kWh cumules */
      txt(XB,Y0-12,"CE QUI EST ENTRÉ, EN kWh","s-tit","start");
      var tot=0; POSTES.forEach(function(p){tot+=S_.E[p];});
      var mx=Math.max(3,tot);
      POSTES.forEach(function(p,i){
        var y=Y0+6+i*26, w=(XB1-XB-110)*S_.E[p]/mx;
        txt(XB,y+12,p,"s-pet","start");
        svg.appendChild(S("rect",{x:XB+92,y:y+2,width:Math.max(1,w),height:13,rx:"2",
          fill:V(S_.E[p]/mx>0.3?"chaud":"froid"),opacity:"0.8"}));
        txt(XB+96+w,y+13,frs(S_.E[p],1),"s-pet","start");
      });
      /* le compte rendu */
      var fini=S_.m>=1440, hh=Math.floor(S_.m/60), mm=S_.m%60;
      var chef=POSTES.slice().sort(function(a,b){return S_.E[b]-S_.E[a];})[0];
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heure</b><span>"+hh+" h "+(mm<10?"0":"")+mm+"</span></span>"+
        "<span><b>Air</b><span>"+frs(S_.Tair,1)+" °C</span></span>"+
        "<span><b>Marchandise</b><span>"+frs(S_.Tg,1)+" °C</span></span>"+
        "<span><b>Groupe</b><span>"+(S_.comp?"en marche":"à l'arrêt")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        (function(){
          if (!S_.q) return "";
          var qq=S_.q, tq=0, chefq="", vq=-1;
          for (var k in qq){ tq+=qq[k]; if (qq[k]>vq){vq=qq[k];chefq=k;} }
          if (S_.qGA>vq){ chefq="Marchandise → air"; vq=S_.qGA; }
          return "<span><b>Entre maintenant</b><span>"+frs(tq+Math.max(0,S_.qGA),2)+" kW</span></span>"+
                 "<span><b>Le plus gros, à cet instant</b><span>"+chefq.toLowerCase()+"</span></span>"+
                 "</div><div class='gros' style='margin-top:8px'>";
        })()+
        "<span><b>Taux de marche</b><span>"+fr(S_.m?100*S_.run/S_.m:0,0)+" %</span></span>"+
        "<span><b>Hors consigne</b><span>"+fr(S_.hors/60,1)+" h</span></span>"+
        "<span><b>Entré au total</b><span>"+frs(tot,1)+" kWh</span></span>"+
        "</div><p>"+(!S_.m
          ? "Appuyez sur <b>Lire</b>. Puis changez une chose — la puissance du groupe, "+
            "la livraison, les ouvertures — et relisez la journée."
          : fini
          ? "<b>Journée finie.</b> Poste dominant : "+chef.toLowerCase()+", "+
            fr(100*S_.E[chef]/tot,0)+" % de ce qui est entré. "+
            (S_.hors>60
              ? "L'air est resté <b>"+fr(S_.hors/60,1)+" h au-dessus de la consigne</b> : "+
                (S_.run/S_.m>0.9 ? "le groupe a tourné presque sans arrêt, il est trop petit pour cette livraison."
                                 : "regardez à quelle heure, et ce qui s'est ouvert ou est entré à ce moment-là.")
              : "La consigne a tenu ; le groupe a tourné "+fr(100*S_.run/S_.m,0)+" % du temps"+
                (S_.run/S_.m<0.5 ? ", il a de la réserve." : "."))
          : "La marchandise réagit dix fois plus lentement que l'air : c'est elle qui "+
            "porte la chaleur de la livraison, et le groupe la sort pendant des heures.")+
        "</p>";
    }

    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.024; dernier=ts;        /* 24 minutes simulees par seconde */
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.m<1440) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){ cancelAnimationFrame(anim); anim=null; bLire.textContent="Lire"; return; }
      if (S_.m>=1440) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bHeure.addEventListener("click",function(){
      if (anim){ cancelAnimationFrame(anim); anim=null; bLire.textContent="Lire"; }
      if (S_.m>=1440) return;
      for (var i=0;i<60 && S_.m<1440;i++) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

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

OUTILS["diagnostic-frigo"] = {
  titre:"Lire la machine : quatre nombres, une panne",
  intro:"Deux pressions, une surchauffe, un sous-refroidissement : c'est tout ce "+
        "qu'un frigoriste relève avant de rien démonter. Choisissez une panne et "+
        "regardez les aiguilles bouger. Puis tirez-en une à l'aveugle, et trouvez.",
  monte:function(d){
    var BASE={t0:-10, tk:40, sc:6, sr:4};
    var P={panne:0, aveugle:false, cache:-1, essais:0};
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    /* le menu des pannes, a observer */
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Panne à observer"));
    var v=E("span",{"class":"v"},""); ch.appendChild(v);
    var sel=E("select",{},PANNES.map(function(p,i){
      return '<option value="'+i+'"'+(i===0?" selected":"")+'>'+p.n+"</option>";}).join(""));
    sel.addEventListener("change",function(){P.panne=+this.value;P.aveugle=false;calc();});
    ch.appendChild(sel); c1.appendChild(ch);
    var cmd=E("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"});
    var bTirer=E("button",{"class":"bt p",type:"button"},"Tirer une panne à l'aveugle");
    cmd.appendChild(bTirer); c2.appendChild(cmd);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);

    var W=680,H=210;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Quatre cadrans : basse pression, haute pression, surchauffe, sous-refroidissement"});
    d.appendChild(svg);
    var choix=E("div",{"class":"qq",style:"display:none;border:0;padding:0"});
    var choixP=E("p",{},"Quelle est la panne ?");
    var choixL=E("div",{"class":"choix"});
    choix.appendChild(choixP); choix.appendChild(choixL); d.appendChild(choix);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var CAD=[
      {n:"Basse pression",u:"bar",lo:0.4,hi:5,  nlo:1.6,nhi:2.6, dec:2},
      {n:"Haute pression",u:"bar",lo:5,  hi:25, nlo:8,  nhi:13,  dec:1},
      {n:"Surchauffe",    u:"K",  lo:0,  hi:30, nlo:4,  nhi:10,  dec:0},
      {n:"Sous-refroid.", u:"K",  lo:0,  hi:16, nlo:2,  nhi:7,   dec:0}
    ];
    function lectures(i){
      var dd=PANNES[i].d;
      return [psatF("R134a",BASE.t0+dd[0]), psatF("R134a",BASE.tk+dd[1]),
              Math.max(0,BASE.sc+dd[2]), Math.max(0,BASE.sr+dd[3])];
    }
    function cadran(cx,cy,r,c,val){
      /* un arc de 240 degres, de -210 a +30 */
      function ang(x){var f=Math.min(1,Math.max(0,(x-c.lo)/(c.hi-c.lo)));return (-210+240*f)*Math.PI/180;}
      function pt(a,rr){return [cx+rr*Math.cos(a),cy+rr*Math.sin(a)];}
      function arc(a1,a2,rr,coul,ep,op){
        var p1=pt(a1,rr),p2=pt(a2,rr), gr=(a2-a1)>Math.PI?1:0;
        svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+
          " A "+rr+" "+rr+" 0 "+gr+" 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),
          fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linecap":"round",opacity:op||1}));
      }
      arc(ang(c.lo),ang(c.hi),r,"trait2",7,0.7);
      arc(ang(c.nlo),ang(c.nhi),r,"vert",7,0.55);
      var a=ang(val), p=pt(a,r-6), hors=val<c.nlo||val>c.nhi;
      svg.appendChild(S("line",{x1:cx,y1:cy,x2:p[0].toFixed(1),y2:p[1].toFixed(1),
        stroke:V(hors?"chaud":"encre"),"stroke-width":"2.6","stroke-linecap":"round"}));
      svg.appendChild(S("circle",{cx:cx,cy:cy,r:"4",fill:V(hors?"chaud":"encre")}));
      svg.appendChild(S("text",{x:cx,y:cy+r-4,"text-anchor":"middle","class":"s-lab",
        fill:V(hors?"chaud":"encre")},frs(val,c.dec)+" "+c.u));
      svg.appendChild(S("text",{x:cx,y:cy+r+18,"text-anchor":"middle","class":"s-pet"},c.n));
    }
    function dessine(vals){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      CAD.forEach(function(c,i){cadran(90+i*167,100,62,c,vals[i]);});
    }
    function calc(){
      choix.style.display="none";
      v.textContent=PANNES[P.panne].n==="Machine saine"?"référence":"observée";
      var L=lectures(P.panne); dessine(L);
      var dirs=CAD.map(function(c,i){return L[i]<c.nlo?"↓":(L[i]>c.nhi?"↑":"=");});
      res.innerHTML="<div class='gros'>"+CAD.map(function(c,i){
        return "<span><b>"+c.n+"</b><span>"+dirs[i]+"</span></span>";}).join("")+
        "</div><p><b>"+PANNES[P.panne].n+".</b> "+PANNES[P.panne].lire+"</p>";
    }
    function aveugle(){
      P.aveugle=true; P.essais=0;
      /* jamais la machine saine seule : on tire parmi les pannes, une fois sur
         six la saine pour garder l'eleve honnete */
      P.cache=Math.random()<0.16?0:1+Math.floor(Math.random()*(PANNES.length-1));
      sel.value="0"; v.textContent="à trouver";
      dessine(lectures(P.cache));
      choixL.innerHTML="";
      PANNES.forEach(function(p,i){
        var b=E("button",{type:"button"},p.n);
        b.addEventListener("click",function(){juger(i,b);});
        choixL.appendChild(b);
      });
      choix.style.display="block";
      res.innerHTML="<p>Lisez les quatre aiguilles. <b>Commencez par la surchauffe</b> : "+
        "elle dit ce qui se passe à l'évaporateur. Puis le sous-refroidissement, qui "+
        "dit ce qui se passe au condenseur. Les pressions confirment.</p>";
    }
    function juger(i,b){
      P.essais++;
      var L=lectures(P.cache), G=lectures(i);
      if (i===P.cache){
        b.className="juste";
        [].slice.call(choixL.children).forEach(function(x){x.disabled=true;});
        res.innerHTML="<p><b>Juste</b>, en "+P.essais+" essai"+(P.essais>1?"s":"")+". "+
          PANNES[i].lire+"</p>";
        return;
      }
      b.className="faux"; b.disabled=true;
      /* la methode, sans la reponse : quelle aiguille contredit ce choix */
      var k=-1, ecart=0;
      for (var j=0;j<4;j++){
        var e=Math.abs(L[j]-G[j])/(CAD[j].hi-CAD[j].lo);
        if (e>ecart){ecart=e;k=j;}
      }
      var sens=L[k]>G[k]?"plus haut":"plus bas";
      res.innerHTML="<p><b>Non.</b> Avec cette panne, le cadran « "+CAD[k].n+" » "+
        "serait "+(L[k]>G[k]?"plus bas":"plus haut")+" que ce que vous lisez : ici il "+
        "est "+sens+". Reprenez par l'aiguille qui sort le plus de sa zone verte.</p>";
    }
    bTirer.addEventListener("click",aveugle);
    calc();
  }
};

/* ─────────── l'embleme d'en-tete : vingt-quatre heures ─────────── */
SCHEMAS["journee-embleme"]=function(el){
  var W=300,H=250, cx=150, cy=128, R=92;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un cadran de vingt-quatre heures, avec la journée d'activité et une température qui oscille"});
  el.appendChild(svg);
  function pt(h,r){var a=(h/24*360-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:V("encre"),"stroke-width":"2.2"}));
  for (var h=0;h<24;h++){
    var a=pt(h,R), b=pt(h,R-(h%6?6:12));
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("encre"),
      "stroke-width":h%6?"1.2":"2.2"}));
  }
  /* la journee d'activite, de 6 a 18 h, en arc exterieur */
  var p1=pt(6,R+9), p2=pt(18,R+9);
  svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+(R+9)+" "+(R+9)+
    " 0 0 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V("chaud"),
    "stroke-width":"5","stroke-linecap":"round"}));
  /* la temperature de l'air, qui oscille autour de la consigne */
  var pts=[];
  for (var i=0;i<=96;i++){
    var t=i/4, r=R-38+8*Math.sin(t*2.2)+(t>7&&t<13?9*Math.exp(-(t-7)/3):0);
    var q=pt(t,r); pts.push(q[0].toFixed(1)+","+q[1].toFixed(1));
  }
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R-38,fill:"none",stroke:V("vert"),
    "stroke-width":"1.2","stroke-dasharray":"4 4"}));
  svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V("froid"),
    "stroke-width":"2.6","stroke-linejoin":"round"}));
  svg.appendChild(S("text",{x:cx,y:cy+6,"text-anchor":"middle","class":"s-tit",
    fill:V("encre2")},"24 h"));
  svg.appendChild(S("text",{x:cx,y:cy-R-16,"text-anchor":"middle","class":"s-pet"},"0 h"));
  svg.appendChild(S("text",{x:cx,y:cy+R+26,"text-anchor":"middle","class":"s-pet"},"12 h"));
};


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

OUTILS["journee-cta"] = {
  titre:"Une journée de centrale de traitement d'air, en une minute",
  intro:"Appuyez sur Lire. La salle se remplit à neuf heures, le CO₂ monte, la "+
        "centrale ouvre son air neuf, le récupérateur rend ce qu'il peut, les "+
        "batteries font le reste. Deux courbes : la température, et le CO₂.",
  monte:function(d){
    var DEF={tm:-3, amp:4, hr:85, sol:4, cons:20, bp:4, eps:60, pers:60,
             occ:"Deux réunions", marche:"24 h sur 24", fc:"Autorisé", hum:"Oui"};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Nuit d'hiver, salle vide, centrale en marche", {occ:"Salle vide"}],
      ["2 · Journée d'hiver, deux réunions", {}],
      ["3 · La même, sans récupérateur", {eps:0}],
      ["4 · Mi-saison : le soleil, et le free-cooling", {tm:14, amp:8, hr:60, sol:12}],
      ["5 · Été : deux réunions et une remise de diplômes", {tm:27, amp:6, hr:55, sol:10,
                                                            cons:25, occ:"Réunions et soirée", hum:"Non"}],
      ["6 · Hiver, programme horaire de 6 h à 20 h", {marche:"6 h à 20 h"}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===2?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    curseur(c1,maj,P,"Température extérieure moyenne","tm",-10,35,1,0," °C",touche,reg);
    curseur(c1,maj,P,"Amplitude jour-nuit","amp",0,14,1,0," K",touche,reg);
    curseur(c1,maj,P,"Humidité extérieure","hr",30,95,5,0," %",touche,reg);
    curseur(c1,maj,P,"Ensoleillement maximal","sol",0,25,1,0," kW",touche,reg);
    maj.push(choixListe(c1,P,"occ",["Salle vide","Deux réunions","Réunions et soirée"],
      "Occupation",touche,null,reg));
    curseur(c2,maj,P,"Consigne d'ambiance","cons",18,27,0.5,1," °C",touche,reg);
    curseur(c2,maj,P,"Bande proportionnelle","bp",1,10,0.5,1," K",touche,reg);
    curseur(c2,maj,P,"Efficacité du récupérateur","eps",0,85,5,0," %",touche,reg);
    curseur(c2,maj,P,"Personnes en réunion","pers",0,100,10,0,"",touche,reg);
    maj.push(choixListe(c2,P,"marche",["24 h sur 24","6 h à 20 h"],"Centrale",touche,null,reg));
    maj.push(choixListe(c2,P,"fc",["Autorisé","Interdit"],"Free-cooling",touche,null,reg));
    maj.push(choixListe(c2,P,"hum",["Oui","Non"],"Humidificateur en hiver",touche,null,reg));
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bHeure=E("button",{"class":"bt",type:"button"},"+ 1 h");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bHeure); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=340, X0=44,X1=420,Y0=28,Y1=224, XB=488,XB1=664;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Température de la salle et CO₂ sur vingt-quatre heures, avec le régime de la centrale"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    /* la salle et la centrale */
    var VOL=960, CZ=9000, UA=0.6, MAIR=1150, QM=1.8, QNMAX=0.8, QNMIN=0.2, FANS=2.16;
    var S_={}, anim=null, acc=0, dernier=0;
    var POSTES=["Chaud","Froid","Vapeur","Ventilateurs","Récupéré","Free-cooling"];
    var PAYES=4;

    function occ(h){
      var n=0;
      if (P.occ!=="Salle vide" && ((h>=9&&h<12)||(h>=14&&h<17))) n=P.pers;
      if (P.occ==="Réunions et soirée" && h>=18 && h<20) n=100;
      return n;
    }
    function text(h){return P.tm+(P.amp/2)*Math.cos(2*Math.PI*(h-15)/24);}
    function reset(){
      maj.forEach(function(x){x();});
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      var t0=text(0);
      S_={m:0, Tz:P.cons, rz:Math.min(rAir(P.cons,0.45), rAir(t0,P.hr/100)+0.5), co2:480,
          E:{}, trT:[], trX:[], trC:[], mode:[], hors:0, occmin:0, co2max:0, eau:0,
          q:null, tmax:P.cons+8, tmin:Math.min(P.cons-6, t0-2)};
      POSTES.forEach(function(p){S_.E[p]=0;});
      dessine(); acc=0;
    }

    function pas(){
      var m=S_.m; if (m>=1440) return;
      var h=m/60, n=occ(h), Te=text(h), re=rAir(Te,P.hr/100);
      var sol=(h>7&&h<18)?P.sol*Math.sin(Math.PI*(h-7)/11):0;
      var on=(P.marche==="24 h sur 24")||(h>=6&&h<20);
      var gains=n*0.07+(n>0?1.44:0)+sol+UA*(Te-S_.Tz);      /* kW vers la salle */
      var vap=n*65/3600;                                       /* g/s */
      var mode=0, Ts=S_.Tz, rs=S_.rz, qn=0, qmix=0;
      var q={"Chaud":0,"Froid":0,"Vapeur":0,"Ventilateurs":0,"Récupéré":0,"Free-cooling":0};
      if (on){
        q["Ventilateurs"]=FANS;
        qn=Math.min(QNMAX,Math.max(QNMIN,QNMIN+(S_.co2-800)/400*(QNMAX-QNMIN)));
        var besoinFroid=S_.Tz>P.cons+0.5, fcok=P.fc==="Autorisé"&&Te<S_.Tz-2&&Te>12;
        if (besoinFroid&&fcok){
          /* premier etage, l'air exterieur, gratuit ; second etage, la batterie,
             si cela ne suffit pas : c'est la sequence d'une vraie centrale */
          mode=3; qn=QM; Ts=Te; rs=re;
          q["Free-cooling"]=QM*1.02*(S_.Tz-Te);
          var Tc0=Math.max(14,Math.min(35,P.cons+(P.cons-S_.Tz)*(21/P.bp)));
          if (Tc0<Te-0.2){
            mode=2; Ts=Tc0; rs=Math.min(re,0.9*rsatAir(Tc0));
            q["Froid"]=QM*(hAirR(Te,re)-hAirR(Tc0,rs));
          }
        } else {
          var eps=P.eps/100;
          var Trec=Te+eps*(S_.Tz-Te);
          q["Récupéré"]=qn*1.02*Math.abs(Trec-Te);
          var Tm=(qn*Trec+(QM-qn)*S_.Tz)/QM, rm=(qn*re+(QM-qn)*S_.rz)/QM;
          var Tc=P.cons+(P.cons-S_.Tz)*(21/P.bp);
          Tc=Math.max(14,Math.min(35,Tc));
          if (Tc>Tm+0.2){ mode=1; Ts=Tc; rs=rm; q["Chaud"]=QM*1.02*(Tc-Tm); }
          else if (Tc<Tm-0.2){
            mode=2; Ts=Tc; rs=Math.min(rm,0.9*rsatAir(Tc));
            q["Froid"]=QM*(hAirR(Tm,rm)-hAirR(Tc,rs));
          } else { mode=4; Ts=Tm; rs=rm; }
          if (P.hum==="Oui" && mode!==2 && hrAir(Ts,rs)<30){
            var rcible=rAir(Ts,0.35), dr=Math.max(0,rcible-rs);
            rs=rcible; q["Vapeur"]=QM*dr/1000*2700; S_.eau+=QM*dr/1000*60;
          }
        }
        Ts+=1;                                                  /* le ventilateur */
        gains+=QM*1.02*(Ts-S_.Tz);
        S_.rz+=(vap+QM*(rs-S_.rz))*60/MAIR;
        S_.co2+=(1e6*n*5e-6/VOL-(qn/1.2/VOL)*(S_.co2-420))*60;
      } else {
        /* centrale arretee : il ne reste que l'infiltration, 0,2 volume par heure */
        S_.rz+=(vap-(0.2/3600)*MAIR*(S_.rz-re))*60/MAIR;
        S_.co2+=(1e6*n*5e-6/VOL-(0.2/3600)*(S_.co2-420))*60;
      }
      S_.Tz+=gains*60/CZ;
      for (var k in q) S_.E[k]+=q[k]/60;
      S_.q=q; S_.qn=qn; S_.Ts=Ts; S_.n=n; S_.Te=Te;
      if (n>0){ S_.occmin++; if (Math.abs(S_.Tz-P.cons)>1.5) S_.hors++; }
      S_.co2max=Math.max(S_.co2max,S_.co2);
      S_.trT.push(S_.Tz); S_.trX.push(Te); S_.trC.push(S_.co2); S_.mode.push(mode);
      S_.tmax=Math.max(S_.tmax,S_.Tz+2,Te+2); S_.tmin=Math.min(S_.tmin,Te-2,S_.Tz-2);
      S_.m++;
    }

    function px(m){return X0+(X1-X0)*m/1440;}
    function py(t){return Y1-(Y1-Y0)*(t-S_.tmin)/(S_.tmax-S_.tmin);}
    function pc(c){return Y1-(Y1-Y0)*Math.min(1,(c-400)/1800);}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
        "class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* l'occupation, en fond */
      for (var i=0;i<1440;i+=10) if (occ(i/60)>0)
        svg.appendChild(S("rect",{x:px(i),y:Y0,width:px(i+10)-px(i)+0.5,height:Y1-Y0,
          fill:V("tiede"),opacity:"0.10"}));
      [0,6,12,18,24].forEach(function(hh){
        svg.appendChild(S("line",{x1:px(hh*60),y1:Y0,x2:px(hh*60),y2:Y1,
          stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(hh*60),Y1+34,hh+" h");
      });
      svg.appendChild(S("rect",{x:X0,y:py(P.cons+1),width:X1-X0,height:py(P.cons-1)-py(P.cons+1),
        fill:V("vert"),opacity:"0.12"}));
      txt(X0-8,py(P.cons)+4,frs(P.cons,0)+" °C","s-pet","end");
      txt(X0-8,py(S_.tmax)+4,fr(S_.tmax,0)+" °C","s-pet","end");
      txt(X0-8,py(S_.tmin)+4,fr(S_.tmin,0)+" °C","s-pet","end");
      txt(X1+6,pc(1000)+4,"1 000 ppm","s-pet","start","vert");
      svg.appendChild(S("line",{x1:X0,y1:pc(1000),x2:X1,y2:pc(1000),stroke:V("vert"),
        "stroke-width":"1","stroke-dasharray":"3 4"}));
      function trace(arr,f,coul,ep,dash){
        if (arr.length<2) return;
        var pts=[];
        for (var i=0;i<arr.length;i++) pts.push(px(i).toFixed(1)+","+f(arr[i]).toFixed(1));
        var a={points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"};
        if (dash) a["stroke-dasharray"]=dash;
        svg.appendChild(S("polyline",a));
      }
      trace(S_.trX,py,"encre2",1.4,"5 4");
      trace(S_.trC,pc,"vert",2);
      trace(S_.trT,py,"froid",2.6);
      /* la centrale : sa barre de regime */
      var yb=Y1+8, COL=["","chaud","froid","vert","trait"];
      for (var i=0;i<S_.mode.length;i++){
        if (!S_.mode[i]) continue;
        svg.appendChild(S("rect",{x:px(i),y:yb,width:Math.max(0.5,px(i+1)-px(i)),height:10,
          fill:V(COL[S_.mode[i]]),opacity:S_.mode[i]===4?"0.5":"1"}));
      }
      txt(X1+6,yb+9,"centrale","s-pet","start");
      if (S_.m>0&&S_.m<1440)
        svg.appendChild(S("line",{x1:px(S_.m),y1:Y0,x2:px(S_.m),y2:Y1+18,stroke:V("encre"),"stroke-width":"1.6"}));
      /* legende */
      var yl=Y1+50;
      [["froid","salle"],["encre2","extérieur"],["vert","CO₂"]].forEach(function(l,i){
        var x=X0+i*118;
        svg.appendChild(S("line",{x1:x,y1:yl,x2:x+20,y2:yl,stroke:V(l[0]),"stroke-width":"3"}));
        txt(x+26,yl+4,l[1],"s-pet","start");
      });
      [["chaud","chauffe"],["froid","refroidit"],["vert","free-cooling"]].forEach(function(l,i){
        var x=X0+i*118;
        svg.appendChild(S("rect",{x:x,y:yl+14,width:20,height:8,fill:V(l[0])}));
        txt(x+26,yl+22,l[1],"s-pet","start");
      });
      /* les postes, payes puis gratuits */
      txt(XB,Y0-12,"PAYÉ, EN kWh","s-tit","start","chaud");
      var tot=0; POSTES.forEach(function(p){tot+=S_.E[p];});
      var mx=Math.max(3,tot);
      POSTES.forEach(function(p,i){
        var y=Y0+6+i*27+(i>=PAYES?18:0), w=(XB1-XB-104)*S_.E[p]/mx;
        if (i===PAYES) txt(XB,y-8,"GRATUIT","s-tit","start","vert");
        txt(XB,y+12,p,"s-pet","start");
        svg.appendChild(S("rect",{x:XB+86,y:y+2,width:Math.max(1,w),height:13,rx:"2",
          fill:V(i>=PAYES?"vert":"chaud"),opacity:"0.8"}));
        txt(XB+90+w,y+13,frs(S_.E[p],1),"s-pet","start");
      });
      /* le compte rendu */
      var fini=S_.m>=1440, hh=Math.floor(S_.m/60), mm=S_.m%60;
      var paye=0, gratuit=0;
      POSTES.forEach(function(p,i){ if(i<PAYES) paye+=S_.E[p]; else gratuit+=S_.E[p]; });
      var MODES=["à l'arrêt","chauffe","refroidit","free-cooling","souffle neutre"];
      var chef="", vq=-1; if (S_.q) for (var k in S_.q) if (S_.q[k]>vq){vq=S_.q[k];chef=k;}
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heure</b><span>"+hh+" h "+(mm<10?"0":"")+mm+"</span></span>"+
        "<span><b>Salle</b><span>"+frs(S_.Tz,1)+" °C · "+fr(hrAir(S_.Tz,S_.rz),0)+" %</span></span>"+
        "<span><b>Extérieur</b><span>"+frs(S_.Te!==undefined?S_.Te:text(0),1)+" °C</span></span>"+
        "<span><b>CO₂</b><span>"+fr(S_.co2,0)+" ppm</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Centrale</b><span>"+MODES[S_.mode.length?S_.mode[S_.mode.length-1]:0]+"</span></span>"+
        "<span><b>Soufflage</b><span>"+(S_.Ts!==undefined&&S_.mode.length&&S_.mode[S_.mode.length-1]?frs(S_.Ts,1)+" °C":"—")+"</span></span>"+
        "<span><b>Air neuf</b><span>"+(S_.qn?frs(S_.qn,2)+" kg/s":"—")+"</span></span>"+
        "<span><b>Le plus gros, à cet instant</b><span>"+(chef?chef.toLowerCase():"—")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Payé</b><span>"+frs(paye,1)+" kWh</span></span>"+
        "<span><b>Gratuit</b><span>"+frs(gratuit,1)+" kWh</span></span>"+
        "<span><b>Eau d'humidification</b><span>"+frs(S_.eau,1)+" L</span></span>"+
        "<span><b>Hors confort, occupé</b><span>"+fr(S_.hors/60,1)+" h</span></span>"+
        "</div><p>"+(!S_.m
          ? "Appuyez sur <b>Lire</b>, ou avancez d'une heure. Puis changez une chose, "+
            "et relisez la journée."
          : fini
          ? "<b>Journée finie.</b> "+frs(paye,1)+" kWh payés, "+frs(gratuit,1)+" kWh rendus "+
            "par le récupérateur et le free-cooling. CO₂ maximal : "+fr(S_.co2max,0)+" ppm"+
            (S_.co2max>1200?", <b>trop haut</b> : l'air neuf n'a pas suivi.":".")+
            (S_.hors>60?" La salle est restée <b>"+fr(S_.hors/60,1)+" h hors confort</b> en présence : regardez à quelle heure.":"")
          : "Le CO₂ monte avec les personnes et la centrale ouvre son air neuf pour le "+
            "tenir sous 1 000 ppm. Le récupérateur rend en vert ce que la batterie "+
            "n'a pas à fournir en rouge.")+"</p>";
    }
    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.024; dernier=ts;
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.m<1440) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";return;}
      if (S_.m>=1440) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bHeure.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      if (S_.m>=1440) return;
      for (var i=0;i<60&&S_.m<1440;i++) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

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

OUTILS["diagnostic-cta"] = {
  titre:"Lire la centrale : cinq températures, une panne",
  intro:"Un thermomètre à chaque caisson, un débit, une perte de charge au filtre, "+
        "un CO₂ à la reprise. Choisissez une panne et regardez le profil se "+
        "déformer. Puis tirez-en une à l'aveugle, et trouvez.",
  monte:function(d){
    var P={panne:0, cache:-1, essais:0};
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Panne à observer"));
    var v=E("span",{"class":"v"},""); ch.appendChild(v);
    var sel=E("select",{},PANNES_CTA.map(function(p,i){
      return '<option value="'+i+'"'+(i===0?" selected":"")+'>'+p.n+"</option>";}).join(""));
    sel.addEventListener("change",function(){P.panne=+this.value;calc();});
    ch.appendChild(sel); c1.appendChild(ch);
    var cmd=E("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"});
    var bTirer=E("button",{"class":"bt p",type:"button"},"Tirer une panne à l'aveugle");
    cmd.appendChild(bTirer); c2.appendChild(cmd);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);

    var W=680,H=266, X0=70,X1=420,Y0=30,Y1=170;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Profil de température le long de la centrale, et trois cadrans"});
    d.appendChild(svg);
    var choix=E("div",{"class":"qq",style:"display:none;border:0;padding:0"});
    choix.appendChild(E("p",{},"Quelle est la panne ?"));
    var choixL=E("div",{"class":"choix"}); choix.appendChild(choixL); d.appendChild(choix);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var STA=["extérieur","après récup.","mélange","après batterie","soufflage"];
    var SAIN=PANNES_CTA[0].r;
    var CAD=[{n:"Débit",u:"%",lo:0,hi:120,nlo:90,nhi:110,dec:0},
             {n:"Filtre",u:"Pa",lo:0,hi:320,nlo:80,nhi:180,dec:0},
             {n:"CO₂ reprise",u:"ppm",lo:400,hi:2200,nlo:600,nhi:1100,dec:0}];
    function py(t){return Y1-(Y1-Y0)*(t+8)/48;}
    function cadran(cx,cy,r,c,val){
      function ang(x){var f=Math.min(1,Math.max(0,(x-c.lo)/(c.hi-c.lo)));return (-210+240*f)*Math.PI/180;}
      function pt(a,rr){return [cx+rr*Math.cos(a),cy+rr*Math.sin(a)];}
      function arc(a1,a2,rr,coul,ep,op){
        var p1=pt(a1,rr),p2=pt(a2,rr), gr=(a2-a1)>Math.PI?1:0;
        svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+rr+" "+rr+
          " 0 "+gr+" 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V(coul),
          "stroke-width":ep,"stroke-linecap":"round",opacity:op||1}));
      }
      arc(ang(c.lo),ang(c.hi),r,"trait2",6,0.7);
      arc(ang(c.nlo),ang(c.nhi),r,"vert",6,0.55);
      var a=ang(val), p=pt(a,r-5), hors=val<c.nlo||val>c.nhi;
      svg.appendChild(S("line",{x1:cx,y1:cy,x2:p[0].toFixed(1),y2:p[1].toFixed(1),
        stroke:V(hors?"chaud":"encre"),"stroke-width":"2.4","stroke-linecap":"round"}));
      svg.appendChild(S("circle",{cx:cx,cy:cy,r:"3.5",fill:V(hors?"chaud":"encre")}));
      svg.appendChild(S("text",{x:cx,y:cy+r-2,"text-anchor":"middle","class":"s-lab",
        fill:V(hors?"chaud":"encre")},fr(val,c.dec)+" "+c.u));
      svg.appendChild(S("text",{x:cx,y:cy+r+16,"text-anchor":"middle","class":"s-pet"},c.n));
    }
    function dessine(r){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la bande normale autour du profil sain, puis le profil lu */
      var bande="", haut=[], bas=[];
      STA.forEach(function(s,i){
        var x=X0+(X1-X0)*i/4;
        haut.push(x.toFixed(1)+","+py(SAIN[i]+2.5).toFixed(1));
        bas.unshift(x.toFixed(1)+","+py(SAIN[i]-2.5).toFixed(1));
        svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1,stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:x,y:Y1+18,"text-anchor":"middle","class":"s-pet"},s));
      });
      svg.appendChild(S("polygon",{points:haut.concat(bas).join(" "),fill:V("vert"),opacity:"0.16"}));
      [-5,10,20,30].forEach(function(t){
        svg.appendChild(S("text",{x:X0-10,y:py(t)+4,"text-anchor":"end","class":"s-pet"},t+" °C"));
      });
      var pts=[];
      STA.forEach(function(s,i){pts.push((X0+(X1-X0)*i/4).toFixed(1)+","+py(r[i]).toFixed(1));});
      svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V("encre"),
        "stroke-width":"2.6","stroke-linejoin":"round"}));
      STA.forEach(function(s,i){
        var x=X0+(X1-X0)*i/4, hors=Math.abs(r[i]-SAIN[i])>2.5;
        svg.appendChild(S("circle",{cx:x,cy:py(r[i]),r:"5",fill:V(hors?"chaud":"encre"),
          stroke:V("carte"),"stroke-width":"1.5"}));
        svg.appendChild(S("text",{x:x,y:py(r[i])-11,"text-anchor":"middle","class":"s-lab",
          fill:V(hors?"chaud":"encre")},frs(r[i],1)));
      });
      cadran(500,96,44,CAD[0],r[5]);
      cadran(596,96,44,CAD[1],r[6]);
      cadran(548,192,44,CAD[2],r[7]);
    }
    function calc(){
      choix.style.display="none";
      v.textContent=P.panne===0?"référence":"observée";
      dessine(PANNES_CTA[P.panne].r);
      res.innerHTML="<p><b>"+PANNES_CTA[P.panne].n+".</b> "+PANNES_CTA[P.panne].lire+"</p>";
    }
    function aveugle(){
      P.essais=0;
      P.cache=Math.random()<0.15?0:1+Math.floor(Math.random()*(PANNES_CTA.length-1));
      sel.value="0"; v.textContent="à trouver";
      dessine(PANNES_CTA[P.cache].r);
      choixL.innerHTML="";
      PANNES_CTA.forEach(function(p,i){
        var b=E("button",{type:"button"},p.n);
        b.addEventListener("click",function(){juger(i,b);});
        choixL.appendChild(b);
      });
      choix.style.display="block";
      res.innerHTML="<p>Suivez l'air de gauche à droite. <b>Chaque caisson doit ajouter "+
        "ce qu'il ajoute d'habitude</b> : le récupérateur 14 K, le mélange une moyenne, "+
        "la batterie le reste. Le premier caisson qui ne fait pas son travail désigne "+
        "la panne ; les trois cadrans confirment.</p>";
    }
    function juger(i,b){
      P.essais++;
      var L=PANNES_CTA[P.cache].r, G=PANNES_CTA[i].r;
      if (i===P.cache){
        b.className="juste";
        [].slice.call(choixL.children).forEach(function(x){x.disabled=true;});
        res.innerHTML="<p><b>Juste</b>, en "+P.essais+" essai"+(P.essais>1?"s":"")+". "+PANNES_CTA[i].lire+"</p>";
        return;
      }
      b.className="faux"; b.disabled=true;
      var ECH=[48,48,48,48,48,120,320,1800], NOMS=STA.concat(["débit","perte du filtre","CO₂"]);
      var k=-1, ecart=0;
      for (var j=0;j<8;j++){ var e=Math.abs(L[j]-G[j])/ECH[j]; if (e>ecart){ecart=e;k=j;} }
      res.innerHTML="<p><b>Non.</b> Avec cette panne, la lecture « "+NOMS[k]+" » serait "+
        (L[k]>G[k]?"plus basse":"plus haute")+" que ce que vous lisez. Reprenez le "+
        "profil caisson par caisson.</p>";
    }
    bTirer.addEventListener("click",aveugle);
    calc();
  }
};

/* ─────────── l'embleme d'en-tete : la journee de la salle ─────────── */
SCHEMAS["cta-embleme"]=function(el){
  var W=300,H=250, cx=150, cy=128, R=92;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un cadran de vingt-quatre heures : la salle occupée, sa température, son CO₂"});
  el.appendChild(svg);
  function pt(h,r){var a=(h/24*360-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:V("encre"),"stroke-width":"2.2"}));
  for (var h=0;h<24;h++){
    var a=pt(h,R), b=pt(h,R-(h%6?6:12));
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("encre"),"stroke-width":h%6?"1.2":"2.2"}));
  }
  [[9,12],[14,17]].forEach(function(o){
    var p1=pt(o[0],R+9), p2=pt(o[1],R+9);
    svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+(R+9)+" "+(R+9)+
      " 0 0 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V("tiede"),
      "stroke-width":"6","stroke-linecap":"round"}));
  });
  function courbe(f,coul,ep){
    var pts=[];
    for (var i=0;i<=96;i++){var t=i/4,q=pt(t,f(t));pts.push(q[0].toFixed(1)+","+q[1].toFixed(1));}
    svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"}));
  }
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R-38,fill:"none",stroke:V("vert"),"stroke-width":"1.2","stroke-dasharray":"4 4"}));
  courbe(function(t){var o=((t>9&&t<12)||(t>14&&t<17))?1:0;return R-38+5*o+2*Math.sin(t*3);},"froid",2.4);
  courbe(function(t){var o=((t>9&&t<12)||(t>14&&t<17))?14*Math.min(1,(t%5)/1.5):0;return R-58+o;},"vert",2);
  svg.appendChild(S("text",{x:cx,y:cy+6,"text-anchor":"middle","class":"s-tit",fill:V("encre2")},"24 h"));
  svg.appendChild(S("text",{x:cx,y:cy-R-16,"text-anchor":"middle","class":"s-pet"},"0 h"));
  svg.appendChild(S("text",{x:cx,y:cy+R+26,"text-anchor":"middle","class":"s-pet"},"12 h"));
};


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

OUTILS["journee-chaufferie"] = {
  titre:"Une journée de chaufferie, en une minute",
  intro:"Appuyez sur Lire. À cinq heures la relance, à sept heures les douches "+
        "de l'internat, à huit heures les élèves, la nuit le réduit. Regardez le "+
        "départ suivre la loi d'eau, et le retour décider si la chaudière condense.",
  monte:function(d){
    var DEF={tm:0, amp:6, sol:8, pente:2.5, para:0, reduit:3, relance:5, bipasse:0,
             pch:90, pers:150, ecs:1600, occ:"Collège en semaine"};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Nuit d'hiver, sans réduit", {reduit:0}],
      ["2 · Journée d'hiver, réduit de nuit", {}],
      ["3 · Loi d'eau trop haute", {para:8}],
      ["4 · La vanne qui tue la condensation", {bipasse:50}],
      ["5 · Le matin de l'internat", {ecs:3200}],
      ["6 · Mi-saison : la chaudière court-cycle", {tm:12, amp:6, sol:12}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===2?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    curseur(c1,maj,P,"Température extérieure moyenne","tm",-10,18,1,0," °C",touche,reg);
    curseur(c1,maj,P,"Amplitude jour-nuit","amp",0,12,1,0," K",touche,reg);
    curseur(c1,maj,P,"Ensoleillement maximal","sol",0,30,1,0," kW",touche,reg);
    curseur(c1,maj,P,"Pente de la loi d'eau","pente",0.6,3,0.1,1,"",touche,reg);
    curseur(c1,maj,P,"Parallèle","para",-10,10,1,0," K",touche,reg);
    curseur(c1,maj,P,"Réduit de nuit","reduit",0,8,0.5,1," K",touche,reg);
    curseur(c2,maj,P,"Heure de relance","relance",3,8,0.5,1," h",touche,reg);
    curseur(c2,maj,P,"Bipasse vers le retour chaudière","bipasse",0,80,10,0," %",touche,reg);
    curseur(c2,maj,P,"Puissance de la chaudière","pch",40,160,10,0," kW",touche,reg);
    curseur(c2,maj,P,"Élèves présents","pers",0,300,25,0,"",touche,reg);
    curseur(c2,maj,P,"ECS puisée par jour","ecs",0,4000,200,0," L",touche,reg);
    maj.push(choixListe(c2,P,"occ",["Collège en semaine","Bâtiment vide"],"Occupation",touche,null,reg));
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bHeure=E("button",{"class":"bt",type:"button"},"+ 1 h");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bHeure); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=350, X0=44,X1=420,Y0=28,Y1=224, XB=488,XB1=664;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Températures de départ, de retour, du bâtiment et du ballon sur vingt-quatre heures"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var CZ=60000, UA=3.0, PHIN=75, QM=0.896, VB=1500, BOUCLE=1.4, PECS=40, POMPES=0.31, CONS=19;
    var S_={}, anim=null, acc=0, dernier=0;
    var POSTES=["Gaz PCI","Chauffage","ECS","Boucle ECS","Fumées","Pompes"];

    function text(h){return P.tm+(P.amp/2)*Math.cos(2*Math.PI*(h-15)/24);}
    function occ(h){return (P.occ==="Collège en semaine"&&((h>=8&&h<12)||(h>=14&&h<17)))?P.pers:0;}
    function puisage(m){                       /* litres a 40 °C, par minute */
      var h=m/60;
      if (h>=7&&h<7.5)  return P.ecs*0.50/30;
      if (h>=12&&h<13)  return P.ecs*0.15/60;
      if (h>=19&&h<19.5)return P.ecs*0.35/30;
      return 0;
    }
    function consigne(h){ return (h>=P.relance&&h<22)?CONS:CONS-P.reduit; }
    function rendement(tret){ return 0.90+0.19*Math.max(0,Math.min(1,(57-tret)/32)); }

    function reset(){
      maj.forEach(function(x){x();});
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      S_={m:0, Tz:CONS-P.reduit*0.6, Tret:40, Tb:60, ecsOn:false, ch:true, cyc:0,
          E:{}, trZ:[], trX:[], trD:[], trR:[], trB:[], cond:[], hors:0, occmin:0,
          eau:0, q:null, tmax:90, tmin:Math.min(-8,text(0)-2), dernierEtat:false};
      POSTES.forEach(function(p){S_.E[p]=0;});
      dessine(); acc=0;
    }

    function pas(){
      var m=S_.m; if (m>=1440) return;
      var h=m/60, n=occ(h), Te=text(h), cs=consigne(h);
      var sol=(h>7&&h<18)?P.sol*Math.sin(Math.PI*(h-7)/11):0;
      /* l'ECS d'abord : puisage, boucle, et le ballon qui demande */
      var L=puisage(m), Leq=L*(40-10)/(S_.Tb-10);
      S_.Tb-=Leq*(S_.Tb-10)/VB;
      S_.Tb-=BOUCLE*60/(VB*4.185);
      S_.eau+=L;
      if (!S_.ecsOn && S_.Tb<55) S_.ecsOn=true;
      if (S_.ecsOn && S_.Tb>=60) S_.ecsOn=false;
      var qEcs=S_.ecsOn?PECS:0;
      /* la loi d'eau, et l'emission des radiateurs (implicite sur le retour) */
      var Tdc=Math.max(25,Math.min(85,cs+P.pente*(cs-Te)+P.para));
      var Tret=S_.Tret, Tdep=Tdc, em=0;
      for (var it=0;it<4;it++){
        var Tm=(Tdep+Tret)/2;
        em=PHIN*Math.pow(Math.max(0,(Tm-S_.Tz)/50),1.3);
        Tret=Tdep-em/(QM*4.185);
      }
      var qCh=Math.max(0,QM*4.185*(Tdep-Tret));
      /* la chaudiere : priorite ECS, modulation de 20 a 100 %, tout ou rien en dessous */
      var dispo=P.pch-qEcs, qChReel=Math.min(qCh,Math.max(0,dispo));
      var Tdep2=Tret+qChReel/(QM*4.185);
      if (qChReel<qCh){                        /* le chauffage n'a pas tout : le depart baisse */
        Tdep=Tdep2;
        for (var it2=0;it2<3;it2++){
          var Tm2=(Tdep+Tret)/2;
          em=PHIN*Math.pow(Math.max(0,(Tm2-S_.Tz)/50),1.3);
          Tret=Tdep-em/(QM*4.185);
        }
      }
      var qTot=qChReel+qEcs, seuil=0.2*P.pch, marche;
      if (qTot<=0) marche=false;
      else if (qTot>=seuil) marche=true;
      else {
        /* sous 20 % : la chaudiere ne module plus, elle bat au rythme de ses seuils */
        var cycleMin=Math.max(3,Math.round(60*seuil/Math.max(qTot,1)/4));
        marche=(m%cycleMin)<Math.max(1,Math.round(cycleMin*qTot/seuil));
      }
      if (marche&&!S_.dernierEtat) S_.cyc++;
      S_.dernierEtat=marche;
      var qBoiler=marche?Math.max(qTot,seuil):0;
      if (qTot>0&&qTot<seuil) qBoiler=marche?seuil:0;
      var TretCh=Tret+(P.bipasse/100)*(Tdep-Tret);
      var eta=rendement(TretCh);
      var condense=marche&&TretCh<57;
      /* le ballon se recharge */
      if (S_.ecsOn&&marche) S_.Tb+=PECS*60/(VB*4.185);
      /* le batiment */
      var gains=n*0.07+sol+UA*(Te-S_.Tz)+em;
      S_.Tz+=gains*60/CZ;
      S_.Tret=Tret;
      /* les comptes */
      var q={"Gaz PCI":qBoiler/eta,"Chauffage":marche?qChReel:0,"ECS":(S_.ecsOn&&marche)?PECS:0,
             "Boucle ECS":BOUCLE,"Fumées":qBoiler/eta-qBoiler,"Pompes":POMPES};
      for (var k in q) S_.E[k]+=q[k]/60;
      S_.q=q; S_.Tdep=Tdep; S_.Te=Te; S_.eta=eta; S_.marche=marche; S_.qBoiler=qBoiler;
      S_.cs=cs; S_.TretCh=TretCh;
      if (n>0){ S_.occmin++; if (S_.Tz<CONS-1.5) S_.hors++; }
      S_.trZ.push(S_.Tz); S_.trX.push(Te); S_.trD.push(marche?Tdep:(qChReel>0?(Tdep+Tret)/2:S_.Tz));
      S_.trR.push(Tret); S_.trB.push(S_.Tb); S_.cond.push(marche?(condense?2:1):0);
      S_.tmin=Math.min(S_.tmin,Te-2); S_.tmax=Math.max(S_.tmax,Tdep+4);
      S_.m++;
    }

    function px(m){return X0+(X1-X0)*m/1440;}
    function py(t){return Y1-(Y1-Y0)*(t-S_.tmin)/(S_.tmax-S_.tmin);}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
        "class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      for (var i=0;i<1440;i+=10) if (occ(i/60)>0)
        svg.appendChild(S("rect",{x:px(i),y:Y0,width:px(i+10)-px(i)+0.5,height:Y1-Y0,
          fill:V("tiede"),opacity:"0.10"}));
      [0,6,12,18,24].forEach(function(hh){
        svg.appendChild(S("line",{x1:px(hh*60),y1:Y0,x2:px(hh*60),y2:Y1,
          stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(hh*60),Y1+34,hh+" h");
      });
      [0,20,40,60,80].forEach(function(t){
        if (t<S_.tmin||t>S_.tmax) return;
        svg.appendChild(S("line",{x1:X0,y1:py(t),x2:X1,y2:py(t),stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.4"}));
        txt(X0-8,py(t)+4,t+" °C","s-pet","end");
      });
      /* les puisages d'ECS, en tirets sur le haut */
      for (var i=0;i<1440;i+=3) if (puisage(i)>0)
        svg.appendChild(S("line",{x1:px(i),y1:Y0-8,x2:px(i),y2:Y0-2,stroke:V("violet"),"stroke-width":"1.2"}));
      txt(X0,Y0-12,"douches","s-pet","start","violet");
      function trace(arr,coul,ep,dash){
        if (arr.length<2) return;
        var pts=[];
        for (var i=0;i<arr.length;i++) pts.push(px(i).toFixed(1)+","+py(arr[i]).toFixed(1));
        var a={points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"};
        if (dash) a["stroke-dasharray"]=dash;
        svg.appendChild(S("polyline",a));
      }
      trace(S_.trX,"encre2",1.4,"5 4");
      trace(S_.trB,"violet",1.8);
      trace(S_.trR,"tiede",2);
      trace(S_.trD,"chaud",2.4);
      trace(S_.trZ,"froid",2.6);
      /* la chaudiere : rouge quand elle brule sans condenser, vert quand elle condense */
      var yb=Y1+8;
      for (var i=0;i<S_.cond.length;i++){
        if (!S_.cond[i]) continue;
        svg.appendChild(S("rect",{x:px(i),y:yb,width:Math.max(0.5,px(i+1)-px(i)),height:10,
          fill:V(S_.cond[i]===2?"vert":"chaud")}));
      }
      txt(X1+6,yb+9,"chaudière","s-pet","start");
      if (S_.m>0&&S_.m<1440)
        svg.appendChild(S("line",{x1:px(S_.m),y1:Y0,x2:px(S_.m),y2:Y1+18,stroke:V("encre"),"stroke-width":"1.6"}));
      var yl=Y1+50;
      [["froid","bâtiment"],["chaud","départ"],["tiede","retour"],["violet","ballon"]].forEach(function(l,i){
        var x=X0+i*94;
        svg.appendChild(S("line",{x1:x,y1:yl,x2:x+20,y2:yl,stroke:V(l[0]),"stroke-width":"3"}));
        txt(x+26,yl+4,l[1],"s-pet","start");
      });
      [["chaud","brûle sans condenser"],["vert","condense"]].forEach(function(l,i){
        var x=X0+i*188;
        svg.appendChild(S("rect",{x:x,y:yl+14,width:20,height:8,fill:V(l[0])}));
        txt(x+26,yl+22,l[1],"s-pet","start");
      });
      /* les postes */
      txt(XB,Y0-12,"LA JOURNÉE, EN kWh","s-tit","start");
      var mx=Math.max(3,S_.E["Gaz PCI"]);
      POSTES.forEach(function(p,i){
        var y=Y0+6+i*27, w=(XB1-XB-132)*S_.E[p]/mx;
        txt(XB,y+12,p,"s-pet","start");
        svg.appendChild(S("rect",{x:XB+86,y:y+2,width:Math.max(1,w),height:13,rx:"2",
          fill:V(i===0?"encre2":(i>=3?"chaud":"vert")),opacity:"0.8"}));
        txt(XB+90+w,y+13,frs(S_.E[p],1),"s-pet","start");
      });
      /* le compte rendu */
      var fini=S_.m>=1440, hh=Math.floor(S_.m/60), mm=S_.m%60;
      var utile=S_.E["Chauffage"]+S_.E["ECS"], gaz=S_.E["Gaz PCI"];
      var rj=gaz>0?100*utile/gaz:0;
      var partCond=S_.cond.length?100*S_.cond.filter(function(c){return c===2;}).length/
                   Math.max(1,S_.cond.filter(function(c){return c>0;}).length):0;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heure</b><span>"+hh+" h "+(mm<10?"0":"")+mm+"</span></span>"+
        "<span><b>Bâtiment</b><span>"+frs(S_.Tz,1)+" °C</span></span>"+
        "<span><b>Consigne</b><span>"+frs(S_.cs!==undefined?S_.cs:consigne(0),1)+" °C</span></span>"+
        "<span><b>Extérieur</b><span>"+frs(S_.Te!==undefined?S_.Te:text(0),1)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Départ · retour</b><span>"+(S_.Tdep!==undefined?fr(S_.Tdep,0)+" · "+fr(S_.Tret,0)+" °C":"—")+"</span></span>"+
        "<span><b>Retour chaudière</b><span>"+(S_.TretCh!==undefined?fr(S_.TretCh,0)+" °C":"—")+"</span></span>"+
        "<span><b>Chaudière</b><span>"+(S_.marche?fr(100*S_.qBoiler/P.pch,0)+" %, "+(S_.TretCh<57?"condense":"ne condense pas"):"à l'arrêt")+"</span></span>"+
        "<span><b>Ballon</b><span>"+frs(S_.Tb,1)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Gaz</b><span>"+frs(gaz,1)+" kWh</span></span>"+
        "<span><b>Rendement du jour</b><span>"+(gaz>0?fr(rj,0)+" %":"—")+"</span></span>"+
        "<span><b>Temps en condensation</b><span>"+fr(partCond,0)+" %</span></span>"+
        "<span><b>Démarrages</b><span>"+S_.cyc+"</span></span>"+
        "<span><b>Hors confort, occupé</b><span>"+fr(S_.hors/60,1)+" h</span></span>"+
        "</div><p>"+(!S_.m
          ? "Appuyez sur <b>Lire</b>, ou avancez d'une heure. Le départ suit la loi d'eau ; "+
            "le retour dit si la chaudière condense."
          : fini
          ? "<b>Journée finie.</b> "+frs(gaz,0)+" kWh de gaz pour "+frs(utile,0)+
            " kWh utiles, rendement "+fr(rj,0)+" % sur PCI. La chaudière a condensé "+
            fr(partCond,0)+" % de son temps de marche"+
            (partCond<40?" : <b>regardez la température qui lui revient.</b>":".")+
            (S_.cyc>40?" <b>"+S_.cyc+" démarrages</b> : elle court-cycle, elle est trop grosse pour cette journée.":"")+
            (S_.hors>60?" Le bâtiment est resté <b>"+fr(S_.hors/60,1)+" h sous la consigne</b> en présence.":"")
          : "Le retour décide de tout : sous 57 °C la barre passe au vert et le gaz "+
            "rend plus que son PCI ; au-dessus, la chaudière brûle comme une "+
            "chaudière ordinaire.")+"</p>";
    }
    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.024; dernier=ts;
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.m<1440) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";return;}
      if (S_.m>=1440) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bHeure.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      if (S_.m>=1440) return;
      for (var i=0;i<60&&S_.m<1440;i++) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

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

OUTILS["diagnostic-chaufferie"] = {
  titre:"Lire la chaufferie : six cadrans, une panne",
  intro:"Il fait 0 °C dehors. La sonde extérieure, le départ, le retour, l'ambiance, le "+
        "manomètre, le ballon : six lectures, et la panne est presque toujours dedans. "+
        "Choisissez-en une et regardez les aiguilles. Puis tirez-en une à l'aveugle, et trouvez.",
  monte:function(d){
    var P={panne:0, cache:-1, essais:0};
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Panne à observer"));
    var v=E("span",{"class":"v"},""); ch.appendChild(v);
    var sel=E("select",{},PANNES_CH.map(function(p,i){
      return '<option value="'+i+'"'+(i===0?" selected":"")+'>'+p.n+"</option>";}).join(""));
    sel.addEventListener("change",function(){P.panne=+this.value;calc();});
    ch.appendChild(sel); c1.appendChild(ch);
    var cmd=E("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"});
    var bTirer=E("button",{"class":"bt p",type:"button"},"Tirer une panne à l'aveugle");
    cmd.appendChild(bTirer); c2.appendChild(cmd);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);

    var W=680,H=330;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Six cadrans : sonde extérieure, départ, retour, ambiance, pression, ballon"});
    d.appendChild(svg);
    var choix=E("div",{"class":"qq",style:"display:none;border:0;padding:0"});
    choix.appendChild(E("p",{},"Quelle est la panne ?"));
    var choixL=E("div",{"class":"choix"}); choix.appendChild(choixL); d.appendChild(choix);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var CAD=[{n:"Sonde extérieure",u:"°C",lo:-10,hi:20,nlo:-2,nhi:2,dec:0},
             {n:"Départ",u:"°C",lo:20,hi:90,nlo:60,nhi:72,dec:0},
             {n:"Retour",u:"°C",lo:20,hi:90,nlo:42,nhi:54,dec:0},
             {n:"Ambiance",u:"°C",lo:12,hi:24,nlo:18.5,nhi:20.5,dec:1},
             {n:"Pression",u:"bar",lo:0,hi:3,nlo:1.2,nhi:2.2,dec:1},
             {n:"Ballon ECS",u:"°C",lo:20,hi:70,nlo:55,nhi:63,dec:0}];
    function cadran(cx,cy,r,c,val){
      function ang(x){var f=Math.min(1,Math.max(0,(x-c.lo)/(c.hi-c.lo)));return (-210+240*f)*Math.PI/180;}
      function pt(a,rr){return [cx+rr*Math.cos(a),cy+rr*Math.sin(a)];}
      function arc(a1,a2,rr,coul,ep,op){
        var p1=pt(a1,rr),p2=pt(a2,rr),gr=(a2-a1)>Math.PI?1:0;
        svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+rr+" "+rr+
          " 0 "+gr+" 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V(coul),
          "stroke-width":ep,"stroke-linecap":"round",opacity:op||1}));
      }
      arc(ang(c.lo),ang(c.hi),r,"trait2",6,0.7);
      arc(ang(c.nlo),ang(c.nhi),r,"vert",6,0.55);
      var a=ang(val), p=pt(a,r-5), hors=val<c.nlo||val>c.nhi;
      svg.appendChild(S("line",{x1:cx,y1:cy,x2:p[0].toFixed(1),y2:p[1].toFixed(1),
        stroke:V(hors?"chaud":"encre"),"stroke-width":"2.4","stroke-linecap":"round"}));
      svg.appendChild(S("circle",{cx:cx,cy:cy,r:"3.5",fill:V(hors?"chaud":"encre")}));
      svg.appendChild(S("text",{x:cx,y:cy+r-2,"text-anchor":"middle","class":"s-lab",
        fill:V(hors?"chaud":"encre")},frs(val,c.dec)+" "+c.u));
      svg.appendChild(S("text",{x:cx,y:cy+r+16,"text-anchor":"middle","class":"s-pet"},c.n));
    }
    function dessine(r){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      CAD.forEach(function(c,i){cadran(120+(i%3)*220,80+Math.floor(i/3)*160,52,c,r[i]);});
      var dt=r[1]-r[2];
      svg.appendChild(S("text",{x:W-14,y:16,"text-anchor":"end","class":"s-lab",
        fill:V(dt<8||dt>26?"chaud":"encre")},"écart départ-retour : "+fr(dt,0)+" K"));
    }
    function calc(){
      choix.style.display="none";
      v.textContent=P.panne===0?"référence":"observée";
      dessine(PANNES_CH[P.panne].r);
      res.innerHTML="<p><b>"+PANNES_CH[P.panne].n+".</b> "+PANNES_CH[P.panne].lire+"</p>";
    }
    function aveugle(){
      P.essais=0;
      P.cache=Math.random()<0.14?0:1+Math.floor(Math.random()*(PANNES_CH.length-1));
      sel.value="0"; v.textContent="à trouver";
      dessine(PANNES_CH[P.cache].r);
      choixL.innerHTML="";
      PANNES_CH.forEach(function(p,i){
        var b=E("button",{type:"button"},p.n);
        b.addEventListener("click",function(){juger(i,b);});
        choixL.appendChild(b);
      });
      choix.style.display="block";
      res.innerHTML="<p>Lisez l'<b>écart départ-retour</b> d'abord : nul, rien ne circule ; "+
        "énorme, le débit manque. Puis l'ambiance dit si le bâtiment s'en plaint, et le "+
        "manomètre ou le ballon désignent ce qui n'est pas le chauffage.</p>";
    }
    function juger(i,b){
      P.essais++;
      var L=PANNES_CH[P.cache].r, G=PANNES_CH[i].r;
      if (i===P.cache){
        b.className="juste";
        [].slice.call(choixL.children).forEach(function(x){x.disabled=true;});
        res.innerHTML="<p><b>Juste</b>, en "+P.essais+" essai"+(P.essais>1?"s":"")+". "+PANNES_CH[i].lire+"</p>";
        return;
      }
      b.className="faux"; b.disabled=true;
      var k=-1, ecart=0;
      for (var j=0;j<6;j++){ var e=Math.abs(L[j]-G[j])/(CAD[j].hi-CAD[j].lo); if (e>ecart){ecart=e;k=j;} }
      res.innerHTML="<p><b>Non.</b> Avec cette panne, le cadran « "+CAD[k].n+" » serait "+
        (L[k]>G[k]?"plus bas":"plus haut")+" que ce que vous lisez. Reprenez par l'écart "+
        "départ-retour, puis par l'aiguille qui sort le plus de sa zone verte.</p>";
    }
    bTirer.addEventListener("click",aveugle);
    calc();
  }
};

/* ─────────── l'embleme d'en-tete : la journee de la chaufferie ─────────── */
SCHEMAS["chaufferie-embleme"]=function(el){
  var W=300,H=250, cx=150, cy=128, R=92;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un cadran de vingt-quatre heures : la relance, la journée d'école, le réduit de nuit, et le départ qui suit"});
  el.appendChild(svg);
  function pt(h,r){var a=(h/24*360-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:V("encre"),"stroke-width":"2.2"}));
  for (var h=0;h<24;h++){
    var a=pt(h,R), b=pt(h,R-(h%6?6:12));
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("encre"),"stroke-width":h%6?"1.2":"2.2"}));
  }
  [[8,12],[14,17]].forEach(function(o){
    var p1=pt(o[0],R+9), p2=pt(o[1],R+9);
    svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+(R+9)+" "+(R+9)+
      " 0 0 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V("tiede"),
      "stroke-width":"6","stroke-linecap":"round"}));
  });
  function courbe(f,coul,ep){
    var pts=[];
    for (var i=0;i<=96;i++){var t=i/4,q=pt(t,f(t));pts.push(q[0].toFixed(1)+","+q[1].toFixed(1));}
    svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"}));
  }
  /* le depart, haut le jour, bas la nuit ; le batiment, qui suit en plus doux */
  courbe(function(t){return R-30+((t>5&&t<22)?12:0)*Math.min(1,(t>5?(t-5):0)/1.5)-3*Math.sin(t*2);},"chaud",2.4);
  courbe(function(t){return R-62+((t>6&&t<23)?7:0)*Math.min(1,(t>6?(t-6):0)/2.5);},"froid",2.4);
  svg.appendChild(S("text",{x:cx,y:cy+6,"text-anchor":"middle","class":"s-tit",fill:V("encre2")},"24 h"));
  svg.appendChild(S("text",{x:cx,y:cy-R-16,"text-anchor":"middle","class":"s-pet"},"0 h"));
  svg.appendChild(S("text",{x:cx,y:cy+R+26,"text-anchor":"middle","class":"s-pet"},"12 h"));
};

/* ═══════════════════════════════════════════ LE PRODUCTIBLE PHOTOVOLTAIQUE
   Seance 22. Quatre nombres suffisent a un productible, trois de plus a ce
   qu'il vaut : la puissance crete, l'irradiation du plan, le ratio de
   performance, puis la consommation, la part autoconsommee et les deux prix.
   L'outil ne connait pas la courbe horaire : la part autoconsommee est un
   curseur, et c'est voulu — c'est elle que le cours discute. */
OUTILS["productible-pv"] = {
  titre:"Le productible, et ce qu'il vaut",
  intro:"Déplacez la puissance crête, l'orientation et le ratio de performance : "+
        "le productible suit. Puis la part autoconsommée et les deux prix : "+
        "c'est là que se joue le temps de retour.",
  monte:function(d){
    var ORI=[["Sud, 30°",1.00],["Sud, 10°",0.95],["Sud, 60°",0.90],["Est ou ouest, 10°",0.86],
             ["Est ou ouest, 30°",0.80],["Sud, vertical",0.70]];
    var NOMS_ORI=ORI.map(function(o){return o[0];});
    var P={pc:90, irr:1750, ori:"Est ou ouest, 10°", pr:0.80, conso:520, auto:72, achat:25, vente:11.07, cout:1100};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    curseur(c1,maj,P,"Puissance crête","pc",3,500,1,0," kWc",calc);
    curseur(c1,maj,P,"Irradiation du site, plan sud 30°","irr",1000,2000,10,0," kWh/m²",calc);
    maj.push(choixListe(c1,P,"ori",NOMS_ORI,"Orientation et inclinaison",calc,
      function(n){for(var i=0;i<ORI.length;i++) if(ORI[i][0]===n) return "coefficient "+frs(ORI[i][1],2);return "";}));
    curseur(c1,maj,P,"Ratio de performance","pr",0.6,0.9,0.01,2,"",calc);
    curseur(c2,maj,P,"Consommation annuelle du bâtiment","conso",10,2000,10,0," MWh",calc);
    curseur(c2,maj,P,"Part de la production autoconsommée","auto",0,100,1,0," %",calc);
    curseur(c2,maj,P,"Prix du kWh acheté","achat",10,40,0.5,1," ct",calc);
    curseur(c2,maj,P,"Prix du kWh vendu","vente",0,20,0.5,2," ct",calc);
    curseur(c2,maj,P,"Coût de l'installation","cout",600,2500,50,0," €/kWc",calc);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);
    function calc(){
      maj.forEach(function(x){x();});
      var k=1; for(var i=0;i<ORI.length;i++) if(ORI[i][0]===P.ori) k=ORI[i][1];
      var hepp=P.irr*k, E_=P.pc*hepp*P.pr;              /* kWh/an */
      var autoK=E_*P.auto/100, surplus=E_-autoK, conso=P.conso*1000;
      var autoprod=conso>0?100*autoK/conso:0;
      var eco=autoK*P.achat/100, vente=surplus*P.vente/100, gain=eco+vente;
      var inv=P.pc*P.cout, retour=gain>0?inv/gain:0;
      var alerte="";
      if (autoK>conso) alerte="<p><b>Impossible :</b> on ne peut pas autoconsommer plus que ce que le bâtiment consomme. Baissez la part autoconsommée ou la puissance.</p>";
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heures équivalentes</b><span>"+fr(hepp,0)+" h/an</span></span>"+
        "<span><b>Productible</b><span>"+fr(E_/1000,1)+" MWh/an</span></span>"+
        "<span><b>Par kWc</b><span>"+fr(E_/P.pc,0)+" kWh/kWc</span></span>"+
        "<span><b>Facteur de charge</b><span>"+fr(100*E_/(P.pc*8760),1)+" %</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Autoconsommé</b><span>"+fr(autoK/1000,1)+" MWh</span></span>"+
        "<span><b>Surplus</b><span>"+fr(surplus/1000,1)+" MWh</span></span>"+
        "<span><b>Taux d'autoproduction</b><span>"+fr(autoprod,1)+" %</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Économie</b><span>"+fr(eco,0)+" €/an</span></span>"+
        "<span><b>Revente</b><span>"+fr(vente,0)+" €/an</span></span>"+
        "<span><b>Gain</b><span>"+fr(gain,0)+" €/an</span></span>"+
        "<span><b>Investissement</b><span>"+fr(inv,0)+" €</span></span>"+
        "<span><b>Retour brut</b><span>"+(retour?fr(retour,1)+" ans":"—")+"</span></span>"+
        "</div>"+alerte+
        "<p>Le kilowattheure autoconsommé vaut <b>"+fr(P.achat,1)+" ct</b>, le kilowattheure vendu <b>"+
        fr(P.vente,2)+" ct</b> : chaque kilowattheure déplacé du surplus vers l'autoconsommation rapporte "+
        fr(P.achat-P.vente,2)+" ct de plus. "+(P.auto<50?"À moins de la moitié autoconsommée, l'installation est trop grande pour le bâtiment, ou ses consommations sont au mauvais moment.":"")+"</p>";
    }
    calc();
  }
};

/* ═══════════════════════════════════════════ ÉCLAIRER UNE SALLE
   Seance 23. La methode du facteur d'utilisation, telle qu'elle se fait a
   la main : le flux a installer, le nombre de luminaires, la puissance au
   metre carre, et ce que la gestion en retire sur l'annee. */
OUTILS["eclairement"] = {
  titre:"Éclairer une salle : combien de luminaires, combien de watts",
  intro:"La surface, le niveau à maintenir, le luminaire et ses deux facteurs : "+
        "le flux à installer suit, puis le nombre de luminaires et les watts par "+
        "mètre carré. Les heures et la gestion disent ce que ça coûte sur l'année.",
  monte:function(d){
    var P={L:8, l:7, E:300, flux:4000, W:36, ui:0.55, fm:0.80, h:1400, pres:20, grad:30, prix:25};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    curseur(c1,maj,P,"Longueur de la salle","L",3,20,0.5,1," m",calc);
    curseur(c1,maj,P,"Largeur","l",3,15,0.5,1," m",calc);
    curseur(c1,maj,P,"Éclairement à maintenir","E",100,750,25,0," lux",calc);
    curseur(c1,maj,P,"Flux d'un luminaire","flux",1000,8000,100,0," lm",calc);
    curseur(c1,maj,P,"Puissance d'un luminaire","W",8,80,1,0," W",calc);
    curseur(c2,maj,P,"Facteur d'utilisation Ui","ui",0.3,0.8,0.01,2,"",calc);
    curseur(c2,maj,P,"Facteur de maintenance Fm","fm",0.6,0.95,0.01,2,"",calc);
    curseur(c2,maj,P,"Heures d'occupation par an","h",200,4000,50,0," h",calc);
    curseur(c2,maj,P,"Gain de la détection de présence","pres",0,50,5,0," %",calc);
    curseur(c2,maj,P,"Gain de la gradation lumière du jour","grad",0,60,5,0," %",calc);
    curseur(c2,maj,P,"Prix du kilowattheure","prix",10,40,0.5,1," ct",calc);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);
    function calc(){
      maj.forEach(function(x){x();});
      var S=P.L*P.l, phi=P.E*S/(P.ui*P.fm), n=Math.ceil(phi/P.flux), Pinst=n*P.W;
      var Ereel=n*P.flux*P.ui*P.fm/S, wm2=Pinst/S, eff=P.flux/P.W;
      var Ean=Pinst*P.h/1000, Egere=Ean*(1-P.pres/100)*(1-P.grad/100);
      var K=S/((2.2)*(P.L+P.l));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Surface</b><span>"+fr(S,1)+" m²</span></span>"+
        "<span><b>Flux à installer</b><span>"+fr(phi,0)+" lm</span></span>"+
        "<span><b>Luminaires</b><span>"+n+"</span></span>"+
        "<span><b>Éclairement obtenu</b><span>"+fr(Ereel,0)+" lux</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Puissance installée</b><span>"+fr(Pinst,0)+" W</span></span>"+
        "<span><b>Par mètre carré</b><span>"+fr(wm2,1)+" W/m²</span></span>"+
        "<span><b>Efficacité du luminaire</b><span>"+fr(eff,0)+" lm/W</span></span>"+
        "<span><b>Indice du local</b><span>K = "+fr(K,1)+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Énergie sans gestion</b><span>"+fr(Ean,0)+" kWh/an</span></span>"+
        "<span><b>Avec gestion</b><span>"+fr(Egere,0)+" kWh/an</span></span>"+
        "<span><b>Économie</b><span>"+fr(Ean-Egere,0)+" kWh, "+fr((Ean-Egere)*P.prix/100,0)+" €/an</span></span>"+
        "</div><p>"+(wm2/(P.E/100)>2.5
          ? "<b>Plus de 2,5 W/m² pour 100 lux :</b> le luminaire est peu efficace, ou les facteurs sont sévères. Une LED récente tient entre 1,5 et 2,2."
          : "Ratio "+fr(wm2/(P.E/100),1)+" W/m² pour 100 lux : dans la plage d'une installation LED correcte.")+
        " L'indice du local K sert à lire Ui dans la table du fabricant ; en dessous de 1, une salle étroite ou haute, Ui tombe vers 0,4.</p>";
    }
    calc();
  }
};

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

OUTILS["lecture-dossier"] = {
  titre:"Quinze minutes de lecture : où chercher, et sous quelle forme répondre",
  intro:"Un dossier fictif, douze consignes. Pour chacune, dites dans quel "+
        "document se trouve la réponse, et quelle forme le verbe de consigne "+
        "attend. Le chronomètre tourne : l'épreuve donne quinze minutes.",
  monte:function(d){
    var D=null, debut=null, fini=false, tick=null;
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Le dossier"));
    var vD=E("span",{"class":"v"},""); ch.appendChild(vD);
    var selD0=E("select",{},'<option value="-1">Au hasard</option>'+DOSSIERS_LECTURE.map(function(x,i){
      return '<option value="'+i+'">'+x.nom+"</option>";}).join(""));
    ch.appendChild(selD0); d.appendChild(ch);
    var tete=E("div",{"class":"res"}); d.appendChild(tete);
    function afficheTete(){
      var i=+selD0.value;
      if (i<0 && !D){
        vD.textContent="tiré au sort au départ";
        tete.innerHTML="<p>Le dossier sera <b>tiré au sort</b> quand vous appuierez sur Commencer : "+
          DOSSIERS_LECTURE.map(function(x){return x.nom.toLowerCase();}).join(", ")+".</p>";
        return;
      }
      var X=D||DOSSIERS_LECTURE[i];
      vD.textContent=X.nom.toLowerCase();
      tete.innerHTML="<p><b>"+X.titre+"</b> · les documents du dossier :</p>"+
        "<ul style='columns:2;margin:6px 0 0;padding-left:18px'>"+X.docs.map(function(x){
          return "<li><b>"+x[0]+"</b> · "+x[1]+"</li>";}).join("")+"</ul>";
    }
    selD0.addEventListener("change",function(){ if (!debut||fini){ D=null; afficheTete(); } });
    var cmd=E("div",{style:"display:flex;gap:8px;margin:12px 0;flex-wrap:wrap;align-items:center"});
    var bGo=E("button",{"class":"bt p",type:"button"},"Commencer");
    var bVer=E("button",{"class":"bt",type:"button",disabled:"disabled"},"Vérifier");
    var chrono=E("span",{"class":"s-lab",style:"font-family:'IBM Plex Mono',monospace;font-size:15px"},"00:00");
    cmd.appendChild(bGo); cmd.appendChild(bVer); cmd.appendChild(chrono); d.appendChild(cmd);
    var liste=E("div",{style:"display:none"}); d.appendChild(liste);
    var res=E("div",{"class":"res",style:"margin-top:12px;display:none"}); d.appendChild(res);
    var ordre=[], selDoc=[], selF=[], lignes=[];
    function construit(){
      liste.innerHTML=""; selDoc=[]; selF=[]; lignes=[];
      ordre=D.questions.map(function(q,i){return i;});
      for (var i=ordre.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=ordre[i];ordre[i]=ordre[j];ordre[j]=t;}
      ordre.forEach(function(qi,k){
        var q=D.questions[qi];
        var bloc=E("div",{"class":"champ",style:"margin:10px 0;padding:10px 12px;border:1px solid var(--trait);border-radius:8px"});
        bloc.appendChild(E("p",{style:"margin:0 0 8px"},"<b>"+(k+1)+".</b> "+q[0]));
        var g=E("div",{style:"display:flex;gap:10px;flex-wrap:wrap"});
        var s1=E("select",{},"<option value=''>Où chercher ?</option>"+D.docs.map(function(x,i){
          return "<option value='"+i+"'>"+x[0]+" · "+x[1]+"</option>";}).join(""));
        var s2=E("select",{},"<option value=''>Quelle forme de réponse ?</option>"+FORMES_LECTURE.map(function(x,i){
          return "<option value='"+i+"'>"+x+"</option>";}).join(""));
        g.appendChild(s1); g.appendChild(s2); bloc.appendChild(g);
        var retour=E("p",{style:"margin:8px 0 0;display:none"}); bloc.appendChild(retour);
        liste.appendChild(bloc); selDoc.push(s1); selF.push(s2); lignes.push(retour);
      });
    }
    function affiche(){
      if (!debut) return;
      var s=Math.floor((Date.now()-debut)/1000), m=Math.floor(s/60); s=s%60;
      chrono.textContent=(m<10?"0":"")+m+":"+(s<10?"0":"")+s+(m>=15?"  · au-delà des quinze minutes":"");
      chrono.style.color=m>=15?V("chaud"):V("encre");
    }
    bGo.addEventListener("click",function(){
      var i=+selD0.value;
      D=DOSSIERS_LECTURE[i<0?Math.floor(Math.random()*DOSSIERS_LECTURE.length):i];
      afficheTete();
      construit(); liste.style.display="block"; res.style.display="none";
      fini=false; debut=Date.now(); bVer.disabled=false; bGo.textContent="Recommencer";
      if (tick) clearInterval(tick); tick=setInterval(affiche,500); affiche();
    });
    bVer.addEventListener("click",function(){
      if (fini||!D) return;
      fini=true; clearInterval(tick); affiche();
      var nd=0, nf=0, vides=0;
      ordre.forEach(function(qi,k){
        var q=D.questions[qi], vd=selDoc[k].value, vf=selF[k].value;
        if (vd===""&&vf==="") vides++;
        var okd=(vd!==""&&+vd===q[1]), okf=(vf!==""&&+vf===q[2]);
        if (okd) nd++; if (okf) nf++;
        selDoc[k].disabled=true; selF[k].disabled=true;
        var r=lignes[k]; r.style.display="block";
        r.innerHTML=(okd?"<span style='color:"+V("vert")+"'><b>Document :</b> juste.</span> ":"<span style='color:"+V("chaud")+"'><b>Document :</b> non, c'était le "+D.docs[q[1]][0]+".</span> ")+
                    (okf?"<span style='color:"+V("vert")+"'><b>Forme :</b> juste.</span> ":"<span style='color:"+V("chaud")+"'><b>Forme :</b> non, "+FORMES_LECTURE[q[2]]+".</span> ")+
                    "<span style='color:var(--encre2)'>"+q[3]+"</span>";
      });
      var s=Math.floor((Date.now()-debut)/1000), m=Math.floor(s/60);
      res.style.display="block";
      res.innerHTML="<div class='gros'>"+
        "<span><b>Dossier</b><span>"+D.nom+"</span></span>"+
        "<span><b>Documents trouvés</b><span>"+nd+" / "+ordre.length+"</span></span>"+
        "<span><b>Formes justes</b><span>"+nf+" / "+ordre.length+"</span></span>"+
        "<span><b>Temps</b><span>"+m+" min "+(s%60)+" s</span></span>"+
        "<span><b>Sans réponse</b><span>"+vides+"</span></span></div>"+
        "<p>"+(m>=15?"<b>Plus de quinze minutes :</b> à l'épreuve, ce temps est pris sur la première partie. ":"<b>Dans les quinze minutes.</b> ")+
        (nd<ordre.length-2?"Plusieurs documents ratés : relisez le sommaire des DT avant les questions, c'est la règle 1 de la lecture. ":"")+
        (nf<ordre.length-2?"Plusieurs formes ratées : le verbe de la consigne dit ce que le correcteur attend, relisez le tableau des verbes de la séance 25. ":"")+
        "Changez de dossier pour vérifier que le geste tient sur un autre bâtiment.</p>";
      res.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
    afficheTete();
  }
};

/* ═══════════════════════════════════════════ LA CARTE DES PREREQUIS
   Page d'essai. Le site ecrit prerequis.js, la carte des pages publiees et
   des pages que chacune suppose lues. L'outil la dessine en colonnes, une par
   sequence, et la croise avec les marques « lu » du navigateur : on choisit
   la page qu'on va lire, et la carte dit ce qu'il faut avoir lu avant, et ce
   qui ne l'est pas encore. Tout reste dans le navigateur, rien ne sort. */
OUTILS["carte-prerequis"] = {
  titre:"Ce qu'il faut avoir lu avant : la carte des prérequis",
  intro:"Chaque page du site annonce ses prérequis. Mises bout à bout, elles font "+
        "une carte. Choisissez la page que vous allez lire : ses prérequis "+
        "s'allument, et ceux que vous n'avez pas encore marqués « lu » sont en rouge.",
  monte:function(d){
    var socle=document.querySelector("[data-site]");
    var res=E("div",{"class":"res"});
    if (!socle){
      res.innerHTML="<p>La carte ne vit que sur le site de classe : elle lit la liste des pages publiées, que seule la construction du site connaît.</p>";
      d.appendChild(res); return;
    }
    var CLE="fed."+socle.getAttribute("data-site")+".lu";
    function lues(){ try{ return JSON.parse(localStorage.getItem(CLE)||"{}")||{}; }catch(e){ return {}; } }
    var sc=document.createElement("script");
    sc.src="../prerequis.js";
    sc.onload=function(){ dessine(window.PREREQUIS||{}); };
    sc.onerror=function(){ res.innerHTML="<p>La carte n'a pas pu être chargée : reconstruire le site.</p>"; d.appendChild(res); };
    document.head.appendChild(sc);

    function dessine(C){
      var ids=Object.keys(C);
      if (!ids.length){ res.innerHTML="<p>Aucune page publiée ne déclare de prérequis.</p>"; d.appendChild(res); return; }
      /* les colonnes : un groupe par sequence, puis le reste dans l'ordre d'apparition */
      var groupes=[], parG={};
      ids.forEach(function(id){
        var g=C[id].groupe; if (!parG[g]){ parG[g]=[]; groupes.push(g); }
        parG[g].push(id);
      });
      groupes.sort(function(a,b){
        var sa=/^Séquence (\d+)/.exec(a), sb=/^Séquence (\d+)/.exec(b);
        if (sa&&sb) return +sa[1]-+sb[1];
        if (sa) return -1; if (sb) return 1; return 0;
      });
      groupes.forEach(function(g){ parG[g].sort(function(a,b){ return (C[a].ordre-C[b].ordre)||(a<b?-1:1); }); });
      var CW=150, RH=54, X0=20, Y0=54, nmax=0;
      groupes.forEach(function(g){ nmax=Math.max(nmax,parG[g].length); });
      var W=X0*2+groupes.length*CW, H=Y0+nmax*RH+20;
      var pos={};
      groupes.forEach(function(g,ci){ parG[g].forEach(function(id,ri){ pos[id]={x:X0+ci*CW+CW/2,y:Y0+ri*RH+RH/2}; }); });
      /* la page qu'on va lire : par defaut la premiere non lue dans l'ordre des colonnes */
      var lu=lues(), choix=null;
      for (var i=0;i<groupes.length&&!choix;i++) for (var j=0;j<parG[groupes[i]].length;j++){ var id=parG[groupes[i]][j]; if(!lu[id]){ choix=id; break; } }
      if (!choix) choix=ids[0];
      var ch=E("div",{"class":"champ"}); ch.appendChild(E("label",{},"La page que je vais lire"));
      var vS=E("span",{"class":"v"},""); ch.appendChild(vS);
      var sel=E("select",{},groupes.map(function(g){ return parG[g].map(function(id){ return "<option value='"+id+"'"+(id===choix?" selected":"")+">"+C[id].nom+"</option>"; }).join(""); }).join(""));
      ch.appendChild(sel); d.appendChild(ch);
      var enveloppe=E("div",{style:"overflow-x:auto;margin-top:8px"}); d.appendChild(enveloppe);
      var svg=S("svg",{viewBox:"0 0 "+W+" "+H,width:W,role:"img","aria-label":"Carte des pages du site et de leurs prérequis"});
      svg.style.minWidth=W+"px"; enveloppe.appendChild(svg);
      d.appendChild(res);
      function amont(id,acc){ (C[id].pre||[]).forEach(function(p){ if(!acc[p[0]]){ acc[p[0]]=p[1]; amont(p[0],acc); } }); return acc; }
      function peint(){
        lu=lues(); choix=sel.value; vS.textContent=lu[choix]?"déjà lue":"à lire";
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var directs={}; (C[choix].pre||[]).forEach(function(p){ directs[p[0]]=p[1]; });
        var tous=amont(choix,{});
        groupes.forEach(function(g,ci){
          svg.appendChild(S("text",{x:X0+ci*CW+CW/2,y:26,"text-anchor":"middle","class":"s-lab",fill:V("encre2")},g));
        });
        /* les liaisons : de la page prerequise vers la page qui la suppose */
        ids.forEach(function(id){ (C[id].pre||[]).forEach(function(p){
          var a=pos[p[0]], b=pos[id]; if(!a||!b) return;
          var fort=(id===choix), amontChoix=(tous[id]!==undefined&&tous[p[0]]!==undefined);
          var coul=fort?(lu[p[0]]?"vert":"chaud"):(amontChoix?"tiede":"trait2");
          var dx=(b.x-a.x)/2;
          svg.appendChild(S("path",{d:"M"+a.x+","+a.y+" C"+(a.x+dx)+","+a.y+" "+(b.x-dx)+","+b.y+" "+b.x+","+b.y,
            fill:"none",stroke:V(coul),"stroke-width":fort?3:(amontChoix?2:1),opacity:fort?1:(amontChoix?0.9:0.35)}));
        }); });
        ids.forEach(function(id){
          var p=pos[id], estChoix=(id===choix), direct=directs[id]!==undefined, loin=tous[id]!==undefined;
          var fond=estChoix?"encre":(direct?(lu[id]?"vert":"chaud"):(loin?"tiede":(lu[id]?"vert":"carte")));
          var g=S("g",{style:"cursor:pointer"});
          g.appendChild(S("rect",{x:p.x-64,y:p.y-18,width:128,height:36,rx:"8",fill:V(fond),opacity:estChoix||direct||loin?1:(lu[id]?0.55:1),stroke:V(lu[id]?"vert":"trait"),"stroke-width":lu[id]?2:1}));
          var nom=C[id].code||C[id].nom.split(" — ")[0].split(" · ")[0];
          if (nom.length>16) nom=nom.slice(0,15)+"…";
          g.appendChild(S("text",{x:p.x,y:p.y+5,"text-anchor":"middle","class":"s-pet",fill:V(estChoix||direct||loin?"carte":"encre")},nom));
          g.addEventListener("click",function(){ sel.value=id; peint(); });
          svg.appendChild(g);
        });
        /* le compte rendu : la liste des prerequis, lus ou non, avec le lien */
        var manque=[], ok=[];
        (C[choix].pre||[]).forEach(function(p){ (lu[p[0]]?ok:manque).push(p); });
        var h="<p><b>"+C[choix].nom+"</b> suppose "+(C[choix].pre||[]).length+" page"+((C[choix].pre||[]).length>1?"s":"")+" lue"+((C[choix].pre||[]).length>1?"s":"")+".</p>";
        if (manque.length) h+="<p><b>À lire avant, pas encore marqué « lu » :</b></p><ul>"+manque.map(function(p){ return "<li><a href='../"+p[0]+".html'>"+C[p[0]].nom+"</a> — "+p[1]+"</li>"; }).join("")+"</ul>";
        if (ok.length) h+="<p><b>Déjà lu :</b> "+ok.map(function(p){ return C[p[0]].nom; }).join(" · ")+"</p>";
        if (!(C[choix].pre||[]).length) h+="<p>Cette page ne suppose rien : on peut commencer par elle.</p>";
        var loinL=Object.keys(tous).filter(function(id){ return !directs[id]&&!lu[id]; });
        if (loinL.length) h+="<p style='color:var(--encre2)'>Plus en amont, non lus : "+loinL.map(function(id){ return C[id].nom; }).join(" · ")+".</p>";
        h+="<p style='color:var(--encre2)'>Les marques « lu » sont celles de ce navigateur, sur cet appareil ; personne d'autre ne les voit.</p>";
        res.innerHTML=h;
      }
      sel.addEventListener("change",peint);
      window.addEventListener("storage",peint);
      peint();
    }
  }
};

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

OUTILS["saison-pac"] = {
  titre:"Une saison de pompe à chaleur, jour par jour",
  intro:"Appuyez sur Lire : du 1er octobre au 30 avril, la PAC seule en automne, "+
        "l'appoint sous le point de bivalence en janvier, le COP qui remonte en "+
        "mars. Le SCOP est ce qui reste à la fin.",
  monte:function(d){
    var DEF={climat:"Fréjus", G:3, part:50, emet:"Radiateurs basse T 55/45", appoint:"électrique", mode:"parallèle", pe:25, pg:10};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Fréjus, radiateurs 55/45, PAC à 50 % de la base", {}],
      ["2 · La même PAC à Lille", {climat:"Lille"}],
      ["3 · Plancher chauffant", {emet:"Plancher chauffant 35/28"}],
      ["4 · Radiateurs existants 65/55", {emet:"Radiateurs existants 65/55"}],
      ["5 · PAC dimensionnée à 100 % de la base", {part:100}],
      ["6 · Appoint gaz en alternatif", {appoint:"gaz", mode:"alternatif"}],
      ["7 · PAC trop petite, 35 % de la base", {part:35}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===1?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    maj.push(choixListe(c1,P,"climat",NOMS_CLIMATS,"Climat",touche,
      function(n){return "base "+CLIMATS[n].base+" °C";},reg));
    curseur(c1,maj,P,"Déperditions du bâtiment G","G",1,10,0.5,1," kW/K",touche,reg);
    curseur(c1,maj,P,"Puissance de la PAC, en part de la base","part",30,120,5,0," %",touche,reg);
    maj.push(choixListe(c1,P,"emet",NOMS_EMETTEURS,"Émetteurs",touche,
      function(n){return EMETTEURS[n].tbase+" °C par temps de base";},reg));
    maj.push(choixListe(c2,P,"appoint",["électrique","gaz"],"Appoint",touche,null,reg));
    maj.push(choixListe(c2,P,"mode",["parallèle","alternatif"],"Bivalence",touche,
      function(n){return n==="parallèle"?"la PAC continue sous le point de bivalence":"l'appoint seul sous le point de bivalence";},reg));
    curseur(c2,maj,P,"Prix du kWh électrique","pe",10,40,0.5,1," ct",touche,reg);
    curseur(c2,maj,P,"Prix du kWh de gaz","pg",5,20,0.5,1," ct",touche,reg);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bMois=E("button",{"class":"bt",type:"button"},"+ 1 mois");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bMois); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=360, X0=54,X1=420,Y0=26,Y1=180, XB=54,YB=236,HB=96;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Température extérieure jour par jour, puis chaleur fournie par la PAC et par l'appoint, mois par mois"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var NJ=212, TINT=19, SEUIL=16;
    var S_={}, anim=null, acc=0, dernier=0;

    function climat(){ return CLIMATS[P.climat]; }
    function pn(){                  /* puissance nominale a +7/35, deduite de la part de la base */
      var c=climat(), pbase=P.G*(TINT-c.base);
      return P.part/100*pbase/(1+0.03*(c.base-7));
    }
    function ppac(te){ return Math.max(0, pn()*(1+0.03*(te-7))); }
    function tdep(te){ var e=EMETTEURS[P.emet]; return Math.max(25, Math.min(e.tbase, TINT+e.pente*(TINT-te))); }
    function cop(te){
      var td=tdep(te), c=0.40*(td+273.15)/Math.max(8, td-te);
      if (te>-3&&te<5) c*=0.9;                       /* le givrage et son degivrage */
      return Math.max(1.3, Math.min(5.5, c));
    }
    function tbiv(){
      var G=P.G, p=pn();
      return (SEUIL*G-0.79*p)/(G+0.03*p);
    }
    function text(j){                /* jour 0..211, une temperature moyenne du jour */
      var c=climat(), pos=j/NJ*7, i=Math.min(6,Math.floor(pos)), f=pos-i;
      var tm=c.tm[i]*(1-f)+c.tm[Math.min(6,i+1)]*f;
      var bruit=Math.sin(j*0.9)*0.5+Math.sin(j*0.23+1.7)*0.45+Math.sin(j*0.07+0.4)*0.35;   /* des vagues de froid de quelques jours */
      return tm+c.amp*bruit;
    }
    function mois(j){ var s=0; for (var i=0;i<7;i++){ s+=JOURS_MOIS[i]; if (j<s) return i; } return 6; }

    function reset(){
      maj.forEach(function(x){x();});
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      S_={j:0, tr:[], mB:[0,0,0,0,0,0,0], mP:[0,0,0,0,0,0,0], mA:[0,0,0,0,0,0,0], mE:[0,0,0,0,0,0,0], mEA:[0,0,0,0,0,0,0],
          besoin:0, chP:0, chA:0, elP:0, elA:0, gazA:0, jApp:0, jours:0, copMin:9, teMin:99, jourApp:[], ppacJour:[]};
      dessine(); acc=0;
    }
    function pas(){
      var j=S_.j; if (j>=NJ) return;
      var te=text(j), m=mois(j);
      var besoin=P.G*Math.max(0,SEUIL-te)*24;          /* kWh du jour */
      var cap=ppac(te)*24, c=cop(te);
      var chP, chA;
      if (besoin<=0){ chP=0; chA=0; }
      else if (P.mode==="alternatif"&&te<tbiv()){ chP=0; chA=besoin; }
      else { chP=Math.min(besoin,cap); chA=besoin-chP; }
      var elP=chP/c, elA=0, gazA=0;
      if (chA>0){ if (P.appoint==="gaz") gazA=chA/0.95; else elA=chA; S_.jApp++; }
      S_.mB[m]+=besoin; S_.mP[m]+=chP; S_.mA[m]+=chA; S_.mE[m]+=elP; S_.mEA[m]+=elA+gazA;
      S_.besoin+=besoin; S_.chP+=chP; S_.chA+=chA; S_.elP+=elP; S_.elA+=elA; S_.gazA+=gazA;
      if (besoin>0){ S_.jours++; if (c<S_.copMin) S_.copMin=c; }
      if (te<S_.teMin) S_.teMin=te;
      S_.tr.push(te); S_.jourApp.push(chA>0); S_.ppacJour.push(cap);
      S_.j++;
    }

    function px(j){return X0+(X1-X0)*j/NJ;}
    function py(t){return Y1-(Y1-Y0)*(t+16)/40;}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle","class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la temperature, jour par jour, avec le point de bivalence */
      var s=0;
      for (var i=0;i<7;i++){
        var x=px(s);
        svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1,stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(s+JOURS_MOIS[i]/2),Y1+14,MOIS_SAISON[i]);
        s+=JOURS_MOIS[i];
      }
      [-10,0,10,20].forEach(function(t){
        svg.appendChild(S("line",{x1:X0,y1:py(t),x2:X1,y2:py(t),stroke:V("trait2"),"stroke-width":"1",opacity:"0.4"}));
        txt(X0-6,py(t)+4,t+" °C","s-pet","end");
      });
      var tb=tbiv();
      if (tb>-16&&tb<24){
        svg.appendChild(S("line",{x1:X0,y1:py(tb),x2:X1,y2:py(tb),stroke:V("chaud"),"stroke-width":"1.5","stroke-dasharray":"5 4"}));
        txt(X1+6,py(tb)+4,"bivalence "+fr(tb,1)+" °C","s-pet","start","chaud");
      }
      /* les jours avec appoint, en fond */
      for (var j=0;j<S_.tr.length;j++) if (S_.jourApp[j])
        svg.appendChild(S("rect",{x:px(j),y:Y0,width:Math.max(0.6,px(j+1)-px(j)),height:Y1-Y0,fill:V("chaud"),opacity:"0.12"}));
      if (S_.tr.length>1){
        var pts=[];
        for (var j2=0;j2<S_.tr.length;j2++) pts.push(px(j2).toFixed(1)+","+py(S_.tr[j2]).toFixed(1));
        svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V("froid"),"stroke-width":"1.8","stroke-linejoin":"round"}));
      }
      txt(X0,Y0-8,"extérieur, jour par jour · en rose, les jours où l'appoint a marché","s-pet","start");
      /* les mois : chaleur PAC et appoint empilees, COP du mois en chiffre */
      var mx=1; for (var i2=0;i2<7;i2++) mx=Math.max(mx,S_.mB[i2]);
      var lb=(X1-XB)/7;
      for (var i3=0;i3<7;i3++){
        var hP=(HB-18)*S_.mP[i3]/mx, hA=(HB-18)*S_.mA[i3]/mx, x0=XB+i3*lb+8, w=lb-16;   /* 18 px de marge pour le COP du mois */
        svg.appendChild(S("rect",{x:x0,y:YB+HB-hP,width:w,height:hP,fill:V("froid"),opacity:"0.85"}));
        svg.appendChild(S("rect",{x:x0,y:YB+HB-hP-hA,width:w,height:hA,fill:V("chaud"),opacity:"0.85"}));
        txt(x0+w/2,YB+HB+14,MOIS_SAISON[i3]);
        if (S_.mE[i3]>0) txt(x0+w/2,YB+HB-hP-hA-6,"COP "+fr(S_.mP[i3]/S_.mE[i3],1),"s-pet","middle","encre");
      }
      txt(XB,YB-8,"chaleur du mois : PAC en bleu, appoint en rouge, et le COP du mois","s-pet","start");
      /* le compte rendu */
      var fini=S_.j>=NJ, jd=Math.max(0,S_.j-1), m=mois(jd), jm=jd-[0,31,61,92,123,151,182][m];
      var scop=S_.elP>0?S_.chP/S_.elP:0, couv=S_.besoin>0?100*S_.chP/S_.besoin:0;
      var cout=(S_.elP+S_.elA)*P.pe/100+S_.gazA*P.pg/100;
      var coutSansPac=P.appoint==="gaz"?S_.besoin/0.95*P.pg/100:S_.besoin*P.pe/100;
      var c=climat();
      res.innerHTML="<div class='gros'>"+
        "<span><b>Date</b><span>"+(fini?"30 avril":(S_.j?(jm+1)+" "+MOIS_SAISON[m]:"1 oct."))+"</span></span>"+
        "<span><b>PAC nominale (+7/35)</b><span>"+fr(pn(),1)+" kW</span></span>"+
        "<span><b>Puissance de base</b><span>"+fr(P.G*(TINT-c.base),0)+" kW à "+c.base+" °C</span></span>"+
        "<span><b>Point de bivalence</b><span>"+fr(tbiv(),1)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Besoin cumulé</b><span>"+fr(S_.besoin/1000,1)+" MWh</span></span>"+
        "<span><b>Fourni par la PAC</b><span>"+fr(couv,0)+" %</span></span>"+
        "<span><b>Jours avec appoint</b><span>"+S_.jApp+"</span></span>"+
        "<span><b>COP le plus bas</b><span>"+(S_.copMin<9?fr(S_.copMin,1):"—")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>SCOP à ce jour</b><span>"+(scop?fr(scop,2):"—")+"</span></span>"+
        "<span><b>Électricité PAC</b><span>"+fr(S_.elP/1000,2)+" MWh</span></span>"+
        "<span><b>Appoint</b><span>"+fr((S_.elA+S_.gazA)/1000,2)+" MWh "+(P.appoint==="gaz"?"de gaz":"électriques")+"</span></span>"+
        "<span><b>Coût</b><span>"+fr(cout,0)+" €</span></span>"+
        "<span><b>Sans PAC, "+(P.appoint==="gaz"?"chaudière seule":"tout électrique")+"</b><span>"+fr(coutSansPac,0)+" €</span></span>"+
        "</div><p>"+(!S_.j
          ? "Appuyez sur <b>Lire</b>, ou avancez d'un mois. Le point de bivalence est la température extérieure sous laquelle la PAC ne suffit plus."
          : fini
          ? "<b>Saison finie.</b> La PAC a fourni "+fr(couv,0)+" % de la chaleur avec un SCOP de "+fr(scop,2)+
            ", l'appoint a marché "+S_.jApp+" jour"+(S_.jApp>1?"s":"")+"."+
            (scop<3?" <b>Un SCOP sous 3</b> : les émetteurs demandent une eau trop chaude, ou le climat est trop froid pour cette machine.":"")+
            (couv<80?" <b>Moins de 80 % par la PAC</b> : elle est trop petite pour ce climat, l'appoint fait le travail aux pires jours, au prix fort.":"")+
            (P.part>=100?" <b>Une PAC à 100 % de la base</b> ne gagne presque rien sur la couverture et coûte le double : la base n'arrive que quelques jours.":"")
          : "Le COP suit l'écart entre le départ d'eau et l'extérieur : il descend quand il fait froid, et plus encore quand les émetteurs veulent de l'eau chaude.")+"</p>";
    }
    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.012; dernier=ts;
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.j<NJ) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";return;}
      if (S_.j>=NJ) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bMois.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      if (S_.j>=NJ) return;
      var m=mois(S_.j), fin=[31,61,92,123,151,182,212][m];
      while (S_.j<fin) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

/* ═══════════════════════════════════════════ CE QUE CONTIENT UN KILO D'AIR
   Fiche enthalpie. Deux airs, A et B, chacun par sa temperature et son
   humidite relative. Pour chacun, h en trois morceaux : l'air sec (1,006 θ),
   la vaporisation de son eau (2 501 r), et la vapeur rechauffee (1,83 θ r).
   Puis la difference, ce qu'elle vaut en puissance pour un debit, et ce que
   le thermometre seul en aurait dit : c'est tout l'argument de la fiche. */
OUTILS["enthalpie-air"] = {
  titre:"Ce que contient un kilogramme d'air",
  intro:"Deux airs, et pour chacun son enthalpie en morceaux : ce que porte "+
        "l'air sec, ce que porte son eau. Puis la différence, ce qu'elle vaut "+
        "pour un débit, et ce que le thermomètre seul en aurait dit.",
  monte:function(d){
    var DEF={t1:30, p1:60, t2:14, p2:95, qm:1.5};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Deux airs à 20 °C, l'un sec, l'autre humide", {t1:20,p1:30,t2:20,p2:80,qm:1}],
      ["2 · L'air neuf d'hiver, chauffé à 19 °C", {t1:-7,p1:90,t2:19,p2:15,qm:1}],
      ["3 · La batterie froide d'été", {}],
      ["4 · L'humidificateur à vapeur", {t1:19,p1:15,t2:19,p2:40,qm:1}],
      ["5 · La salle de bains et le séjour", {t1:24,p1:90,t2:19,p2:40,qm:1}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Deux airs à comparer"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===3?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} calc(); }
    curseur(c1,maj,P,"Air A · température","t1",-15,40,0.5,1," °C",touche,reg);
    curseur(c1,maj,P,"Air A · humidité relative","p1",5,100,1,0," %",touche,reg);
    curseur(c2,maj,P,"Air B · température","t2",-15,40,0.5,1," °C",touche,reg);
    curseur(c2,maj,P,"Air B · humidité relative","p2",5,100,1,0," %",touche,reg);
    curseur(c2,maj,P,"Débit d'air sec","qm",0.1,5,0.1,1," kg/s",touche,reg);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; calc();
    });

    var W=680,H=236, XZ=230, XM=640;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"L'enthalpie des deux airs, en trois morceaux : l'air sec, la vaporisation de l'eau, la vapeur réchauffée"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function morceaux(t,p){
      var r=rAir(t,p/100);
      return {r:r, sec:1.006*t, lat:r/1000*2501, vap:r/1000*1.83*t, h:hAirR(t,r)};
    }
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"start","class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function calc(){
      maj.forEach(function(x){x();});
      vS.textContent=selS.value==="0"?"réglages à la main":"chargé";
      var A=morceaux(P.t1,P.p1), B=morceaux(P.t2,P.p2);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* l'echelle : de la plus petite valeur negative a la plus grande enthalpie */
      var lo=Math.min(0,A.sec,B.sec), hi=Math.max(20,A.h,B.h,A.sec+A.lat,B.sec+B.lat)*1.08;
      function px(v){ return XZ+(XM-XZ)*(v-lo)/(hi-lo); }
      txt(24,20,"CE QUE CONTIENT 1 kg D'AIR SEC, ET SON EAU","s-tit","start","encre");
      /* le zero de reference */
      svg.appendChild(S("line",{x1:px(0),y1:34,x2:px(0),y2:176,stroke:V("encre"),"stroke-width":"1.5","stroke-dasharray":"3 3"}));
      txt(px(0),192,"0 : air sec et eau liquide à 0 °C","s-pet","middle");
      function barre(y,m,nom,det){
        txt(XZ-12,y+15,nom,"s-nom","end","encre");
        txt(XZ-12,y+32,det,"s-pet","end");
        /* l'air sec, a partir de zero, vers la gauche s'il fait moins de 0 °C */
        var x0=px(Math.min(0,m.sec)), x1=px(Math.max(0,m.sec));
        svg.appendChild(S("rect",{x:x0,y:y,width:Math.max(1,x1-x0),height:24,fill:V("chaud"),opacity:"0.8"}));
        /* l'eau : la vaporisation, puis la vapeur rechauffee, empilees apres l'air sec */
        var base=m.sec, xa=px(base), xb=px(base+m.lat), xc=px(base+m.lat+m.vap);
        svg.appendChild(S("rect",{x:Math.min(xa,xb),y:y,width:Math.max(1,Math.abs(xb-xa)),height:24,fill:V("froid"),opacity:"0.8"}));
        if (Math.abs(xc-xb)>0.5)
          svg.appendChild(S("rect",{x:Math.min(xb,xc),y:y,width:Math.abs(xc-xb),height:24,fill:V("violet"),opacity:"0.8"}));
        var xh=px(m.h);
        svg.appendChild(S("line",{x1:xh,y1:y-4,x2:xh,y2:y+28,stroke:V("encre"),"stroke-width":"2.5"}));
        txt(Math.min(xh+6,XM-4),y+17,"h = "+fr(m.h,1),"s-lab",xh+80>W?"end":"start","encre");
      }
      barre(44,A,"Air A",fr(P.t1,1)+" °C · "+fr(P.p1,0)+" % · r = "+fr(A.r,1)+" g/kg");
      barre(112,B,"Air B",fr(P.t2,1)+" °C · "+fr(P.p2,0)+" % · r = "+fr(B.r,1)+" g/kg");
      /* la legende */
      [["chaud","air sec : 1,006 θ"],["froid","vaporiser l'eau : 2 501 r"],["violet","vapeur réchauffée : 1,83 θ r"]].forEach(function(l,i){
        var x=24+i*206;
        svg.appendChild(S("rect",{x:x,y:210,width:18,height:12,fill:V(l[0]),opacity:"0.8"}));
        txt(x+24,220,l[1],"s-pet","start");
      });
      var dh=B.h-A.h, dsens=1.006*(P.t2-P.t1), dlat=dh-dsens;
      var phi=P.qm*dh, phiT=P.qm*1.006*(P.t2-P.t1), deau=P.qm*(B.r-A.r)/1000*3600;
      var parts=Math.abs(dh)>0.3?100*Math.abs(dlat)/Math.abs(dh):0;
      res.innerHTML="<div class='gros'>"+
        "<span><b>h de A</b><span>"+fr(A.h,1)+" kJ/kg</span></span>"+
        "<span><b>h de B</b><span>"+fr(B.h,1)+" kJ/kg</span></span>"+
        "<span><b>Δh = hB − hA</b><span>"+(dh>=0?"+ ":"− ")+fr(Math.abs(dh),1)+" kJ/kg</span></span>"+
        "<span><b>Dont l'eau</b><span>"+fr(parts,0)+" %</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Puissance, qm × Δh</b><span>"+fr(Math.abs(phi),1)+" kW "+(phi>=0?"à fournir":"à retirer")+"</span></span>"+
        "<span><b>Ce que dirait le thermomètre, qm × 1,006 × Δθ</b><span>"+fr(Math.abs(phiT),1)+" kW</span></span>"+
        "<span><b>Eau</b><span>"+(Math.abs(deau)<0.5?"aucune":fr(Math.abs(deau),1)+" kg/h "+(deau>0?"ajoutés":"retirés"))+"</span></span>"+
        "</div><p>"+(Math.abs(P.t2-P.t1)<0.3&&Math.abs(dh)>1
          ? "<b>Même température, et pourtant "+fr(Math.abs(dh),1)+" kJ/kg d'écart :</b> le thermomètre ne voit rien, l'enthalpie voit l'eau. Passer de l'un à l'autre coûte "+fr(Math.abs(phi),1)+" kW."
          : parts>35
          ? "<b>"+fr(parts,0)+" % de l'écart est de l'eau</b> qui s'est vaporisée ou condensée. Le calcul par la température seule donnerait "+fr(Math.abs(phiT),1)+" kW au lieu de "+fr(Math.abs(phi),1)+" : c'est la raison de lire h, et pas θ."
          : "Ici l'eau ne bouge presque pas : la différence d'enthalpie et le calcul par la température disent la même chose, à quelques pour cent près. Ce n'est vrai que tant que r ne change pas.")+
        (A.h<0||B.h<0?" Une enthalpie <b>négative</b> n'est pas une erreur : l'air est sous le zéro de référence, 0 °C, et seules les différences comptent.":"")+"</p>";
    }
    calc();
  }
};

OUTILS.ecs={
  titre:"Eau chaude sanitaire — puissance et stockage",
  intro:"Le profil de puisage d'un internat, heure par heure. Le stockage ne "+
        "change pas l'énergie : il change la puissance à installer.",
  monte:function(d){
    var P={n:40,tf:10,tc:60,sto:0};
    var maj=[];
    var W=680,H=250,X0=52,X1=650,Y0=20,Y1=190;
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Nombre d'élèves","n",5,200,5,0,"");
    ch(c1,"Température d'eau froide","tf",5,20,1,0," °C");
    ch(c2,"Température de production","tc",45,75,1,0," °C");
    ch(c2,"Volume de stockage","sto",0,1500,25,0," L");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Profil de puisage horaire"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var f=P.n/40, dt=P.tc-P.tf;
      var vol=PROFIL.map(function(x){return x*f;});
      var tot=0,mx=0,hp=0;
      vol.forEach(function(x,i){tot+=x;if(x>mx){mx=x;hp=i;}});
      var E_j=tot*1.163*dt/1000;                       /* kWh par jour */
      var P_inst=mx*1.163*dt/1000;                     /* kW en pointe, sans stockage */
      /* avec stockage : la pointe est ecretee de ce que le ballon peut fournir */
      var reste=Math.max(0,mx-P.sto);
      var P_sto=reste*1.163*dt/1000;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var lm=Math.max(mx,1);
      for(var i=0;i<24;i++){
        var x=X0+i*(X1-X0)/24, l=(X1-X0)/24-3;
        var h=(Y1-Y0)*vol[i]/lm;
        svg.appendChild(S("rect",{x:x,y:Y1-h,width:l,height:h,rx:2,
          fill:V(i===hp?"chaud":"froid"),opacity:i===hp?"0.85":"0.45"}));
        if(i%3===0)svg.appendChild(S("text",{x:x+l/2,y:Y1+18,"text-anchor":"middle",
          "class":"s-pet"},String(i)+" h"));
      }
      if(P.sto>0&&P.sto<mx){
        var ys=Y1-(Y1-Y0)*P.sto/lm;
        svg.appendChild(S("line",{x1:X0,y1:ys,x2:X1,y2:ys,stroke:V("vert"),
          "stroke-width":"2","stroke-dasharray":"6 4"}));
        svg.appendChild(S("text",{x:X1,y:ys-7,"text-anchor":"end","class":"s-nom",
          fill:V("vert")},"ce que le ballon absorbe"));
      }
      svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),
        "stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:X0,y:Y0+10,"class":"s-pet"},
        "litres puisés dans l'heure"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Volume du jour</b><span>"+fr(tot,0)+" L</span></span>"+
        "<span><b>Énergie du jour</b><span>"+frs(E_j,1)+" kWh</span></span>"+
        "<span><b>Pointe</b><span>"+fr(mx,0)+" L à "+hp+" h</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Sans stockage</b><span>"+frs(P_inst,1)+" kW</span></span>"+
        "<span><b>Avec ce ballon</b><span>"+frs(P_sto,1)+" kW</span></span>"+
        "</div><p>"+(P.sto<=0
        ? "Sans ballon, l'appareil doit couvrir seul l'heure de pointe : <b>"+
          frs(P_inst,1)+" kW</b> pour "+fr(tot,0)+" litres par jour."
        : P_sto<=0
        ? "<b>Le ballon absorbe toute la pointe.</b> La production peut être "+
          "dimensionnée sur la moyenne, pas sur le maximum — c'est tout "+
          "l'intérêt du stockage."
        : "Le ballon écrête la pointe : la puissance tombe de "+frs(P_inst,1)+
          " à <b>"+frs(P_sto,1)+" kW</b>, soit "+fr(100*(1-P_sto/P_inst),0)+
          " % de moins. L'énergie du jour, elle, n'a pas bougé.")+"</p>";
    }
    calc();
  }
};

/* ─────────── ou passent les 100 unites de combustible ─────────── */
SCHEMAS["pertes-chaudiere"]=function(el){
  barres(el,{
    titre:"Cent unités de PCI dans une chaudière standard bien réglée",
    source:"Survolez une ligne. Les six unités de chaleur latente sont "+
           "celles qu'une chaudière à condensation va chercher.",
    max:100,
    lignes:[
      {n:"Chaleur utile à l'eau",v:88,unite:" %",accent:true,
       aide:"c'est le rendement sur PCI — 88 %, chaudière standard"},
      {n:"Fumées : chaleur latente",v:6,unite:" %",detail:"récupérable",
       aide:"la vapeur d'eau formée par la combustion ; condenser, c'est la reprendre"},
      {n:"Fumées : chaleur sensible",v:5,unite:" %",
       aide:"les fumées sortent à 160 ou 180 °C ; c'est le terme de Siegert"},
      {n:"Parois du corps de chauffe",v:0.8,unite:" %",
       aide:"le corps rayonne dans le local technique — 3 à 5 % sur un appareil ancien"},
      {n:"Imbrûlés",v:0.2,unite:" %",
       aide:"CO et suies ; au-delà de 0,5 %, le brûleur est à régler"}
    ]});
};

/* ─────────── la loi d'emission, et la droite qu'on croit suivre ─────────── */
SCHEMAS["loi-emission"]=function(el){
  var W=760,H=372,X0=84,X1=700,Y0=44,Y1=300,DMAX=60,FMAX=1.4;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Puissance émise selon l'écart moyen, en puissance 1,3 et en loi linéaire"});
  el.appendChild(svg);
  function px(d){return X0+d/DMAX*(X1-X0);}
  function py(f){return Y1-f/FMAX*(Y1-Y0);}
  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }

  /* la grille */
  [0,10,20,30,40,50,60].forEach(function(d){
    svg.appendChild(S("line",{x1:px(d),y1:Y0,x2:px(d),y2:Y1,
      stroke:V("trait2"),"stroke-width":"1",opacity:d?"0.5":"1"}));
    txt(px(d),Y1+22,String(d),"s-pet");
  });
  [0,0.25,0.5,0.75,1,1.25].forEach(function(f){
    svg.appendChild(S("line",{x1:X0,y1:py(f),x2:X1,y2:py(f),
      stroke:V("trait2"),"stroke-width":"1",opacity:f?"0.5":"1"}));
    txt(X0-12,py(f)+4,frs(f,2),"s-pet","end");
  });
  txt((X0+X1)/2,Y1+46,"écart moyen entre l'eau et l'air, en kelvins","s-nom");
  txt(X0-4,Y0-16,"Φ / Φ nominal","s-nom","start");

  /* la droite : la regle de trois */
  var dr=[],co=[];
  for(var d=0;d<=DMAX;d+=1){
    dr.push(px(d).toFixed(1)+","+py(d/50).toFixed(1));
    co.push(px(d).toFixed(1)+","+py(Math.pow(d/50,1.3)).toFixed(1));
  }
  svg.appendChild(S("polyline",{points:dr.join(" "),fill:"none",
    stroke:V("encre2"),"stroke-width":"2","stroke-dasharray":"7 5"}));
  svg.appendChild(S("polyline",{points:co.join(" "),fill:"none",
    stroke:V("chaud"),"stroke-width":"3.2","stroke-linejoin":"round"}));

  /* les trois reperes */
  function point(d,f,coul){
    svg.appendChild(S("circle",{cx:px(d),cy:py(f),r:"5",fill:V(coul),
      stroke:V("carte"),"stroke-width":"1.5"}));
  }
  point(50,1,"chaud");
  txt(px(50)-12,py(1)-12,"Δθ = 50 K : le catalogue","s-lab","end","chaud");
  point(20,Math.pow(0.4,1.3),"chaud");
  txt(px(20)+14,py(Math.pow(0.4,1.3))+18,"en 45/35 : 0,30","s-lab","start","chaud");
  point(20,0.4,"encre2");
  txt(px(20)-14,py(0.4)-12,"règle de trois : 0,40","s-lab","end","encre2");

  /* la legende, dans le coin vide en haut a gauche */
  svg.appendChild(S("line",{x1:X0+18,y1:Y0+22,x2:X0+58,y2:Y0+22,
    stroke:V("chaud"),"stroke-width":"3.2"}));
  txt(X0+66,Y0+27,"loi réelle, en puissance 1,3","s-pet","start");
  svg.appendChild(S("line",{x1:X0+18,y1:Y0+48,x2:X0+58,y2:Y0+48,
    stroke:V("encre2"),"stroke-width":"2","stroke-dasharray":"7 5"}));
  txt(X0+66,Y0+53,"la proportionnalité, fausse ici","s-pet","start");

  var lg=E("p",{"class":"leg-schema"},
    "Les deux courbes se rejoignent au point catalogue et nulle part ailleurs. "+
    "<b>En basse température l'écart atteint un tiers</b> : la règle de trois "+
    "annonce 0,40 là où le radiateur ne donne que 0,30.");
  (el.parentNode||el).appendChild(lg);
};

/* ─────────── simple flux et double flux ─────────── */
SCHEMAS["flux-ventilation"]=function(el){
  var W=980,H=468;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Ventilation simple flux et double flux : chemin de l'air et récupération"});
  el.appendChild(svg);

  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function fleche(x1,y,x2,coul){
    svg.appendChild(S("line",{x1:x1,y1:y,x2:x2-9,y2:y,stroke:V(coul),
      "stroke-width":"3","stroke-linecap":"round"}));
    var s=x2>x1?1:-1;
    svg.appendChild(S("path",{d:"M "+x2+" "+y+" L "+(x2-s*11)+" "+(y-6)+
      " L "+(x2-s*11)+" "+(y+6)+" Z",fill:V(coul)}));
  }
  function boite(x,y,w,h,t,coul){
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"5",fill:V(coul),
      opacity:"0.16",stroke:V(coul),"stroke-width":"1.6"}));
    txt(x+w/2,y+h/2+5,t,"s-nom");
  }
  function ventilateur(cx,cy,coul){
    svg.appendChild(S("circle",{cx:cx,cy:cy,r:"17",fill:V("carte"),
      stroke:V(coul),"stroke-width":"1.8"}));
    svg.appendChild(S("path",{d:"M "+(cx-8)+" "+(cy-8)+" L "+(cx+8)+" "+cy+
      " L "+(cx-8)+" "+(cy+8)+" Z",fill:V(coul),opacity:"0.8"}));
  }

  /* ---------- simple flux ---------- */
  txt(24,44,"SIMPLE FLUX","s-tit","start","tiede");
  txt(24,66,"Un seul ventilateur, à l'extraction. L'air neuf entre par les menuiseries.","s-pet","start");
  (function(){
    var y=124;
    boite(30,y-26,132,52,"entrée d'air","froid");
    fleche(168,y,236,"froid");
    boite(242,y-30,150,60,"logement","tiede");
    fleche(398,y,462,"tiede");
    boite(468,y-26,120,52,"bouche","tiede");
    fleche(594,y,652,"tiede");
    ventilateur(676,y,"tiede");
    fleche(700,y,796,"tiede");
    txt(806,y+5,"rejet","s-nom","start");
    txt(96,y+46,"menuiserie, débit non traité","s-pet");
    txt(676,y+38,"caisson","s-pet");
  })();
  txt(24,204,"La version hygroréglable est le même schéma : les bouches et les entrées "+
    "se referment quand l'air est sec.","s-pet","start");

  /* ---------- double flux ---------- */
  txt(24,254,"DOUBLE FLUX","s-tit","start","vert");
  txt(24,276,"Deux ventilateurs, et un récupérateur où les deux airs échangent sans se mélanger.","s-pet","start");
  (function(){
    var ys=326, yr=386, XR=250, XL=30;
    /* le recuperateur, traverse par les deux flux */
    svg.appendChild(S("rect",{x:XR,y:ys-32,width:96,height:(yr-ys)+64,rx:"5",
      fill:V("vert"),opacity:"0.14",stroke:V("vert"),"stroke-width":"1.8"}));
    svg.appendChild(S("line",{x1:XR,y1:ys-32,x2:XR+96,y2:yr+32,
      stroke:V("vert"),"stroke-width":"1.2",opacity:"0.7"}));
    svg.appendChild(S("line",{x1:XR,y1:yr+32,x2:XR+96,y2:ys-32,
      stroke:V("vert"),"stroke-width":"1.2",opacity:"0.7"}));
    txt(XR+48,yr+56,"récupérateur","s-nom","middle","vert");
    /* le logement */
    boite(742,ys-30,180,(yr-ys)+60,"logement","tiede");
    /* soufflage : air neuf froid, puis prechauffe */
    txt(XL,ys+5,"air neuf","s-nom","start","froid");
    fleche(96,ys,244,"froid");
    fleche(352,ys,448,"tiede");
    ventilateur(474,ys,"tiede");
    fleche(498,ys,736,"tiede");
    txt(614,ys-16,"soufflage préchauffé","s-pet");
    /* reprise : air chaud vers le recuperateur, rejet froid */
    fleche(736,yr,504,"chaud");
    ventilateur(478,yr,"chaud");
    fleche(454,yr,352,"chaud");
    fleche(244,yr,96,"froid");
    txt(614,yr+22,"reprise","s-pet");
    txt(XL,yr+5,"rejet","s-nom","start","froid");
  })();

  var lg=E("p",{"class":"leg-schema"},
    "En simple flux, l'air neuf entre froid et rien n'est récupéré. "+
    "<b>En double flux, l'air rejeté réchauffe l'air neuf</b> avant qu'il "+
    "n'atteigne la batterie : c'est la puissance calculée au 8.4.");
  (el.parentNode||el).appendChild(lg);
};

/* ─────────── boucle ouverte et boucle fermee ─────────── */
SCHEMAS["boucle-regulation"]=function(el){
  var W=940,H=384;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Boucle ouverte et boucle fermée : la seconde mesure sa sortie"});
  el.appendChild(svg);

  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function fleche(x1,y1,x2,y2,coul){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":"2.4","stroke-linecap":"round"}));
    var dx=x2-x1, dy=y2-y1, n=Math.sqrt(dx*dx+dy*dy);
    dx/=n; dy/=n;
    var px=-dy, py=dx;
    svg.appendChild(S("path",{d:"M "+x2+" "+y2+
      " L "+(x2-10*dx+5*px)+" "+(y2-10*dy+5*py)+
      " L "+(x2-10*dx-5*px)+" "+(y2-10*dy-5*py)+" Z",fill:V(coul)}));
  }
  function boite(x,y,w,h,t,coul){
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"5",fill:V(coul),
      opacity:"0.16",stroke:V(coul),"stroke-width":"1.6"}));
    txt(x+w/2,y+h/2+5,t,"s-nom");
  }

  /* ---------- boucle ouverte ---------- */
  (function(){
    var y=96;
    txt(24,44,"BOUCLE OUVERTE","s-tit","start","tiede");
    txt(24,66,"On agit d'après une information extérieure, sans vérifier le résultat.","s-pet","start");
    txt(30,y+5,"météo","s-nom","start","froid");
    fleche(96,y,166,y,"froid");
    boite(172,y-24,146,48,"régulateur","tiede");
    fleche(324,y,394,y,"tiede");
    boite(400,y-24,150,48,"organe","tiede");
    fleche(556,y,626,y,"tiede");
    boite(632,y-24,150,48,"le local","chaud");
    fleche(788,y,858,y,"chaud");
    txt(866,y+5,"θ réelle","s-nom","start","chaud");
  })();

  /* ---------- boucle fermee ---------- */
  (function(){
    var y=264, yb=y+74;
    txt(24,190,"BOUCLE FERMÉE","s-tit","start","vert");
    txt(24,212,"On mesure la grandeur réglée et on agit sur l'écart à la consigne.","s-pet","start");
    txt(30,y+5,"consigne","s-nom","start","froid");
    fleche(106,y,138,y,"froid");
    svg.appendChild(S("circle",{cx:154,cy:y,r:"16",fill:V("carte"),
      stroke:V("encre2"),"stroke-width":"1.8"}));
    txt(154,y+5,"−","s-nom");
    txt(154,y-26,"écart","s-pet");
    fleche(172,y,214,y,"tiede");
    boite(220,y-24,140,48,"régulateur","tiede");
    fleche(366,y,412,y,"tiede");
    boite(418,y-24,140,48,"organe","tiede");
    fleche(564,y,610,y,"tiede");
    boite(616,y-24,150,48,"le local","chaud");
    fleche(772,y,842,y,"chaud");
    txt(850,y+5,"θ réelle","s-nom","start","chaud");
    /* le retour de mesure */
    svg.appendChild(S("polyline",{points:"806,"+y+" 806,"+yb+" 154,"+yb,
      fill:"none",stroke:V("vert"),"stroke-width":"2.4","stroke-linejoin":"round"}));
    fleche(154,yb,154,y+18,"vert");
    txt(480,yb+22,"capteur : la mesure revient au comparateur","s-pet","middle","vert");
  })();

  var lg=E("p",{"class":"leg-schema"},
    "<b>La boucle ouverte est rapide et stable</b>, mais aveugle à tout ce "+
    "qu'elle ne mesure pas. <b>La boucle fermée corrige tout</b>, au prix d'un "+
    "risque d'oscillation. Une installation correcte emploie les deux.");
  (el.parentNode||el).appendChild(lg);
};

/* ─────────── bitube, monotube, pieuvre ─────────── */
SCHEMAS["topologies-hydro"]=function(el){
  var W=1020,H=330;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Trois architectures de distribution : bitube, monotube et pieuvre"});
  el.appendChild(svg);

  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function tube(x1,y1,x2,y2,coul,ep){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":ep||3,"stroke-linecap":"round"}));
  }
  /* un emetteur : fond de carte d'abord, pour que le tube ne le traverse pas */
  function radiateur(cx,cy,coul){
    var w=46,h=34,x=cx-w/2,y=cy-h/2;
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"3",fill:V("carte")}));
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"3",fill:V(coul),
      opacity:"0.18",stroke:V(coul),"stroke-width":"1.6"}));
    for(var i=1;i<=3;i++)
      svg.appendChild(S("line",{x1:x+i*w/4,y1:y+5,x2:x+i*w/4,y2:y+h-5,
        stroke:V(coul),"stroke-width":"1.2"}));
  }

  var YT=40, YC=302, YD=96, YR=236, YM=166;

  /* ---------- 1. bitube ---------- */
  (function(){
    var X0=24,X1=310, xs=[80,167,254];
    txt((X0+X1)/2,YT,"BITUBE","s-tit","middle","chaud");
    tube(X0,YD,X1,YD,"chaud");
    tube(X0,YR,X1,YR,"froid");
    txt(X0,YD-12,"départ","s-pet","start");
    txt(X0,YR+22,"retour","s-pet","start");
    xs.forEach(function(x){
      tube(x,YD,x,YM-17,"chaud",2.2);
      tube(x,YM+17,x,YR,"froid",2.2);
      radiateur(x,YM,"chaud");
    });
    txt((X0+X1)/2,YC,"Tous reçoivent la même température de départ.");
  })();

  /* ---------- 2. monotube ---------- */
  (function(){
    var X0=356,X1=642, xs=[400,499,598], cs=["chaud","tiede","tiede"];
    txt((X0+X1)/2,YT,"MONOTUBE","s-tit","middle","tiede");
    /* la boucle : aller par les emetteurs, retour par le bas */
    tube(X0,YM,xs[0]-23,YM,"chaud");
    tube(xs[0]+23,YM,xs[1]-23,YM,"tiede");
    tube(xs[1]+23,YM,xs[2]-23,YM,"tiede");
    tube(xs[2]+23,YM,X1,YM,"froid");
    tube(X1,YM,X1,YR,"froid");
    tube(X1,YR,X0,YR,"froid");
    txt(X0,YM-16,"départ","s-pet","start");
    txt(X0,YR+22,"retour unique","s-pet","start");
    xs.forEach(function(x,i){radiateur(x,YM,cs[i]);});
    txt((X0+X1)/2,YC,"Le dernier reçoit une eau déjà refroidie.");
  })();

  /* ---------- 3. pieuvre ---------- */
  (function(){
    var X0=688,X1=996, xc=716, xr=948, ys=[106,166,226];
    txt((X0+X1)/2,YT,"PIEUVRE","s-tit","middle","vert");
    /* le collecteur : deux nourrices superposees */
    svg.appendChild(S("rect",{x:xc-12,y:120,width:24,height:38,rx:"4",
      fill:V("chaud"),opacity:"0.20",stroke:V("chaud"),"stroke-width":"1.6"}));
    svg.appendChild(S("rect",{x:xc-12,y:176,width:24,height:38,rx:"4",
      fill:V("froid"),opacity:"0.20",stroke:V("froid"),"stroke-width":"1.6"}));
    txt(xc,112,"collecteur","s-pet");
    ys.forEach(function(y){
      tube(xc+12,139,xr-23,y-8,"chaud",2.2);
      tube(xc+12,195,xr-23,y+8,"froid",2.2);
      radiateur(xr,y,"chaud");
    });
    txt((X0+X1)/2,YC,"Une liaison par émetteur, aucun raccord noyé.");
  })();

  var lg=E("p",{"class":"leg-schema"},
    "Les trois desservent les mêmes émetteurs. <b>Le bitube</b> est "+
    "l'architecture normale ; <b>le monotube</b> économise du tube et impose "+
    "de surdimensionner les derniers émetteurs ; <b>la pieuvre</b> s'équilibre "+
    "au collecteur et ne noie aucun raccord.");
  (el.parentNode||el).appendChild(lg);
};

/* ─────────── retour direct contre retour inverse ─────────── */
SCHEMAS["retour-inverse"]=function(el){
  var W=760,H=300;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Retour direct et retour inversé"});
  function bloc(x0,titre,inv){
    var y1=76,y2=210, xs=[x0+40,x0+110,x0+180,x0+250];
    svg.appendChild(S("text",{x:x0+150,y:38,"text-anchor":"middle","class":"s-tit",
      fill:V(inv?"vert":"chaud")},titre));
    /* depart en haut, retour en bas */
    svg.appendChild(S("line",{x1:x0,y1:y1,x2:x0+290,y2:y1,stroke:V("chaud"),
      "stroke-width":"3"}));
    svg.appendChild(S("line",{x1:x0,y1:y2,x2:x0+290,y2:y2,stroke:V("froid"),
      "stroke-width":"3"}));
    xs.forEach(function(x,i){
      svg.appendChild(S("rect",{x:x-17,y:126,width:34,height:34,rx:2,fill:V("carte"),
        stroke:V("encre2"),"stroke-width":"2"}));
      svg.appendChild(S("text",{x:x,y:148,"text-anchor":"middle","class":"s-nom"},
        String(i+1)));
      svg.appendChild(S("line",{x1:x,y1:y1,x2:x,y2:126,stroke:V("chaud"),
        "stroke-width":"2"}));
      svg.appendChild(S("line",{x1:x,y1:160,x2:x,y2:y2,stroke:V("froid"),
        "stroke-width":"2"}));
    });
    /* le circulateur, et le sens du retour */
    svg.appendChild(S("circle",{cx:x0,cy:(y1+y2)/2,r:"14",fill:V("carte"),
      stroke:V("encre2"),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x0,y:(y1+y2)/2+5,"text-anchor":"middle","class":"s-nom"},
      "P"));
    svg.appendChild(S("line",{x1:x0,y1:y1,x2:x0,y2:(y1+y2)/2-14,stroke:V("chaud"),
      "stroke-width":"3"}));
    svg.appendChild(S("line",{x1:x0,y1:(y1+y2)/2+14,x2:x0,y2:y2,stroke:V("froid"),
      "stroke-width":"3"}));
    svg.appendChild(S("text",{x:x0+150,y:250,"text-anchor":"middle","class":"s-nom",
      fill:V(inv?"vert":"chaud")},
      inv?"chaque circuit a la même longueur"
         :"le circuit 1 est le plus court : il prend tout le débit"));
  }
  bloc(50,"RETOUR DIRECT",false);
  bloc(420,"RETOUR INVERSÉ",true);
  /* en retour inverse le collecteur de retour repart de l'autre bout */
  svg.appendChild(S("line",{x1:420,y1:210,x2:420,y2:274,stroke:V("froid"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:420,y1:274,x2:710,y2:274,stroke:V("froid"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:710,y1:274,x2:710,y2:210,stroke:V("froid"),
    "stroke-width":"3"}));
  el.appendChild(svg);
  el.parentNode.appendChild(E("p",{"class":"leg-schema"},
    "En retour direct, l'eau qui traverse l'émetteur 1 parcourt bien moins de "+
    "chemin que celle du 4 : elle y passe en priorité, et le dernier émetteur "+
    "manque de débit. <b>Le retour inversé égalise les longueurs</b> — un peu "+
    "plus de tube, et l'équilibrage se fait tout seul."));
};


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

OUTILS["symboles-hydro"]={
  titre:"Les symboles d'un circuit hydraulique",
  intro:"Quinze symboles suffisent à lire la quasi-totalité des schémas de "+
        "l'épreuve. Cliquez-en un : son rôle, sa place, et ce que l'épreuve "+
        "en demande.",
  monte:function(d,el){
    var grille=E("div",{"class":"grille-sym"});
    var carte=E("div",{"class":"res",style:"margin-top:14px"});
    d.appendChild(grille);d.appendChild(carte);
    function montre(i){
      [].forEach.call(grille.children,function(b,k){
        b.className="case-sym"+(k===i?" on":"");});
      var o=ORGANES_HYDRO[i];
      carte.innerHTML="<div class='gro' style='font-weight:600;font-size:17px;"+
        "margin-bottom:8px'>"+o.rep+" · "+o.n+"</div>"+
        "<p><b>Rôle</b> "+o.r+"</p>"+
        "<p><b>Où on le trouve</b> "+o.ou+"</p>"+
        "<p><b>Ce que l'épreuve demande</b> "+o.ep+"</p>";
      [].forEach.call(carte.querySelectorAll("p b:first-child"),function(b){
        b.style.cssText="font-family:'Bricolage Grotesque',sans-serif;font-size:10.5px;"+
          "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
          "display:block;margin-bottom:1px";});
    }
    ORGANES_HYDRO.forEach(function(o,i){
      var b=E("button",{"class":"case-sym",type:"button"});
      b.appendChild(symbole(o.k));
      b.appendChild(E("span",{},o.rep+" · "+o.n));
      b.addEventListener("click",function(){montre(i);});
      grille.appendChild(b);
    });
    montre(0);
  }
};

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
SCHEMAS["cycle-mollier"]     =function(el){dessineMollier(el,true);};
SCHEMAS["cycle-mollier-muet"]=function(el){dessineMollier(el,false);};

SCHEMAS["sous-station"]=function(el){
  var W=860,H=430;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Schéma de principe d'une sous-station de chauffage urbain"});
  function tube(x1,y1,x2,y2,coul,ep){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":ep||3,"stroke-linecap":"round"}));
  }
  function rep(x,y,n){
    svg.appendChild(S("circle",{cx:x,cy:y,r:"12",fill:V("carte"),stroke:V("encre"),
      "stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x,y:y+5,"text-anchor":"middle","class":"s-rep"},
      String(n)));
  }
  function pose(k,x,y,n,coul,pos){
    var g=S("g",{transform:"translate("+(x-32)+","+(y-22)+")"});
    var s=symbole(k,coul);
    [].slice.call(s.childNodes).forEach(function(c){g.appendChild(c);});
    svg.appendChild(g);
    if(n){if(pos==="g")rep(x-30,y,n);else rep(x+26,y-26,n);}
  }
  var YA=104, YR=250, XE=340;

  /* le primaire, a gauche */
  svg.appendChild(S("rect",{x:8,y:52,width:XE-40,height:250,fill:V("froid"),
    opacity:"0.06"}));
  svg.appendChild(S("text",{x:20,y:40,"class":"s-tit",fill:V("froid")},
    "PRIMAIRE — RÉSEAU DE CHALEUR URBAIN"));
  tube(20,YA,XE-30,YA,"chaud");
  tube(20,YR,XE-30,YR,"froid");
  svg.appendChild(S("text",{x:20,y:YA-12,"class":"s-nom",fill:V("chaud")},"< 110 °C"));
  pose("compteur",110,YA,14);
  pose("filtre",210,YA,12);
  pose("arret",110,YR,5);

  /* l'echangeur */
  pose("echangeur",XE,(YA+YR)/2,1,"vert");
  tube(XE-30,YA,XE-30,(YA+YR)/2-16,"chaud");
  tube(XE-30,YR,XE-30,(YA+YR)/2+16,"froid");
  tube(XE+30,(YA+YR)/2-16,XE+30,YA,"chaud");
  tube(XE+30,(YA+YR)/2+16,XE+30,YR,"froid");

  /* le secondaire, a droite */
  svg.appendChild(S("rect",{x:XE+40,y:52,width:W-XE-58,height:250,fill:V("chaud"),
    opacity:"0.05"}));
  svg.appendChild(S("text",{x:XE+52,y:40,"class":"s-tit",fill:V("chaud")},
    "SECONDAIRE — CIRCUIT DU BÂTIMENT   70 / 55 °C"));
  tube(XE+30,YA,W-30,YA,"chaud");
  tube(XE+30,YR,W-30,YR,"froid");
  pose("v3v",470,YA,3);
  pose("pompe",580,YA,2);
  pose("sonde",700,YA,11);

  /* les emetteurs */
  [760,820].forEach(function(x,i){
    svg.appendChild(S("rect",{x:x-18,y:150,width:36,height:54,rx:2,fill:V("carte"),
      stroke:V("chaud"),"stroke-width":"2"}));
    for(var k=0;k<3;k++)svg.appendChild(S("line",{x1:x-10+k*10,y1:154,
      x2:x-10+k*10,y2:200,stroke:V("chaud"),"stroke-width":"1.5"}));
    tube(x,YA,x,150,"chaud",2.5);
    tube(x,204,x,YR,"froid",2.5);
  });
  svg.appendChild(S("text",{x:790,y:224,"text-anchor":"middle","class":"s-nom"},
    "émetteurs"));
  pose("v2v",760,YA-0,4);
  pose("reglage",820,YR,6);
  pose("clapet",624,YA,7);
  pose("purgeur",552,YA-34,13,null,"g");
  tube(552,YA-24,552,YA,"chaud",2);

  /* la securite, en bas du secondaire */
  tube(430,YR,430,340,"froid",2.5);
  pose("soupape",430,362,8);
  tube(530,YR,530,336,"froid",2.5);
  pose("vase",530,358,9);
  pose("mano",620,YR+40,10);
  tube(620,YR,620,YR+18,"froid",2);
  pose("disconnecteur",250,YR+40,15);
  tube(250,YR,250,YR+18,"froid",2);
  svg.appendChild(S("text",{x:250,y:YR+84,"text-anchor":"middle","class":"s-nom"},
    "remplissage"));

  svg.appendChild(S("text",{x:W/2,y:H-8,"text-anchor":"middle","class":"s-nom"},
    "Les deux eaux ne se mélangent jamais : elles échangent à travers une paroi."));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les numéros renvoient à la bibliothèque de symboles. <b>Suivez un fluide du "+
    "doigt</b>, d'un bout à l'autre, en nommant chaque organe rencontré : si vous "+
    "y arrivez, vous savez lire le schéma."));
};

/* ═══════ Quatre schemas pour les fiches d'automatismes de la 2de ═══════
   Ajoutes le 9 septembre 2026. Comme les vingt et un precedents, ils ne
   parlent d'aucun metier : c'est ce qui les rend reutilisables ailleurs. */

/* ─────────── un repere orthogonal, et quatre points a lire ─────────── */
SCHEMAS["repere-points"]=function(el){
  var W=724,H=380,X0=60,X1=680,Y0=30,Y1=340;
  var xmin=-4,xmax=6,ymin=-3,ymax=4;
  function x(v){return X0+(v-xmin)/(xmax-xmin)*(X1-X0);}
  function y(v){return Y1-(v-ymin)/(ymax-ymin)*(Y1-Y0);}
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Repère orthogonal et quatre points repérés par leurs coordonnées"});
  var i;
  for(i=xmin;i<=xmax;i++)svg.appendChild(S("line",{x1:x(i),y1:Y0,x2:x(i),y2:Y1,
    stroke:V("trait2"),"stroke-width":"1"}));
  for(i=ymin;i<=ymax;i++)svg.appendChild(S("line",{x1:X0,y1:y(i),x2:X1,y2:y(i),
    stroke:V("trait2"),"stroke-width":"1"}));
  svg.appendChild(S("line",{x1:X0,y1:y(0),x2:X1,y2:y(0),stroke:V("encre2"),
    "stroke-width":"2.2"}));
  svg.appendChild(S("line",{x1:x(0),y1:Y0,x2:x(0),y2:Y1,stroke:V("encre2"),
    "stroke-width":"2.2"}));
  for(i=xmin;i<=xmax;i++)if(i!==0)svg.appendChild(S("text",{x:x(i),y:y(0)+20,
    "text-anchor":"middle","class":"s-pet"},String(i)));
  for(i=ymin;i<=ymax;i++)if(i!==0)svg.appendChild(S("text",{x:x(0)-10,y:y(i)+5,
    "text-anchor":"end","class":"s-pet"},String(i)));
  svg.appendChild(S("text",{x:x(0)-10,y:y(0)+20,"text-anchor":"end",
    "class":"s-pet"},"0"));
  svg.appendChild(S("text",{x:X1,y:y(0)-12,"text-anchor":"end","class":"s-lab",
    fill:V("encre2")},"x"));
  svg.appendChild(S("text",{x:x(0)+14,y:Y0+16,"class":"s-lab",
    fill:V("encre2")},"y"));

  /* Le point A porte la lecture dessinee : on part de l'axe des x, on monte. */
  svg.appendChild(S("line",{x1:x(3),y1:y(0),x2:x(3),y2:y(2),stroke:V("chaud"),
    "stroke-width":"1.6","stroke-dasharray":"5 4"}));
  svg.appendChild(S("line",{x1:x(0),y1:y(2),x2:x(3),y2:y(2),stroke:V("chaud"),
    "stroke-width":"1.6","stroke-dasharray":"5 4"}));

  [[3,2,"A","chaud"],[-2,1,"B","encre2"],[0,-2,"C","encre2"],[5,0,"D","encre2"]]
  .forEach(function(p){
    svg.appendChild(S("circle",{cx:x(p[0]),cy:y(p[1]),r:"7",fill:V(p[3])}));
    svg.appendChild(S("text",{x:x(p[0])+13,y:y(p[1])-11,"class":"s-lab",
      fill:V(p[3]),style:"font-size:20px"},p[2]));
  });
  svg.appendChild(S("text",{x:x(3)+13,y:y(2)+22,"class":"s-pet",
    fill:V("chaud")},"( 3 ; 2 )"));
  svg.appendChild(S("text",{x:X1,y:Y0+18,"text-anchor":"end","class":"s-tit",
    fill:V("chaud")},"L'ABSCISSE D'ABORD, L'ORDONNÉE ENSUITE"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "On lit <b>toujours dans cet ordre</b> : on avance sur l'axe horizontal, "+
    "puis on monte. A se note ( 3 ; 2 ) et jamais ( 2 ; 3 ) — ce serait un "+
    "autre point."));
};

/* ─────────── lire une image, puis un antecedent, sur la meme courbe ─────────── */
SCHEMAS["lire-courbe"]=function(el){
  var W=724,H=380,X0=70,X1=680,Y0=30,Y1=330;
  var xmin=0,xmax=8,ymin=0,ymax=10;
  function x(v){return X0+(v-xmin)/(xmax-xmin)*(X1-X0);}
  function y(v){return Y1-(v-ymin)/(ymax-ymin)*(Y1-Y0);}
  function f(v){return v+1;}                /* une droite, et qui tombe juste */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Courbe, lecture d'une image et lecture d'un antécédent"});
  var i;
  for(i=xmin;i<=xmax;i++)svg.appendChild(S("line",{x1:x(i),y1:Y0,x2:x(i),y2:Y1,
    stroke:V("trait2"),"stroke-width":"1"}));
  for(i=ymin;i<=ymax;i+=1)svg.appendChild(S("line",{x1:X0,y1:y(i),x2:X1,y2:y(i),
    stroke:V("trait2"),"stroke-width":"1"}));
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("encre2"),
    "stroke-width":"2.2"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X0,y2:Y1,stroke:V("encre2"),
    "stroke-width":"2.2"}));
  for(i=xmin;i<=xmax;i++)svg.appendChild(S("text",{x:x(i),y:Y1+20,
    "text-anchor":"middle","class":"s-pet"},String(i)));
  for(i=ymin;i<=ymax;i+=2)svg.appendChild(S("text",{x:X0-10,y:y(i)+5,
    "text-anchor":"end","class":"s-pet"},String(i)));
  svg.appendChild(S("line",{x1:x(0),y1:y(f(0)),x2:x(8),y2:y(f(8)),
    stroke:V("encre"),"stroke-width":"3"}));
  svg.appendChild(S("text",{x:x(7.4),y:y(f(7.4))-14,"text-anchor":"end",
    "class":"s-lab",fill:V("encre")},"ƒ"));

  /* image de 3 : on part de l'axe des x */
  svg.appendChild(S("line",{x1:x(3),y1:Y1,x2:x(3),y2:y(f(3)),stroke:V("chaud"),
    "stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("line",{x1:x(3),y1:y(f(3)),x2:X0,y2:y(f(3)),stroke:V("chaud"),
    "stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("circle",{cx:x(3),cy:y(f(3)),r:"6",fill:V("chaud")}));
  svg.appendChild(S("text",{x:x(3),y:Y1+38,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud")},"je pars de 3"));
  svg.appendChild(S("text",{x:X0+10,y:y(f(3))-10,"class":"s-lab",
    fill:V("chaud")},"ƒ(3) se lit ici"));

  /* antecedent de 8 : on part de l'axe des y */
  svg.appendChild(S("line",{x1:X0,y1:y(8),x2:x(7),y2:y(8),
    stroke:V("froid"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("line",{x1:x(7),y1:y(8),x2:x(7),y2:Y1,
    stroke:V("froid"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("circle",{cx:x(7),cy:y(8),r:"6",fill:V("froid")}));
  svg.appendChild(S("text",{x:X0+10,y:y(8)-10,"class":"s-lab",
    fill:V("froid")},"je pars de 8"));
  svg.appendChild(S("text",{x:x(7),y:Y1+38,"text-anchor":"middle",
    "class":"s-lab",fill:V("froid")},"l'antécédent est là"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>Une image se lit de bas en haut</b> : je pars de l'axe horizontal, je "+
    "monte jusqu'à la courbe, je vais lire à gauche. <b>Un antécédent se lit "+
    "dans l'autre sens</b> : je pars de l'axe vertical, je vais jusqu'à la "+
    "courbe, je descends. Le geste dit lequel des deux on cherche."));
};

/* ─────────── les quatre crochets, sur la meme portion de droite ─────────── */
SCHEMAS["intervalles"]=function(el){
  var W=724,H=380,X0=124,X1=700,LIG=[70,146,222,298];
  var vmin=1,vmax=9;
  function x(v){return X0+(v-vmin)/(vmax-vmin)*(X1-X0);}
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les quatre types d'intervalles entre 3 et 7, bornes comprises ou exclues"});
  var cas=[["[3 ; 7]",true,true],["]3 ; 7[",false,false],
           ["[3 ; 7[",true,false],["]3 ; 7]",false,true]];
  cas.forEach(function(c,k){
    var Y=LIG[k];
    svg.appendChild(S("text",{x:X0-24,y:Y+7,"text-anchor":"end","class":"s-lab",
      fill:V("encre"),style:"font-size:21px"},c[0]));
    svg.appendChild(S("line",{x1:X0,y1:Y,x2:X1,y2:Y,stroke:V("trait"),
      "stroke-width":"1.6"}));
    var i;
    for(i=vmin;i<=vmax;i++){
      svg.appendChild(S("line",{x1:x(i),y1:Y-6,x2:x(i),y2:Y+6,stroke:V("trait"),
        "stroke-width":"1.2"}));
      if(k===3)svg.appendChild(S("text",{x:x(i),y:Y+28,"text-anchor":"middle",
        "class":"s-pet"},String(i)));
    }
    svg.appendChild(S("line",{x1:x(3),y1:Y,x2:x(7),y2:Y,stroke:V("chaud"),
      "stroke-width":"7","stroke-linecap":"butt"}));
    [[3,c[1]],[7,c[2]]].forEach(function(b){
      svg.appendChild(S("circle",{cx:x(b[0]),cy:Y,r:"9",
        fill:b[1]?V("chaud"):V("carte"),stroke:V("chaud"),"stroke-width":"3"}));
    });
  });
  svg.appendChild(S("text",{x:X0-24,y:352,"class":"s-tit",fill:V("chaud")},
    "DISQUE PLEIN : LA BORNE EST DANS L'INTERVALLE"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le crochet <b>tourné vers l'intérieur</b> prend la borne ; tourné vers "+
    "l'extérieur, il la laisse dehors. Les quatre intervalles couvrent la même "+
    "portion de droite et ne contiennent pourtant pas les mêmes nombres."));
};

/* ─────────── reconnaitre Pythagore, reconnaitre Thales ─────────── */
SCHEMAS["pythagore-thales"]=function(el){
  var W=724,H=340;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un triangle rectangle et une configuration de Thalès, côte à côte"});
  /* ── Pythagore : triangle rectangle en A ── */
  var Ax=70,Ay=250,Bx=270,By=250,Cx=70,Cy=90;
  svg.appendChild(S("polygon",{points:Ax+","+Ay+" "+Bx+","+By+" "+Cx+","+Cy,
    fill:"none",stroke:V("encre"),"stroke-width":"3"}));
  svg.appendChild(S("path",{d:"M "+(Ax+22)+" "+Ay+" L "+(Ax+22)+" "+(Ay-22)+
    " L "+Ax+" "+(Ay-22),fill:"none",stroke:V("chaud"),"stroke-width":"2.4"}));
  svg.appendChild(S("line",{x1:Bx,y1:By,x2:Cx,y2:Cy,stroke:V("chaud"),
    "stroke-width":"5"}));
  svg.appendChild(S("text",{x:Ax-10,y:Ay+8,"text-anchor":"end","class":"s-lab"},"A"));
  svg.appendChild(S("text",{x:Bx+12,y:By+8,"class":"s-lab"},"B"));
  svg.appendChild(S("text",{x:Cx-10,y:Cy-4,"text-anchor":"end","class":"s-lab"},"C"));
  svg.appendChild(S("text",{x:186,y:154,"class":"s-lab",fill:V("chaud")},"hypoténuse"));
  svg.appendChild(S("text",{x:Ax,y:48,"class":"s-tit",fill:V("chaud")},
    "UN ANGLE DROIT → PYTHAGORE"));
  svg.appendChild(S("text",{x:Ax,y:300,"class":"s-pet",fill:V("encre2")},
    "BC² = AB² + AC²"));

  /* ── Thales : le point S, deux directions, et DEUX parametres ──
     Les deux paralleles sont construites avec le MEME couple de directions et
     deux coefficients : elles sont donc paralleles par construction, et non
     parce qu'on a estime des coordonnees a l'oeil. */
  var Sx=470,Sy=75, ux=-38,uy=70, vx=90,vy=55;
  function P(k,dx,dy){return [Sx+k*dx, Sy+k*dy];}
  var M=P(1.3,ux,uy), N=P(1.3,vx,vy), B=P(2.4,ux,uy), C=P(2.4,vx,vy);
  var U=P(2.65,ux,uy), Vv=P(2.65,vx,vy);
  svg.appendChild(S("line",{x1:Sx,y1:Sy,x2:U[0],y2:U[1],stroke:V("encre"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:Sx,y1:Sy,x2:Vv[0],y2:Vv[1],stroke:V("encre"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:M[0],y1:M[1],x2:N[0],y2:N[1],stroke:V("froid"),
    "stroke-width":"4"}));
  svg.appendChild(S("line",{x1:B[0],y1:B[1],x2:C[0],y2:C[1],stroke:V("froid"),
    "stroke-width":"4"}));
  svg.appendChild(S("text",{x:Sx,y:Sy-12,"text-anchor":"middle","class":"s-lab"},"S"));
  svg.appendChild(S("text",{x:M[0]-12,y:M[1]+4,"text-anchor":"end","class":"s-lab",
    fill:V("froid")},"M"));
  svg.appendChild(S("text",{x:N[0]+12,y:N[1]+4,"class":"s-lab",fill:V("froid")},"N"));
  svg.appendChild(S("text",{x:B[0]-12,y:B[1]+4,"text-anchor":"end","class":"s-lab",
    fill:V("froid")},"B"));
  svg.appendChild(S("text",{x:C[0]+12,y:C[1]+4,"class":"s-lab",fill:V("froid")},"C"));
  svg.appendChild(S("text",{x:352,y:48,"class":"s-tit",fill:V("froid")},
    "DEUX PARALLÈLES → THALÈS"));
  svg.appendChild(S("text",{x:352,y:300,"class":"s-pet",fill:V("encre2")},
    "SM / SB = SN / SC = MN / BC"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>On reconnaît la configuration avant de chercher la formule.</b> Un "+
    "angle droit marqué appelle Pythagore, et l'hypoténuse est toujours le côté "+
    "en face de cet angle. Deux droites parallèles coupant deux sécantes "+
    "appellent Thalès, et les trois rapports sont égaux. Sans l'un ou l'autre, "+
    "aucune des deux ne s'applique."));
};

/* ─────────── la pile zinc-cuivre, et le chemin des electrons ───────────
   Ajoute le 18 septembre 2026 pour la Tle CTRM, sequence 2. Il sert aussi
   en sequence 9 : la corrosion est la meme reaction, sans le fil. */
SCHEMAS["pile-electrons"]=function(el){
  var W=724,H=412;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Pile zinc-cuivre : les électrons quittent le zinc, passent par le fil, "+
                 "et sont captés par les ions cuivre"});
  var BX0=176,BX1=548,BY0=146,BY1=326, LIQ=176;
  var ZX=246,CX=470,PW=26,PY0=112,PY1=300, FIL=64, MX=(ZX+CX)/2;

  /* ── le becher et la solution ── */
  svg.appendChild(S("path",{d:"M "+BX0+" "+BY0+" L "+BX0+" "+(BY1-16)+
    " Q "+BX0+" "+BY1+" "+(BX0+16)+" "+BY1+" L "+(BX1-16)+" "+BY1+
    " Q "+BX1+" "+BY1+" "+BX1+" "+(BY1-16)+" L "+BX1+" "+BY0,
    fill:V("carte2"),stroke:V("encre2"),"stroke-width":"2.4"}));
  svg.appendChild(S("line",{x1:BX0,y1:LIQ,x2:BX1,y2:LIQ,stroke:V("encre2"),
    "stroke-width":"1.6","stroke-dasharray":"7 5"}));
  /* la legende du liquide se pose ENTRE les deux lames : ailleurs elle passe
     derriere l'une des deux, et le mot devient illisible. */
  svg.appendChild(S("text",{x:MX,y:LIQ+20,"text-anchor":"middle","class":"s-pet",
    fill:V("encre2")},"solution conductrice"));

  /* ── les deux lames ── */
  /* Le nom se pose A COTE de la lame, pas au-dessus : le fil monte du milieu
     de la lame et barrait le mot en son centre. */
  [[ZX,"chaud","ZINC",-10,"end"],[CX,"froid","CUIVRE",10,"start"]]
  .forEach(function(p){
    svg.appendChild(S("rect",{x:p[0]-PW/2,y:PY0,width:PW,height:PY1-PY0,rx:"3",
      fill:V("carte"),stroke:V(p[1]),"stroke-width":"3"}));
    svg.appendChild(S("text",{x:p[0]+p[3],y:PY0-12,"text-anchor":p[4],
      "class":"s-lab",fill:V(p[1])},p[2]));
  });

  /* ── le fil exterieur, et le voltmetre ── */
  svg.appendChild(S("path",{d:"M "+ZX+" "+PY0+" L "+ZX+" "+FIL+" L "+CX+" "+FIL+
    " L "+CX+" "+PY0,fill:"none",stroke:V("encre"),"stroke-width":"3"}));
  svg.appendChild(S("circle",{cx:MX,cy:FIL,r:"21",fill:V("carte"),stroke:V("encre"),
    "stroke-width":"3"}));
  svg.appendChild(S("text",{x:MX,y:FIL+7,"text-anchor":"middle","class":"s-lab",
    fill:V("encre")},"V"));

  /* ── une pointe de fleche, apex en (x,y), dirigee vers la DROITE ── */
  function pointe(x,y,coul){
    svg.appendChild(S("path",{d:"M "+x+" "+y+" l -13 -6 l 0 12 z",fill:V(coul)}));
  }
  /* Les electrons QUITTENT le zinc et VONT au cuivre : de gauche a droite.
     Une premiere version les faisait pointer vers le zinc — le schema disait
     alors exactement le contraire de sa legende. */
  [ZX+62,CX-40].forEach(function(x){ pointe(x,FIL,"chaud"); });
  [ZX+50,CX-52].forEach(function(x){
    svg.appendChild(S("text",{x:x,y:FIL-14,"text-anchor":"middle","class":"s-pet",
      fill:V("chaud"),style:"font-size:15px"},"e⁻"));
  });
  svg.appendChild(S("text",{x:MX,y:26,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"DEUX CHEMINS POUR LES MÊMES ÉLECTRONS"));

  /* ── les ions, dans la solution : les deux cations vont vers la CATHODE,
        donc vers la droite. Zn²⁺ quitte sa lame, Cu²⁺ rejoint la sienne. ── */
  [[ZX+22,"Zn²⁺","chaud"],[CX-92,"Cu²⁺","froid"]].forEach(function(p){
    svg.appendChild(S("path",{d:"M "+p[0]+" 248 l 44 0",stroke:V(p[2]),
      "stroke-width":"1.8"}));
    pointe(p[0]+44,248,p[2]);
    svg.appendChild(S("text",{x:p[0]+22,y:234,"text-anchor":"middle","class":"s-pet",
      fill:V(p[2])},p[1]));
  });

  /* ── le raccourci, en gris et en pointille : il existe, il ne sert a rien,
        et c'est lui qui depose du cuivre sur le zinc. ── */
  svg.appendChild(S("path",{d:"M 344 292 L 272 292",stroke:V("encre2"),
    "stroke-width":"1.8","stroke-dasharray":"6 4"}));
  svg.appendChild(S("path",{d:"M 266 292 l 13 -6 l 0 12 z",fill:V("encre2")}));
  svg.appendChild(S("rect",{x:ZX+PW/2,y:280,width:8,height:24,
    fill:V("froid")}));
  svg.appendChild(S("text",{x:352,y:296,"class":"s-pet",fill:V("encre2")},
    "le raccourci"));

  /* ── les deux demi-equations, sur deux lignes courtes chacune ── */
  svg.appendChild(S("text",{x:110,y:364,"class":"s-lab",fill:V("chaud"),
    style:"font-size:19px"},"Zn → Zn²⁺ + 2 e⁻"));
  svg.appendChild(S("text",{x:110,y:388,"class":"s-pet",fill:V("encre2")},
    "OXYDATION · il perd · borne −"));
  svg.appendChild(S("text",{x:614,y:364,"text-anchor":"end","class":"s-lab",
    fill:V("froid"),style:"font-size:19px"},"Cu²⁺ + 2 e⁻ → Cu"));
  svg.appendChild(S("text",{x:614,y:388,"text-anchor":"end","class":"s-pet",
    fill:V("encre2")},"RÉDUCTION · il gagne · borne +"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le zinc <b>perd</b> deux électrons ; les ions cuivre les <b>prennent</b>. Entre les "+
    "deux, il y a <b>deux chemins</b>. Par <b>le fil</b>, le déplacement des électrons "+
    "<b>est</b> le courant : c'est celui qu'on veut. <b>Au contact</b> du zinc, un ion "+
    "cuivre peut se servir directement — rien ne sort dans le fil, et le cuivre se "+
    "dépose sur la lame. <b>La couche rouge qui apparaît sur le zinc, c'est ce "+
    "raccourci-là</b>, et c'est de l'énergie perdue en chaleur."));
};

/* ─────────── ce que pese l'energie, pour un meme besoin ───────────
   Une seule mesure, donc une seule teinte, plus l'accent sur la ligne qui
   porte le message. Les barres sont A L'ECHELLE : celle du gazole est
   presque invisible, et c'est exactement ce qu'il faut voir. */
SCHEMAS["energie-par-kg"]=function(el){
  var W=724,H=330,X0=206,LMAX=438,Y=[96,166,236],HB=38;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Masse nécessaire pour stocker 240 kilowattheures : plomb 6857 kg, "+
                 "lithium 1500 kg, gazole 20 kg"});
  svg.appendChild(S("text",{x:20,y:42,"class":"s-tit",
    fill:V("chaud")},"POUR STOCKER LES MÊMES 240 kW·h"));
  var MAX=6857;
  [["Plomb",6857,"6 857 kg","chaud"],
   ["Lithium-ion",1500,"1 500 kg","encre2"],
   ["Gazole",20,"20 kg","encre2"]].forEach(function(b,i){
    var w=Math.max(3, b[1]/MAX*LMAX);
    svg.appendChild(S("text",{x:X0-14,y:Y[i]+HB/2+6,"text-anchor":"end",
      "class":"s-lab",fill:V("encre")},b[0]));
    svg.appendChild(S("rect",{x:X0,y:Y[i],width:w,height:HB,rx:"2",fill:V(b[3])}));
    svg.appendChild(S("text",{x:X0+w+12,y:Y[i]+HB/2+6,"class":"s-lab",
      fill:V(b[3])},b[2]));
  });
  svg.appendChild(S("line",{x1:X0,y1:Y[0]-14,x2:X0,y2:Y[2]+HB+14,stroke:V("encre2"),
    "stroke-width":"2"}));
  svg.appendChild(S("text",{x:X0,y:Y[2]+HB+34,"class":"s-pet",fill:V("chaud")},
    "le plomb, c'est 27 % de la charge utile du tracteur"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les trois barres sont <b>à la même échelle</b>. Celle du gazole tient dans un trait, "+
    "et c'est la raison pour laquelle les camions ont roulé au gazole pendant un siècle. "+
    "<b>Attention pourtant :</b> ces 240 kW·h de gazole ne sont pas de l'énergie utile — "+
    "un moteur thermique n'en convertit qu'environ <b>40 %</b> en mouvement, contre plus "+
    "de <b>90 %</b> pour un moteur électrique. La comparaison n'est pas honnête telle quelle."));
};

/* ─────────── le banc de l'activite 2, dans les deux sens ───────────
   L'accumulateur est A LA MEME PLACE dans les deux panneaux — montant de
   droite. Seule la fleche change, et c'est tout le propos de la seance.
   Les valeurs sont celles d'un NiMH format AA : 1,2 V nominal, 2 000 mA·h. */
SCHEMAS["banc-charge-decharge"]=function(el){
  var W=724,H=516;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Banc de charge et de décharge d'un accumulateur, puis les deux "+
                 "courbes de tension relevées toutes les deux minutes"});
  svg.appendChild(S("text",{x:W/2,y:30,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"LE MÊME ACCUMULATEUR, DANS LES DEUX SENS"));

  /* pointe de fleche : dir = +1 vers la droite, -1 vers la gauche */
  function pointe(x,y,coul,dir){
    svg.appendChild(S("path",{d:"M "+x+" "+y+" l "+(-13*dir)+" -6 l 0 12 z",
      fill:V(coul)}));
  }

  function panneau(ox,num,titre,coul,charge,l1,l2){
    var XL=ox+62,XR=ox+250,YT=104,YB=196,MID=(XL+XR)/2,MY=(YT+YB)/2;
    svg.appendChild(S("text",{x:ox+160,y:66,"text-anchor":"middle","class":"s-lab",
      fill:V(coul)},num+"  "+titre));
    /* la boucle, puis les organes par-dessus : leur fond masque le fil */
    svg.appendChild(S("path",{d:"M "+XL+" "+YT+" L "+XR+" "+YT+" L "+XR+" "+YB+
      " L "+XL+" "+YB+" Z",fill:"none",stroke:V("encre"),"stroke-width":"3"}));
    svg.appendChild(S("circle",{cx:MID,cy:YT,r:"20",fill:V("carte"),stroke:V("encre"),
      "stroke-width":"3"}));
    svg.appendChild(S("text",{x:MID,y:YT+7,"text-anchor":"middle","class":"s-lab",
      fill:V("encre")},"A"));
    /* a gauche : l'alimentation en charge, la lampe en decharge */
    if(charge){
      svg.appendChild(S("rect",{x:XL-48,y:MY-32,width:96,height:64,rx:"5",
        fill:V("carte"),stroke:V("encre"),"stroke-width":"2.4"}));
      svg.appendChild(S("text",{x:XL,y:MY-4,"text-anchor":"middle","class":"s-lab",
        fill:V("encre")},"ALIM."));
      svg.appendChild(S("text",{x:XL,y:MY+18,"text-anchor":"middle","class":"s-pet",
        fill:V("encre2")},"0,20 A"));
    }else{
      svg.appendChild(S("circle",{cx:XL,cy:MY,r:"22",fill:V("carte"),stroke:V("chaud"),
        "stroke-width":"2.8"}));
      svg.appendChild(S("path",{d:"M "+(XL-15)+" "+(MY-15)+" L "+(XL+15)+" "+(MY+15)+
        " M "+(XL+15)+" "+(MY-15)+" L "+(XL-15)+" "+(MY+15),stroke:V("chaud"),
        "stroke-width":"2.2"}));
      svg.appendChild(S("text",{x:XL,y:YB+22,"text-anchor":"middle","class":"s-pet",
        fill:V("encre2")},"lampe 2,5 V"));
    }
    /* a droite : l'accumulateur, borne + en haut DANS LES DEUX CAS */
    svg.appendChild(S("rect",{x:XR-24,y:MY-20,width:48,height:40,fill:V("carte")}));
    svg.appendChild(S("rect",{x:XR-20,y:MY-14,width:40,height:"3.5",fill:V("encre")}));
    svg.appendChild(S("rect",{x:XR-10,y:MY+2,width:20,height:"5",fill:V("encre")}));
    svg.appendChild(S("text",{x:XR+26,y:MY-8,"class":"s-lab",fill:V("encre2")},"+"));
    svg.appendChild(S("text",{x:XR+26,y:MY+16,"class":"s-lab",fill:V("encre2")},"−"));
    svg.appendChild(S("text",{x:XR,y:YB+22,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},"accumulateur"));
    /* le sens du courant : deux pointes sur le fil du haut */
    var dir=charge?1:-1;
    /* les deux pointes se placent EN MIROIR : cote a cote dans le panneau
       decharge, elles se chevauchaient et faisaient une seule tache. */
    [charge?MID+58:MID-58, charge?XL+46:XR-46].forEach(function(x){
      pointe(x,YT,coul,dir);
    });
    svg.appendChild(S("text",{x:MID,y:YT+30,"text-anchor":"middle","class":"s-pet",
      fill:V(coul)},charge?"le courant ENTRE":"le courant SORT"));
    /* le releve du poste */
    svg.appendChild(S("rect",{x:ox+6,y:240,width:308,height:56,rx:"6",
      fill:V("carte2")}));
    svg.appendChild(S("text",{x:ox+160,y:262,"text-anchor":"middle","class":"s-lab",
      fill:V(coul)},l1));
    svg.appendChild(S("text",{x:ox+160,y:284,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},l2));
  }
  panneau(30,"①","EN CHARGE","chaud",true,
          "I = 0,20 A constant","U : 1,30 V → 1,45 V en 10 min");
  panneau(374,"②","EN DÉCHARGE","froid",false,
          "I ≈ 0,15 A","U : 1,25 V → 1,10 V en 10 min");

  /* ── les deux courbes : c'est le tableau g) du polycopie, rempli ── */
  var X0=150,X1=620,YB2=482,HT=136;
  function xT(t){return X0+t/10*(X1-X0);}
  function yU(u){return YB2-(u-1.0)/0.5*HT;}
  svg.appendChild(S("text",{x:W/2,y:320,"text-anchor":"middle","class":"s-pet",
    fill:V("encre2")},"ce que donne le relevé de tension, toutes les deux minutes"));
  [1.0,1.1,1.2,1.3,1.4,1.5].forEach(function(u){
    svg.appendChild(S("line",{x1:X0,y1:yU(u),x2:X1,y2:yU(u),stroke:V("trait"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-12,y:yU(u)+5,"text-anchor":"end","class":"s-pet",
      fill:V("encre2")},u.toFixed(1).replace(".",",")+" V"));
  });
  svg.appendChild(S("line",{x1:X0,y1:yU(1.5),x2:X0,y2:YB2,stroke:V("encre2"),
    "stroke-width":"2"}));
  svg.appendChild(S("line",{x1:X0,y1:YB2,x2:X1,y2:YB2,stroke:V("encre2"),
    "stroke-width":"2"}));
  [0,2,4,6,8,10].forEach(function(t){
    svg.appendChild(S("text",{x:xT(t),y:500,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},""+t));
  });
  svg.appendChild(S("text",{x:636,y:500,"class":"s-pet",fill:V("encre2")},"min"));
  function trace(vals,coul,nom,dy){
    var d="";
    vals.forEach(function(u,i){
      d+=(i?" L ":"M ")+xT(i*2)+" "+yU(u);
      svg.appendChild(S("circle",{cx:xT(i*2),cy:yU(u),r:"4",fill:V(coul)}));
    });
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V(coul),"stroke-width":"2.6"}));
    svg.appendChild(S("text",{x:X1+10,y:yU(vals[5])+dy,"class":"s-pet",fill:V(coul)},nom));
  }
  trace([1.30,1.35,1.38,1.41,1.43,1.45],"chaud","charge",-6);
  trace([1.25,1.22,1.20,1.18,1.15,1.10],"froid","décharge",14);
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le montage est le même des deux côtés, et l'accumulateur est à la même place : "+
    "<b>seule la flèche du courant change de sens</b>. En charge, on <b>force</b> le courant "+
    "à entrer et la tension <b>monte</b> ; en décharge, l'accumulateur <b>fournit</b> le "+
    "courant et la tension <b>descend</b>. Les valeurs portées ici sont celles d'un NiMH "+
    "format AA — <b>les vôtres seront voisines, pas identiques</b>, et c'est normal : ce "+
    "qu'il faut retrouver, c'est le <b>sens</b> des deux courbes, pas le centième de volt."));
};

/* ─────────── la decharge complete, d'ou sortent Q et E ───────────
   Le prolongement du banc de la seance 2, a courant constant. Les nombres
   sont ceux de l'accumulateur AA, JAMAIS ceux des tableaux i) et j) du
   polycopie : la fiche montre comment on lit, elle ne rend pas la copie. */
SCHEMAS["releve-decharge"]=function(el){
  var W=724,H=540;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Courbe de décharge à courant constant : le plateau à 1,2 volt, "+
                 "la chute à 10 heures, et le calcul de la capacité et de l'énergie"});
  var X0=120,X1=610,YB=380,HT=280;
  function xT(t){return X0+t/12*(X1-X0);}
  function yU(u){return YB-(u-0.8)/0.8*HT;}
  svg.appendChild(S("text",{x:20,y:32,"class":"s-tit",fill:V("chaud")},
    "UN ACCUMULATEUR QU'ON VIDE À COURANT CONSTANT"));
  svg.appendChild(S("text",{x:20,y:56,"class":"s-pet",fill:V("encre2")},
    "le même AA que sur le banc, déchargé sous 0,20 A sans jamais varier"));
  [0.8,0.9,1.0,1.1,1.2,1.3,1.4,1.5,1.6].forEach(function(u){
    svg.appendChild(S("line",{x1:X0,y1:yU(u),x2:X1,y2:yU(u),stroke:V("trait"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-12,y:yU(u)+5,"text-anchor":"end","class":"s-pet",
      fill:V("encre2")},u.toFixed(1).replace(".",",")+" V"));
  });
  svg.appendChild(S("line",{x1:X0,y1:yU(1.6),x2:X0,y2:YB,stroke:V("encre2"),
    "stroke-width":"2"}));
  svg.appendChild(S("line",{x1:X0,y1:YB,x2:X1,y2:YB,stroke:V("encre2"),
    "stroke-width":"2"}));
  [0,2,4,6,8,12].forEach(function(t){
    svg.appendChild(S("text",{x:xT(t),y:402,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},""+t));
  });
  svg.appendChild(S("text",{x:(X0+X1)/2,y:426,"text-anchor":"middle","class":"s-pet",
    fill:V("encre2")},"temps de décharge, en heures"));
  /* le seuil d'arret : en dessous, on abime la cellule */
  svg.appendChild(S("line",{x1:X0,y1:yU(1.0),x2:X1,y2:yU(1.0),stroke:V("chaud"),
    "stroke-width":"1.8","stroke-dasharray":"7 5"}));
  /* calee sur X1, l etiquette passait sous le point du genou : elle s arrete
     avant lui. */
  svg.appendChild(S("text",{x:xT(9.4),y:yU(1.0)-17,"text-anchor":"end","class":"s-pet",
    fill:V("chaud")},"seuil d'arrêt : 1,0 V"));
  /* la courbe : long plateau, puis le genou */
  var PTS=[[0,1.38],[0.5,1.32],[1,1.30],[2,1.28],[4,1.26],[6,1.24],[8,1.22],
           [9,1.20],[9.5,1.17],[10,1.10],[10.3,0.95],[10.5,0.85]];
  var d="";
  PTS.forEach(function(q,i){ d+=(i?" L ":"M ")+xT(q[0])+" "+yU(q[1]); });
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"3"}));
  /* la lecture du temps d'arret */
  svg.appendChild(S("line",{x1:xT(10),y1:yU(1.0),x2:xT(10),y2:YB,stroke:V("chaud"),
    "stroke-width":"1.8","stroke-dasharray":"7 5"}));
  svg.appendChild(S("circle",{cx:xT(10),cy:yU(1.10),r:"5",fill:V("chaud")}));
  svg.appendChild(S("text",{x:xT(10),y:YB+22,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud")},"t = 10 h"));
  svg.appendChild(S("text",{x:xT(4.6),y:yU(1.26)+38,"text-anchor":"middle","class":"s-pet",
    fill:V("froid")},"le plateau : U ≈ 1,2 V presque tout le temps"));
  /* les deux calculs, dans le coin libre en haut a droite */
  /* Les deux encadres sont SOUS le graphique, cote a cote. Poses dans le coin
     haut-droit, ils recouvraient le plateau de la courbe et son etiquette. */
  [["Q = I × t = 0,20 × 10","soit 2,0 A·h — la capacité",20],
   ["E = Q × U = 2,0 × 1,2","soit 2,4 W·h — l'énergie",374]]
  .forEach(function(b){
    svg.appendChild(S("rect",{x:b[2],y:448,width:330,height:66,rx:"6",
      fill:V("carte2"),stroke:V("chaud"),"stroke-width":"1.6"}));
    svg.appendChild(S("text",{x:b[2]+18,y:476,"class":"s-lab",fill:V("encre")},b[0]));
    svg.appendChild(S("text",{x:b[2]+18,y:499,"class":"s-pet",fill:V("chaud")},b[1]));
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Tout se lit sur la courbe. <b>Le courant est connu</b> parce qu'on l'a imposé : 0,20 A. "+
    "<b>Le temps se lit</b> là où la tension tombe sous le seuil : 10 h. Leur produit est la "+
    "<b>capacité</b>, 2,0 A·h — et c'est bien la valeur inscrite sur l'accumulateur. La "+
    "multiplier par la tension donne l'<b>énergie</b>, 2,4 W·h. <b>Le plateau explique "+
    "pourquoi on a le droit de multiplier par une seule tension :</b> elle ne bouge presque "+
    "pas de toute la décharge. Une batterie de camion fait exactement cela, avec des nombres "+
    "trois cents fois plus grands."));
};

/* ─────────── peser l'accumulateur, puis remonter au camion ───────────
   Une manip de trente secondes qui ancre la table de l'activite 4 : le
   W·h/kg cesse d'etre un nombre lu quelque part. */
SCHEMAS["peser-l-energie"]=function(el){
  var W=724,H=360;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Peser un accumulateur AA pour en tirer une énergie par kilogramme, "+
                 "et la comparer au plomb et au lithium"});
  svg.appendChild(S("text",{x:20,y:32,"class":"s-tit",fill:V("chaud")},
    "CE QUE PÈSE L'ÉNERGIE — ON COMMENCE PAR PESER"));
  /* la balance et sa cellule */
  svg.appendChild(S("text",{x:145,y:72,"text-anchor":"middle","class":"s-pet",
    fill:V("encre2")},"1 accumulateur AA"));
  svg.appendChild(S("rect",{x:132,y:88,width:26,height:46,rx:"4",fill:V("carte"),
    stroke:V("froid"),"stroke-width":"2.6"}));
  svg.appendChild(S("rect",{x:140,y:82,width:10,height:7,rx:"2",fill:V("froid")}));
  svg.appendChild(S("rect",{x:56,y:136,width:178,height:11,rx:"4",fill:V("encre2")}));
  svg.appendChild(S("rect",{x:70,y:150,width:150,height:50,rx:"6",fill:V("carte"),
    stroke:V("encre"),"stroke-width":"2.4"}));
  svg.appendChild(S("rect",{x:92,y:162,width:106,height:26,rx:"3",fill:V("carte2")}));
  svg.appendChild(S("text",{x:145,y:181,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud")},"0,026 kg"));
  /* les deux grandeurs, puis le quotient */
  [["ÉNERGIE","2,4 W·h","mesurée en séance 3",300,"froid"],
   ["MASSE","0,026 kg","pesée ici",502,"encre2"]].forEach(function(b){
    svg.appendChild(S("rect",{x:b[3],y:82,width:170,height:64,rx:"6",fill:V("carte2"),
      stroke:V(b[4]),"stroke-width":"1.6"}));
    svg.appendChild(S("text",{x:b[3]+85,y:104,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},b[0]));
    svg.appendChild(S("text",{x:b[3]+85,y:127,"text-anchor":"middle","class":"s-lab",
      fill:V(b[4])},b[1]));
    svg.appendChild(S("text",{x:b[3]+85,y:162,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},b[2]));
  });
  svg.appendChild(S("text",{x:486,y:124,"text-anchor":"middle","class":"s-lab",
    fill:V("encre")},"÷"));
  svg.appendChild(S("text",{x:486,y:202,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud"),style:"font-size:21px"},"= 92 W·h par kilogramme"));
  /* le situer entre les deux technologies de la table */
  /* LMAX=400 poussait l etiquette du lithium hors du viewBox : 340 la ramene */
  var SX=250,LMAX=340,MAX=160;
  [["Plomb",35,"35","encre2",238],
   ["NiMH — le vôtre",92,"92","chaud",276],
   ["Lithium-ion",160,"160","encre2",314]].forEach(function(b){
    svg.appendChild(S("text",{x:SX-14,y:b[4]+20,"text-anchor":"end","class":"s-pet",
      fill:V("encre")},b[0]));
    svg.appendChild(S("rect",{x:SX,y:b[4],width:b[1]/MAX*LMAX,height:28,rx:"2",
      fill:V(b[3])}));
    svg.appendChild(S("text",{x:SX+b[1]/MAX*LMAX+12,y:b[4]+20,"class":"s-pet",
      fill:V(b[3])},b[2]+" W·h/kg"));
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le <b>W·h par kilogramme</b> de la table de l'activité 4 n'est pas un nombre tombé du "+
    "ciel : c'est <b>l'énergie divisée par la masse</b>, et on peut le mesurer soi-même sur "+
    "une pile qu'on tient dans la main. Le NiMH se place <b>entre le plomb et le lithium</b>, "+
    "ce qui est bien sa place. Et le calcul remonte au camion sans rien changer : pour les "+
    "<b>240 kW·h</b> du besoin, il faudrait <b>240 000 ÷ 92 ≈ 2 610 kg</b> de NiMH — "+
    "environ <b>cent mille piles</b> comme celle-là."));
};

/* ══════════════════════════════════ SCHEMAS — Tle CTRM, sequence 3
   Vecteurs dans l'espace. La convention d'axes est celle de la figure du
   polycopie, fig3-espace : x longueur vers la DROITE, y largeur en fuyante
   vers le haut-droit, z hauteur vers le HAUT. Un schema web qui inverserait
   deux axes ferait douter de la feuille, pas de lui-meme. */

/* ─────────── la caisse, et trois nombres pour un point ─────────── */
SCHEMAS["caisse-reperee"]=function(el){
  var W=724,H=400;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une caisse de 6 m sur 2 m sur 3 m vue en perspective, ses trois axes, "+
                 "et les coordonnées de quatre points remarquables"});
  var OX=150,OY=356,UX=62,UZ=54,DX=40,DY=26;
  function P(x,y,z){ return [OX+x*UX+y*DX, OY-z*UZ-y*DY]; }
  function L(a,b,coul,ep){
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],
      stroke:V(coul),"stroke-width":ep}));
  }
  svg.appendChild(S("text",{x:W/2,y:28,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"TROIS NOMBRES POUR UN POINT"));
  svg.appendChild(S("text",{x:W/2,y:50,"text-anchor":"middle","class":"s-pet",
    fill:V("encre2")},"la caisse mobile : 6 m de long, 2 m de large, 3 m de haut"));

  /* les douze aretes */
  var LX=6,LY=2,LZ=3;
  [[0,0,0,LX,0,0],[0,LY,0,LX,LY,0],[0,0,LZ,LX,0,LZ],[0,LY,LZ,LX,LY,LZ],
   [0,0,0,0,LY,0],[LX,0,0,LX,LY,0],[0,0,LZ,0,LY,LZ],[LX,0,LZ,LX,LY,LZ],
   [0,0,0,0,0,LZ],[LX,0,0,LX,0,LZ],[0,LY,0,0,LY,LZ],[LX,LY,0,LX,LY,LZ]]
  .forEach(function(a){ L(P(a[0],a[1],a[2]),P(a[3],a[4],a[5]),"encre2","1.8"); });

  /* les trois axes, par-dessus, avec leur pointe */
  function axe(bx,by,txt,tx,ty,anc){
    var o=P(0,0,0);
    svg.appendChild(S("line",{x1:o[0],y1:o[1],x2:bx,y2:by,stroke:V("encre"),
      "stroke-width":"3"}));
    var dx=bx-o[0],dy=by-o[1],n=Math.sqrt(dx*dx+dy*dy);
    dx/=n; dy/=n;
    svg.appendChild(S("path",{d:"M "+bx+" "+by+" L "+(bx-13*dx+6*dy)+" "+(by-13*dy-6*dx)+
      " L "+(bx-13*dx-6*dy)+" "+(by-13*dy+6*dx)+" z",fill:V("encre")}));
    svg.appendChild(S("text",{x:tx,y:ty,"text-anchor":anc,"class":"s-lab",
      fill:V("encre")},txt));
  }
  axe(578,356,"x longueur",586,362,"start");
  axe(150,172,"z hauteur",160,166,"start");
  axe(OX+2.7*DX,OY-2.7*DY,"y largeur",OX+2.7*DX+10,OY-2.7*DY-6,"start");

  /* quatre gommettes, comme sur la boite du bureau */
  [[0,0,0,"(0 ; 0 ; 0)",0,26,"middle"],
   [6,0,0,"(6 ; 0 ; 0)",-12,22,"end"],
   [0,2,0,"(0 ; 2 ; 0)",-12,4,"end"],
   [6,2,3,"(6 ; 2 ; 3)",12,-8,"start"],
   [3,1,0,"(3 ; 1 ; 0)",16,6,"start"]].forEach(function(g){
    var p=P(g[0],g[1],g[2]);
    svg.appendChild(S("circle",{cx:p[0],cy:p[1],r:"7",fill:V("chaud")}));
    svg.appendChild(S("text",{x:p[0]+g[4],y:p[1]+g[5],"text-anchor":g[6],
      "class":"s-pet",fill:V("chaud")},g[3]));
  });
  svg.appendChild(S("text",{x:136,y:352,"text-anchor":"end","class":"s-lab",
    fill:V("encre")},"O"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "On lit les trois nombres <b>en marchant le long des arêtes</b> : d'abord vers le "+
    "fond, puis vers la droite, puis vers le haut. Jamais dans un autre ordre, et jamais "+
    "en diagonale. Le point marqué <b>(3 ; 1 ; 0)</b> est le centre du plancher : la "+
    "moitié de 6, la moitié de 2, et <b>zéro en hauteur</b> puisqu'il est au sol. "+
    "<b>Posez une vraie boîte devant vous</b> — celle-ci est un dessin, et c'est le "+
    "dessin qui fait échouer, pas l'espace."));
};

/* ─────────── les deux sangles, et pourquoi 2 + 2 ne font pas 4 ───────────
   A, B et S ont tous x = 4 : la figure est PLANE, et ce dessin en (y ; z)
   n'est donc pas une projection, c'est la vraie forme. */
SCHEMAS["deux-sangles-somme"]=function(el){
  var W=724,H=420;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les deux vecteurs sangles mis bout à bout : leur somme est verticale "+
                 "et vaut 3,2 m, alors que chacun mesure 2 m"});
  var OX=180,OY=350,U=80;
  function P(y,z){ return [OX+y*U, OY-z*U]; }
  var A=P(0,0), B=P(2.4,0), Sp=P(1.2,1.6), T=P(0,3.2);
  function fl(a,b,coul,ep,dash){
    var at={x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),"stroke-width":ep};
    if(dash)at["stroke-dasharray"]=dash;
    svg.appendChild(S("line",at));
    var dx=b[0]-a[0],dy=b[1]-a[1],n=Math.sqrt(dx*dx+dy*dy); dx/=n; dy/=n;
    svg.appendChild(S("path",{d:"M "+b[0]+" "+b[1]+" L "+(b[0]-14*dx+6*dy)+" "+
      (b[1]-14*dy-6*dx)+" L "+(b[0]-14*dx-6*dy)+" "+(b[1]-14*dy+6*dx)+" z",fill:V(coul)}));
  }
  svg.appendChild(S("text",{x:20,y:30,"class":"s-tit",fill:V("chaud")},
    "DEUX SANGLES DE 2 m, UNE SOMME DE 3,2 m"));
  /* le plancher */
  svg.appendChild(S("line",{x1:130,y1:OY,x2:420,y2:OY,stroke:V("encre"),
    "stroke-width":"4"}));
  for(var x=140;x<420;x+=26){
    svg.appendChild(S("line",{x1:x,y1:OY+4,x2:x-14,y2:OY+18,stroke:V("encre2"),
      "stroke-width":"2"}));
  }
  /* la verticale qui passe par A : c'est sur elle que la somme retombe */
  svg.appendChild(S("line",{x1:OX,y1:OY,x2:OX,y2:86,stroke:V("trait"),
    "stroke-width":"1.6","stroke-dasharray":"6 5"}));
  /* les deux sangles, puis BS reporte au bout de AS */
  fl(A,Sp,"froid","3.2");
  fl(B,Sp,"froid","3.2");
  fl(Sp,T,"encre2","2.4","7 5");
  fl(A,T,"chaud","4");
  [[A,"A (4 ; 0 ; 0)",0,26,"middle"],[B,"B (4 ; 2,4 ; 0)",0,26,"middle"],
   [Sp,"S (4 ; 1,2 ; 1,6)",14,-10,"start"]].forEach(function(g){
    svg.appendChild(S("circle",{cx:g[0][0],cy:g[0][1],r:"6",fill:V("encre")}));
    svg.appendChild(S("text",{x:g[0][0]+g[2],y:g[0][1]+g[3],"text-anchor":g[4],
      "class":"s-pet",fill:V("encre")},g[1]));
  });
  svg.appendChild(S("text",{x:OX-12,y:100,"text-anchor":"end","class":"s-lab",
    fill:V("chaud")},"3,2 m"));
  /* cale sur S, cette etiquette passait sous le nom du point ; a droite de
     la fleche en pointille, elle est seule. */
  svg.appendChild(S("text",{x:300,y:150,"class":"s-pet",fill:V("encre2")},
    "BS reporté ici"));
  /* le compte, a droite */
  svg.appendChild(S("rect",{x:436,y:112,width:268,height:158,rx:"6",
    fill:V("carte2"),stroke:V("chaud"),"stroke-width":"1.6"}));
  [["‖AS‖ = 2 m","froid",146],
   ["‖BS‖ = 2 m","froid",176],
   ["2 + 2 = 4","encre2",214],
   ["‖AS + BS‖ = 3,2 m","chaud",248]].forEach(function(b){
    svg.appendChild(S("text",{x:570,y:b[2],"text-anchor":"middle","class":"s-lab",
      fill:V(b[1])},b[0]));
  });
  svg.appendChild(S("line",{x1:470,y1:192,x2:670,y2:192,stroke:V("encre2"),
    "stroke-width":"1.4"}));
  /* sur une seule ligne, cette phrase debordait du viewBox */
  [["la norme de la somme",294],["n'est pas la somme des normes",314]]
  .forEach(function(t){
    svg.appendChild(S("text",{x:570,y:t[1],"text-anchor":"middle","class":"s-pet",
      fill:V("chaud")},t[0]));
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le dessin est <b>à l'échelle</b>, et c'est lui qui fait la preuve. On part de A, on "+
    "suit la première sangle jusqu'à S, puis on <b>reporte la seconde au bout de la "+
    "première</b> : on retombe exactement <b>au-dessus de A</b>, à 3,2 m de haut. Les "+
    "deux composantes en largeur, <b>+1,2 et −1,2</b>, se sont annulées — c'est ce qui "+
    "rend la somme verticale. Et le chemin direct est <b>plus court</b> que les deux "+
    "morceaux mis bout à bout : 3,2 m contre 4 m."));
};

/* ─────────── colineaires : la meme droite, pas le meme sens ─────────── */
SCHEMAS["direction-et-sens"]=function(el){
  var W=724,H=360;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un vecteur et ses multiples sur une même droite : k positif garde le "+
                 "sens, k négatif le retourne"});
  var OX=330,OY=190,UXv=110,UYv=-44;
  function P(k){ return [OX+k*UXv, OY+k*UYv]; }
  function fl(b,coul,ep){
    var a=[OX,OY];
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),
      "stroke-width":ep}));
    var dx=b[0]-a[0],dy=b[1]-a[1],n=Math.sqrt(dx*dx+dy*dy); dx/=n; dy/=n;
    svg.appendChild(S("path",{d:"M "+b[0]+" "+b[1]+" L "+(b[0]-14*dx+6*dy)+" "+
      (b[1]-14*dy-6*dx)+" L "+(b[0]-14*dx-6*dy)+" "+(b[1]-14*dy+6*dx)+" z",fill:V(coul)}));
  }
  svg.appendChild(S("text",{x:20,y:30,"class":"s-tit",fill:V("chaud")},
    "LA MÊME DROITE, PAS FORCÉMENT LE MÊME SENS"));
  /* la droite support : c'est elle, la direction */
  svg.appendChild(S("line",{x1:0,y1:OY+OX*0.4,x2:W,y2:OY-(W-OX)*0.4,
    stroke:V("trait"),"stroke-width":"1.6","stroke-dasharray":"7 5"}));
  svg.appendChild(S("text",{x:20,y:340,"class":"s-pet",fill:V("encre2")},
    "une seule droite : c'est la direction"));
  /* les quatre multiples, du plus long au plus court pour que les traits
     courts restent visibles par-dessus */
  [[2,"chaud","4"],[1,"chaud","5"],[-1,"froid","5"],[-2,"froid","4"]]
  .forEach(function(m){ fl(P(m[0]),m[1],m[2]); });
  /* k = 2 posait son etiquette la ou passe le verdict du haut : elle passe
     SOUS la pointe. */
  [[2,"k = 2",8,22,"start"],[1,"u",6,-14,"start"],
   [-1,"k = −1",-10,30,"end"],[-2,"k = −2",-10,18,"end"]]
  .forEach(function(m){
    var p=P(m[0]);
    svg.appendChild(S("text",{x:p[0]+m[2],y:p[1]+m[3],"text-anchor":m[4],
      "class":"s-lab",fill:m[0]>0?V("chaud"):V("froid")},m[1]));
  });
  svg.appendChild(S("circle",{cx:OX,cy:OY,r:"6",fill:V("encre")}));
  /* les deux verdicts */
  /* les deux verdicts vont dans les deux coins libres, loin des pointes
     et de la droite support. */
  [["k > 0 : même sens que u","chaud",700,208,"end"],
   ["k < 0 : sens contraire","froid",60,130,"start"]].forEach(function(b){
    svg.appendChild(S("text",{x:b[2],y:b[3],"text-anchor":b[4],"class":"s-lab",
      fill:V(b[1])},b[0]));
  });
  svg.appendChild(S("text",{x:W-16,y:338,"text-anchor":"end","class":"s-pet",
    fill:V("encre2")},"u(2 ; −1 ; 4)  →  2u(4 ; −2 ; 8)  →  −2u(−4 ; 2 ; −8)"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les quatre vecteurs sont <b>colinéaires</b> : chacun est le précédent multiplié par "+
    "un nombre, et tous portent <b>la même droite</b>. C'est cela, la direction. Le "+
    "<b>sens</b> est autre chose : il se retourne dès que <b>k est négatif</b>. Deux "+
    "sangles colinéaires tirent donc sur la même ligne — mais si l'un des k est négatif, "+
    "<b>elles tirent l'une contre l'autre</b>. La longueur, elle, est multipliée par "+
    "<b>la valeur de k sans son signe</b>."));
};

/* ─────────── ce que dit la troisieme coordonnee ───────────
   Les deux panneaux sont vus DE COTE, et c'est indispensable : une vue de
   dessus ne peut pas montrer que z vaut zero, puisque tout y parait
   horizontal. Le premier essai la prenait, et ne demontrait rien. */
SCHEMAS["troisieme-coordonnee"]=function(el){
  var W=724,H=360,FY=256,NIV=196;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux sangles restées à la même hauteur ne plaquent pas la charge ; "+
                 "un ancrage au plancher donne une troisième coordonnée négative"});
  svg.appendChild(S("text",{x:W/2,y:28,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"CE QUE DIT LA TROISIÈME COORDONNÉE"));
  function fl(a,b,coul,ep){
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),
      "stroke-width":ep}));
    var dx=b[0]-a[0],dy=b[1]-a[1],n=Math.sqrt(dx*dx+dy*dy); dx/=n; dy/=n;
    svg.appendChild(S("path",{d:"M "+b[0]+" "+b[1]+" L "+(b[0]-14*dx+6*dy)+" "+
      (b[1]-14*dy-6*dx)+" L "+(b[0]-14*dx-6*dy)+" "+(b[1]-14*dy+6*dx)+" z",fill:V(coul)}));
  }
  function plancher(ox){
    svg.appendChild(S("line",{x1:ox+10,y1:FY,x2:ox+320,y2:FY,stroke:V("encre"),
      "stroke-width":"4"}));
    for(var x=ox+22;x<ox+320;x+=26){
      svg.appendChild(S("line",{x1:x,y1:FY+4,x2:x-14,y2:FY+18,stroke:V("encre2"),
        "stroke-width":"2"}));
    }
  }
  function palette(x0,larg){
    svg.appendChild(S("rect",{x:x0,y:NIV,width:larg,height:FY-NIV,rx:"3",
      fill:V("carte2"),stroke:V("encre2"),"stroke-width":"2"}));
  }
  function nom(x,y,t){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":"middle","class":"s-pet",
      fill:V("encre")},t));
  }
  function note(cx,t){
    svg.appendChild(S("text",{x:cx,y:166,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},t));
  }
  function verdict(cx,gros,coul,petit){
    svg.appendChild(S("text",{x:cx,y:306,"text-anchor":"middle","class":"s-lab",
      fill:V(coul)},gros));
    svg.appendChild(S("text",{x:cx,y:328,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},petit));
  }

  /* ① les deux ancrages sont a la meme hauteur que le point d'attache */
  var A=20;
  svg.appendChild(S("text",{x:A+165,y:62,"text-anchor":"middle","class":"s-lab",
    fill:V("froid")},"① TOUT À LA MÊME HAUTEUR"));
  plancher(A);
  svg.appendChild(S("line",{x1:A+16,y1:NIV,x2:A+314,y2:NIV,stroke:V("trait"),
    "stroke-width":"1.6","stroke-dasharray":"6 5"}));
  palette(A+16,48); palette(A+266,48); palette(A+130,70);
  nom(A+40,230,"P₁"); nom(A+290,230,"P₃"); nom(A+165,230,"P₄");
  fl([A+165,NIV],[A+72,NIV],"froid","3");
  fl([A+165,NIV],[A+258,NIV],"froid","3");
  note(A+165,"les trois points sont à 1,0 m de haut");
  verdict(A+165,"z = 0","froid","rien ne tire vers le bas");

  /* ② l'ancrage est au plancher : le vecteur descend */
  var B=374;
  svg.appendChild(S("text",{x:B+165,y:62,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud")},"② UN ANCRAGE AU PLANCHER"));
  plancher(B);
  palette(B+130,70);
  nom(B+165,188,"P₄");
  var T=[B+165,NIV], R=[B+93,FY];
  svg.appendChild(S("circle",{cx:R[0],cy:R[1],r:"8",fill:V("encre")}));
  svg.appendChild(S("text",{x:R[0]-14,y:FY+20,"text-anchor":"end","class":"s-pet",
    fill:V("encre2")},"ancrage R"));
  svg.appendChild(S("line",{x1:T[0],y1:NIV,x2:T[0],y2:FY,stroke:V("trait"),
    "stroke-width":"1.6","stroke-dasharray":"6 4"}));
  fl(T,R,"chaud","3.4");
  svg.appendChild(S("text",{x:T[0]+12,y:232,"class":"s-pet",fill:V("chaud")},"−1,0"));
  svg.appendChild(S("text",{x:B+112,y:212,"text-anchor":"end","class":"s-pet",
    fill:V("chaud")},"P₄R"));
  note(B+165,"l'ancrage est 1,0 m plus bas");
  verdict(B+165,"z = −1,0","chaud","la sangle plaque la charge");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "À gauche, les trois points sont <b>à la même hauteur</b> — c'est le cas du problème 1, "+
    "où les quatre palettes sont identiques. Les deux sangles restent à plat, et leur somme "+
    "aussi : <b>la troisième coordonnée vaut 0</b>. La charge est tenue sur les côtés, "+
    "<b>rien ne l'empêche de décoller</b> au premier dos-d'âne. À droite, l'ancrage est "+
    "<b>au plancher</b> : le vecteur descend, sa troisième coordonnée est <b>négative</b>, "+
    "et c'est ce signe-là qui dit que la sangle plaque. C'est la raison d'être de "+
    "l'arrimage par-dessus, dit <b>frictionnel</b>."));
};

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
SCHEMAS["quatre-modeles-un-nuage"]=function(el){
  var W=724,H=456;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Le relevé vitesse-consommation ajusté par quatre modèles : affine, "+
                 "quadratique, exponentiel et logarithmique, avec leurs quatre R carré"});
  var X=[60,65,70,75,80,85,90,95,100], Y=[26,27,29,31,34,38,43,50,58];
  svg.appendChild(S("text",{x:W/2,y:28,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"LE MÊME NUAGE, QUATRE MODÈLES"));
  svg.appendChild(S("text",{x:W/2,y:50,"text-anchor":"middle","class":"s-pet",
    fill:V("encre2")},"relevé ② : la consommation selon la vitesse — "+
                     "même échelle sur les quatre"));
  var LARG=280,HAUT=118;
  var MOD=[
   ["① AFFINE","0,919",function(x){return 0.7733*x-24.5333;},44,96,false],
   ["② QUADRATIQUE","0,998",function(x){return 0.020*x*x-2.4267*x+100.133;},398,96,true],
   ["③ EXPONENTIEL","0,966",function(x){return 7.1742*Math.pow(1.02037,x);},44,296,false],
   ["④ LOGARITHMIQUE","0,877",function(x){return 59.3217*Math.log(x)-221.8249;},398,296,false]];
  MOD.forEach(function(m,idx){
    var ox=m[3],oy=m[4],gagne=m[5],coul=gagne?"chaud":"froid";
    function fx(x){ return ox+(x-58)/44*LARG; }
    function fy(y){ return oy+HAUT-(y-22)/40*HAUT; }
    svg.appendChild(S("text",{x:ox,y:oy-12,"class":"s-lab",fill:V(coul)},m[0]));
    if(gagne){
      svg.appendChild(S("text",{x:ox+LARG,y:oy-12,"text-anchor":"end","class":"s-pet",
        fill:V("chaud")},"RETENU"));
    }
    /* la grille reste en retrait, l'encadre du retenu est en chaud */
    [30,40,50,60].forEach(function(v){
      svg.appendChild(S("line",{x1:ox,y1:fy(v),x2:ox+LARG,y2:fy(v),stroke:V("trait"),
        "stroke-width":"1"}));
    });
    svg.appendChild(S("rect",{x:ox,y:oy,width:LARG,height:HAUT,fill:"none",
      stroke:V(gagne?"chaud":"encre2"),"stroke-width":gagne?"2":"1.2"}));
    _courbe(svg,m[2],58,102,fx,fy,coul,"2.6",22,62);
    _pts(svg,X,Y,fx,fy,"3.4");
    /* le R² est du TEXTE, pas une serie : encre, et un fond pour ne pas
       s'asseoir sur la ligne de grille. L'identite du panneau est portee
       par son titre, qui lui est colore. */
    svg.appendChild(S("rect",{x:ox+6,y:oy+6,width:104,height:22,rx:"3",
      fill:V("carte")}));
    svg.appendChild(S("text",{x:ox+14,y:oy+22,"class":"s-lab",fill:V("encre")},
      "R² = "+m[1]));
    if(ox===44){
      [30,50].forEach(function(v){
        svg.appendChild(S("text",{x:ox-8,y:fy(v)+5,"text-anchor":"end","class":"s-pet",
          fill:V("encre2")},""+v));
      });
    }
    if(oy===296){
      [60,100].forEach(function(v){
        svg.appendChild(S("text",{x:fx(v),y:oy+HAUT+20,"text-anchor":"middle",
          "class":"s-pet",fill:V("encre2")},""+v));
      });
    }
  });
  svg.appendChild(S("text",{x:44,y:448,"class":"s-pet",fill:V("encre2")},
    "en abscisse la vitesse (km/h), en ordonnée la consommation (L/100 km)"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>Les neuf points sont les mêmes partout</b>, et l'échelle aussi : seule la courbe "+
    "change. L'affine passe au-dessus des points du milieu et en dessous des deux bouts — "+
    "c'est visible à l'œil, et le R² de 0,919 le chiffre. Le logarithmique fait l'inverse "+
    "et fait pire. <b>Le quadratique épouse la courbure</b>, R² = 0,998. L'exponentiel n'est "+
    "pas ridicule, 0,966, mais il monte trop tôt. <b>On regarde l'allure, puis on lit le "+
    "R².</b> Jamais l'inverse."));
};

/* ─────────── deux modeles que le R2 ne separe pas ─────────── */
SCHEMAS["deux-modeles-qui-se-valent"]=function(el){
  var W=724,H=392;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Sur le relevé charge-consommation, le modèle affine et le modèle "+
                 "quadratique ont le même R carré et se confondent"});
  var X=[5,7,9,11,13,15,18,21,24,28], Y=[26,28,28,32,34,34,36,40,43,46];
  var X0=80,X1=590,Y0=300,Y1=76;
  function fx(x){ return X0+(x-3)/43*(X1-X0); }
  function fy(y){ return Y0-(y-22)/42*(Y0-Y1); }
  svg.appendChild(S("text",{x:20,y:28,"class":"s-tit",fill:V("chaud")},
    "DEUX MODÈLES, LE MÊME R² : LEQUEL PRENDRE ?"));
  /* la plage des releves, en fond */
  svg.appendChild(S("rect",{x:fx(5),y:Y1,width:fx(28)-fx(5),height:Y0-Y1,
    fill:V("carte2")}));
  svg.appendChild(S("text",{x:(fx(5)+fx(28))/2,y:Y0+40,"text-anchor":"middle",
    "class":"s-pet",fill:V("encre2")},"la plage des relevés : 5 à 28 t"));
  [30,40,50,60].forEach(function(v){
    svg.appendChild(S("line",{x1:X0,y1:fy(v),x2:X1,y2:fy(v),stroke:V("trait"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-8,y:fy(v)+5,"text-anchor":"end","class":"s-pet",
      fill:V("encre2")},""+v));
  });
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X0,y2:Y0,stroke:V("encre2"),
    "stroke-width":"1.6"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X1,y2:Y0,stroke:V("encre2"),
    "stroke-width":"1.6"}));
  [10,20,30,40].forEach(function(v){
    svg.appendChild(S("text",{x:fx(v),y:Y0+18,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},""+v));
  });
  _courbe(svg,function(x){return 0.002079*x*x+0.80685*x+21.9355;},3,45,fx,fy,
          "froid","5.5",22,64);
  _courbe(svg,function(x){return 0.8745*x+21.4945;},3,45,fx,fy,"chaud","2.4",22,64);
  _pts(svg,X,Y,fx,fy);
  /* nommees en bout de trace : l'identite ne tient pas a la couleur seule */
  svg.appendChild(S("text",{x:X1+10,y:fy(60.85)+4,"class":"s-pet",fill:V("chaud")},
    "affine"));
  svg.appendChild(S("text",{x:X1+10,y:fy(62.45)-10,"class":"s-pet",fill:V("froid")},
    "quadratique"));
  svg.appendChild(S("rect",{x:100,y:88,width:240,height:62,rx:"6",fill:V("carte"),
    stroke:V("encre2"),"stroke-width":"1.4"}));
  svg.appendChild(S("text",{x:220,y:112,"text-anchor":"middle","class":"s-lab",
    fill:V("encre")},"R² = 0,985  et  R² = 0,985"));
  svg.appendChild(S("text",{x:220,y:136,"text-anchor":"middle","class":"s-pet",
    fill:V("chaud")},"la machine ne tranche pas"));
  svg.appendChild(S("text",{x:20,y:378,"class":"s-pet",fill:V("encre2")},
    "charge (t) en abscisse, consommation (L/100 km) en ordonnée"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Sur toute la plage des relevés, les deux courbes <b>se confondent</b> : l'écart le plus "+
    "grand entre elles est de <b>0,18 L/100 km</b>, soit moins que l'épaisseur du trait. "+
    "Les deux R² sont égaux parce que les deux modèles décrivent aussi bien. <b>Quand le R² "+
    "ne tranche pas, on prend le plus simple</b>, donc l'affine : une droite s'explique à un "+
    "exploitant, une parabole beaucoup moins. Et il n'y a rien à gagner à choisir le "+
    "compliqué — ils donnent le même résultat là où l'on a des points."));
};

/* ─────────── jusqu'ou les modeles restent d'accord ─────────── */
SCHEMAS["extrapoler-les-quatre"]=function(el){
  var W=724,H=432;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Hors de la plage des relevés, les quatre modèles donnent de 62 à 97 "+
                 "litres aux cent kilomètres pour 120 km/h"});
  var X=[60,65,70,75,80,85,90,95,100], Y=[26,27,29,31,34,38,43,50,58];
  var X0=70,X1=548,Y0=336,Y1=76;
  function fx(x){ return X0+(x-55)/70*(X1-X0); }
  function fy(y){ return Y0-(y-20)/85*(Y0-Y1); }
  svg.appendChild(S("text",{x:20,y:28,"class":"s-tit",fill:V("chaud")},
    "LE MÊME RELEVÉ, PROLONGÉ JUSQU'À 120 km/h"));
  svg.appendChild(S("rect",{x:fx(60),y:Y1,width:fx(100)-fx(60),height:Y0-Y1,
    fill:V("carte2")}));
  [60,80,100,120].forEach(function(v){
    svg.appendChild(S("text",{x:fx(v),y:Y0+18,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},""+v));
  });
  svg.appendChild(S("text",{x:(fx(60)+fx(100))/2,y:Y0+40,"text-anchor":"middle",
    "class":"s-pet",fill:V("encre2")},"on a des points ici"));
  svg.appendChild(S("text",{x:(fx(100)+fx(122))/2,y:Y0+40,"text-anchor":"middle",
    "class":"s-pet",fill:V("chaud")},"et rien ici"));
  [40,60,80,100].forEach(function(v){
    svg.appendChild(S("line",{x1:X0,y1:fy(v),x2:X1,y2:fy(v),stroke:V("trait"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-8,y:fy(v)+5,"text-anchor":"end","class":"s-pet",
      fill:V("encre2")},""+v));
  });
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X0,y2:Y0,stroke:V("encre2"),"stroke-width":"1.6"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X1,y2:Y0,stroke:V("encre2"),"stroke-width":"1.6"}));
  svg.appendChild(S("line",{x1:fx(100),y1:Y1,x2:fx(100),y2:Y0,stroke:V("encre2"),
    "stroke-width":"1.6","stroke-dasharray":"6 5"}));
  /* Quatre traces, deux teintes seulement : l'exponentiel et le
     logarithmique passent sur l'encre avec DEUX MOTIFS de pointilles
     distincts. Une troisieme teinte ne tiendrait pas l'ecart CVD ; un
     motif, si, et il est lisible a l'impression comme en daltonisme. */
  _courbe(svg,function(x){return 7.1742*Math.pow(1.02037,x);},58,122,fx,fy,
          "encre","1.8",20,105,"8 5");
  _courbe(svg,function(x){return 59.3217*Math.log(x)-221.8249;},58,122,fx,fy,
          "encre","1.8",20,105,"2 5");
  _courbe(svg,function(x){return 0.7733*x-24.5333;},58,122,fx,fy,"froid","2.8",20,105);
  _courbe(svg,function(x){return 0.020*x*x-2.4267*x+100.133;},58,122,fx,fy,"chaud","2.8",20,105);
  _pts(svg,X,Y,fx,fy,"3.4");
  /* les quatre valeurs a 120, chacune nommee : pas de cinquieme couleur */
  [["quadratique","96,9",96.9,"chaud",96],
   ["exponentiel","80,7",80.7,"encre",150],
   ["affine","68,3",68.3,"froid",190],
   ["logarithmique","62,2",62.2,"encre",222]].forEach(function(b){
    var y=fy(b[2]);
    svg.appendChild(S("circle",{cx:fx(120),cy:y,r:"5.5",fill:V(b[3])}));
    svg.appendChild(S("line",{x1:fx(120)+8,y1:y,x2:562,y2:b[4],stroke:V("trait"),
      "stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:568,y:b[4]+4,"class":"s-pet",fill:V(b[3])},
      b[0]+"  "+b[1]));
  });
  svg.appendChild(S("text",{x:20,y:400,"class":"s-lab",fill:V("chaud")},
    "de 62 à 97 L/100 km selon le modèle : l'écart vaut 1,6 fois"));
  svg.appendChild(S("text",{x:20,y:422,"class":"s-pet",fill:V("encre2")},
    "vitesse (km/h) en abscisse, consommation (L/100 km) en ordonnée"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>Dans la plage, les quatre modèles sont d'accord</b> — ils passent tous dans le "+
    "nuage, à peu de chose près. <b>Dès qu'on sort, ils divergent</b> : à 120 km/h le "+
    "logarithmique annonce 62 L/100 km et le quadratique 97, soit <b>1,6 fois plus</b>. "+
    "Aucun relevé ne permet de départager, puisqu'il n'y a pas de point là-bas. C'est "+
    "toute la différence entre <b>interpoler</b>, où le modèle rend compte de mesures, et "+
    "<b>extrapoler</b>, où il ne fait plus que prolonger une habitude."));
};

/* ─────────── le cafe : deux R2 excellents, une reponse absurde ─────────── */
SCHEMAS["cafe-deux-modeles"]=function(el){
  var W=724,H=416;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Le refroidissement d'un café ajusté de deux façons : le modèle brut "+
                 "passe sous la température de la pièce, celui sur l'écart n'y descend pas"});
  var X=[0,5,10,15,20,25,30], Y=[88,71,58.3,48.7,41.5,36.1,32.1];
  var X0=76,X1=568,Y0=318,Y1=72;
  function fx(t){ return X0+t/126*(X1-X0); }
  function fy(v){ return Y0-v/96*(Y0-Y1); }
  svg.appendChild(S("text",{x:20,y:28,"class":"s-tit",fill:V("chaud")},
    "DEUX MODÈLES EXCELLENTS, UNE RÉPONSE IMPOSSIBLE"));
  svg.appendChild(S("rect",{x:fx(0),y:Y1,width:fx(30)-fx(0),height:Y0-Y1,
    fill:V("carte2")}));
  svg.appendChild(S("text",{x:(fx(0)+fx(30))/2,y:Y0+40,"text-anchor":"middle",
    "class":"s-pet",fill:V("encre2")},"le relevé : 0 à 30 min"));
  [20,40,60,80].forEach(function(v){
    svg.appendChild(S("line",{x1:X0,y1:fy(v),x2:X1,y2:fy(v),stroke:V("trait"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-8,y:fy(v)+5,"text-anchor":"end","class":"s-pet",
      fill:V("encre2")},v+"°"));
  });
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X0,y2:Y0,stroke:V("encre2"),"stroke-width":"1.6"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X1,y2:Y0,stroke:V("encre2"),"stroke-width":"1.6"}));
  [0,30,60,90,120].forEach(function(t){
    svg.appendChild(S("text",{x:fx(t),y:Y0+18,"text-anchor":"middle","class":"s-pet",
      fill:V("encre2")},""+t));
  });
  /* la temperature de la piece : le plancher physique que le modele ignore */
  svg.appendChild(S("line",{x1:X0,y1:fy(20),x2:X1,y2:fy(20),stroke:V("encre"),
    "stroke-width":"2","stroke-dasharray":"8 5"}));
  svg.appendChild(S("text",{x:X0+10,y:fy(20)-10,"class":"s-pet",
    fill:V("encre")},"la pièce : 20 °C"));
  _courbe(svg,function(t){return 83.94*Math.pow(0.96686,t);},0,126,fx,fy,"froid","2.8",0,96);
  _courbe(svg,function(t){return 20+68.038*Math.pow(0.94404,t);},0,126,fx,fy,"chaud","2.8",0,96);
  _pts(svg,X,Y,fx,fy,"3.6");
  svg.appendChild(S("text",{x:576,y:fy(20.1)-6,"class":"s-pet",fill:V("chaud")},
    "sur l'écart"));
  svg.appendChild(S("text",{x:576,y:fy(20.1)+14,"class":"s-lab",fill:V("chaud")},
    "20,1 °C"));
  svg.appendChild(S("text",{x:576,y:fy(1.5)-16,"class":"s-pet",fill:V("froid")},
    "brut"));
  svg.appendChild(S("text",{x:576,y:fy(1.5)+2,"class":"s-lab",fill:V("froid")},
    "1,5 °C"));
  svg.appendChild(S("rect",{x:300,y:92,width:262,height:60,rx:"6",fill:V("carte"),
    stroke:V("encre2"),"stroke-width":"1.4"}));
  svg.appendChild(S("text",{x:431,y:114,"text-anchor":"middle","class":"s-pet",
    fill:V("froid")},"brut : R² = 0,989"));
  svg.appendChild(S("text",{x:431,y:136,"text-anchor":"middle","class":"s-pet",
    fill:V("chaud")},"sur l'écart : R² = 1,000"));
  svg.appendChild(S("text",{x:20,y:396,"class":"s-pet",fill:V("encre2")},
    "temps (min) en abscisse, température (°C) en ordonnée"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>Les deux courbes passent par les mêmes points</b>, et les deux R² sont excellents. "+
    "Sur les trente minutes relevées, rien ne les sépare. Puis le modèle brut <b>traverse la "+
    "ligne des 20 °C</b> et continue à descendre : il annonce <b>1,5 °C</b> à deux heures, "+
    "soit un café plus froid que la pièce. Le modèle posé sur <b>l'écart à la pièce</b> "+
    "s'arrête à 20,1 °C, parce que l'écart, lui, tend vers zéro. <b>Le R² ne connaît pas la "+
    "physique</b> : il compare une courbe à des points, et c'est tout."));
};




/* --------- dispersion d'une serie de releves ---------
   Ajoute le 3 septembre 2026, sequence 1 de maths-PC. C'est la statistique
   descriptive du CCF de mathematiques, sur des donnees de chaufferie. */
OUTILS.dispersion={
  titre:"Moyenne, étendue, écart-type",
  intro:"Entrez une série de relevés, séparés par des espaces ou des virgules. "+
        "Les séries proposées viennent d'installations voisines de celles du cours, "+
        "jamais des activités elles-mêmes.",
  monte:function(d){
    var st={txt:"62,4 62,1 62,6 62,3 62,5 62,2 62,4 62,7 62,3 62,5",cons:62.5,tol:0.5};
    var g=E("div",{"class":"g2"});
    var col1=E("div"),col2=E("div");

    var seg=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"});
    /* chaque serie emporte sa consigne et sa tolerance : sans cela l'outil
       compare des releves a 62 degres a une consigne restee a 45. */
    [["Départ chaufferie","62,4 62,1 62,6 62,3 62,5 62,2 62,4 62,7 62,3 62,5",62.5,0.5],
     ["Régulation A","44,8 45,2 44,9 45,1 45,0 44,9 45,1 45,0",45,0.5],
     ["Régulation B","43,5 46,4 44,2 45,8 45,0 44,1 46,2 44,8",45,0.5],
     ["Débit d'un circuit","2,42 2,38 2,45 2,40 2,44 2,37",2.4,0.05]
    ].forEach(function(o){
      var b=E("button",{"class":"bt",type:"button"},o[0]);
      b.addEventListener("click",function(){
        st.txt=o[1];st.cons=o[2];st.tol=o[3];
        zone.value=o[1];curC.value=o[2];curT.value=o[3];calc();});
      seg.appendChild(b);
    });
    col1.appendChild(seg);

    var zone=E("textarea",{rows:"3",
      style:"width:100%;font-size:15px;padding:8px;border-radius:6px;"+
            "border:1px solid var(--trait);background:var(--carte);color:inherit"});
    zone.value=st.txt;
    zone.addEventListener("input",function(){st.txt=this.value;calc();});
    col1.appendChild(zone);

    function champ(lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");
      c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:st[cle]});
      i.addEventListener("input",function(){st[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);col1.appendChild(c);
      var f=function(){v.textContent=unite+frs(st[cle],dec);};
      f.input=i;return f;
    }
    var mC=champ("Valeur de consigne","cons",0,100,0.1,1,"");
    var mT=champ("Tolérance acceptée","tol",0.05,5,0.05,2,"± ");
    var curC=mC.input, curT=mT.input;

    var res=E("div",{"class":"res"});col2.appendChild(res);
    var boite=E("div",{style:"margin-top:12px"});col2.appendChild(boite);
    var note=E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},"");
    col2.appendChild(note);

    function lire(){
      return st.txt.replace(/,(?=[0-9])/g,".").split(/[^0-9.+-]+/)
             .filter(function(x){return x!==""&&isFinite(parseFloat(x));})
             .map(parseFloat);
    }
    function calc(){
      mC();mT();
      var v=lire(),n=v.length;
      if(n<2){
        res.innerHTML="<div class='gros'><span><b>Série trop courte</b>"+
          "<span>il en faut deux</span></span></div>";
        boite.innerHTML="";note.textContent="";return;
      }
      var som=0;v.forEach(function(x){som+=x;});
      var moy=som/n,mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),c2=0;
      v.forEach(function(x){c2+=(x-moy)*(x-moy);});
      var sn=Math.sqrt(c2/n), sn1=Math.sqrt(c2/(n-1));
      var hors=v.filter(function(x){return Math.abs(x-st.cons)>st.tol;}).length;
      res.innerHTML=
        "<div class='gros'><span><b>Moyenne</b><span>"+frs(moy,3)+"</span></span>"+
        "<span><b>Étendue</b><span>"+frs(mx-mn,3)+"</span></span></div>"+
        "<div class='gros'><span><b>sigma n</b><span>"+frs(sn,3)+"</span></span>"+
        "<span><b>sigma n−1 — expérimental</b><span>"+frs(sn1,3)+"</span></span></div>";
      var W=360,H=74,X0=14,X1=W-14,lo=Math.min(mn,st.cons-st.tol),
          hi=Math.max(mx,st.cons+st.tol),et=(hi-lo)||1;
      lo-=et*0.12;hi+=et*0.12;
      function px(x){return X0+(X1-X0)*(x-lo)/(hi-lo);}
      var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
        "aria-label":"nuage des relevés"});
      svg.appendChild(S("rect",{x:px(st.cons-st.tol),y:8,
        width:px(st.cons+st.tol)-px(st.cons-st.tol),height:44,
        fill:V("trait"),opacity:"0.14"}));
      svg.appendChild(S("line",{x1:X0,y1:56,x2:X1,y2:56,stroke:V("trait"),
        "stroke-width":"1.5"}));
      svg.appendChild(S("line",{x1:px(moy),y1:6,x2:px(moy),y2:60,stroke:V("chaud"),
        "stroke-width":"2"}));
      var vus={};
      v.forEach(function(x){
        var k=x.toFixed(4),m=vus[k]||0;vus[k]=m+1;
        svg.appendChild(S("circle",{cx:px(x),cy:48-12*m,r:4.5,fill:V("froid")}));
      });
      svg.appendChild(S("text",{x:px(moy),y:70,"text-anchor":"middle","class":"s-pet"},
        "moyenne"));
      boite.innerHTML="";boite.appendChild(svg);
      note.innerHTML="<b>"+n+" relevés</b>. L'écart-type expérimental est le "+
        "<b>sigma n−1</b> : c'est celui qui compte sur un échantillon de mesures. "+
        (hors?("<b>"+hors+"</b> relevé"+(hors>1?"s sortent":" sort")+
               " de la tolérance."):"Aucun relevé ne sort de la tolérance.");
    }
    g.appendChild(col1);g.appendChild(col2);d.appendChild(g);
    calc();
  }
};

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
