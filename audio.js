/* ============================================================
   THE SYSTEM — Motor de audio sintetico (Web Audio API)
   Sin archivos externos: funciona 100% offline.
   ============================================================ */
(function(){
  'use strict';

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicOn = true;
  let sfxOn = true;
  let musicLoop = null;
  let musicStarted = false;

  function ensureCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.0;
      musicGain.connect(masterGain);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.7;
      sfxGain.connect(masterGain);
    }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- Utilidades de sintesis ---------- */
  function tone(freq, start, dur, type, peak, target){
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(target || sfxGain);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  function noiseBurst(start, dur, peak, target, filterFreq){
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<len;i++) data[i] = (Math.random()*2-1) * (1 - i/len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = filterFreq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(flt); flt.connect(g); g.connect(target || sfxGain);
    src.start(start);
  }

  /* ---------- Efectos de sonido (estilo Solo Leveling) ---------- */
  const SFX = {
    // Sonido al completar mision: campana ascendente brillante
    complete(){
      if(!sfxOn) return; ensureCtx();
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f,i)=>{
        tone(f, t + i*0.06, 0.5, 'triangle', 0.35);
      });
    },
    // Tap de boton: click cristalino corto
    tap(){
      if(!sfxOn) return; ensureCtx();
      const t = ctx.currentTime;
      tone(880, t, 0.12, 'square', 0.12);
      tone(1320, t + 0.02, 0.1, 'sine', 0.08);
    },
    // Boton primario / accion importante: golpe con cuerpo
    thud(){
      if(!sfxOn) return; ensureCtx();
      const t = ctx.currentTime;
      noiseBurst(t, 0.18, 0.4, sfxGain, 400);
      tone(110, t, 0.25, 'sine', 0.4);
    },
    // Subir de nivel: fanfarria epica
    levelup(){
      if(!sfxOn) return; ensureCtx();
      const t = ctx.currentTime;
      noiseBurst(t, 0.4, 0.5, sfxGain, 600);
      const chord = [261.63, 329.63, 392.00, 523.25];
      chord.forEach(f => tone(f, t + 0.05, 1.4, 'sawtooth', 0.18));
      [392.00, 523.25, 659.25, 783.99, 1046.5].forEach((f,i)=>{
        tone(f, t + 0.35 + i*0.1, 0.9, 'triangle', 0.3);
      });
    },
    // Recompensa reclamada: brillo magico
    reward(){
      if(!sfxOn) return; ensureCtx();
      const t = ctx.currentTime;
      [1046.5, 1318.5, 1568, 2093].forEach((f,i)=>{
        tone(f, t + i*0.05, 0.6, 'sine', 0.22);
      });
    },
    // Error / regano del Sistema: tono grave de alerta
    error(){
      if(!sfxOn) return; ensureCtx();
      const t = ctx.currentTime;
      tone(146.83, t, 0.3, 'sawtooth', 0.3);
      tone(138.59, t + 0.18, 0.4, 'sawtooth', 0.3);
    }
  };

  /* ---------- Voz "ARISE" sintetizada ---------- */
  function speakArise(){
    ensureCtx();
    // Intento 1: voz real del navegador (mas dramatica)
    if('speechSynthesis' in window){
      try{
        const u = new SpeechSynthesisUtterance('Arise');
        u.rate = 0.62;
        u.pitch = 0.45;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
        return;
      }catch(e){}
    }
    // Fallback: barrido sintetico grave y resonante
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 1.7);
  }

  /* ---------- Stinger de intro: golpe epico + coro ---------- */
  function introStinger(){
    ensureCtx();
    const t = ctx.currentTime;
    // Impacto grave
    noiseBurst(t, 0.6, 0.6, masterGain, 500);
    tone(55, t, 0.9, 'sine', 0.55, masterGain);
    // Acorde de coro (menor, oscuro)
    const choir = [110, 130.81, 164.81, 220, 261.63];
    choir.forEach(f=>{
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 5; lfoG.gain.value = 2.5;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      const flt = ctx.createBiquadFilter();
      flt.type='lowpass'; flt.frequency.value = 1200;
      o.connect(flt); flt.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + 2.8);
      lfo.start(t); lfo.stop(t + 2.8);
    });
  }

  /* ---------- Musica de fondo: epica oscura en loop ---------- */
  // Progresion en La menor, tambores + bajo + pad de coro + arpegios
  function startMusic(){
    ensureCtx();
    if(musicStarted) return;
    musicStarted = true;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(musicOn ? 0.34 : 0.0, ctx.currentTime + 2);

    const bpm = 84;
    const beat = 60 / bpm;
    const barLen = beat * 4;

    // Progresion (Am - F - C - G) en frecuencias de bajo
    const prog = [
      {root:55.00, chord:[110,130.81,164.81]},   // Am
      {root:43.65, chord:[87.31,110,130.81]},    // F
      {root:65.41, chord:[130.81,164.81,196]},   // C
      {root:49.00, chord:[98,123.47,146.83]}     // G
    ];

    function scheduleBar(barTime, prog_i){
      const p = prog[prog_i % prog.length];

      // --- Tambor grave en cada beat ---
      for(let b=0;b<4;b++){
        const tb = barTime + b*beat;
        noiseBurst(tb, 0.16, b%2===0?0.34:0.2, musicGain, 220);
        tone(p.root, tb, 0.3, 'sine', b%2===0?0.32:0.18, musicGain);
      }
      // Redoble sutil en el ultimo beat
      for(let s=0;s<4;s++){
        noiseBurst(barTime + 3*beat + s*(beat/4), 0.06, 0.08, musicGain, 1800);
      }

      // --- Bajo pulsante ---
      [0,1.5,2.5,3].forEach(off=>{
        tone(p.root, barTime + off*beat, 0.4, 'sawtooth', 0.16, musicGain);
      });

      // --- Pad de coro sostenido ---
      p.chord.forEach(f=>{
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type='sawtooth'; o.frequency.value=f;
        const flt = ctx.createBiquadFilter();
        flt.type='lowpass'; flt.frequency.value=900;
        g.gain.setValueAtTime(0.0001, barTime);
        g.gain.linearRampToValueAtTime(0.07, barTime + barLen*0.3);
        g.gain.linearRampToValueAtTime(0.0001, barTime + barLen);
        o.connect(flt); flt.connect(g); g.connect(musicGain);
        o.start(barTime); o.stop(barTime + barLen + 0.1);
      });

      // --- Arpegio cristalino encima (melodia) ---
      const arp = [p.chord[0]*4, p.chord[2]*2, p.chord[1]*4, p.chord[2]*4,
                   p.chord[0]*4, p.chord[2]*4, p.chord[1]*2, p.chord[2]*2];
      arp.forEach((f,i)=>{
        tone(f, barTime + i*(beat/2), 0.45, 'triangle', 0.06, musicGain);
      });
    }

    let bar = 0;
    let nextBarTime = ctx.currentTime + 0.15;
    function tick(){
      const ahead = ctx.currentTime + 1.0;
      while(nextBarTime < ahead){
        scheduleBar(nextBarTime, bar);
        nextBarTime += barLen;
        bar++;
      }
    }
    tick();
    musicLoop = setInterval(tick, 250);
  }

  function setMusic(on){
    musicOn = on;
    if(!ctx) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(on ? 0.34 : 0.0, ctx.currentTime + 0.6);
  }
  function setSfx(on){ sfxOn = on; }

  /* ---------- API publica ---------- */
  window.SystemAudio = {
    unlock: ensureCtx,
    sfx: SFX,
    speakArise: speakArise,
    introStinger: introStinger,
    startMusic: startMusic,
    setMusic: setMusic,
    setSfx: setSfx,
    isMusicOn: ()=>musicOn,
    isSfxOn: ()=>sfxOn
  };
})();
