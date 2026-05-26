/* ============================================================
   THE SYSTEM — Logica principal
   ============================================================ */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const A = window.SystemAudio;

  /* ---------- Datos estaticos ---------- */
  const QUOTES = [
    {t:"TATAKAE. Sigue luchando, no importa cuanto duela.", s:"Attack on Titan"},
    {t:"PLUS ULTRA. Ve mas alla de tu limite, siempre.", s:"My Hero Academia"},
    {t:"El miedo no es malo. Te dice cual es tu debilidad.", s:"Mob Psycho 100"},
    {t:"Si vas a hacerlo, hazlo al 100%. Ese es tu poder.", s:"Mob Psycho 100"},
    {t:"No te conviertas en lo que odias. Se tu mejor version.", s:"Mob Psycho 100"},
    {t:"Solo yo puedo nivelarme. Nadie mas lo hara por mi.", s:"Solo Leveling"},
    {t:"El esfuerzo de hoy es el poder de manana.", s:"Solo Leveling"},
    {t:"No controlas lo que pasa, solo como respondes.", s:"Epicteto"},
    {t:"La disciplina es elegir lo que quieres a largo plazo.", s:"Estoicismo"},
    {t:"Despierta. Tienes misiones que cumplir, cazador.", s:"El Sistema"},
    {t:"Eres lo que haces repetidamente.", s:"Aristoteles"},
    {t:"Ningun viento es favorable para quien no sabe a donde va.", s:"Seneca"}
  ];

  const NAG = [
    "El Sistema te observa. Aun falta: \"{t}\". Deja de huir, cazador.",
    "Otra vez procrastinando? \"{t}\" sigue ahi. Los debiles descansan, tu no.",
    "Mientras dudas, otros suben de nivel. Termina: \"{t}\".",
    "El miedo es solo una excusa. Levantate y haz \"{t}\" AHORA.",
    "Un Monarca no posterga. \"{t}\" te espera. Sin excusas.",
    "Cada minuto perdido es XP regalado. \"{t}\" no se hara sola.",
    "Vas a quedarte en Rango E para siempre? Haz \"{t}\".",
    "TATAKAE. \"{t}\" es tu enemigo de hoy. No le des la espalda.",
    "El Sistema no acepta debilidad. \"{t}\" — muevete YA."
  ];

  const DEFAULT_DAILY = [
    {n:"Hacer ejercicio", xp:50, done:false, locked:true},
    {n:"Leer", xp:25, done:false, locked:true},
    {n:"Hacer aseo", xp:25, done:false, locked:true},
    {n:"Cocinar", xp:25, done:false, locked:true},
    {n:"Tareas de la universidad", xp:50, done:false, locked:true}
  ];

  const DEFAULT_WEEKLY = [
    {n:"Entrenar 4+ dias esta semana", xp:150, done:false, locked:true},
    {n:"Terminar un libro o capitulo grande", xp:120, done:false, locked:true},
    {n:"Limpieza profunda del cuarto", xp:100, done:false, locked:true},
    {n:"Adelantar un proyecto importante", xp:150, done:false, locked:true}
  ];

  const DEFAULT_REWARDS = [
    {n:"Pedir un delivery", lvl:3, claimed:false},
    {n:"Comprar un sobre del Mundial Panini", lvl:5, claimed:false},
    {n:"Noche de peli con crispetas", lvl:7, claimed:false},
    {n:"Sesion de PlayStation sin culpa", lvl:9, claimed:false},
    {n:"Salir a comer tu plato favorito", lvl:12, claimed:false},
    {n:"Comprar ese videojuego que quieres", lvl:15, claimed:false},
    {n:"Dia libre total sin culpa", lvl:18, claimed:false},
    {n:"Recompensa grande a tu eleccion", lvl:21, claimed:false}
  ];

  /* ---------- Estado + persistencia ---------- */
  let state = {
    level:1, totalXP:0, streak:0,
    daily:JSON.parse(JSON.stringify(DEFAULT_DAILY)),
    weekly:JSON.parse(JSON.stringify(DEFAULT_WEEKLY)),
    rewards:JSON.parse(JSON.stringify(DEFAULT_REWARDS)),
    history:{},          // { 'YYYY-MM-DD': xpGanadoEseDia }
    settings:{music:true, sfx:true},
    lastWeekReset:null
  };

  function load(){
    try{
      const raw = localStorage.getItem('system_state_v2');
      if(raw) state = JSON.parse(raw);
    }catch(e){}
    state.daily   = mergeFixed(state.daily,  DEFAULT_DAILY);
    state.weekly  = mergeFixed(state.weekly, DEFAULT_WEEKLY);
    if(!state.rewards)  state.rewards  = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
    if(!state.history)  state.history  = {};
    if(!state.settings) state.settings = {music:true, sfx:true};
  }
  function save(){
    try{ localStorage.setItem('system_state_v2', JSON.stringify(state)); }catch(e){}
  }
  function mergeFixed(list, defs){
    const d = JSON.parse(JSON.stringify(defs));
    const fixed = d.map(def=>{
      const ex = (list||[]).find(t=>t.n===def.n);
      return ex ? {n:def.n, xp:def.xp, done:!!ex.done, locked:true} : def;
    });
    const custom = (list||[]).filter(t=>!t.locked);
    return fixed.concat(custom);
  }

  /* ---------- Fechas ---------- */
  function todayKey(){
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  /* ---------- Logica RPG (XP 25% mas lento) ----------
     Antes: nivel L necesitaba L*100 XP.
     Ahora cuesta 33% mas XP  =>  sube ~25% mas lento.
     L*100 / 0.75 = L*133.33  =>  redondeado a L*133            */
  const XP_PER_LEVEL = 133;
  const xpForLevel = l => l * XP_PER_LEVEL;

  function curLevelXP(){
    let used=0;
    for(let l=1;l<state.level;l++) used+=xpForLevel(l);
    return state.totalXP-used;
  }
  function rankFor(l){
    if(l>=20) return "Rango S — Monarca";
    if(l>=15) return "Rango A — Cazador de elite";
    if(l>=10) return "Rango B — Cazador avanzado";
    if(l>=6)  return "Rango C — Cazador";
    if(l>=3)  return "Rango D — Cazador novato";
    return "Rango E — Cazador";
  }

  function gainXP(amt){
    state.totalXP += amt;
    const k = todayKey();
    state.history[k] = (state.history[k]||0) + amt;
    const before = state.level;
    while(curLevelXP() >= xpForLevel(state.level)) state.level++;
    if(state.level > before) showLevelUp(before);
  }
  function loseXP(amt){
    state.totalXP = Math.max(0, state.totalXP - amt);
    const k = todayKey();
    state.history[k] = Math.max(0, (state.history[k]||0) - amt);
    while(state.level>1 && curLevelXP()<0) state.level--;
  }

  function showLevelUp(before){
    $('lu-num').textContent = state.level;
    const oldR = rankFor(before), newR = rankFor(state.level);
    $('lu-rank').textContent = (oldR!==newR) ? ("ASCENDIDO A "+newR.toUpperCase()) : "";
    $('levelup').classList.add('show');
    if(A) A.sfx.levelup();
    if(navigator.vibrate) navigator.vibrate([60,40,60,40,140]);
  }
  $('levelup').addEventListener('click', ()=>{
    $('levelup').classList.remove('show');
    if(A) A.sfx.tap();
  });

  /* ---------- Frases ---------- */
  function newQuote(){
    const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
    $('quote-text').textContent = '"'+q.t+'"';
    $('quote-src').textContent = '\u2014 '+q.s;
  }

  /* ---------- Toast ---------- */
  function toast(msg, cls){
    const el = document.createElement('div');
    el.className = 'toast '+(cls||'xp');
    el.textContent = msg;
    $('toast').appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; }, 4000);
    setTimeout(()=> el.remove(), 4400);
  }

  /* ---------- Vista activa: daily | weekly ---------- */
  let view = 'daily';
  function curList(){ return view==='daily' ? state.daily : state.weekly; }

  /* ---------- Render ---------- */
  function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function render(){
    $('level-num').textContent = state.level;
    $('rank-label').textContent = rankFor(state.level);
    const need = xpForLevel(state.level), have = curLevelXP();
    $('xp-label').textContent = have+' / '+need+' XP';
    $('xp-fill').style.width = Math.min(100,(have/need)*100)+'%';
    $('total-xp').textContent = state.totalXP;
    $('streak').textContent = state.streak;

    const list = curList();
    const done = list.filter(t=>t.done).length;
    $('progress-pill').textContent = done+'/'+list.length;
    $('list-title').textContent = view==='daily' ? 'Misiones de hoy' : 'Misiones de la semana';

    const tl = $('task-list'); tl.innerHTML='';
    list.forEach((t,i)=>{
      const card = document.createElement('div');
      card.className = 'card'+(t.done?' done':'')+(view==='weekly'?' weekly':'');
      const chk = document.createElement('button');
      chk.className = 'check'+(t.done?' on':'');
      chk.innerHTML = t.done?'\u2713':'';
      chk.setAttribute('aria-label', t.done?'Desmarcar':'Completar');
      chk.onclick = ()=>{
        t.done = !t.done;
        if(t.done){
          gainXP(t.xp);
          toast('\u2713 Mision completada \u00b7 +'+t.xp+' XP','xp');
          newQuote();
          if(A) A.sfx.complete();
          if(navigator.vibrate) navigator.vibrate(30);
        } else {
          loseXP(t.xp);
          if(A) A.sfx.tap();
        }
        save(); render();
      };
      const label = document.createElement('div');
      label.className = 'label';
      label.innerHTML = esc(t.n)+' <span class="xp-tag">+'+t.xp+'</span>'+
        (t.locked?' <span class="fixed-tag">\u00b7 fija</span>':'');
      card.appendChild(chk); card.appendChild(label);
      if(!t.locked){
        const del = document.createElement('button');
        del.className='icon-btn'; del.innerHTML='\u2715';
        del.setAttribute('aria-label','Eliminar');
        del.onclick = ()=>{
          if(A) A.sfx.tap();
          list.splice(i,1); save(); render();
        };
        card.appendChild(del);
      }
      tl.appendChild(card);
    });

    renderHistory();
    renderRewards();
  }

  function renderHistory(){
    const box = $('hist-bars'); box.innerHTML='';
    const days = [];
    for(let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      days.push({key:key, label:['D','L','M','X','J','V','S'][d.getDay()], xp:state.history[key]||0});
    }
    const max = Math.max(100, ...days.map(d=>d.xp));
    days.forEach(d=>{
      const wrap = document.createElement('div'); wrap.className='hist-bar';
      const val = document.createElement('div'); val.className='val';
      val.textContent = d.xp>0?d.xp:'';
      const bar = document.createElement('div'); bar.className='bar';
      bar.style.height = Math.max(3,(d.xp/max)*64)+'px';
      if(d.xp===0) bar.style.opacity='0.25';
      const day = document.createElement('div'); day.className='day';
      day.textContent = d.label;
      wrap.appendChild(val); wrap.appendChild(bar); wrap.appendChild(day);
      box.appendChild(wrap);
    });
  }

  function renderRewards(){
    const rl = $('reward-list'); rl.innerHTML='';
    state.rewards.forEach(r=>{
      const unlocked = state.level >= r.lvl;
      const card = document.createElement('div');
      card.className = 'card reward '+(r.claimed?'claimed':(unlocked?'ready':'locked'));
      const ic = document.createElement('span');
      ic.className='r-icon';
      ic.textContent = r.claimed?'\u2705':(unlocked?'\u{1F381}':'\u{1F512}');
      const label = document.createElement('div');
      label.className='label';
      label.innerHTML = esc(r.n)+' <span class="fixed-tag">\u00b7 Nv '+r.lvl+'</span>';
      card.appendChild(ic); card.appendChild(label);
      if(unlocked && !r.claimed){
        const btn = document.createElement('button');
        btn.className='reward-claim'; btn.textContent='Reclamar';
        btn.onclick = ()=>{
          r.claimed = true;
          toast('\u{1F381} Recompensa reclamada. Te la ganaste, cazador.','gold');
          if(A) A.sfx.reward();
          if(navigator.vibrate) navigator.vibrate([40,30,40]);
          save(); render();
        };
        card.appendChild(btn);
      }
      rl.appendChild(card);
    });
  }

  /* ---------- Tabs ---------- */
  $('tab-daily').onclick = ()=>{
    view='daily';
    $('tab-daily').classList.add('active'); $('tab-weekly').classList.remove('active');
    if(A) A.sfx.tap();
    render();
  };
  $('tab-weekly').onclick = ()=>{
    view='weekly';
    $('tab-weekly').classList.add('active'); $('tab-daily').classList.remove('active');
    if(A) A.sfx.tap();
    render();
  };

  /* ---------- Acciones ---------- */
  $('add-task').onclick = ()=>{
    const v = $('new-task').value.trim();
    if(!v) return;
    curList().push({n:v, xp:parseInt($('new-xp').value), done:false, locked:false});
    $('new-task').value='';
    if(A) A.sfx.thud();
    save(); render();
  };
  $('new-task').addEventListener('keydown', e=>{ if(e.key==='Enter') $('add-task').click(); });

  $('reset-day').onclick = ()=>{
    if(A) A.sfx.thud();
    const allDone = state.daily.length>0 && state.daily.every(t=>t.done);
    if(allDone){
      state.streak++;
      toast('\u{1F525} Dia perfecto! Racha: '+state.streak,'level');
    } else {
      state.streak = 0;
      toast('\u{1F480} Dia incompleto. El Sistema reinicia tu racha.','nag');
      if(A) A.sfx.error();
    }
    state.daily.forEach(t=>t.done=false);
    state.daily = state.daily.filter(t=>t.locked);
    state.daily = mergeFixed(state.daily, DEFAULT_DAILY);
    save(); render();
  };

  /* ---------- Controles de audio ---------- */
  function syncAudioButtons(){
    $('btn-music').classList.toggle('off', !state.settings.music);
    $('btn-sfx').classList.toggle('off', !state.settings.sfx);
  }
  $('btn-music').onclick = ()=>{
    state.settings.music = !state.settings.music;
    if(A) A.setMusic(state.settings.music);
    syncAudioButtons(); save();
  };
  $('btn-sfx').onclick = ()=>{
    state.settings.sfx = !state.settings.sfx;
    if(A){ A.setSfx(state.settings.sfx); if(state.settings.sfx) A.sfx.tap(); }
    syncAudioButtons(); save();
  };

  /* ---------- Notificaciones ---------- */
  let swReg = null;
  // El SW solo funciona bajo http(s); con file:// falla y se ignora sin romper nada.
  if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
    try{
      navigator.serviceWorker.register('sw.js')
        .then(reg=>{ swReg = reg; })
        .catch(()=>{ /* sin SW: las notificaciones usan el fallback directo */ });
    }catch(e){}
  }

  function refreshNotifBanner(){
    const banner = $('notif-banner');
    if(!('Notification' in window)){ banner.style.display='none'; return; }
    if(Notification.permission === 'granted'){
      banner.style.display='flex'; banner.classList.add('ok');
      $('notif-text').textContent = 'El Sistema te vigila. Alertas activas.';
      $('notif-btn').style.display='none';
    } else if(Notification.permission === 'denied'){
      banner.style.display='flex';
      $('notif-text').textContent = 'Notificaciones bloqueadas. Actívalas en Ajustes de Safari.';
      $('notif-btn').style.display='none';
    } else {
      banner.style.display='flex';
      $('notif-btn').style.display='block';
    }
  }
  $('notif-btn').onclick = async ()=>{
    if(A) A.sfx.tap();
    try{
      const p = await Notification.requestPermission();
      if(p==='granted'){
        toast('\u26A1 El Sistema ahora te vigila.','xp');
        pushNotif('\u10DC THE SYSTEM', 'Vigilancia activada. No habra escapatoria, cazador.');
      }
    }catch(e){}
    refreshNotifBanner();
  };

  function pushNotif(title, body){
    if(Notification.permission!=='granted') return;
    if(swReg && swReg.active){
      swReg.active.postMessage({type:'NAG', title:title, body:body});
    } else {
      try{ new Notification(title, {body:body, icon:'icon-192.png'}); }catch(e){}
    }
  }

  /* --- Ventana de sueno: 11:30 PM - 6:30 AM (no molestar) --- */
  function isSleepTime(){
    const d = new Date();
    const mins = d.getHours()*60 + d.getMinutes();
    const start = 23*60 + 30;  // 23:30
    const end   = 6*60 + 30;   // 06:30
    return (mins >= start) || (mins < end);
  }

  /* --- Regano anti-procrastinacion: cada 60s si hay pendientes --- */
  setInterval(()=>{
    if(isSleepTime()) return;
    const pending = state.daily.filter(t=>!t.done);
    if(!pending.length) return;
    const t = pending[Math.floor(Math.random()*pending.length)];
    const msg = NAG[Math.floor(Math.random()*NAG.length)].replace('{t}', t.n);
    if(Notification.permission==='granted') pushNotif('\u10DC THE SYSTEM', msg);
    else toast(msg,'nag');
  }, 60000);

  /* --- Recordatorio de checklist cada 3 horas --- */
  let last3h = Date.now();
  /* --- Aviso para dormir: 11:00 PM (30 min antes de las 11:30) --- */
  let bedtimeNotifiedDay = null;

  setInterval(()=>{
    const now = new Date();

    // Checklist cada 3h (fuera de la ventana de sueno)
    if(Date.now() - last3h >= 3*60*60*1000){
      last3h = Date.now();
      if(!isSleepTime()){
        const done = state.daily.filter(t=>t.done).length;
        const tot = state.daily.length;
        pushNotif('\u10DC Reporte del Sistema',
          'Revision de progreso: '+done+'/'+tot+' misiones hoy. Como vas, cazador?');
      }
    }

    // Aviso para dormir a las 23:00
    const mins = now.getHours()*60 + now.getMinutes();
    const dayKey = todayKey();
    if(now.getHours()===23 && now.getMinutes()>=0 && now.getMinutes()<5 && bedtimeNotifiedDay!==dayKey){
      bedtimeNotifiedDay = dayKey;
      pushNotif('\u10DC Protocolo de descanso',
        'En 30 min es hora de dormir (11:30 PM). Un cazador disciplinado respeta su horario. Cierra el dia.');
    }
  }, 60000);

  /* ============================================================
     INTRO EPICA
     ============================================================ */
  function spawnGlyphs(){
    const box = $('intro-glyphs');
    const chars = ['\u16A0','\u16A2','\u16B1','\u16C1','\u16D2','\u16DF','S','\u2726','\u2727'];
    for(let i=0;i<22;i++){
      const g = document.createElement('div');
      g.className='glyph';
      g.textContent = chars[Math.floor(Math.random()*chars.length)];
      g.style.left = Math.random()*100+'%';
      g.style.top  = (40+Math.random()*55)+'%';
      g.style.fontSize = (12+Math.random()*22)+'px';
      g.style.animationDelay = (0.5+Math.random()*2.5)+'s';
      box.appendChild(g);
    }
  }

  function runIntroSequence(){
    // El audio ya fue desbloqueado por el tap en INICIAR
    try{
      if(A){
        A.introStinger();
        A.startMusic();
        setTimeout(()=>{ try{ if(A) A.speakArise(); }catch(e){} }, 1850);
      }
    }catch(e){ /* el audio fallo pero la intro visual continua */ }
    try{ spawnGlyphs(); }catch(e){}
    if(navigator.vibrate) try{ navigator.vibrate([0,100,60,100,60,200]); }catch(e){}

    $('intro-prompt').style.display='none';
    $('intro-start').style.display='none';
    $('intro-skip').style.display='block';

    // Cierre automatico tras la secuencia
    introTimer = setTimeout(closeIntro, 4600);
  }

  let introTimer = null;
  function closeIntro(){
    if(introTimer){ clearTimeout(introTimer); introTimer=null; }
    const intro = $('intro');
    intro.classList.add('hide');
    setTimeout(()=>{ intro.style.display='none'; }, 800);
    newQuote();
  }

  $('intro-start').onclick = ()=>{
    // Gesto del usuario: desbloquea Web Audio
    try{
      if(A){
        A.unlock();
        A.setMusic(state.settings.music);
        A.setSfx(state.settings.sfx);
      }
    }catch(e){
      toast('No se pudo iniciar el audio en este navegador.','nag');
    }
    runIntroSequence();
  };
  $('intro-skip').onclick = ()=>{
    if(A) A.sfx.tap();
    closeIntro();
  };

  /* ============================================================
     INIT
     ============================================================ */
  load();
  syncAudioButtons();
  render();
  refreshNotifBanner();

  // Pre-cargar voces de speechSynthesis (algunos navegadores las cargan async)
  if('speechSynthesis' in window){ window.speechSynthesis.getVoices(); }
})();
