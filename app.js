/* ============================================================
   THE SYSTEM v1.1.0 — By Kevin V.
   Logica principal
   ============================================================ */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const A = window.SystemAudio;
  const VERSION = '1.1.0';

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

  // misiones fijas: cada una puede otorgar puntos de atributo
  const DEFAULT_DAILY = [
    {n:"Hacer ejercicio", xp:50, attr:"str", done:false, locked:true},
    {n:"Leer", xp:25, attr:"int", done:false, locked:true},
    {n:"Hacer aseo", xp:25, attr:"sta", done:false, locked:true},
    {n:"Cocinar", xp:25, attr:"vit", done:false, locked:true},
    {n:"Tareas de la universidad", xp:50, attr:"int", done:false, locked:true}
  ];

  const DEFAULT_WEEKLY = [
    {n:"Entrenar 4+ dias esta semana", xp:150, attr:"str", done:false, locked:true},
    {n:"Terminar un libro o capitulo grande", xp:120, attr:"int", done:false, locked:true},
    {n:"Limpieza profunda del cuarto", xp:100, attr:"sta", done:false, locked:true},
    {n:"Adelantar un proyecto importante", xp:150, attr:"int", done:false, locked:true}
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

  // Inventario: items que se desbloquean al alcanzar X XP total
  const INVENTORY = [
    {n:"Espada del Novato", emoji:"\u{1F5E1}\uFE0F", xp:100},
    {n:"Escudo de Hierro", emoji:"\u{1F6E1}\uFE0F", xp:250},
    {n:"Hoja de Esmeralda", emoji:"\u{1F343}", xp:450},
    {n:"Anillo de Luna", emoji:"\u{1F48D}", xp:700},
    {n:"Rubi de Llama", emoji:"\u{1F48E}", xp:1000},
    {n:"Pluma de Fenix", emoji:"\u{1FAB6}", xp:1400},
    {n:"Corona del Cazador", emoji:"\u{1F451}", xp:1900},
    {n:"Reliquia del Monarca", emoji:"\u{1F52E}", xp:2500}
  ];

  const ATTR_INFO = {
    str:{name:"Fuerza",       color:"#ff6b5b", icon:"\u26A1"},
    int:{name:"Inteligencia", color:"#9d8bff", icon:"\u{1F9E0}"},
    sta:{name:"Resistencia",  color:"#5bb8ff", icon:"\u{1F6E1}"},
    spd:{name:"Velocidad",    color:"#3ddc8a", icon:"\u{1F3C3}"},
    vit:{name:"Vitalidad",    color:"#ff8fc7", icon:"\u2764"}
  };
  const ATTR_PER_TASK = 5;  // puntos de atributo por mision completada

  /* ---------- Estado + persistencia ---------- */
  let state = {
    level:1, totalXP:0, streak:0, bestStreak:0,
    daily:JSON.parse(JSON.stringify(DEFAULT_DAILY)),
    weekly:JSON.parse(JSON.stringify(DEFAULT_WEEKLY)),
    rewards:JSON.parse(JSON.stringify(DEFAULT_REWARDS)),
    attrs:{str:0,int:0,sta:0,spd:0,vit:0},
    history:{},
    settings:{music:true, sfx:true},
    version:VERSION
  };

  function load(){
    try{
      const raw = localStorage.getItem('system_state_v3');
      if(raw) state = JSON.parse(raw);
      else {
        // migrar desde v2 si existe
        const old = localStorage.getItem('system_state_v2');
        if(old){
          const o = JSON.parse(old);
          state.level=o.level||1; state.totalXP=o.totalXP||0;
          state.streak=o.streak||0; state.history=o.history||{};
          state.settings=o.settings||{music:true,sfx:true};
        }
      }
    }catch(e){}
    state.daily   = mergeFixed(state.daily,  DEFAULT_DAILY);
    state.weekly  = mergeFixed(state.weekly, DEFAULT_WEEKLY);
    if(!state.rewards)  state.rewards  = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
    if(!state.history)  state.history  = {};
    if(!state.settings) state.settings = {music:true, sfx:true};
    if(!state.attrs)    state.attrs    = {str:0,int:0,sta:0,spd:0,vit:0};
    if(typeof state.bestStreak!=='number') state.bestStreak = 0;
    state.version = VERSION;
  }
  function save(){
    try{ localStorage.setItem('system_state_v3', JSON.stringify(state)); }catch(e){}
  }
  function mergeFixed(list, defs){
    const d = JSON.parse(JSON.stringify(defs));
    const fixed = d.map(def=>{
      const ex = (list||[]).find(t=>t.n===def.n);
      return ex ? {n:def.n, xp:def.xp, attr:def.attr, done:!!ex.done, locked:true} : def;
    });
    const custom = (list||[]).filter(t=>!t.locked);
    return fixed.concat(custom);
  }

  function todayKey(){
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  /* ---------- Logica RPG (XP 25% mas lento: 133 por nivel) ---------- */
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
    const prevXP = state.totalXP;
    state.totalXP += amt;
    const k = todayKey();
    state.history[k] = (state.history[k]||0) + amt;
    const before = state.level;
    while(curLevelXP() >= xpForLevel(state.level)) state.level++;
    if(state.level > before) showLevelUp(before);
    checkInventory(prevXP, state.totalXP);
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

  function checkInventory(prevXP, newXP){
    INVENTORY.forEach(it=>{
      if(prevXP < it.xp && newXP >= it.xp){
        toast('\u{1F4E6} Item desbloqueado: '+it.n+' '+it.emoji,'gold');
        if(A) A.sfx.unlock();
      }
    });
  }

  function newQuote(){
    const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
    $('quote-text').textContent = '"'+q.t+'"';
    $('quote-src').textContent = '\u2014 '+q.s;
  }

  function toast(msg, cls){
    const el = document.createElement('div');
    el.className = 'toast '+(cls||'xp');
    el.textContent = msg;
    $('toast').appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; }, 4000);
    setTimeout(()=> el.remove(), 4400);
  }

  /* ---------- Tira de dias de la semana ---------- */
  function renderWeekStrip(){
    const strip = $('week-strip'); strip.innerHTML='';
    const names = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'];
    const today = new Date();
    const dow = today.getDay();
    for(let i=0;i<7;i++){
      const d = new Date(today);
      d.setDate(today.getDate() - dow + i);
      const cell = document.createElement('div');
      cell.className = 'day-cell'+(i===dow?' today':'');
      cell.innerHTML = '<div class="dn">'+names[i]+'</div><div class="dd">'+d.getDate()+'</div>';
      strip.appendChild(cell);
    }
  }

  /* ---------- Atributos ---------- */
  function renderAttrs(){
    const box = $('attrs'); box.innerHTML='';
    const maxVal = Math.max(50, ...Object.values(state.attrs));
    ['str','int','sta','spd','vit'].forEach(key=>{
      const info = ATTR_INFO[key];
      const val = state.attrs[key]||0;
      const row = document.createElement('div');
      row.className='attr';
      row.innerHTML =
        '<div class="ic" style="background:'+info.color+'33;color:'+info.color+'">'+info.icon+'</div>'+
        '<div class="nm">'+info.name+'</div>'+
        '<div class="tk"><div class="fl" style="width:'+Math.min(100,(val/maxVal)*100)+'%;background:'+info.color+'"></div></div>'+
        '<div class="vl" style="color:'+info.color+'">'+val+'</div>';
      box.appendChild(row);
    });
  }

  /* ---------- Vista activa ---------- */
  let view = 'daily';
  function curList(){ return view==='daily' ? state.daily : state.weekly; }

  function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function render(){
    $('level-num').textContent = state.level;
    $('rank-label').textContent = rankFor(state.level);
    const need = xpForLevel(state.level), have = curLevelXP();
    $('xp-label').textContent = have+' / '+need+' XP';
    $('xp-fill').style.width = Math.min(100,(have/need)*100)+'%';
    $('total-xp').textContent = state.totalXP;
    $('streak').textContent = state.streak;
    $('best-streak').textContent = state.bestStreak;

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
          if(t.attr && ATTR_INFO[t.attr]){
            state.attrs[t.attr] = (state.attrs[t.attr]||0) + ATTR_PER_TASK;
            toast('\u2713 +'+t.xp+' XP \u00b7 +'+ATTR_PER_TASK+' '+ATTR_INFO[t.attr].name,'xp');
            if(A){ A.sfx.complete(); setTimeout(()=>{ try{A.sfx.attr();}catch(e){} },250); }
          } else {
            toast('\u2713 Mision completada \u00b7 +'+t.xp+' XP','xp');
            if(A) A.sfx.complete();
          }
          newQuote();
          if(navigator.vibrate) navigator.vibrate(30);
        } else {
          loseXP(t.xp);
          if(t.attr && ATTR_INFO[t.attr]){
            state.attrs[t.attr] = Math.max(0,(state.attrs[t.attr]||0) - ATTR_PER_TASK);
          }
          if(A) A.sfx.tap();
        }
        save(); render();
      };
      const label = document.createElement('div');
      label.className = 'label';
      let attrTag = '';
      if(t.attr && ATTR_INFO[t.attr]){
        const ai = ATTR_INFO[t.attr];
        attrTag = ' <span class="attr-tag" style="background:'+ai.color+'33;color:'+ai.color+'">'+ai.icon+' '+ai.name+'</span>';
      }
      label.innerHTML = esc(t.n)+' <span class="xp-tag">+'+t.xp+'</span>'+
        (t.locked?' <span class="fixed-tag">\u00b7 fija</span>':'')+attrTag;
      card.appendChild(chk); card.appendChild(label);
      if(!t.locked){
        const del = document.createElement('button');
        del.className='icon-btn'; del.innerHTML='\u2715';
        del.setAttribute('aria-label','Eliminar');
        del.onclick = ()=>{ if(A) A.sfx.tap(); list.splice(i,1); save(); render(); };
        card.appendChild(del);
      }
      tl.appendChild(card);
    });

    renderAttrs();
    renderHistory();
    renderInventory();
    renderRewards();
  }

  function renderHistory(){
    const box = $('hist-bars'); box.innerHTML='';
    const days = [];
    for(let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      days.push({label:['D','L','M','X','J','V','S'][d.getDay()], xp:state.history[key]||0});
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

  function renderInventory(){
    const grid = $('inv-grid'); grid.innerHTML='';
    let unlocked = 0;
    INVENTORY.forEach(it=>{
      const isUnlocked = state.totalXP >= it.xp;
      if(isUnlocked) unlocked++;
      const cell = document.createElement('div');
      cell.className = 'inv-item '+(isUnlocked?'unlocked':'locked');
      cell.innerHTML =
        '<div class="lock">'+(isUnlocked?'\u2705':'\u{1F512}')+'</div>'+
        '<div class="emoji">'+it.emoji+'</div>'+
        '<div class="nm">'+esc(it.n)+'</div>'+
        '<div class="req">'+(isUnlocked?'DESBLOQUEADO':it.xp+' XP')+'</div>';
      grid.appendChild(cell);
    });
    $('inv-count').textContent = unlocked+'/'+INVENTORY.length;
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
    const attr = $('new-attr').value || null;
    curList().push({n:v, xp:parseInt($('new-xp').value), attr:attr, done:false, locked:false});
    $('new-task').value='';
    $('new-attr').value='';
    if(A) A.sfx.thud();
    save(); render();
  };
  $('new-task').addEventListener('keydown', e=>{ if(e.key==='Enter') $('add-task').click(); });

  $('reset-day').onclick = ()=>{
    if(A) A.sfx.thud();
    const allDone = state.daily.length>0 && state.daily.every(t=>t.done);
    if(allDone){
      state.streak++;
      if(state.streak > state.bestStreak) state.bestStreak = state.streak;
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

  /* ---------- Pomodoro ---------- */
  let pomoMin = 25, pomoSec = 25*60, pomoTimer = null, pomoRunning = false;
  function fmtTime(s){
    const m = Math.floor(s/60), ss = s%60;
    return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0');
  }
  function renderPomo(){
    $('pomo-time').textContent = fmtTime(pomoSec);
    $('pomo-time').classList.toggle('running', pomoRunning);
    $('pomo-state').textContent = pomoRunning ? 'CONCENTRACION ACTIVA' :
      (pomoSec===pomoMin*60 ? 'LISTO PARA ENFOCARSE' : 'EN PAUSA');
    $('pomo-start').textContent = pomoRunning ? 'PAUSAR' : 'INICIAR';
  }
  document.querySelectorAll('.pomo-presets button').forEach(b=>{
    b.onclick = ()=>{
      if(pomoRunning) return;
      document.querySelectorAll('.pomo-presets button').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      pomoMin = parseInt(b.dataset.min);
      pomoSec = pomoMin*60;
      if(A) A.sfx.tap();
      renderPomo();
    };
  });
  $('pomo-start').onclick = ()=>{
    if(A) A.sfx.tap();
    if(pomoRunning){
      pomoRunning = false;
      clearInterval(pomoTimer);
      renderPomo();
    } else {
      pomoRunning = true;
      renderPomo();
      pomoTimer = setInterval(()=>{
        pomoSec--;
        if(pomoSec<=0){
          clearInterval(pomoTimer);
          pomoRunning = false;
          // recompensa: 2 XP por minuto enfocado + Inteligencia
          const reward = pomoMin*2;
          gainXP(reward);
          state.attrs.int = (state.attrs.int||0) + Math.round(pomoMin/5);
          toast('\u{1F3AF} Sesion completada! +'+reward+' XP de concentracion','level');
          if(A) A.sfx.timerDone();
          if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
          pomoSec = pomoMin*60;
          save(); render();
        }
        renderPomo();
      }, 1000);
    }
  };
  $('pomo-reset').onclick = ()=>{
    if(A) A.sfx.tap();
    pomoRunning = false;
    clearInterval(pomoTimer);
    pomoSec = pomoMin*60;
    renderPomo();
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
  if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
    try{
      navigator.serviceWorker.register('sw.js')
        .then(reg=>{ swReg = reg; })
        .catch(()=>{});
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

  function isSleepTime(){
    const d = new Date();
    const mins = d.getHours()*60 + d.getMinutes();
    const start = 23*60 + 30;
    const end   = 6*60 + 30;
    return (mins >= start) || (mins < end);
  }

  setInterval(()=>{
    if(isSleepTime()) return;
    const pending = state.daily.filter(t=>!t.done);
    if(!pending.length) return;
    const t = pending[Math.floor(Math.random()*pending.length)];
    const msg = NAG[Math.floor(Math.random()*NAG.length)].replace('{t}', t.n);
    if(Notification.permission==='granted') pushNotif('\u10DC THE SYSTEM', msg);
    else toast(msg,'nag');
  }, 60000);

  let last3h = Date.now();
  let bedtimeNotifiedDay = null;
  setInterval(()=>{
    const now = new Date();
    if(Date.now() - last3h >= 3*60*60*1000){
      last3h = Date.now();
      if(!isSleepTime()){
        const done = state.daily.filter(t=>t.done).length;
        const tot = state.daily.length;
        pushNotif('\u10DC Reporte del Sistema',
          'Revision de progreso: '+done+'/'+tot+' misiones hoy. Como vas, cazador?');
      }
    }
    const dayKey = todayKey();
    if(now.getHours()===23 && now.getMinutes()<5 && bedtimeNotifiedDay!==dayKey){
      bedtimeNotifiedDay = dayKey;
      pushNotif('\u10DC Protocolo de descanso',
        'En 30 min es hora de dormir (11:30 PM). Un cazador disciplinado respeta su horario. Cierra el dia.');
    }
  }, 60000);

  /* ---------- INTRO EPICA ---------- */
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

  let introTimer = null;
  function runIntroSequence(){
    try{
      if(A){
        A.introStinger();
        A.startMusic();
        setTimeout(()=>{ try{ if(A) A.speakArise(); }catch(e){} }, 1850);
      }
    }catch(e){}
    try{ spawnGlyphs(); }catch(e){}
    if(navigator.vibrate) try{ navigator.vibrate([0,100,60,100,60,200]); }catch(e){}
    $('intro-prompt').style.display='none';
    $('intro-start').style.display='none';
    $('intro-skip').style.display='block';
    introTimer = setTimeout(closeIntro, 4800);
  }
  function closeIntro(){
    if(introTimer){ clearTimeout(introTimer); introTimer=null; }
    const intro = $('intro');
    intro.classList.add('hide');
    setTimeout(()=>{ intro.style.display='none'; }, 800);
    newQuote();
  }
  $('intro-start').onclick = ()=>{
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

  /* ---------- INIT ---------- */
  load();
  syncAudioButtons();
  renderWeekStrip();
  renderPomo();
  render();
  refreshNotifBanner();
  if('speechSynthesis' in window){ window.speechSynthesis.getVoices(); }
})();
