
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const APP_VERSION = "10.0.0";
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
  ["inicio","🏠","Início"],
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
    $("#appScreen").classList.remove("hidden");
    $("#userName").textContent = u.nome || u.usuario;
    $("#userRole").textContent = isAdmin() ? "Administrador" : `Líder · ${u.setorNome || u.setor}`;
    $("#userInitials").textContent = initial(u.nome || u.usuario);
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

function renderInicio(){
  const colaboradores = visible(state.colaboradores).filter(x=>x.ativo !== false);
  const escalas = visible(state.escalas).filter(x=>x.ativo !== false);
  const avisos = visible(state.avisosRH).filter(x=>x.ativo !== false);
  const banco = visible(state.bancoHoras).filter(x=>x.ativo !== false);
  const planos = visible(state.planosAcao).filter(x=>x.ativo !== false);
  const eventos = visible(state.eventos).filter(x=>x.ativo !== false);
  const ferias = visible(state.ferias).filter(x=>x.ativo !== false);
  const aniversariantes = colaboradores.filter(c => {
    const d = c.dataNascimento || c.nascimento || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && Number(d.slice(5,7)) === monthNow();
  });
  const pendentes = avisos.filter(a => (a.status || "pendente") === "pendente");

  setTitle(isAdmin() ? "Resumo Geral" : "Minha Área", isAdmin() ? "Visão geral da Gestão de Pessoas" : `Resumo do setor ${currentUser.setorNome || currentUser.setor}`);
  content.innerHTML = `
    <section class="cards">
      ${card("👥","Colaboradores ativos", colaboradores.length, "Somente dados cadastrados no Firebase")}
      ${card("🎂","Aniversariantes do mês", aniversariantes.length, "Usa dataNascimento quando existir")}
      ${card("🌴","Férias programadas", ferias.length, "Registros ativos")}
      ${card("🔔","Avisos pendentes", pendentes.length, "Atestado, banco de horas e faltas")}
      ${card("📅","Escalas", escalas.length, "Escalas registradas")}
      ${card("⏱️","Banco de horas", banco.length, "Registros de saldo")}
      ${card("✅","Planos de ação", planos.length, "Planos cadastrados")}
      ${card("🎉","Eventos", eventos.length, "Eventos cadastrados")}
    </section>

    <section class="grid-two">
      <div class="panel">
        <div class="panel-header">
          <h2>Avisos recentes para o RH</h2>
          <button class="primary-small" id="newAvisoHome">Enviar aviso</button>
        </div>
        ${tableAvisos(avisos.slice(0,6))}
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Estrutura do acesso</h2></div>
        <div class="kv">
          <div><strong>${isAdmin() ? "Total" : (currentUser.setorNome || currentUser.setor)}</strong><span>Acesso atual</span></div>
          <div><strong>${isAdmin() ? "Admin" : "Líder"}</strong><span>Perfil</span></div>
          <div><strong>${state.setores.filter(s=>s.ativo!==false).length}</strong><span>Setores cadastrados</span></div>
          <div><strong>${state.usuarios.filter(u=>u.ativo!==false).length}</strong><span>Usuários ativos</span></div>
        </div>
      </div>
    </section>`;
  $("#newAvisoHome").addEventListener("click", openAvisoModal);
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
  const list = visible(state.escalas).filter(x=>x.ativo !== false);
  setTitle("Escalas", isAdmin() ? "Escalas de todos os setores" : `Escalas do setor ${currentUser.setorNome || currentUser.setor}`);
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Escalas cadastradas</h2><button class="primary-small" id="newEscala">Nova escala</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Setor</th><th>Início</th><th>Fim</th><th>Status</th><th>Criado por</th><th>Obs.</th></tr></thead><tbody>
        ${list.map(e=>`<tr><td>${fmt(e.setorNome || e.setor)}</td><td>${fmt(e.dataInicio)}</td><td>${fmt(e.dataFim)}</td><td>${badge(e.status || "rascunho")}</td><td>${fmt(e.criadoPorNome || e.criadoPor)}</td><td>${fmt(e.observacao)}</td></tr>`).join("")}
      </tbody></table></div>` : empty("Nenhuma escala cadastrada ainda.")}
    </div>`;
  $("#newEscala").addEventListener("click", openEscalaModal);
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
  const list = visible(state.bancoHoras).filter(x=>x.ativo !== false);
  setTitle("Banco de Horas", "Saldos cadastrados por colaborador");
  content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2>Banco de horas</h2><button class="primary-small" id="newBanco">Novo registro</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Setor</th><th>Saldo</th><th>Tipo</th><th>Atualização</th><th>Observação</th></tr></thead><tbody>
        ${list.map(b=>`<tr><td>${fmt(b.colaborador)}</td><td>${fmt(b.setorNome || b.setor)}</td><td>${fmt(b.saldoHoras)}</td><td>${badge(b.tipoSaldo || "neutro")}</td><td>${fmt(b.ultimaAtualizacao)}</td><td>${fmt(b.observacao)}</td></tr>`).join("")}
      </tbody></table></div>` : empty("Nenhum saldo de banco de horas cadastrado ainda.")}
    </div>`;
  $("#newBanco").addEventListener("click", openBancoModal);
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
  await Promise.all(keys.filter(k => !k.includes("spani-rh-real-v10")).map(k => caches.delete(k)));
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
