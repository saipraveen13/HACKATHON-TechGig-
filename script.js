(function(){
  // ---------- Utilities ----------
  const $ = sel => document.querySelector(sel);
  const modeEl = $("#mode");
  const features = {
    "portrait-primary": $("#alarmCard"),
    "portrait-secondary": $("#timerCard"),
    "landscape-primary": $("#stopwatchCard"),
    "landscape-secondary": $("#weatherCard"),
  };
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let motionPermGranted = false;

  function bell(duration=2000){
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = "sine";
    let t = audioCtx.currentTime;
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(440, t + duration/2000);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration/1000);
    o.start(); o.stop(t + duration/1000 + 0.05);
    if (navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
  }

  // ---------- Orientation detection ----------
  let lastComputed = null;
  let gravity = {x:0,y:0,z:0};
  let usingSim = false;

  function computeOrientation(){
    // Prefer Screen Orientation API if available
    let type = null;
    if (screen.orientation && screen.orientation.type){
      type = screen.orientation.type;
      // Normalize: e.g., "portrait-primary", "portrait-secondary", "landscape-primary", "landscape-secondary"
    } else if (typeof window.orientation === "number"){
      const ang = window.orientation; // 0, 90, -90, 180
      if (ang === 0) type = "portrait-primary";
      else if (ang === 180) type = "portrait-secondary";
      else if (ang === 90) type = "landscape-primary";
      else if (ang === -90) type = "landscape-secondary";
    }

    // Fallback: infer from aspect + gravity Y sign for upside-down
    if (!type){
      const isPortrait = window.innerHeight >= window.innerWidth;
      if (isPortrait){
        // when upside down, gravity y is positive (top of device points down)
        type = gravity.y > 0.5 ? "portrait-secondary" : "portrait-primary";
      } else {
        // landscape: use gravity x sign to split primary/secondary
        type = gravity.x > 0 ? "landscape-secondary" : "landscape-primary";
      }
    }
    return type;
  }

  function applyMode(type){
    if (!type) return;
    if (lastComputed === type) return;
    lastComputed = type;
    modeEl.textContent = labelFor(type);
    for (const k in features){
      features[k].classList.toggle("hidden", k !== type);
    }
  }

  function labelFor(type){
    switch(type){
      case "portrait-primary": return "Portrait ↑ — Alarm Clock";
      case "portrait-secondary": return "Portrait ↓ — Timer";
      case "landscape-primary": return "Landscape ⟲ — Stopwatch";
      case "landscape-secondary": return "Landscape ⟳ — Weather";
      default: return "Detecting…";
    }
  }

  function requestMotionPermissionIfNeeded() {
    const needs = typeof DeviceMotionEvent !== "undefined" &&
                  typeof DeviceMotionEvent.requestPermission === "function" &&
                  !motionPermGranted;
    $("#motion-perm").style.display = needs ? "flex" : "none";
    return needs;
  }

  async function grantMotionPermission(){
    try{
      const state = await DeviceMotionEvent.requestPermission();
      motionPermGranted = state === "granted";
    }catch(e){
      console.warn("Motion permission request failed", e);
    }finally{
      requestMotionPermissionIfNeeded();
    }
  }

  // Listeners
  window.addEventListener("resize", ()=>applyMode(computeOrientation()));
  window.addEventListener("orientationchange", ()=>applyMode(computeOrientation()));
  if ("ondeviceorientationabsolute" in window || "ondeviceorientation" in window){
    window.addEventListener("deviceorientation", (ev)=>{
      // Use this mostly to wake permissions; gravity handled by devicemotion
      applyMode(computeOrientation());
    });
  }
  if ("ondevicemotion" in window){
    window.addEventListener("devicemotion", (ev)=>{
      if (ev.accelerationIncludingGravity){
        const a = ev.accelerationIncludingGravity;
        gravity.x = a.x / 9.81;
        gravity.y = a.y / 9.81;
        gravity.z = a.z / 9.81;
        applyMode(computeOrientation());
      }
    });
  }

  $("#grantMotion")?.addEventListener("click", async ()=>{
    await grantMotionPermission();
  });

  // Simulation buttons (handy for desktop testing)
  $("#simulatePortraitPrimary").addEventListener("click",()=>{ usingSim=true; applyMode("portrait-primary"); });
  $("#simulatePortraitSecondary").addEventListener("click",()=>{ usingSim=true; applyMode("portrait-secondary"); });
  $("#simulateLandscapePrimary").addEventListener("click",()=>{ usingSim=true; applyMode("landscape-primary"); });
  $("#simulateLandscapeSecondary").addEventListener("click",()=>{ usingSim=true; applyMode("landscape-secondary"); });

  // Initial state
  requestMotionPermissionIfNeeded();
  setTimeout(()=>applyMode(computeOrientation()), 150);

  // ---------- Live Clock (Alarm view) ----------
  const clockNow = $("#clockNow");
  function pad(n, len=2){ return String(n).padStart(len,"0"); }
  function updateClock(){
    const d = new Date();
    const s = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    clockNow.textContent = s;
    requestAnimationFrame(updateClock);
  }
  updateClock();

  // ---------- Alarm ----------
  let alarmAt = null;
  const alarmStatus = $("#alarmStatus");
  $("#setAlarm").addEventListener("click", ()=>{
    const v = $("#alarmTime").value;
    if (!v){ alarmStatus.textContent = "Pick a time"; return; }
    const [hh, mm] = v.split(":").map(x=>parseInt(x,10));
    const now = new Date();
    let target = new Date(now);
    target.setHours(hh, mm, 0, 0);
    if (target <= now) target.setDate(target.getDate()+1); // next day
    alarmAt = target.getTime();
    alarmStatus.textContent = "Set for " + target.toLocaleTimeString();
  });
  $("#clearAlarm").addEventListener("click", ()=>{
    alarmAt = null; alarmStatus.textContent = "No alarm set";
  });
  $("#snooze").addEventListener("click", ()=>{
    if (!alarmAt) return;
    alarmAt = Date.now() + 5*60*1000;
    alarmStatus.textContent = "Snoozed for 5 minutes";
  });
  $("#testAlarm").addEventListener("click", ()=> bell(1500));

  setInterval(()=>{
    if (alarmAt && Date.now() >= alarmAt){
      bell(2500); alarmAt = null;
      alarmStatus.textContent = "Alarm!";
    }
  }, 500);

  // ---------- Timer ----------
  const timerReadout = $("#timerReadout");
  const timerStatus = $("#timerStatus");
  let tRemain = 30_000, tRunning = false, tLast = null, tRAF = null;

  function fmtMillis(ms){
    ms = Math.max(0, ms|0);
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000)/1000);
    const ms3 = ms % 1000;
    return `${pad(m)}:${pad(s)}.${String(ms3).padStart(3,"0")}`;
  }

  function timerLoop(ts){
    if (!tRunning){ tRAF=null; return; }
    if (tLast==null) tLast = ts;
    const dt = ts - tLast; tLast = ts;
    tRemain -= dt;
    timerReadout.textContent = fmtMillis(tRemain);
    if (tRemain <= 0){
      tRunning=false; tRAF=null; tLast=null; timerStatus.textContent="Done";
      bell(2000);
      return;
    }
    tRAF = requestAnimationFrame(timerLoop);
  }

  $("#startTimer").addEventListener("click", ()=>{
    const m = parseInt($("#timerMin").value||"0",10);
    const s = parseInt($("#timerSec").value||"0",10);
    if (!tRunning && tRemain<=0) tRemain = 0;
    if (!tRunning && (m>0 || s>0)){
      tRemain = (m*60 + s) * 1000;
    }
    if (!tRunning){
      tRunning = true; timerStatus.textContent="Running"; tLast=null;
      tRAF = requestAnimationFrame(timerLoop);
    }
  });
  $("#pauseTimer").addEventListener("click", ()=>{
    tRunning=false; timerStatus.textContent="Paused";
  });
  $("#resetTimer").addEventListener("click", ()=>{
    tRunning=false; tLast=null; tRemain = (parseInt($("#timerMin").value||"0",10)*60 + parseInt($("#timerSec").value||"0",10))*1000;
    timerReadout.textContent = fmtMillis(tRemain);
    timerStatus.textContent="Idle";
  });
  $("#testTimer").addEventListener("click", ()=> bell(800));

  // ---------- Stopwatch ----------
  const swReadout = $("#swReadout");
  const swStatus = $("#swStatus");
  let swStartT = 0, swAcc = 0, swTick=null, swLaps=[];

  function swUpdate(){
    const now = performance.now();
    const elapsed = swAcc + (swStartT? now - swStartT : 0);
    swReadout.textContent = fmtMillis(elapsed);
    swTick = requestAnimationFrame(swUpdate);
  }
  $("#swStart").addEventListener("click", ()=>{
    if (!swStartT){ swStartT = performance.now(); }
    if (!swTick) swTick = requestAnimationFrame(swUpdate);
    swStatus.textContent="Running";
  });
  $("#swStop").addEventListener("click", ()=>{
    if (swStartT){
      swAcc += performance.now() - swStartT;
      swStartT = 0;
    }
    if (swTick){ cancelAnimationFrame(swTick); swTick=null; }
    swStatus.textContent="Stopped";
  });
  $("#swReset").addEventListener("click", ()=>{
    swStartT = 0; swAcc = 0; swReadout.textContent="00:00.000";
    if (swTick){ cancelAnimationFrame(swTick); swTick=null; }
    swStatus.textContent="Ready";
    swLaps=[]; $("#laps").innerHTML="";
  });
  $("#swLap").addEventListener("click", ()=>{
    const t = swReadout.textContent;
    swLaps.push(t);
    const el = document.createElement("div");
    el.className="row";
    el.innerHTML = `<span class="hint">Lap ${swLaps.length}</span><div style="font-weight:800">${t}</div>`;
    $("#laps").prepend(el);
  });

  // ---------- Weather (Open-Meteo) ----------
  const wEmoji = $("#wEmoji"), wPlace=$("#wPlace"), wDesc=$("#wDesc"), wTemp=$("#wTemp"), wRange=$("#wRange");
  const refreshBtn = $("#refreshWeather");
  const weatherMap = {
    // Basic mapping of Open-Meteo WMO codes
    0:["Clear","☀️"], 1:["Mainly clear","🌤️"], 2:["Partly cloudy","⛅"], 3:["Overcast","☁️"],
    45:["Fog","🌫️"], 48:["Depositing rime fog","🌫️"],
    51:["Light drizzle","🌦️"], 53:["Moderate drizzle","🌦️"], 55:["Dense drizzle","🌧️"],
    61:["Slight rain","🌧️"], 63:["Moderate rain","🌧️"], 65:["Heavy rain","🌧️"],
    71:["Slight snow","❄️"], 73:["Moderate snow","❄️"], 75:["Heavy snow","❄️"],
    80:["Rain showers","🌧️"], 81:["Rain showers","🌧️"], 82:["Violent rain showers","⛈️"],
    95:["Thunderstorm","⛈️"], 96:["Thunderstorm w/ hail","⛈️"], 99:["Thunderstorm w/ hail","⛈️"]
  };

  async function getWeather(){
    wPlace.textContent = "Locating…";
    try{
      const pos = await new Promise((res, rej)=>{
        if (!navigator.geolocation) rej(new Error("Geolocation not available"));
        navigator.geolocation.getCurrentPosition(res, rej, {enableHighAccuracy:true, timeout:10000, maximumAge:60000});
      });
      const {latitude:lat, longitude:lon} = pos.coords;
      wPlace.textContent = lat.toFixed(3) + ", " + lon.toFixed(3);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const r = await fetch(url);
      const data = await r.json();
      const code = (data.current && data.current.weather_code) ?? (data.daily?.weather_code?.[0] ?? 0);
      const [desc, emo] = weatherMap[code] || ["Weather","🌍"];
      const t = (data.current && data.current.temperature_2m) ?? null;
      const hi = data.daily?.temperature_2m_max?.[0] ?? null;
      const lo = data.daily?.temperature_2m_min?.[0] ?? null;
      wEmoji.textContent = emo;
      wDesc.textContent = desc;
      wTemp.textContent = (t!==null? Math.round(t)+"°" : "--°");
      wRange.textContent = `H ${hi!==null?Math.round(hi):"--"}° / L ${lo!==null?Math.round(lo):"--"}°`;
    }catch(e){
      wPlace.textContent = "Location blocked";
      wDesc.textContent = "Cannot fetch weather without location access";
      wTemp.textContent = "--°"; wRange.textContent = "H --° / L --°";
    }
  }
  refreshBtn.addEventListener("click", getWeather);

  // kick weather on load (user can refresh if denied)
  getWeather();

  // ------ Progressive Enhancement: show current feature only ------
  function refreshVisibility(){
    // Hide all features initially; applyMode toggles
    for (const k in features) features[k].classList.add("hidden");
    applyMode(computeOrientation());
  }
  refreshVisibility();

  // Handle page visibility (suspend audio context on background)
  document.addEventListener("visibilitychange",()=>{
    if (document.hidden){
      if (audioCtx.state === "running") audioCtx.suspend();
    }else{
      if (audioCtx.state !== "running") audioCtx.resume();
    }
  });

})();