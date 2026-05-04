const ADMIN_CODE = "28041972*";
const DEFAULT_JOIN_CODE = "SKIPTON-PILOT";

const defaultState = {
  adminUnlocked:false,
  currentGroupId:"skipton-pilot",
  groups:[{id:"skipton-pilot", name:"Skipton Pilot", locked:false, status:"Pilot"}],
  members:[
    {id:crypto.randomUUID(), groupId:"skipton-pilot", name:"Craig", area:"Skipton", role:"Admin", at:new Date().toLocaleDateString()}
  ],
  posts:[
    {id:crypto.randomUUID(), groupId:"skipton-pilot", type:"☕ Coffee", text:"Coffee in Skipton town", location:"Costa High Street", time:"11:00", when:"today", going:3, maybe:1, onway:1, arrived:0, asksTime:0, asksPlace:0, closed:false},
    {id:crypto.randomUUID(), groupId:"skipton-pilot", type:"🚶 Walk", text:"Canal walk later", location:"Morrisons bridge", time:"18:00", when:"today", going:2, maybe:0, onway:0, arrived:0, asksTime:0, asksPlace:0, closed:false}
  ],
  pending:[]
};

const state = JSON.parse(localStorage.getItem("wa_simple_pilot_state") || "null") || defaultState;
state.tab = "home";

const screen = document.getElementById("screen");
const adminLockBtn = document.getElementById("adminLockBtn");
const groupLabel = document.getElementById("groupLabel");

function save(){
  const copy = {...state};
  delete copy.tab;
  localStorage.setItem("wa_simple_pilot_state", JSON.stringify(copy));
}

function currentGroup(){
  return state.groups.find(g => g.id === state.currentGroupId) || state.groups[0];
}

function setHeader(){
  groupLabel.textContent = currentGroup().name;
  adminLockBtn.textContent = state.adminUnlocked ? "🔓 Admin" : "🔒 Admin";
}

document.querySelectorAll(".bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    activateTab(btn.dataset.tab);
    state.tab = btn.dataset.tab;
    render();
  });
});

adminLockBtn.addEventListener("click", () => {
  if(state.adminUnlocked){
    state.adminUnlocked = false;
    save();
    render();
    return;
  }
  document.getElementById("adminModal").classList.remove("hidden");
});

document.getElementById("closeAdminModal").addEventListener("click", () => {
  document.getElementById("adminModal").classList.add("hidden");
});

document.getElementById("unlockAdmin").addEventListener("click", () => {
  const input = document.getElementById("adminCodeInput");
  const msg = document.getElementById("adminLockMsg");
  if(input.value.trim() === ADMIN_CODE){
    state.adminUnlocked = true;
    state.tab = "manage";
    activateTab("manage");
    document.getElementById("adminModal").classList.add("hidden");
    input.value = "";
    msg.classList.add("hidden");
    save();
    render();
  } else {
    msg.textContent = "Wrong admin code.";
    msg.classList.remove("hidden");
  }
});

function render(){
  setHeader();
  const tpl = document.getElementById(state.tab + "Tpl");
  screen.innerHTML = "";
  screen.appendChild(tpl.content.cloneNode(true));
  const banner = document.getElementById("adminBanner");
  if(banner && state.adminUnlocked) banner.classList.remove("hidden");

  if(state.tab === "home") initHome();
  if(state.tab === "post") initPost();
  if(state.tab === "join") initJoin();
  if(state.tab === "manage") initManage();
}

function initHome(){
  const group = currentGroup();
  const feed = document.getElementById("feed");
  const offline = document.getElementById("offlineNotice");
  document.getElementById("quickPostBtn").addEventListener("click", () => {
    state.tab = "post"; activateTab("post"); render();
  });

  if(group.locked && !state.adminUnlocked){
    offline.classList.remove("hidden");
    document.querySelector(".hero").classList.add("hidden");
    document.querySelector(".filters").classList.add("hidden");
    feed.innerHTML = "";
    return;
  }

  let active = "all";
  document.querySelectorAll(".filter").forEach(f => {
    f.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
      f.classList.add("active");
      active = f.dataset.filter;
      draw();
    });
  });

  function draw(){
    const posts = state.posts.filter(p => p.groupId === group.id && !p.closed && (active === "all" || p.when === active));
    feed.innerHTML = posts.length ? posts.map(postCard).join("") : `<div class="empty">Nothing posted yet. Be the first to put the bench out.</div>`;
    feed.querySelectorAll("[data-act]").forEach(btn => btn.addEventListener("click", postAction));
  }
  draw();
}

function postCard(p){
  return `<article class="meetup">
    <div class="title">
      <div><h2>${escapeHtml(p.type)}</h2><div>${escapeHtml(p.text)}</div></div>
      <span class="badge">${p.when === "now" ? "Now" : p.when === "today" ? "Today" : "This week"}</span>
    </div>
    <div class="meta"><div>📍 ${escapeHtml(p.location)}</div><div>⏰ ${escapeHtml(p.time)}</div></div>
    <div class="counts">
      <span>👍 ${p.going} going</span><span>👀 ${p.maybe} maybe</span><span>🟢 ${p.onway} on way</span><span>📍 ${p.arrived} arrived</span>
      ${p.asksTime ? `<span>⏰ ${p.asksTime} asked time</span>` : ""}
      ${p.asksPlace ? `<span>📍 ${p.asksPlace} asked place</span>` : ""}
    </div>
    <div class="actions">
      <button class="action join" data-act="going" data-id="${p.id}">👍 I’m in</button>
      <button class="action" data-act="maybe" data-id="${p.id}">👀 Maybe</button>
      <button class="action" data-act="onway" data-id="${p.id}">🟢 On way</button>
      <button class="action" data-act="arrived" data-id="${p.id}">📍 Arrived</button>
      <button class="action ask" data-act="asksTime" data-id="${p.id}">⏰ Time?</button>
      <button class="action ask" data-act="asksPlace" data-id="${p.id}">📍 Where?</button>
      ${state.adminUnlocked ? `<button class="action danger" data-act="close" data-id="${p.id}">🔒 Close</button>` : ""}
    </div>
  </article>`;
}

function postAction(e){
  const p = state.posts.find(x => x.id === e.currentTarget.dataset.id);
  const act = e.currentTarget.dataset.act;
  if(!p) return;
  if(act === "close") p.closed = true;
  else p[act] = (p[act] || 0) + 1;
  save(); render();
}

function initPost(){
  const group = currentGroup();
  if(group.locked && !state.adminUnlocked){
    document.querySelector(".card").innerHTML = `<h2>App temporarily offline</h2><p class="muted">This group is currently unavailable.</p>`;
    return;
  }

  let selectedType = "☕ Coffee";
  let when = "now";

  document.querySelectorAll(".quick-types button").forEach((btn, i) => {
    if(i === 0) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      document.querySelectorAll(".quick-types button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedType = btn.dataset.type;
      const input = document.getElementById("postText");
      if(!input.value.trim()){
        input.value = selectedType.replace(/[^\u{1F300}-\u{1FAFF}]/gu,"").trim() ? selectedType.replace(/^.. /,"") + " in town" : "Meetup";
      }
    });
  });

  document.querySelectorAll("#whenChoice button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#whenChoice button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      when = btn.dataset.when;
    });
  });

  document.getElementById("createPost").addEventListener("click", () => {
    const text = document.getElementById("postText").value.trim();
    const location = document.getElementById("location").value.trim();
    const time = document.getElementById("time").value;
    const msg = document.getElementById("createMsg");
    if(!text || !location || !time){
      msg.textContent = "Add what, where and time.";
      msg.classList.remove("hidden");
      return;
    }
    state.posts.unshift({id:crypto.randomUUID(), groupId:group.id, type:selectedType, text, location, time, when, going:1, maybe:0, onway:0, arrived:0, asksTime:0, asksPlace:0, closed:false});
    save();
    state.tab = "home"; activateTab("home"); render();
  });
}

function initJoin(){
  const codeInput = document.getElementById("inviteCode");
  const params = new URLSearchParams(location.search);
  if(params.get("code")) codeInput.value = params.get("code");
  if(params.get("group")){
    const g = state.groups.find(x => x.id === params.get("group"));
    if(g) state.currentGroupId = g.id;
  }

  document.getElementById("joinRequest").addEventListener("click", () => {
    const name = document.getElementById("joinName").value.trim();
    const area = document.getElementById("joinArea").value.trim();
    const code = codeInput.value.trim();
    const msg = document.getElementById("joinMsg");
    if(!name || !area || !code){
      msg.textContent = "Add first name, area and code.";
      msg.classList.remove("hidden");
      return;
    }
    state.pending.push({id:crypto.randomUUID(), groupId:currentGroup().id, name, area, code, at:new Date().toLocaleString()});
    save();
    msg.textContent = `${name} added to pending approval.`;
    msg.classList.remove("hidden");
    document.getElementById("joinName").value = "";
    document.getElementById("joinArea").value = "";
  });

  document.getElementById("refreshQR").addEventListener("click", makeQR);
  makeQR();
}

function makeQR(){
  const code = DEFAULT_JOIN_CODE;
  document.getElementById("liveCode").textContent = code;
  document.getElementById("validUntil").textContent = currentGroup().name;
  drawFakeQR(document.getElementById("qrCanvas"), `join?group=${currentGroup().id}&code=${code}`);
}

function initManage(){
  const group = currentGroup();
  const adminCards = document.querySelectorAll(".admin-card");
  if(!state.adminUnlocked){
    document.getElementById("lockedPanel").classList.remove("hidden");
    adminCards.forEach(card => card.classList.add("locked"));
  }

  document.getElementById("pendingCount").textContent = state.pending.filter(p => p.groupId === group.id).length;
  document.getElementById("memberCount").textContent = state.members.filter(m => m.groupId === group.id).length;
  document.getElementById("postCount").textContent = state.posts.filter(p => p.groupId === group.id && !p.closed).length;

  const lockBtn = document.getElementById("toggleGroupLock");
  lockBtn.textContent = group.locked ? "Unlock group" : "Lock group";
  lockBtn.addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    group.locked = !group.locked;
    save(); render();
  });

  document.getElementById("resetDemo").addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    if(confirm("Reset this pilot demo on this device?")){
      localStorage.removeItem("wa_simple_pilot_state");
      location.reload();
    }
  });

  const select = document.getElementById("groupSelect");
  select.innerHTML = state.groups.map(g => `<option value="${g.id}" ${g.id === group.id ? "selected" : ""}>${escapeHtml(g.name)} ${g.locked ? "(locked)" : ""}</option>`).join("");
  select.addEventListener("change", () => {
    if(!state.adminUnlocked) return;
    state.currentGroupId = select.value;
    save(); render();
  });

  document.getElementById("createGroup").addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    const name = document.getElementById("newGroupName").value.trim();
    const msg = document.getElementById("groupMsg");
    if(!name){ msg.textContent = "Add a group name."; msg.classList.remove("hidden"); return; }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || crypto.randomUUID();
    if(state.groups.some(g => g.id === id)){ msg.textContent = "That group already exists."; msg.classList.remove("hidden"); return; }
    state.groups.push({id, name, locked:false, status:"Pilot"});
    state.currentGroupId = id;
    state.members.push({id:crypto.randomUUID(), groupId:id, name:"Group Admin", area:"", role:"Admin", at:new Date().toLocaleDateString()});
    save(); render();
  });

  drawPending(group.id);
  drawMembers(group.id);
}

function drawPending(groupId){
  const list = document.getElementById("pendingList");
  const pending = state.pending.filter(p => p.groupId === groupId);
  list.innerHTML = pending.length ? pending.map(p => `<div class="row">
    <strong>${escapeHtml(p.name)}</strong> <small>${escapeHtml(p.area)}</small><br>
    <small>${escapeHtml(p.code)} · ${escapeHtml(p.at)}</small>
    <div class="row-actions">
      <button class="approve" data-approve="${p.id}">Approve</button>
      <button class="reject" data-reject="${p.id}">Reject</button>
    </div>
  </div>`).join("") : `<div class="empty">No pending people.</div>`;

  list.querySelectorAll("[data-approve]").forEach(btn => btn.addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    const p = state.pending.find(x => x.id === btn.dataset.approve);
    if(!p) return;
    state.members.push({id:crypto.randomUUID(), groupId:p.groupId, name:p.name, area:p.area, role:"Member", at:new Date().toLocaleDateString()});
    state.pending = state.pending.filter(x => x.id !== p.id);
    save(); render();
  }));
  list.querySelectorAll("[data-reject]").forEach(btn => btn.addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    state.pending = state.pending.filter(x => x.id !== btn.dataset.reject);
    save(); render();
  }));
}

function drawMembers(groupId){
  const list = document.getElementById("memberList");
  const members = state.members.filter(m => m.groupId === groupId);
  list.innerHTML = members.length ? members.map(m => `<div class="row">
    <strong>${escapeHtml(m.name)}</strong> <small>${escapeHtml(m.role)}</small><br>
    <small>${escapeHtml(m.area || "No area")} · joined ${escapeHtml(m.at)}</small>
    ${m.role !== "Admin" ? `<div class="row-actions"><button class="remove" data-remove="${m.id}">Remove</button></div>` : ""}
  </div>`).join("") : `<div class="empty">No members yet.</div>`;

  list.querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    state.members = state.members.filter(x => x.id !== btn.dataset.remove);
    save(); render();
  }));
}

function drawFakeQR(canvas, seed){
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.fillStyle = "white"; ctx.fillRect(0,0,size,size);
  ctx.fillStyle = "black";
  function finder(x,y){ctx.fillRect(x,y,50,50);ctx.fillStyle="white";ctx.fillRect(x+10,y+10,30,30);ctx.fillStyle="black";ctx.fillRect(x+20,y+20,10,10)}
  finder(15,15); finder(size-65,15); finder(15,size-65);
  let hash = 0; for(let i=0;i<seed.length;i++) hash = ((hash<<5)-hash)+seed.charCodeAt(i);
  for(let y=20;y<size-20;y+=10){
    for(let x=20;x<size-20;x+=10){
      const inFinder=(x<75&&y<75)||(x>size-85&&y<75)||(x<75&&y>size-85);
      if(inFinder) continue;
      if(Math.abs(Math.sin((x*13+y*7+hash)*.017))>.56) ctx.fillRect(x,y,8,8);
    }
  }
}

function activateTab(tab){
  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(()=>{}); }
render();
