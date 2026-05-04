const state = {
  role: localStorage.getItem("role") || "Member",
  adminUnlocked: localStorage.getItem("adminUnlocked") === "true",
  posts: JSON.parse(localStorage.getItem("posts") || "null") || [
    {
      id: crypto.randomUUID(),
      category:"☕ Coffee",
      text:"Coffee in Skipton town",
      location:"Costa High Street",
      time:"11:00",
      when:"today",
      going:3, maybe:1, onway:1, arrived:0,
      asksTime:0, asksPlace:0,
      host:"Craig",
      closed:false
    },
    {
      id: crypto.randomUUID(),
      category:"🚶 Walk",
      text:"Canal walk later",
      location:"Morrisons bridge",
      time:"18:00",
      when:"today",
      going:2, maybe:0, onway:0, arrived:0,
      asksTime:0, asksPlace:0,
      host:"Simon",
      closed:false
    }
  ],
  pending: JSON.parse(localStorage.getItem("pending") || "[]"),
  posters: JSON.parse(localStorage.getItem("posters") || "[]"),
  tab: "home"
};

function save(){
  localStorage.setItem("posts", JSON.stringify(state.posts));
  localStorage.setItem("pending", JSON.stringify(state.pending));
  localStorage.setItem("posters", JSON.stringify(state.posters));
  localStorage.setItem("role", state.role);
  localStorage.setItem("adminUnlocked", state.adminUnlocked ? "true" : "false");
}

const screen = document.getElementById("screen");
const tabs = document.querySelectorAll(".bottom-nav button");
const adminLockBtn = document.getElementById("adminLockBtn");
adminLockBtn.textContent = state.adminUnlocked ? "🔓 Admin" : "🔒 Admin";

tabs.forEach(btn => btn.addEventListener("click", () => {
  tabs.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.tab = btn.dataset.tab;
  render();
}));

adminLockBtn.addEventListener("click", () => {
  if(state.adminUnlocked){
    state.adminUnlocked = false;
    state.role = "Member";
    adminLockBtn.textContent = "🔒 Admin";
    save();
    render();
    return;
  }
  document.getElementById("adminModal").classList.remove("hidden");
});

document.getElementById("closeAdminModal").addEventListener("click", () => {
  document.getElementById("adminModal").classList.add("hidden");
});

document.getElementById("unlockAdmin").addEventListener("click", async () => {
  const input = document.getElementById("adminCodeInput");
  const msg = document.getElementById("adminLockMsg");
  const enteredHash = await sha256Hex(input.value.trim());
  if(enteredHash === ADMIN_CODE_HASH){
    state.adminUnlocked = true;
    state.role = "Admin";
    adminLockBtn.textContent = "🔓 Admin";
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


async function sha256Hex(text){
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Demo admin code is checked by hash, not stored as plain text.
// Production version should verify admin access on the backend.
const ADMIN_CODE_HASH = "6aaa689ab4cc5b8f9890452ab921f0861c773508870cd3cca0fc68f4270ad5c3";

// Demo print authorisation code is also checked by hash.
const PRINT_CODE_HASH = "c476a774b20f3b937a9a59364a8558f76dd58c6bd4127368b99f21a23b613470";


function render(){
  const tpl = document.getElementById(state.tab + "Tpl");
  screen.innerHTML = "";
  screen.appendChild(tpl.content.cloneNode(true));
  if(state.tab === "home") initHome();
  if(state.tab === "create") initCreate();
  if(state.tab === "join") initJoin();
  if(state.tab === "manage") initManage();
}

function initHome(){
  const feed = document.getElementById("feed");
  const filters = document.querySelectorAll(".filter");
  let active = "all";
  filters.forEach(f => f.addEventListener("click", () => {
    filters.forEach(x => x.classList.remove("active"));
    f.classList.add("active");
    active = f.dataset.filter;
    drawFeed();
  }));
  function drawFeed(){
    const posts = state.posts.filter(p => !p.closed && (active==="all" || p.when===active));
    feed.innerHTML = posts.length ? posts.map(postCard).join("") : `<div class="empty">Nothing happening yet. Create the first meetup.</div>`;
    feed.querySelectorAll("[data-act]").forEach(btn => btn.addEventListener("click", handlePostAction));
  }
  drawFeed();
}

function postCard(p){
  return `<article class="meetup">
    <div class="title">
      <div>
        <h2>${escapeHtml(p.category)}</h2>
        <div>${escapeHtml(p.text)}</div>
      </div>
      <span class="badge">${p.when === "now" ? "Now" : p.when === "today" ? "Today" : "This week"}</span>
    </div>
    <div class="meta">
      <div>📍 ${escapeHtml(p.location || "Location needed")}</div>
      <div>⏰ ${escapeHtml(p.time || "Time needed")}</div>
    </div>
    <div class="counts">
      <span>👍 ${p.going} going</span>
      <span>👀 ${p.maybe} maybe</span>
      <span>🟢 ${p.onway} on way</span>
      <span>📍 ${p.arrived} arrived</span>
      ${p.asksTime ? `<span>⏰ ${p.asksTime} asked time</span>` : ""}
      ${p.asksPlace ? `<span>📍 ${p.asksPlace} asked place</span>` : ""}
    </div>
    <div class="actions">
      <button class="action join" data-act="going" data-id="${p.id}">👍 I’m in</button>
      <button class="action" data-act="maybe" data-id="${p.id}">👀 Maybe</button>
      <button class="action" data-act="onway" data-id="${p.id}">🟢 On my way</button>
      <button class="action" data-act="arrived" data-id="${p.id}">📍 Arrived</button>
      <button class="action ask" data-act="asksTime" data-id="${p.id}">⏰ What time?</button>
      <button class="action ask" data-act="asksPlace" data-id="${p.id}">📍 Where?</button>
      ${state.adminUnlocked ? `<button class="action danger" data-act="close" data-id="${p.id}">🔒 Close</button>` : ""}
    </div>
  </article>`;
}

function handlePostAction(e){
  const id = e.currentTarget.dataset.id;
  const act = e.currentTarget.dataset.act;
  const p = state.posts.find(x => x.id === id);
  if(!p) return;
  if(act === "close") p.closed = true;
  else p[act] = (p[act] || 0) + 1;
  save();
  render();
}

function initCreate(){
  let when = "now";
  document.querySelectorAll("#whenChoice button").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("#whenChoice button").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    when = btn.dataset.when;
  }));
  document.getElementById("createPost").addEventListener("click", () => {
    const text = document.getElementById("postText").value.trim();
    const category = document.getElementById("category").value;
    const location = document.getElementById("location").value.trim();
    const time = document.getElementById("time").value;
    const msg = document.getElementById("createMsg");
    if(!text || !location || !time){
      msg.textContent = "Add a short post, location and time first.";
      msg.classList.remove("hidden");
      return;
    }
    state.posts.unshift({
      id: crypto.randomUUID(), category, text, location, time, when,
      going:1, maybe:0, onway:0, arrived:0, asksTime:0, asksPlace:0,
      host:"You", closed:false
    });
    save();
    state.tab = "home";
    document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.tab==="home"));
    render();
  });
}

function initJoin(){
  const codeInput = document.getElementById("inviteCode");
  const params = new URLSearchParams(location.search);
  if(params.get("p")) codeInput.value = params.get("p");
  if(params.get("code")) codeInput.value = params.get("code");
  document.getElementById("joinRequest").addEventListener("click", () => {
    const code = codeInput.value.trim();
    const name = document.getElementById("joinName").value.trim();
    const area = document.getElementById("joinArea").value.trim();
    const msg = document.getElementById("joinMsg");
    if(!code || !name || !area){
      msg.textContent = "Add code, first name and area.";
      msg.classList.remove("hidden");
      return;
    }
    state.pending.push({id: crypto.randomUUID(), code, name, area, at: new Date().toLocaleString()});
    save();
    msg.textContent = "Request sent. A moderator/admin would approve this in the real app.";
    msg.classList.remove("hidden");
  });
  document.getElementById("refreshQR").addEventListener("click", makeLiveQR);
  makeLiveQR();
}

function makeLiveQR(){
  const code = "LIVE-" + Math.random().toString(36).slice(2,6).toUpperCase() + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
  const until = new Date(Date.now() + 2*60*60*1000);
  document.getElementById("liveCode").textContent = code;
  document.getElementById("validUntil").textContent = "Valid until " + until.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  drawFakeQR(document.getElementById("qrCanvas"), "join?code=" + code);
}

function drawFakeQR(canvas, seed){
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.fillStyle = "white"; ctx.fillRect(0,0,size,size);
  ctx.fillStyle = "black";
  const cell = 10, margin = 20;
  function finder(x,y){
    ctx.fillRect(x,y,50,50); ctx.fillStyle="white"; ctx.fillRect(x+10,y+10,30,30); ctx.fillStyle="black"; ctx.fillRect(x+20,y+20,10,10);
  }
  finder(15,15); finder(size-65,15); finder(15,size-65);
  let hash = 0;
  for(let i=0;i<seed.length;i++) hash = ((hash<<5)-hash)+seed.charCodeAt(i);
  for(let y=margin;y<size-margin;y+=cell){
    for(let x=margin;x<size-margin;x+=cell){
      const inFinder = (x<75&&y<75)||(x>size-85&&y<75)||(x<75&&y>size-85);
      if(inFinder) continue;
      const val = Math.abs(Math.sin((x*13+y*7+hash)*.017));
      if(val>.56) ctx.fillRect(x,y,cell-2,cell-2);
    }
  }
}

function initManage(){
  if(!state.adminUnlocked){
    document.getElementById("lockedPanel").classList.remove("hidden");
    document.querySelectorAll("#manageTpl, .card").forEach(()=>{});
    screen.querySelectorAll(".card").forEach((card, i) => { if(i > 0) card.classList.add("locked-blur"); });
  }
  document.getElementById("pendingCount").textContent = state.pending.length;
  document.getElementById("postCount").textContent = state.posts.filter(p => !p.closed).length;
  document.getElementById("posterCount").textContent = state.posters.length;
  const pendingList = document.getElementById("pendingList");
  pendingList.innerHTML = state.pending.length ? state.pending.map(p => `<div class="row">
    <strong>${escapeHtml(p.name)}</strong> <small>${escapeHtml(p.area)}</small><br>
    <small>Code: ${escapeHtml(p.code)} · ${escapeHtml(p.at)}</small>
    <div class="row-actions">
      <button class="approve" data-pending="approve" data-id="${p.id}">Approve</button>
      <button class="reject" data-pending="reject" data-id="${p.id}">Reject</button>
    </div>
  </div>`).join("") : `<div class="empty">No pending requests.</div>`;
  pendingList.querySelectorAll("[data-pending]").forEach(btn => btn.addEventListener("click", () => {
    if(!state.adminUnlocked) return;
    state.pending = state.pending.filter(p => p.id !== btn.dataset.id);
    save(); render();
  }));

  const posterList = document.getElementById("posterList");
  drawPosterList();
  document.getElementById("createPoster").addEventListener("click", async () => {
    if(!state.adminUnlocked) return;
    const code = document.getElementById("printCode").value.trim();
    const note = document.getElementById("posterNote").value.trim();
    const msg = document.getElementById("posterMsg");
    const printHash = await sha256Hex(code);
    if(printHash !== PRINT_CODE_HASH){
      msg.textContent = "Wrong print code.";
      msg.classList.remove("hidden");
      return;
    }
    const n = state.posters.length + 1;
    const id = "SK-AMC-" + String(n).padStart(3,"0");
    state.posters.unshift({id, note: note || "Skipton AMC", created:new Date().toLocaleString(), active:true, scans:0, joins:0});
    save();
    msg.textContent = `Poster created: ${id}`;
    msg.classList.remove("hidden");
    drawPosterList();
    document.getElementById("posterCount").textContent = state.posters.length;
  });

  function drawPosterList(){
    posterList.innerHTML = state.posters.length ? state.posters.map(p => `<div class="row">
      <strong>${p.id}</strong> ${p.active ? "🟢" : "🔴"}<br>
      <small>${escapeHtml(p.note)} · ${escapeHtml(p.created)}</small><br>
      <small>Scans: ${p.scans} · Join requests: ${p.joins}</small>
    </div>`).join("") : `<div class="empty">No poster fingerprints yet.</div>`;
  }
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
render();
