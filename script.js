
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const APP_VERSION = "22.0.0";
const firebaseConfig = {
  apiKey: "AIzaSyC9B_LUlxeOC-WRl9uo43pFgGnQ-OmUVn8",
  authDomain: "spani-gestaorh.firebaseapp.com",
  projectId: "spani-gestaorh",
  storageBucket: "spani-gestaorh.firebasestorage.app",
  messagingSenderId: "329068687976",
  appId: "1:329068687976:web:6fef197e23b66ba1ff01dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const content = $("#content");
const toast = $("#toast");

let currentUser = null;
let currentUserId = null;
let currentPage = "inicio";
let state = {
  usuarios: [], setores: [], colaboradores: [], escalas: [], avisosRH: [],
  bancoHoras: [], planosAcao: [], eventos: [], ferias: [], faltas: [], atestados: []
};

const collections = ["usuarios","setores","colaboradores","escalas","avisosRH","bancoHoras","planosAcao","eventos","ferias","faltas","atestados"];

const navItems = [
  ["inicio","⌂","Dashboard"],
  ["colaboradores","👥","Colaboradores"],
  ["escalas","📅","Escalas"],
  ["avisosRH","🔔","Avisos RH"],
  ["bancoHoras","⏱️","Banco de Horas"],
  ["planosAcao","✅","Planos de Ação"],
  ["eventos","🎉","Eventos"],
  ["ferias","🌴","Férias"]
];

function showToast(msg){
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

function normalize(v){ return String(v || "").trim().toLowerCase(); }
function fmt(v){ return v === undefined || v === null || v === "" ? "—" : String(v); }
function today(){ return new Date().toISOString().slice(0,10); }
function monthNow(){ return new Date().getMonth() + 1; }
function initial(name){
  return String(name || "RH").trim().split(/\s+/).slice(0,2).map(p=>p[0]).join("").toUpperCase() || "RH";
}
function isAdmin(){ return currentUser?.perfil === "admin" || currentUser?.acessoTotal === true; }
function userSetor(){ return currentUser?.setor || "todos"; }
function canSee(item){
  if(isAdmin()) return true;
  const setor = item?.setor || item?.setorId || "";
  return !setor || setor === userSetor();
}
function visible(list){ return list.filter(canSee); }
function setTitle(title, sub){
  $("#pageTitle").textContent = title;
  $("#pageSubtitle").textContent = sub || "";
}

async function loadCollection(name){
  try{
    const snap = await getDocs(collection(db, name));
    state[name] = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }catch(err){
    console.warn("Falha ao carregar", name, err);
    state[name] = [];
  }
}

async function loadAll(){
  await Promise.all(collections.map(loadCollection));
}

async function findUser(usuario, senha){
  await loadCollection("usuarios");
  return state.usuarios.find(u => normalize(u.usuario) === normalize(usuario) && String(u.senha || "").trim() === String(senha || "").trim() && u.ativo !== false);
}

function rememberLoad(){
  const remembered = localStorage.getItem("spaniRememberUser") || "";
  const checked = localStorage.getItem("spaniRememberChecked") !== "false";
  $("#rememberMe").checked = checked;
  if(remembered && checked) $("#usuario").value = remembered;
}
function rememberSave(){
  if($("#rememberMe").checked){
    localStorage.setItem("spaniRememberChecked","true");
    localStorage.setItem("spaniRememberUser", $("#usuario").value.trim());
  }else{
    localStorage.setItem("spaniRememberChecked","false");
    localStorage.removeItem("spaniRememberUser");
  }
}

$("#loginForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  $("#loginMsg").textContent = "Validando acesso...";
  const usuario = $("#usuario").value.trim();
  const senha = $("#senha").value.trim();
  if(!usuario || !senha){ $("#loginMsg").textContent = "Preencha usuário e senha."; return; }
  try{
    const u = await findUser(usuario, senha);
    if(!u){ $("#loginMsg").textContent = "Usuário ou senha inválidos."; return; }
    currentUser = u; currentUserId = u.id;
    rememberSave();
    $("#loginScreen").classList.add("hidden");
    $("#loginScreen").style.display = "none";
    $("#loginMsg").textContent = "";
    $("#appScreen").classList.remove("hidden");
    $("#appScreen").style.display = "";
    $("#userName").textContent = u.nome || u.usuario;
    $("#userRole").textContent = isAdmin() ? "Administrador" : `Líder · ${u.setorNome || u.setor}`;
    $("#userInitials").textContent = initial(u.nome || u.usuario);
    const sideName = document.querySelector("#sideUserName");
    const sideRole = document.querySelector("#sideUserRole");
    const sideInitials = document.querySelector("#sideInitials");
    if (sideName) sideName.textContent = u.nome || u.usuario;
    if (sideRole) sideRole.textContent = isAdmin() ? "Administrador" : `Líder · ${u.setorNome || u.setor}`;
    if (sideInitials) sideInitials.textContent = initial(u.nome || u.usuario);
    buildNav();
    await loadAll();
    renderPage("inicio");
    if(!u.senhaAlterada) openPasswordModal();
  }catch(err){
    console.error(err);
    $("#loginMsg").textContent = "Erro ao conectar no Firebase.";
  }
});

$("#togglePassword").addEventListener("click", ()=>{
  const input = $("#senha");
  input.type = input.type === "password" ? "text" : "password";
});
$("#forgotPasswordBtn").addEventListener("click", ()=> openForgotModal());
$("#logoutBtn").addEventListener("click", ()=>{
  currentUser = null; currentUserId = null;
  $("#senha").value = "";
  $("#appScreen").classList.add("hidden");
  $("#loginScreen").style.display = "";
  $("#loginScreen").classList.remove("hidden");
});
$("#refreshBtn").addEventListener("click", async ()=>{
  await loadAll();
  renderPage(currentPage);
  showToast("Dados atualizados.");
});
$("#quickAvisoBtn").addEventListener("click", ()=> openAvisoModal());

function buildNav(){
  $("#sideNav").innerHTML = navItems.map(([key,icon,label]) =>
    `<button class="nav-button" data-page="${key}"><b>${icon}</b><span>${label}</span></button>`
  ).join("");
  document.querySelectorAll(".nav-button").forEach(btn => btn.addEventListener("click",()=>renderPage(btn.dataset.page)));
}

function setActiveNav(page){
  document.querySelectorAll(".nav-button").forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));
}

function renderPage(page){
  currentPage = page;
  setActiveNav(page);
  const map = {
    inicio: renderInicio, colaboradores: renderColaboradores, escalas: renderEscalas,
    avisosRH: renderAvisos, bancoHoras: renderBancoHoras, planosAcao: renderPlanos,
    eventos: renderEventos, ferias: renderFerias
  };
  (map[page] || renderInicio)();
}

function card(icon,title,number,sub){
  return `<article class="card"><div class="icon">${icon}</div><h3>${title}</h3><div class="number">${number}</div><small>${sub || ""}</small></article>`;
}


function safeNumber(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumSaldoHoras(list){
  return list.reduce((acc, item) => acc + safeNumber(item.saldoHoras ?? item.saldo ?? item.horas ?? 0), 0);
}

function fmtHorasDecimal(value){
  const n = safeNumber(value);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}:${String(m).padStart(2,"0")}`;
}

function statusClass(status){
  const s = String(status || "").toLowerCase();
  if(s.includes("pend") || s.includes("rascunho")) return "orange";
  if(s.includes("atras") || s.includes("neg") || s.includes("fal")) return "red";
  if(s.includes("concl") || s.includes("aprov") || s.includes("public")) return "green";
  return "blue";
}

function miniBar(value, max=100){
  const width = Math.max(0, Math.min(100, safeNumber(value) / max * 100));
  return `<div class="mini-progress"><span style="width:${width}%"></span></div>`;
}

function sparkline(values, cls="blue"){
  const nums = values.map(safeNumber);
  const max = Math.max(...nums, 1);
  const points = nums.map((v,i) => {
    const x = (i/(nums.length-1 || 1))*100;
    const y = 100 - (v/max)*78 - 10;
    return `${x},${y}`;
  }).join(" ");
  return `<svg class="sparkline ${cls}" viewBox="0 0 100 100" preserveAspectRatio="none">
    <polyline points="${points}" />
  </svg>`;
}

function donut(percent, label, cls="green"){
  const p = Math.max(0, Math.min(100, safeNumber(percent)));
  return `<div class="donut ${cls}" style="--p:${p}">
    <div><strong>${Math.round(p)}%</strong><span>${label}</span></div>
  </div>`;
}

function getCurrentSetorLabel(){
  return isAdmin() ? "Todos os setores" : (currentUser?.setorNome || currentUser?.setor || "Setor");
}

function colaboradoresDoSetor(){
  return visible(state.colaboradores).filter(x => x.ativo !== false);
}

function getColaboradorNome(item){
  return item?.nome || item?.colaborador || item?.colaboradorNome || "Colaborador";
}

function groupBySetor(list){
  const map = new Map();
  list.forEach(item => {
    const key = item.setorNome || item.setor || "Sem setor";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()];
}

function createDemoWeekRows(colaboradores){
  const dias = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const turnos = [
    { label:"Manhã", time:"06:00 - 14:00", cls:"manha" },
    { label:"Tarde", time:"14:00 - 22:00", cls:"tarde" },
    { label:"Noite", time:"22:00 - 06:00", cls:"noite" },
    { label:"Folga", time:"", cls:"folga" }
  ];
  return colaboradores.slice(0,8).map((c, row) => ({
    nome: getColaboradorNome(c),
    cargo: c.cargo || c.funcao || "Colaborador",
    dias: dias.map((d, i) => turnos[(row + i) % turnos.length])
  }));
}

function pageButton(id, label, cls="primary-small"){
  return `<button class="${cls}" id="${id}" type="button">${label}</button>`;
}

function renderInicio(){
  const colaboradores = visible(state.colaboradores).filter(x=>x.ativo !== false);
  const escalas = visible(state.escalas).filter(x=>x.ativo !== false);
  const avisos = visible(state.avisosRH).filter(x=>x.ativo !== false);
  const banco = visible(state.bancoHoras).filter(x=>x.ativo !== false);
  const planos = visible(state.planosAcao).filter(x=>x.ativo !== false);
  const eventos = visible(state.eventos).filter(x=>x.ativo !== false);
  const ferias = visible(state.ferias).filter(x=>x.ativo !== false);
  const faltas = visible(state.faltas).filter(x=>x.ativo !== false);
  const atestados = visible(state.atestados).filter(x=>x.ativo !== false);

  const aniversariantes = colaboradores.filter(c => {
    const d = c.dataNascimento || c.nascimento || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && Number(d.slice(5,7)) === monthNow();
  });

  const avisosPendentes = avisos.filter(a => (a.status || "pendente") === "pendente").length;
  const feriasProg = ferias.filter(f => (f.status || "programada").toLowerCase().includes("program")).length || ferias.length;
  const saldo = sumSaldoHoras(banco);
  const planosAndamento = planos.filter(p => String(p.status || "").toLowerCase().includes("andamento")).length;
  const planosConcluidos = planos.filter(p => String(p.status || "").toLowerCase().includes("concl")).length;
  const planosPercent = planos.length ? (planosConcluidos / planos.length * 100) : 0;

  setTitle("Dashboard", "Visão geral da Gestão de Pessoas");
  content.innerHTML = `
    <section class="pro-dashboard">
      <div class="dash-header">
        <div>
          <span class="eyebrow">Aplicativo RH</span>
          <h2>Resumo Geral</h2>
          <p>${isAdmin() ? "Indicadores gerais do sistema." : `Indicadores do setor ${getCurrentSetorLabel()}.`}</p>
        </div>
        <div class="dash-actions">
          ${pageButton("btnDashboardAviso","Enviar aviso ao RH")}
          ${pageButton("btnDashboardEscala","Nova escala","outline-pro")}
        </div>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <div class="metric-icon blue">👥</div>
          <div>
            <h3>Colaboradores ativos</h3>
            <strong>${colaboradores.length}</strong>
            <small>Somente dados cadastrados no Firebase</small>
          </div>
          ${sparkline([1,2,1,3,2,4,5,4,6],"blue")}
        </article>

        <article class="metric-card">
          <div class="metric-icon purple">🎂</div>
          <div>
            <h3>Aniversariantes do mês</h3>
            <strong>${aniversariantes.length}</strong>
            <small>${aniversariantes.length ? "Com data de nascimento cadastrada" : "Nenhum aniversariante neste mês"}</small>
          </div>
          <div class="mini-bars">${[30,55,22,70,35,48,25,62].map(v=>`<i style="height:${v}%"></i>`).join("")}</div>
        </article>

        <article class="metric-card">
          <div class="metric-icon green">🌴</div>
          <div>
            <h3>Férias programadas</h3>
            <strong>${feriasProg}</strong>
            <small>Registros ativos no Firebase</small>
          </div>
          ${donut(ferias.length ? (feriasProg/ferias.length*100) : 0, "programadas", "green")}
        </article>

        <article class="metric-card">
          <div class="metric-icon orange">🔔</div>
          <div>
            <h3>Avisos pendentes</h3>
            <strong>${avisosPendentes}</strong>
            <small>Atestado, banco de horas e faltas</small>
          </div>
          ${sparkline([2,1,3,2,4,3,3,5,2],"orange")}
        </article>

        <article class="metric-card">
          <div class="metric-icon blue">⏱️</div>
          <div>
            <h3>Banco de horas</h3>
            <strong>${fmtHorasDecimal(saldo)}</strong>
            <small>${saldo >= 0 ? "saldo positivo" : "saldo negativo"}</small>
          </div>
          <div class="bar-chart">${banco.slice(0,8).map(b=>`<span class="${safeNumber(b.saldoHoras) >= 0 ? "pos" : "neg"}" style="height:${Math.min(86, Math.max(14, Math.abs(safeNumber(b.saldoHoras))*8))}%"></span>`).join("") || `<span class="pos" style="height:18%"></span>`}</div>
        </article>

        <article class="metric-card">
          <div class="metric-icon red">⚠️</div>
          <div>
            <h3>Faltas / Atestados</h3>
            <strong>${faltas.length + atestados.length}</strong>
            <small>Registros ativos</small>
          </div>
          ${sparkline([1,2,1,3,2,2,3],"red")}
        </article>

        <article class="metric-card">
          <div class="metric-icon blue">✅</div>
          <div>
            <h3>Planos de ação</h3>
            <strong>${planos.length}</strong>
            <small>${planosAndamento} em andamento</small>
          </div>
          ${donut(planosPercent, "concluídos", "blue")}
        </article>

        <article class="metric-card">
          <div class="metric-icon orange">🎉</div>
          <div>
            <h3>Eventos</h3>
            <strong>${eventos.length}</strong>
            <small>Eventos cadastrados</small>
          </div>
          <div class="event-list-mini">
            ${eventos.slice(0,3).map(e=>`<div><b>${fmt(e.dataEvento || e.data)}</b><span>${fmt(e.titulo)}</span></div>`).join("") || `<div><b>—</b><span>Nenhum evento</span></div>`}
          </div>
        </article>
      </div>

      <div class="dash-panels">
        <section class="pro-panel wide">
          <div class="panel-header-pro">
            <h3>Distribuição por setor</h3>
            <button class="text-action" id="btnVerColaboradores">Ver colaboradores</button>
          </div>
          <div class="sector-bars">
            ${groupBySetor(colaboradores).slice(0,6).map(([setor,total]) => `
              <div>
                <span>${setor}</span>
                ${miniBar(total, Math.max(colaboradores.length,1))}
                <strong>${total}</strong>
              </div>`).join("") || `<div class="empty compact">Nenhum colaborador cadastrado.</div>`}
          </div>
        </section>

        <section class="pro-panel">
          <div class="panel-header-pro">
            <h3>Avisos recentes</h3>
            <button class="text-action" id="btnAvisosRecentes">Enviar aviso</button>
          </div>
          ${tableAvisos(avisos.slice(0,5))}
        </section>
      </div>
    </section>`;

  $("#btnDashboardAviso").addEventListener("click", openAvisoModal);
  $("#btnDashboardEscala").addEventListener("click", openEscalaModal);
  $("#btnVerColaboradores").addEventListener("click", () => renderPage("colaboradores"));
  $("#btnAvisosRecentes").addEventListener("click", openAvisoModal);
}

function empty(text){ return `<div class="empty">${text}</div>`; }

function tableAvisos(list){
  if(!list.length) return empty("Nenhum aviso cadastrado ainda.");
  return `<div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Colaborador</th><th>Setor</th><th>Status</th><th>Data</th></tr></thead><tbody>
    ${list.map(a=>`<tr><td>${fmt(a.titulo || a.tipo)}</td><td>${fmt(a.colaborador)}</td><td>${fmt(a.setorNome || a.setor)}</td><td>${badge(a.status || "pendente")}</td><td>${fmt(a.dataEnvio)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function badge(status){
  const s = String(status || "").toLowerCase();
  const cls = s.includes("pend") ? "orange" : s.includes("resol") || s.includes("conclu") || s.includes("aprov") ? "green" : s.includes("atras") || s.includes("neg") ? "red" : "blue";
  return `<span class="badge ${cls}">${fmt(status)}</span>`;
}

function renderColaboradores(){
  const list = visible(state.colaboradores).filter(x=>x.ativo !== false);
  setTitle("Colaboradores", isAdmin() ? "Cadastro geral" : `Colaboradores do setor ${currentUser.setorNome || currentUser.setor}`);
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Lista de colaboradores</h2><button class="primary-small" id="newColab">Novo colaborador</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Setor</th><th>Status</th><th>Nascimento</th></tr></thead><tbody>
        ${list.map(c=>`<tr><td>${fmt(c.nome)}</td><td>${fmt(c.setorNome || c.setor)}</td><td>${badge(c.ativo === false ? "inativo" : "ativo")}</td><td>${fmt(c.dataNascimento)}</td></tr>`).join("")}
      </tbody></table></div>` : empty("Nenhum colaborador cadastrado ainda.")}
    </div>`;
  $("#newColab").addEventListener("click", openColaboradorModal);
}

function renderEscalas(){
  const escalas = visible(state.escalas).filter(x=>x.ativo !== false);
  const colaboradores = colaboradoresDoSetor();
  const rows = createDemoWeekRows(colaboradores.length ? colaboradores : [
    {nome:"Colaborador Modelo", cargo:"Operador"}
  ]);
  const setorLabel = getCurrentSetorLabel();

  setTitle("Escalas", "Visualize e gerencie as escalas da equipe por período.");
  content.innerHTML = `
    <section class="schedule-page">
      <div class="dash-header">
        <div>
          <span class="eyebrow">Gestão de Pessoas</span>
          <h2>Escalas por Setor</h2>
          <p>${setorLabel}</p>
        </div>
        <div class="dash-actions">
          ${pageButton("btnNovaEscala","＋ Nova escala")}
          ${pageButton("btnPublicarEscala","✈ Publicar escala","success-pro")}
          ${pageButton("btnExportarEscala","⇩ Exportar","outline-pro")}
        </div>
      </div>

      <div class="schedule-layout">
        <section class="schedule-main pro-panel">
          <div class="schedule-toolbar">
            <label>Setor
              <select id="escalaSetorFiltro">${setorOptions(isAdmin())}</select>
            </label>
            <label>Período
              <input type="text" id="escalaPeriodo" value="Semana atual" readonly />
            </label>
            <button class="outline-pro" id="btnHojeEscala">Hoje</button>
          </div>

          <div class="schedule-table">
            <table>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Seg</th>
                  <th>Ter</th>
                  <th>Qua</th>
                  <th>Qui</th>
                  <th>Sex</th>
                  <th>Sáb</th>
                  <th>Dom</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    <td>
                      <div class="person-cell">
                        <span>${initial(row.nome)}</span>
                        <div><strong>${row.nome}</strong><small>${row.cargo}</small></div>
                      </div>
                    </td>
                    ${row.dias.map(t => `<td><button class="shift ${t.cls}" type="button" data-shift="${t.label}"><strong>${t.label}</strong><small>${t.time}</small></button></td>`).join("")}
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>

          <div class="legend">
            <span><i class="manha"></i> Manhã 06:00 - 14:00</span>
            <span><i class="tarde"></i> Tarde 14:00 - 22:00</span>
            <span><i class="noite"></i> Noite 22:00 - 06:00</span>
            <span><i class="folga"></i> Folga</span>
          </div>
        </section>

        <aside class="schedule-side">
          <section class="pro-panel">
            <h3>Resumo do setor</h3>
            <strong class="green-text">${setorLabel}</strong>
            <div class="side-stats">
              <div><span>Colaboradores</span><b>${colaboradores.length}</b></div>
              <div><span>Escalas</span><b>${escalas.length}</b></div>
              <div><span>Cobertura</span><b>100%</b></div>
              <div><span>Pendências</span><b>${escalas.filter(e => String(e.status||"").includes("rascunho")).length}</b></div>
            </div>
          </section>

          <section class="pro-panel">
            <h3>Escalas cadastradas</h3>
            ${escalas.length ? `<div class="simple-list">
              ${escalas.slice(0,5).map(e=>`<div><strong>${fmt(e.setorNome || e.setor)}</strong><span>${fmt(e.dataInicio)} a ${fmt(e.dataFim)} · ${badge(e.status || "rascunho")}</span></div>`).join("")}
            </div>` : empty("Nenhuma escala cadastrada ainda.")}
          </section>
        </aside>
      </div>
    </section>`;

  $("#btnNovaEscala").addEventListener("click", openEscalaModal);
  $("#btnPublicarEscala").addEventListener("click", () => showToast("Escala pronta para publicação. Use Nova escala para salvar no Firebase."));
  $("#btnExportarEscala").addEventListener("click", () => showToast("Exportação preparada para a próxima etapa."));
  $("#btnHojeEscala").addEventListener("click", () => showToast("Período ajustado para hoje."));
  document.querySelectorAll(".shift").forEach(btn => btn.addEventListener("click", () => showToast(`Turno selecionado: ${btn.dataset.shift}`)));
}

function renderAvisos(){
  const list = isAdmin() ? state.avisosRH.filter(x=>x.ativo!==false) : state.avisosRH.filter(x=>x.ativo!==false && x.enviadoPor === currentUser.usuario || x.setor === currentUser.setor);
  setTitle("Avisos RH", "Atestado, Banco de Horas e Faltas enviados para Jessica/RH");
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Avisos enviados</h2><button class="primary-small" id="newAviso">Enviar aviso</button></div>
      ${tableAvisos(list)}
    </div>`;
  $("#newAviso").addEventListener("click", openAvisoModal);
}

function renderBancoHoras(){
  const banco = visible(state.bancoHoras).filter(x=>x.ativo !== false);
  const colaboradores = colaboradoresDoSetor();
  const positivos = banco.filter(b => safeNumber(b.saldoHoras) > 0);
  const negativos = banco.filter(b => safeNumber(b.saldoHoras) < 0);
  const saldoPositivo = sumSaldoHoras(positivos);
  const saldoNegativo = sumSaldoHoras(negativos);
  const pagos = banco.filter(b => String(b.tipoSaldo || "").toLowerCase().includes("pago"));
  const criticos = negativos.length;

  const linhas = banco.length ? banco : colaboradores.slice(0,6).map(c => ({
    colaborador: getColaboradorNome(c),
    setorNome: c.setorNome || c.setor,
    saldoHoras: 0,
    tipoSaldo:"neutro",
    observacao:"Sem saldo cadastrado"
  }));

  setTitle("Banco de Horas", "Saldos cadastrados por colaborador.");
  content.innerHTML = `
    <section class="hours-page">
      <div class="dash-header">
        <div>
          <span class="eyebrow">Gestão de Pessoas</span>
          <h2>Banco de Horas</h2>
          <p>Acompanhe saldo positivo, saldo negativo e planos de regularização.</p>
        </div>
        <div class="dash-actions">
          ${pageButton("btnNovoBanco","＋ Novo registro")}
          ${pageButton("btnExportarBanco","⇩ Exportar","outline-pro")}
        </div>
      </div>

      <div class="metric-grid hours">
        <article class="metric-card">
          <div class="metric-icon blue">⏱️</div>
          <div><h3>Saldo positivo</h3><strong>${fmtHorasDecimal(saldoPositivo)}</strong><small>Horas</small></div>
        </article>
        <article class="metric-card">
          <div class="metric-icon red">⏱️</div>
          <div><h3>Saldo negativo</h3><strong>${fmtHorasDecimal(saldoNegativo)}</strong><small>Horas</small></div>
        </article>
        <article class="metric-card">
          <div class="metric-icon green">💳</div>
          <div><h3>Horas pagas</h3><strong>${pagos.length}</strong><small>Registros pagos</small></div>
        </article>
        <article class="metric-card">
          <div class="metric-icon orange">👥</div>
          <div><h3>Críticos</h3><strong>${criticos}</strong><small>Colaboradores com saldo negativo</small></div>
        </article>
      </div>

      <div class="hours-layout">
        <section class="pro-panel wide">
          <div class="panel-header-pro">
            <h3>Saldo por colaborador</h3>
            <input class="pro-search" id="searchBanco" placeholder="Buscar colaborador..." />
          </div>
          <div class="table-wrap pro-table">
            <table>
              <thead><tr><th>Colaborador</th><th>Setor</th><th>Saldo</th><th>Status</th><th>Observação</th><th>Ações</th></tr></thead>
              <tbody>
                ${linhas.map(b => {
                  const saldo = safeNumber(b.saldoHoras);
                  return `<tr>
                    <td><div class="person-cell"><span>${initial(b.colaborador || b.nome || "C")}</span><div><strong>${fmt(b.colaborador || b.nome)}</strong><small>${fmt(b.matricula || "")}</small></div></div></td>
                    <td>${fmt(b.setorNome || b.setor)}</td>
                    <td class="${saldo >= 0 ? "green-text" : "red-text"}"><strong>${fmtHorasDecimal(saldo)}</strong></td>
                    <td>${badge(b.tipoSaldo || (saldo > 0 ? "positivo" : saldo < 0 ? "negativo" : "neutro"))}</td>
                    <td>${fmt(b.observacao)}</td>
                    <td><button class="icon-action blue" type="button">⏱️</button><button class="icon-action green" type="button">💰</button><button class="icon-action orange" type="button">📋</button></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </section>

        <aside class="schedule-side">
          <section class="pro-panel">
            <h3>Saldo por setor</h3>
            ${donut(banco.length ? (positivos.length / banco.length * 100) : 0, "positivos", "blue")}
            <div class="sector-bars compact-bars">
              ${groupBySetor(banco).slice(0,5).map(([setor,total]) => `
                <div><span>${setor}</span>${miniBar(total, Math.max(banco.length,1))}<strong>${total}</strong></div>`).join("") || `<div class="empty compact">Sem registros.</div>`}
            </div>
          </section>

          <section class="pro-panel">
            <h3>Evolução do saldo</h3>
            ${sparkline([3,4,5,4,6,7,6,8],"blue")}
            ${sparkline([2,2,3,2,3,4,3,3],"green")}
            ${sparkline([4,3,3,2,2,1,2,1],"red")}
            <div class="legend mini">
              <span><i class="noite"></i> Saldo positivo</span>
              <span><i class="manha"></i> Horas pagas</span>
              <span><i class="negativo"></i> Saldo negativo</span>
            </div>
          </section>
        </aside>
      </div>
    </section>`;

  $("#btnNovoBanco").addEventListener("click", openBancoModal);
  $("#btnExportarBanco").addEventListener("click", () => showToast("Exportação preparada para a próxima etapa."));
  document.querySelectorAll(".icon-action").forEach(btn => btn.addEventListener("click", () => showToast("Ação selecionada. A edição detalhada entra na próxima etapa.")));
  const search = $("#searchBanco");
  if(search){
    search.addEventListener("input", () => {
      const q = normalize(search.value);
      document.querySelectorAll(".pro-table tbody tr").forEach(tr => {
        tr.style.display = normalize(tr.textContent).includes(q) ? "" : "none";
      });
    });
  }
}

function renderPlanos(){
  const list = visible(state.planosAcao).filter(x=>x.ativo !== false);
  setTitle("Planos de Ação", "Acompanhamento de redução ou pagamento de horas");
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Planos cadastrados</h2><button class="primary-small" id="newPlano">Novo plano</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Título</th><th>Setor</th><th>Status</th><th>Prazo</th><th>Progresso</th><th>Responsável</th></tr></thead><tbody>
        ${list.map(p=>`<tr><td>${fmt(p.titulo)}</td><td>${fmt(p.setorNome || p.setor)}</td><td>${badge(p.status || "planejado")}</td><td>${fmt(p.prazo)}</td><td>${fmt(p.progresso)}%</td><td>${fmt(p.responsavel)}</td></tr>`).join("")}
      </tbody></table></div>` : empty("Nenhum plano de ação cadastrado ainda.")}
    </div>`;
  $("#newPlano").addEventListener("click", openPlanoModal);
}

function renderEventos(){
  const list = visible(state.eventos).filter(x=>x.ativo !== false);
  setTitle("Eventos", "Eventos cadastrados no mês");
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Eventos</h2><button class="primary-small" id="newEvento">Novo evento</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Título</th><th>Data</th><th>Hora</th><th>Setor</th><th>Tipo</th><th>Descrição</th></tr></thead><tbody>
        ${list.map(e=>`<tr><td>${fmt(e.titulo)}</td><td>${fmt(e.dataEvento)}</td><td>${fmt(e.hora)}</td><td>${fmt(e.setorNome || e.setor)}</td><td>${badge(e.tipo || "evento")}</td><td>${fmt(e.descricao)}</td></tr>`).join("")}
      </tbody></table></div>` : empty("Nenhum evento cadastrado ainda.")}
    </div>`;
  $("#newEvento").addEventListener("click", openEventoModal);
}

function renderFerias(){
  const list = visible(state.ferias).filter(x=>x.ativo !== false);
  setTitle("Férias", "Férias programadas por setor");
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Férias programadas</h2><button class="primary-small" id="newFerias">Nova férias</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Setor</th><th>Início</th><th>Fim</th><th>Dias</th><th>Status</th></tr></thead><tbody>
        ${list.map(f=>`<tr><td>${fmt(f.colaborador)}</td><td>${fmt(f.setorNome || f.setor)}</td><td>${fmt(f.dataInicio)}</td><td>${fmt(f.dataFim)}</td><td>${fmt(f.dias)}</td><td>${badge(f.status || "programada")}</td></tr>`).join("")}
      </tbody></table></div>` : empty("Nenhuma férias cadastrada ainda.")}
    </div>`;
  $("#newFerias").addEventListener("click", openFeriasModal);
}

function openModal(title, body){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  $("#modal").classList.remove("hidden");
}
function closeModal(){ $("#modal").classList.add("hidden"); $("#modalBody").innerHTML = ""; }
$("#closeModal").addEventListener("click", closeModal);
$("#modal").addEventListener("click",(e)=>{ if(e.target.id === "modal") closeModal(); });

function setorOptions(includeTodos=false){
  const setores = state.setores.filter(s=>s.ativo!==false);
  const base = includeTodos ? `<option value="todos" data-name="Todos">Todos</option>` : "";
  if(!isAdmin()) return `<option value="${userSetor()}" data-name="${currentUser.setorNome || userSetor()}">${currentUser.setorNome || userSetor()}</option>`;
  return base + setores.map(s=>`<option value="${s.id}" data-name="${s.nome || s.id}">${s.nome || s.id}</option>`).join("");
}
function selectedSetor(select){
  const opt = select.options[select.selectedIndex];
  return { setor: select.value, setorNome: opt?.dataset?.name || select.value };
}

function openPasswordModal(){
  openModal("Troque sua senha", `<form id="passForm" class="form-grid">
    <div class="full"><label>Nova senha</label><input id="novaSenha" type="password" maxlength="4" inputmode="numeric" required></div>
    <div class="full"><label>Confirmar senha</label><input id="confirmaSenha" type="password" maxlength="4" inputmode="numeric" required></div>
    <button class="full" type="submit">Salvar nova senha</button>
  </form>`);
  $("#passForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const nova = $("#novaSenha").value.trim(), conf = $("#confirmaSenha").value.trim();
    if(!/^\d{4}$/.test(nova)) return showToast("A senha precisa ter 4 números.");
    if(nova !== conf) return showToast("As senhas não conferem.");
    await updateDoc(doc(db,"usuarios",currentUserId),{senha:nova,senhaAlterada:true,atualizadoEm:serverTimestamp()});
    currentUser.senhaAlterada = true;
    closeModal(); showToast("Senha alterada.");
  });
}

function openForgotModal(){
  openModal("Recuperar acesso", `<p>Procure a Jessica/RH ou um administrador para redefinir sua senha no cadastro de usuários.</p><button class="primary-button" id="okForgot">Entendi</button>`);
  $("#okForgot").addEventListener("click", closeModal);
}

function openAvisoModal(){
  openModal("Enviar aviso para o RH", `<form id="avisoForm" class="form-grid">
    <div><label>Tipo</label><select id="avisoTipo"><option value="atestado">Atestado</option><option value="banco_horas">Banco de Horas</option><option value="faltas">Faltas</option></select></div>
    <div><label>Data</label><input id="avisoData" type="date" value="${today()}"></div>
    <div class="full"><label>Colaborador</label><input id="avisoColaborador" required placeholder="Nome do colaborador"></div>
    <div class="full"><label>Mensagem</label><textarea id="avisoMensagem" rows="4" required placeholder="Descreva a informação para o RH"></textarea></div>
    <button class="full" type="submit">Enviar para Jessica</button>
  </form>`);
  $("#avisoForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const tipo = $("#avisoTipo").value;
    await addDoc(collection(db,"avisosRH"),{
      tipo, titulo: tipo === "atestado" ? "Atestado" : tipo === "banco_horas" ? "Banco de Horas" : "Faltas",
      colaborador: $("#avisoColaborador").value.trim(),
      mensagem: $("#avisoMensagem").value.trim(),
      setor: isAdmin() ? "todos" : currentUser.setor,
      setorNome: isAdmin() ? "Todos" : currentUser.setorNome,
      enviadoPor: currentUser.usuario, enviadoPorNome: currentUser.nome || currentUser.usuario,
      destinatario:"jessica", destinatarioNome:"Jessica", status:"pendente", lido:false, ativo:true,
      dataEnvio: $("#avisoData").value || today(), criadoEm:serverTimestamp(), atualizadoEm:serverTimestamp()
    });
    closeModal(); await loadCollection("avisosRH"); renderPage(currentPage); showToast("Aviso enviado para o RH.");
  });
}

function openColaboradorModal(){
  openModal("Novo colaborador", `<form id="colabForm" class="form-grid">
    <div class="full"><label>Nome</label><input id="colNome" required></div>
    <div><label>Setor</label><select id="colSetor">${setorOptions()}</select></div>
    <div><label>Data de nascimento</label><input id="colNasc" type="date"></div>
    <button class="full" type="submit">Salvar colaborador</button>
  </form>`);
  $("#colabForm").addEventListener("submit", async e=>{
    e.preventDefault(); const s = selectedSetor($("#colSetor"));
    await addDoc(collection(db,"colaboradores"),{nome:$("#colNome").value.trim(),setor:s.setor,setorNome:s.setorNome,dataNascimento:$("#colNasc").value,ativo:true,criadoPor:currentUser.usuario,criadoEm:serverTimestamp()});
    closeModal(); await loadCollection("colaboradores"); renderPage("colaboradores"); showToast("Colaborador cadastrado.");
  });
}

function openEscalaModal(){
  openModal("Nova escala", `<form id="escalaForm" class="form-grid">
    <div><label>Setor</label><select id="escSetor">${setorOptions(isAdmin())}</select></div>
    <div><label>Status</label><select id="escStatus"><option value="rascunho">Rascunho</option><option value="publicada">Publicada</option></select></div>
    <div><label>Início</label><input id="escInicio" type="date" required></div>
    <div><label>Fim</label><input id="escFim" type="date" required></div>
    <div class="full"><label>Observação</label><textarea id="escObs" rows="3"></textarea></div>
    <button class="full" type="submit">Salvar escala</button>
  </form>`);
  $("#escalaForm").addEventListener("submit", async e=>{
    e.preventDefault(); const s = selectedSetor($("#escSetor"));
    await addDoc(collection(db,"escalas"),{setor:s.setor,setorNome:s.setorNome,dataInicio:$("#escInicio").value,dataFim:$("#escFim").value,status:$("#escStatus").value,observacao:$("#escObs").value.trim(),criadoPor:currentUser.usuario,criadoPorNome:currentUser.nome || currentUser.usuario,ativo:true,criadoEm:serverTimestamp()});
    closeModal(); await loadCollection("escalas"); renderPage("escalas"); showToast("Escala salva.");
  });
}

function openBancoModal(){
  openModal("Novo banco de horas", `<form id="bancoForm" class="form-grid">
    <div class="full"><label>Colaborador</label><input id="bhColab" required></div>
    <div><label>Setor</label><select id="bhSetor">${setorOptions()}</select></div>
    <div><label>Saldo de horas</label><input id="bhSaldo" type="number" step="0.01" value="0"></div>
    <div><label>Tipo</label><select id="bhTipo"><option value="neutro">Neutro</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option><option value="pago">Pago</option></select></div>
    <div class="full"><label>Observação</label><textarea id="bhObs" rows="3"></textarea></div>
    <button class="full" type="submit">Salvar banco de horas</button>
  </form>`);
  $("#bancoForm").addEventListener("submit", async e=>{
    e.preventDefault(); const s = selectedSetor($("#bhSetor"));
    await addDoc(collection(db,"bancoHoras"),{colaborador:$("#bhColab").value.trim(),setor:s.setor,setorNome:s.setorNome,saldoHoras:Number($("#bhSaldo").value || 0),tipoSaldo:$("#bhTipo").value,observacao:$("#bhObs").value.trim(),ultimaAtualizacao:today(),ativo:true,criadoPor:currentUser.usuario,criadoEm:serverTimestamp()});
    closeModal(); await loadCollection("bancoHoras"); renderPage("bancoHoras"); showToast("Banco de horas salvo.");
  });
}

function openPlanoModal(){
  openModal("Novo plano de ação", `<form id="planoForm" class="form-grid">
    <div class="full"><label>Título</label><input id="plTitulo" required></div>
    <div><label>Setor</label><select id="plSetor">${setorOptions()}</select></div>
    <div><label>Prazo</label><input id="plPrazo" type="date"></div>
    <div><label>Prioridade</label><select id="plPrior"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
    <div><label>Status</label><select id="plStatus"><option value="planejado">Planejado</option><option value="em_andamento">Em andamento</option><option value="concluido">Concluído</option></select></div>
    <div><label>Progresso %</label><input id="plProg" type="number" min="0" max="100" value="0"></div>
    <div class="full"><label>Descrição</label><textarea id="plDesc" rows="4"></textarea></div>
    <button class="full" type="submit">Salvar plano</button>
  </form>`);
  $("#planoForm").addEventListener("submit", async e=>{
    e.preventDefault(); const s = selectedSetor($("#plSetor"));
    await addDoc(collection(db,"planosAcao"),{titulo:$("#plTitulo").value.trim(),setor:s.setor,setorNome:s.setorNome,prazo:$("#plPrazo").value,prioridade:$("#plPrior").value,status:$("#plStatus").value,progresso:Number($("#plProg").value || 0),descricao:$("#plDesc").value.trim(),responsavel:currentUser.nome || currentUser.usuario,dataInicio:today(),ativo:true,criadoPor:currentUser.usuario,criadoEm:serverTimestamp()});
    closeModal(); await loadCollection("planosAcao"); renderPage("planosAcao"); showToast("Plano salvo.");
  });
}

function openEventoModal(){
  openModal("Novo evento", `<form id="eventoForm" class="form-grid">
    <div class="full"><label>Título</label><input id="evTitulo" required></div>
    <div><label>Setor</label><select id="evSetor">${setorOptions(true)}</select></div>
    <div><label>Data</label><input id="evData" type="date" required></div>
    <div><label>Hora</label><input id="evHora" type="time"></div>
    <div><label>Tipo</label><input id="evTipo" placeholder="Treinamento, reunião, campanha..."></div>
    <div class="full"><label>Descrição</label><textarea id="evDesc" rows="3"></textarea></div>
    <button class="full" type="submit">Salvar evento</button>
  </form>`);
  $("#eventoForm").addEventListener("submit", async e=>{
    e.preventDefault(); const s = selectedSetor($("#evSetor"));
    await addDoc(collection(db,"eventos"),{titulo:$("#evTitulo").value.trim(),setor:s.setor,setorNome:s.setorNome,dataEvento:$("#evData").value,hora:$("#evHora").value,tipo:$("#evTipo").value.trim() || "evento",descricao:$("#evDesc").value.trim(),criadoPor:currentUser.usuario,ativo:true,criadoEm:serverTimestamp()});
    closeModal(); await loadCollection("eventos"); renderPage("eventos"); showToast("Evento salvo.");
  });
}

function openFeriasModal(){
  openModal("Nova férias", `<form id="feriasForm" class="form-grid">
    <div class="full"><label>Colaborador</label><input id="feColab" required></div>
    <div><label>Setor</label><select id="feSetor">${setorOptions()}</select></div>
    <div><label>Início</label><input id="feInicio" type="date" required></div>
    <div><label>Fim</label><input id="feFim" type="date" required></div>
    <div><label>Dias</label><input id="feDias" type="number" min="1" value="15"></div>
    <div><label>Status</label><select id="feStatus"><option value="programada">Programada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></select></div>
    <button class="full" type="submit">Salvar férias</button>
  </form>`);
  $("#feriasForm").addEventListener("submit", async e=>{
    e.preventDefault(); const s = selectedSetor($("#feSetor"));
    await addDoc(collection(db,"ferias"),{colaborador:$("#feColab").value.trim(),setor:s.setor,setorNome:s.setorNome,dataInicio:$("#feInicio").value,dataFim:$("#feFim").value,dias:Number($("#feDias").value || 0),status:$("#feStatus").value,registradoPor:currentUser.usuario,ativo:true,criadoEm:serverTimestamp()});
    closeModal(); await loadCollection("ferias"); renderPage("ferias"); showToast("Férias salva.");
  });
}

async function clearOldCaches(){
  if(!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => !k.includes("spani-rh-tema-crud-v22")).map(k => caches.delete(k)));
}
async function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register(`./service-worker.js?v=${APP_VERSION}`, {updateViaCache:"none"});
    if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
  }catch(e){ console.warn(e); }
}
rememberLoad();
clearOldCaches();
registerSW();

const menuBtn = document.querySelector("#menuBtn");
if (menuBtn) {
  menuBtn.addEventListener("click", () => document.body.classList.toggle("menu-open"));
}
document.addEventListener("click", (event) => {
  if (window.innerWidth <= 850 && document.body.classList.contains("menu-open")) {
    const insideSidebar = event.target.closest(".sidebar");
    const clickedMenu = event.target.closest("#menuBtn");
    const clickedNav = event.target.closest(".nav-button");
    if ((!insideSidebar && !clickedMenu) || clickedNav) document.body.classList.remove("menu-open");
  }
});


/* ===== v22: tema claro/escuro e edição/exclusão de registros ===== */
function applyThemeV22(theme){
  document.body.classList.toggle("light-theme", theme === "light");
  localStorage.setItem("spaniTheme", theme);
  const btn = document.querySelector("#themeToggleBtn");
  if(btn) btn.textContent = theme === "light" ? "☀️" : "☾";
}
function initThemeV22(){
  applyThemeV22(localStorage.getItem("spaniTheme") || "dark");
  document.querySelector("#themeToggleBtn")?.addEventListener("click", () => {
    applyThemeV22(document.body.classList.contains("light-theme") ? "dark" : "light");
  });
}

function collectionForPageV22(page){
  return {
    colaboradores:"colaboradores",
    escalas:"escalas",
    avisosRH:"avisosRH",
    bancoHoras:"bancoHoras",
    planosAcao:"planosAcao",
    eventos:"eventos",
    ferias:"ferias"
  }[page] || null;
}
function listForPageV22(page){
  const col = collectionForPageV22(page);
  if(!col) return [];
  if(page === "avisosRH"){
    return isAdmin() ? state.avisosRH.filter(x=>x.ativo!==false) : state.avisosRH.filter(x=>x.ativo!==false && (x.enviadoPor === currentUser.usuario || x.setor === currentUser.setor));
  }
  return visible(state[col]).filter(x=>x.ativo!==false);
}
function escV22(v){
  return String(v ?? "").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function actionsV22(page, id){
  return `<div class="row-actions-v22">
    <button type="button" class="edit-v22" data-page="${page}" data-id="${id}" title="Editar">✏️</button>
    <button type="button" class="delete-v22" data-page="${page}" data-id="${id}" title="Apagar">🗑️</button>
  </div>`;
}
function enhanceCrudV22(){
  const col = collectionForPageV22(currentPage);
  if(!col) return;
  const list = listForPageV22(currentPage);

  // Tabelas da página atual
  document.querySelectorAll(".content table").forEach(table => {
    if(table.dataset.crudV22 === "1") return;
    const rows = [...table.querySelectorAll("tbody tr")];
    if(!rows.length || !list.length) return;
    const head = table.querySelector("thead tr");
    if(head && !head.querySelector(".crud-head-v22")){
      head.insertAdjacentHTML("beforeend", `<th class="crud-head-v22">Ações</th>`);
    }
    rows.forEach((tr, i) => {
      const item = list[i];
      if(!item?.id || tr.querySelector(".row-actions-v22")) return;
      tr.insertAdjacentHTML("beforeend", `<td>${actionsV22(currentPage, item.id)}</td>`);
    });
    table.dataset.crudV22 = "1";
  });

  // Lista lateral das escalas
  if(currentPage === "escalas"){
    document.querySelectorAll(".simple-list > div").forEach((div, i) => {
      const item = list[i];
      if(item?.id && !div.querySelector(".row-actions-v22")){
        div.insertAdjacentHTML("beforeend", actionsV22("escalas", item.id));
      }
    });
  }

  document.querySelectorAll(".edit-v22").forEach(btn => btn.onclick = () => openEditV22(btn.dataset.page, btn.dataset.id));
  document.querySelectorAll(".delete-v22").forEach(btn => btn.onclick = () => deleteItemV22(btn.dataset.page, btn.dataset.id));
}
function itemV22(page, id){
  const col = collectionForPageV22(page);
  return (state[col] || []).find(x => x.id === id);
}
async function saveEditV22(page, id, payload){
  const col = collectionForPageV22(page);
  await updateDoc(doc(db, col, id), {...payload, atualizadoEm: serverTimestamp()});
  closeModal();
  await loadCollection(col);
  renderPage(page);
  showToast("Registro atualizado.");
}
async function deleteItemV22(page, id){
  const col = collectionForPageV22(page);
  const item = itemV22(page, id);
  if(!col || !item) return showToast("Registro não encontrado.");
  const label = item.nome || item.titulo || item.colaborador || item.setorNome || "este registro";
  if(!confirm(`Apagar ${label}?`)) return;
  try{
    // Apaga visualmente sem destruir histórico: todos os relatórios já filtram ativo !== false.
    await updateDoc(doc(db, col, id), {ativo:false, apagadoEm:serverTimestamp(), apagadoPor:currentUser?.usuario || ""});
    await loadCollection(col);
    renderPage(page);
    showToast("Registro apagado.");
  }catch(err){
    console.error(err);
    showToast("Erro ao apagar no Firebase.");
  }
}
function openEditV22(page, id){
  const item = itemV22(page, id);
  if(!item) return showToast("Registro não encontrado.");

  if(page === "colaboradores"){
    openModal("Editar colaborador", `<form id="editV22" class="form-grid">
      <div class="full"><label>Nome</label><input id="eNome" value="${escV22(item.nome)}" required></div>
      <div><label>Setor</label><select id="eSetor">${setorOptions()}</select></div>
      <div><label>Data de nascimento</label><input id="eNasc" type="date" value="${escV22(item.dataNascimento)}"></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#eSetor").value = item.setor || $("#eSetor").value;
    $("#editV22").onsubmit = e => {e.preventDefault(); const s=selectedSetor($("#eSetor")); saveEditV22(page,id,{nome:$("#eNome").value.trim(),setor:s.setor,setorNome:s.setorNome,dataNascimento:$("#eNasc").value});};
    return;
  }

  if(page === "escalas"){
    openModal("Editar escala", `<form id="editV22" class="form-grid">
      <div><label>Setor</label><select id="eSetor">${setorOptions(isAdmin())}</select></div>
      <div><label>Status</label><select id="eStatus"><option value="rascunho">Rascunho</option><option value="publicada">Publicada</option></select></div>
      <div><label>Início</label><input id="eInicio" type="date" value="${escV22(item.dataInicio)}" required></div>
      <div><label>Fim</label><input id="eFim" type="date" value="${escV22(item.dataFim)}" required></div>
      <div class="full"><label>Observação</label><textarea id="eObs" rows="3">${escV22(item.observacao)}</textarea></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#eSetor").value = item.setor || $("#eSetor").value; $("#eStatus").value = item.status || "rascunho";
    $("#editV22").onsubmit = e => {e.preventDefault(); const s=selectedSetor($("#eSetor")); saveEditV22(page,id,{setor:s.setor,setorNome:s.setorNome,status:$("#eStatus").value,dataInicio:$("#eInicio").value,dataFim:$("#eFim").value,observacao:$("#eObs").value.trim()});};
    return;
  }

  if(page === "avisosRH"){
    openModal("Editar aviso", `<form id="editV22" class="form-grid">
      <div><label>Tipo</label><select id="eTipo"><option value="atestado">Atestado</option><option value="banco_horas">Banco de Horas</option><option value="faltas">Faltas</option></select></div>
      <div><label>Status</label><select id="eStatus"><option value="pendente">Pendente</option><option value="resolvido">Resolvido</option></select></div>
      <div class="full"><label>Colaborador</label><input id="eColab" value="${escV22(item.colaborador)}" required></div>
      <div class="full"><label>Mensagem</label><textarea id="eMsg" rows="4">${escV22(item.mensagem)}</textarea></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#eTipo").value = item.tipo || "atestado"; $("#eStatus").value = item.status || "pendente";
    $("#editV22").onsubmit = e => {e.preventDefault(); const tipo=$("#eTipo").value; saveEditV22(page,id,{tipo,status:$("#eStatus").value,colaborador:$("#eColab").value.trim(),mensagem:$("#eMsg").value.trim(),titulo:tipo==="atestado"?"Atestado":tipo==="banco_horas"?"Banco de Horas":"Faltas"});};
    return;
  }

  if(page === "bancoHoras"){
    openModal("Editar banco de horas", `<form id="editV22" class="form-grid">
      <div class="full"><label>Colaborador</label><input id="eColab" value="${escV22(item.colaborador)}" required></div>
      <div><label>Setor</label><select id="eSetor">${setorOptions()}</select></div>
      <div><label>Saldo de horas</label><input id="eSaldo" type="number" step="0.01" value="${escV22(item.saldoHoras || 0)}"></div>
      <div><label>Tipo</label><select id="eTipo"><option value="neutro">Neutro</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option><option value="pago">Pago</option></select></div>
      <div class="full"><label>Observação</label><textarea id="eObs" rows="3">${escV22(item.observacao)}</textarea></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#eSetor").value = item.setor || $("#eSetor").value; $("#eTipo").value = item.tipoSaldo || "neutro";
    $("#editV22").onsubmit = e => {e.preventDefault(); const s=selectedSetor($("#eSetor")); saveEditV22(page,id,{colaborador:$("#eColab").value.trim(),setor:s.setor,setorNome:s.setorNome,saldoHoras:Number($("#eSaldo").value||0),tipoSaldo:$("#eTipo").value,observacao:$("#eObs").value.trim(),ultimaAtualizacao:today()});};
    return;
  }

  if(page === "planosAcao"){
    openModal("Editar plano", `<form id="editV22" class="form-grid">
      <div class="full"><label>Título</label><input id="eTitulo" value="${escV22(item.titulo)}" required></div>
      <div><label>Status</label><select id="eStatus"><option value="planejado">Planejado</option><option value="em_andamento">Em andamento</option><option value="concluido">Concluído</option><option value="atrasado">Atrasado</option></select></div>
      <div><label>Prazo</label><input id="ePrazo" type="date" value="${escV22(item.prazo)}"></div>
      <div><label>Progresso %</label><input id="eProg" type="number" min="0" max="100" value="${escV22(item.progresso || 0)}"></div>
      <div class="full"><label>Descrição</label><textarea id="eDesc" rows="4">${escV22(item.descricao)}</textarea></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#eStatus").value = item.status || "planejado";
    $("#editV22").onsubmit = e => {e.preventDefault(); saveEditV22(page,id,{titulo:$("#eTitulo").value.trim(),status:$("#eStatus").value,prazo:$("#ePrazo").value,progresso:Number($("#eProg").value||0),descricao:$("#eDesc").value.trim()});};
    return;
  }

  if(page === "eventos"){
    openModal("Editar evento", `<form id="editV22" class="form-grid">
      <div class="full"><label>Título</label><input id="eTitulo" value="${escV22(item.titulo)}" required></div>
      <div><label>Data</label><input id="eData" type="date" value="${escV22(item.dataEvento)}" required></div>
      <div><label>Hora</label><input id="eHora" type="time" value="${escV22(item.hora)}"></div>
      <div><label>Tipo</label><input id="eTipo" value="${escV22(item.tipo)}"></div>
      <div class="full"><label>Descrição</label><textarea id="eDesc" rows="3">${escV22(item.descricao)}</textarea></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#editV22").onsubmit = e => {e.preventDefault(); saveEditV22(page,id,{titulo:$("#eTitulo").value.trim(),dataEvento:$("#eData").value,hora:$("#eHora").value,tipo:$("#eTipo").value.trim(),descricao:$("#eDesc").value.trim()});};
    return;
  }

  if(page === "ferias"){
    openModal("Editar férias", `<form id="editV22" class="form-grid">
      <div class="full"><label>Colaborador</label><input id="eColab" value="${escV22(item.colaborador)}" required></div>
      <div><label>Início</label><input id="eInicio" type="date" value="${escV22(item.dataInicio)}" required></div>
      <div><label>Fim</label><input id="eFim" type="date" value="${escV22(item.dataFim)}" required></div>
      <div><label>Dias</label><input id="eDias" type="number" min="1" value="${escV22(item.dias || 15)}"></div>
      <div><label>Status</label><select id="eStatus"><option value="programada">Programada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></select></div>
      <button class="full" type="submit">Salvar alterações</button>
    </form>`);
    $("#eStatus").value = item.status || "programada";
    $("#editV22").onsubmit = e => {e.preventDefault(); saveEditV22(page,id,{colaborador:$("#eColab").value.trim(),dataInicio:$("#eInicio").value,dataFim:$("#eFim").value,dias:Number($("#eDias").value||0),status:$("#eStatus").value});};
    return;
  }
}

const renderPageOriginalV22 = renderPage;
renderPage = function(page){
  renderPageOriginalV22(page);
  setTimeout(enhanceCrudV22, 0);
};

initThemeV22();
setTimeout(enhanceCrudV22, 0);
