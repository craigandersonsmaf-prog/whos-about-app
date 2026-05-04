const MASTER_ADMIN_CODE = "28041972*";
const FALLBACK_JOIN_CODE = "SKIPTON-PILOT";

function plusDays(days){
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 14));
  d.setHours(23,59,59,999);
  return d.toISOString();
}

const defaultState = {
  adminUnlocked:false,
  adminScope:"none", // none | master | group
  currentGroupId:"skipton-pilot",
  groups:[{
    id:"skipton-pilot",
    name:"Skipton Pilot",
    locked:false,
    accessMode:"trial", // trial | free | paid | locked
    trialDays:14,
    trialStart:new Date().toISOString(),
    trialEnd:plusDays(14),
    maxMembers:20,
    subscriptionActive:false,
    overrideAccess:false,
    overrideReason:"",
    groupAdminPassword:"pilot123",
    joinCode:"SKIPTON-PILOT"
  }],
  members:[
    {id:crypto.randomUUID(), groupId:"skipton-pilot", name:"Craig", area:"Skipton", role:"Admin", at:new Date().toLocaleDateString()}
  ],
  posts:[
    {id:crypto.randomUUID(), groupId:"skipton-pilot", type:"☕ Coffee", text:"Coffee in Skipton town", location:"Costa High Street", time:"11:00", when:"today", going:3, maybe:1, onway:1, arrived:0, asksTime:0, asksPlace:0, closed:false},
    {id:crypto.randomUUID(), groupId:"skipton-pilot", type:"🚶 Walk", text:"Canal walk later", location:"Morrisons bridge", time:"18:00", when:"today", going:2, maybe:0, onway:0, arrived:0, asksTime:0, asksPlace:0, closed:false}
  ],
  pending:[]
};

const state = JSON.parse(localStorage.getItem("wa_full_admin_v2_state") || "null") || defaultState;
state.tab = "home";

const screen = document.getElementById("screen");
const adminLockBtn = document.getElementById("adminLockBtn");
const groupLabel = document.getElementById("groupLabel");

function save(){
  const copy = {...state};
  delete copy.tab;
  localStorage.setItem("wa_full_admin_v2_state", JSON.stringify(copy));
}

function currentGroup(){
  return state.groups.find(g => g.id === state.currentGroupId) || state.groups[0];
}

function currentUrlBase(){
  return location.origin + location.pathname.replace(/\/[^\/]*$/, "/");
}

function isTrialExpired(group){
  return group.accessMode === "trial" && group.trialEnd && new Date(group.trialEnd).getTime() < Date.now();
}

function daysLeft(group){
  if(!group.trialEnd) return null;
  return Math.ceil((new Date(group.trialEnd).getTime() - Date.now()) / 86400000);
}

function groupUsable(group){
  if(group.overrideAccess) return true;
  if(group.locked) return false;
  if(group.accessMode === "locked") return false;
  if(group.accessMode === "free") return true;
  if(group.accessMode === "paid") return !!group.subscriptionActive;
  if(group.accessMode === "trial") return !isTrialExpired(group);
  return false;
}

function statusText(group){
  if(group.overrideAccess) return `Override active${group.overrideReason ? " - " + group.overrideReason : ""}`;
  if(group.locked || group.accessMode === "locked") return "Group locked";
  if(group.accessMode === "free") return "Free / good cause";
  if(group.accessMode === "paid") return group.subscriptionActive ? "Paid subscription active" : "Payment required";
  if(group.accessMode === "trial"){
    const left = daysLeft(group);
    return left >= 0 ? `Trial active - ${left} day${left === 1 ? "" : "s"} left` : "Trial expired";
  }
  return "Unknown";
}

function statusClass(group){
  if(groupUsable(group)){
    if(group.accessMode === "trial" && daysLeft(group) <= 3) return "warn";
    return "good";
  }
  return "bad";
}

function setHeader(){
  const group = currentGroup();
  groupLabel.textContent = group.name;
  adminLockBtn.textContent = state.adminUnlocked ? (state.adminScope === "master" ? "🔓 Master" : "🔓 Group") : "🔒 Admin";
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
    state.adminScope = "none";
    save(); render(); return;
  }
  document.getElementById("adminModal").classList.remove("hidden");
});

document.getElementById("closeAdminModal").addEventListener("click", () => {
  document.getElementById("adminModal").classList.add("hidden");
});

document.getElementById("unlockAdmin").addEventListener("click", () => {
  const input = document.getElementById("adminCodeInput");
  const msg = document.getElementById("adminLockMsg");
  const entered = input.value.trim();
  const group = currentGroup();

  if(entered === MASTER_ADMIN_CODE){
    state.adminUnlocked = true;
    state.adminScope = "master";
  } else if(entered && entered === group.groupAdminPassword){
    state.adminUnlocked = true;
    state.adminScope = "group";
  } else {
    msg.textContent = "Wrong admin password.";
    msg.classList.remove("hidden");
    return;
  }

  state.tab = "manage";
  activateTab("manage");
  document.getElementById("adminModal").classList.add("hidden");
  input.value = "";
  msg.classList.add("hidden");
  save(); render();
});

function render(){
  setHeader();
  const tpl = document.getElementById(state.tab + "Tpl");
  screen.innerHTML = "";
  screen.appendChild(tpl.content.cloneNode(true));

  const banner = document.getElementById("adminBanner");
  if(banner && state.adminUnlocked){
    banner.textContent = state.adminScope === "master" ? "🔓 Master Admin Mode Active" : "🔓 Group Admin Mode Active";
    banner.classList.remove("hidden");
  }

  const status = document.getElementById("statusBanner");
  if(status){
    const g = currentGroup();
    status.innerHTML = `<div class="status-pill ${statusClass(g)}">${escapeHtml(statusText(g))}</div>`;
  }

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

  if(!groupUsable(group) && !state.adminUnlocked){
    offline.classList.remove("hidden");
    document.getElementById("offlineTitle").textContent = isTrialExpired(group) ? "Pilot group ended" : "App temporarily offline";
    document.getElementById("offlineText").textContent = isTrialExpired(group)
      ? "This pilot group has now finished. Please contact your group admin."
      : "This group is currently unavailable. Please check back later.";
    document.getElementById("homeHero").classList.add("hidden");
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
  if(!groupUsable(group) && !state.adminUnlocked){
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
  const group = currentGroup();
  const codeInput = document.getElementById("inviteCode");
  codeInput.value = group.joinCode || FALLBACK_JOIN_CODE;

  const params = new URLSearchParams(location.search);
  if(params.get("group")){
    const g = state.groups.find(x => x.id === params.get("group"));
    if(g){ state.currentGroupId = g.id; save(); }
  }
  if(params.get("code")) codeInput.value = params.get("code");

  document.getElementById("joinRequest").addEventListener("click", () => {
    const name = document.getElementById("joinName").value.trim();
    const area = document.getElementById("joinArea").value.trim();
    const code = codeInput.value.trim();
    const msg = document.getElementById("joinMsg");
    const g = currentGroup();

    if(!name || !area || !code){
      msg.textContent = "Add first name, area and code.";
      msg.classList.remove("hidden");
      return;
    }
    if(code !== g.joinCode){
      msg.textContent = "That join code does not match this group.";
      msg.classList.remove("hidden");
      return;
    }
    if(state.members.filter(m => m.groupId === g.id).length >= Number(g.maxMembers || 999999)){
      msg.textContent = "This group has reached its member limit.";
      msg.classList.remove("hidden");
      return;
    }
    state.pending.push({id:crypto.randomUUID(), groupId:g.id, name, area, code, at:new Date().toLocaleString()});
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
  const group = currentGroup();
  const code = group.joinCode || FALLBACK_JOIN_CODE;
  document.getElementById("liveCode").textContent = code;
  document.getElementById("validUntil").textContent = group.name;
  drawFakeQR(document.getElementById("qrCanvas"), `join?group=${group.id}&code=${code}`);
}

function initManage(){
  const group = currentGroup();
  const canAdmin = state.adminUnlocked;
  const isMaster = state.adminScope === "master";

  if(!canAdmin){
    document.getElementById("lockedPanel").classList.remove("hidden");
    document.querySelectorAll(".admin-card").forEach(card => card.classList.add("locked"));
  }
  if(!isMaster){
    document.querySelectorAll(".master-only").forEach(el => el.classList.add("master-hidden"));
  }

  document.getElementById("pendingCount").textContent = state.pending.filter(p => p.groupId === group.id).length;
  document.getElementById("memberCount").textContent = state.members.filter(m => m.groupId === group.id).length;
  document.getElementById("postCount").textContent = state.posts.filter(p => p.groupId === group.id && !p.closed).length;

  drawAllGroups();

  const lockBtn = document.getElementById("toggleGroupLock");
  lockBtn.textContent = group.locked || group.accessMode === "locked" ? "Unlock group" : "Lock group";
  lockBtn.addEventListener("click", () => {
    if(!canAdmin) return;
    if(group.accessMode === "locked"){
      group.accessMode = "trial";
      group.locked = false;
    } else {
      group.locked = !group.locked;
    }
    save(); render();
  });

  const select = document.getElementById("groupSelect");
  select.innerHTML = state.groups.map(g => `<option value="${g.id}" ${g.id === group.id ? "selected" : ""}>${escapeHtml(g.name)} - ${escapeHtml(statusText(g))}</option>`).join("");
  select.addEventListener("change", () => {
    if(!canAdmin) return;
    state.currentGroupId = select.value;
    save(); render();
  });

  fillSettings(group);
  document.getElementById("saveGroupSettings").addEventListener("click", () => {
    if(!canAdmin) return;
    if(!isMaster && document.getElementById("overrideAccess").value === "true"){
      showMsg("settingsMsg", "Only master admin can set override.");
      return;
    }
    group.accessMode = document.getElementById("accessMode").value;
    group.trialDays = Number(document.getElementById("trialDays").value || 14);
    group.maxMembers = Number(document.getElementById("maxMembers").value || 20);
    group.subscriptionActive = document.getElementById("subscriptionActive").value === "true";
    if(isMaster){
      group.overrideAccess = document.getElementById("overrideAccess").value === "true";
      group.overrideReason = document.getElementById("overrideReason").value.trim();
    }
    group.groupAdminPassword = document.getElementById("groupAdminPassword").value.trim() || group.groupAdminPassword;
    group.joinCode = document.getElementById("joinCode").value.trim() || group.joinCode;

    if(group.accessMode === "trial"){
      group.trialStart = group.trialStart || new Date().toISOString();
      const end = new Date();
      end.setDate(end.getDate() + group.trialDays);
      end.setHours(23,59,59,999);
      group.trialEnd = end.toISOString();
    }
    if(group.accessMode !== "locked") group.locked = false;
    save();
    showMsg("settingsMsg", "Group settings saved.");
    render();
  });

  document.getElementById("createGroup").addEventListener("click", () => {
    if(!isMaster) return;
    const name = document.getElementById("newGroupName").value.trim();
    const days = Number(document.getElementById("newTrialDays").value || 14);
    const maxMembers = Number(document.getElementById("newMaxMembers").value || 20);
    const password = document.getElementById("newGroupPassword").value.trim();
    const msg = document.getElementById("groupMsg");
    if(!name || !password){
      msg.textContent = "Add group name and group admin password.";
      msg.classList.remove("hidden");
      return;
    }
    const id = slug(name);
    if(state.groups.some(g => g.id === id)){
      msg.textContent = "That group already exists.";
      msg.classList.remove("hidden");
      return;
    }
    const joinCode = id.toUpperCase().replace(/-/g, "-").slice(0,20);
    state.groups.push({
      id, name, locked:false, accessMode:"trial", trialDays:days, trialStart:new Date().toISOString(),
      trialEnd:plusDays(days), maxMembers, subscriptionActive:false, overrideAccess:false, overrideReason:"",
      groupAdminPassword:password, joinCode
    });
    state.currentGroupId = id;
    state.members.push({id:crypto.randomUUID(), groupId:id, name:"Group Admin", area:"", role:"Admin", at:new Date().toLocaleDateString()});
    save(); render();
  });

  document.getElementById("copyInvitePack").addEventListener("click", async () => {
    const text = invitePackText(currentGroup());
    try{
      await navigator.clipboard.writeText(text);
      showMsg("copyMsg", "Invite pack copied.");
    } catch(e){
      showMsg("copyMsg", "Copy blocked by browser. Select the text and copy it manually.");
    }
  });

  document.getElementById("resetDemo").addEventListener("click", () => {
    if(!isMaster) return;
    if(confirm("Reset this prototype on this device?")){
      localStorage.removeItem("wa_full_admin_v2_state");
      location.reload();
    }
  });

  drawPending(group.id);
  drawMembers(group.id);
  fillInviteLinks(group);
}

function fillSettings(group){
  document.getElementById("accessMode").value = group.accessMode || "trial";
  document.getElementById("trialDays").value = group.trialDays || 14;
  document.getElementById("maxMembers").value = group.maxMembers || 20;
  document.getElementById("subscriptionActive").value = String(!!group.subscriptionActive);
  document.getElementById("overrideAccess").value = String(!!group.overrideAccess);
  document.getElementById("overrideReason").value = group.overrideReason || "";
  document.getElementById("groupAdminPassword").value = group.groupAdminPassword || "";
  document.getElementById("joinCode").value = group.joinCode || "";
  if(state.adminScope !== "master"){
    document.getElementById("overrideAccess").disabled = true;
    document.getElementById("overrideReason").disabled = true;
    document.getElementById("subscriptionActive").disabled = true;
  }
}

function fillInviteLinks(group){
  const base = currentUrlBase();
  const setup = `${base}?group=${encodeURIComponent(group.id)}&setup=1`;
  const join = `${base}?group=${encodeURIComponent(group.id)}&code=${encodeURIComponent(group.joinCode || "")}`;
  document.getElementById("setupLink").value = setup + "\nPassword: " + (group.groupAdminPassword || "");
  document.getElementById("joinLink").value = join + "\nJoin code: " + (group.joinCode || "");
}

function invitePackText(group){
  const base = currentUrlBase();
  return `Who’s About - ${group.name}

Facilitator setup link:
${base}?group=${group.id}&setup=1

Group admin password:
${group.groupAdminPassword || ""}

Member join link:
${base}?group=${group.id}&code=${encodeURIComponent(group.joinCode || "")}

Join code:
${group.joinCode || ""}

Status:
${statusText(group)}

Note:
This is a pilot buddy-bench style meetup app. No private messages, no discussion threads, meetups only.`;
}

function drawAllGroups(){
  const list = document.getElementById("allGroupsList");
  if(!list) return;
  list.innerHTML = state.groups.map(g => `<div class="row">
    <strong>${escapeHtml(g.name)}</strong><br>
    <small>${escapeHtml(statusText(g))}</small><br>
    <small>Mode: ${escapeHtml(g.accessMode)} · Members: ${state.members.filter(m=>m.groupId===g.id).length}/${g.maxMembers || "∞"}</small>
    <div class="row-actions">
      <button class="green" data-open-group="${g.id}">Open</button>
      <button class="amber" data-extend-group="${g.id}">Extend 7 days</button>
      <button class="remove" data-lock-group="${g.id}">${groupUsable(g) ? "Lock" : "Unlock"}</button>
    </div>
  </div>`).join("");

  list.querySelectorAll("[data-open-group]").forEach(btn => btn.addEventListener("click", () => {
    state.currentGroupId = btn.dataset.openGroup; save(); render();
  }));
  list.querySelectorAll("[data-extend-group]").forEach(btn => btn.addEventListener("click", () => {
    const g = state.groups.find(x => x.id === btn.dataset.extendGroup);
    if(!g) return;
    g.accessMode = "trial";
    g.locked = false;
    g.trialDays = Number(g.trialDays || 14) + 7;
    g.trialEnd = plusDays(7);
    save(); render();
  }));
  list.querySelectorAll("[data-lock-group]").forEach(btn => btn.addEventListener("click", () => {
    const g = state.groups.find(x => x.id === btn.dataset.lockGroup);
    if(!g) return;
    if(groupUsable(g)){
      g.locked = true;
    } else {
      g.locked = false;
      if(g.accessMode === "locked") g.accessMode = "trial";
      if(g.accessMode === "paid") g.subscriptionActive = true;
      if(g.accessMode === "trial" && isTrialExpired(g)) g.trialEnd = plusDays(7);
    }
    save(); render();
  }));
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

function showMsg(id, text){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
}

function activateTab(tab){
  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
}

function slug(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || crypto.randomUUID();
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(()=>{}); }
render();
