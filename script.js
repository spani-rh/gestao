
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const APP_VERSION = "5.0.0";
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

let currentUser = null;
let currentUserDocId = null;

const $ = (sel) => document.querySelector(sel);
const loginScreen = $("#loginScreen");
const appScreen = $("#appScreen");
const mockupStage = $("#mockupStage");
const loginMsg = $("#loginMsg");
const loginMsgMobile = $("#loginMsgMobile");
const toast = $("#toast");

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

function normalize(v) {
  return String(v || "").trim().toLowerCase();
}

function loadRememberedUser() {
  const remembered = localStorage.getItem("spaniRememberUser") || "";
  const checked = localStorage.getItem("spaniRememberChecked") !== "false";
  $("#rememberMe").checked = checked;
  $("#rememberMeMobile").checked = checked;
  if (remembered && checked) {
    $("#usuario").value = remembered;
    $("#usuarioMobile").value = remembered;
  }
}

function saveRememberedUser(usuario) {
  const desktopChecked = $("#rememberMe").checked;
  const mobileChecked = $("#rememberMeMobile").checked;
  const checked = window.matchMedia("(max-width: 900px)").matches ? mobileChecked : desktopChecked;
  localStorage.setItem("spaniRememberChecked", checked ? "true" : "false");
  if (checked) localStorage.setItem("spaniRememberUser", usuario || $("#usuario").value || $("#usuarioMobile").value || "");
  else localStorage.removeItem("spaniRememberUser");
}

async function findUser(usuario, senha) {
  const snap = await getDocs(collection(db, "usuarios"));
  let found = null;
  snap.forEach((d) => {
    const data = d.data();
    if (normalize(data.usuario) === normalize(usuario) && String(data.senha || "").trim() === String(senha || "").trim()) {
      found = { id: d.id, ...data };
    }
  });
  return found;
}

function isAdmin() {
  return currentUser?.perfil === "admin" || currentUser?.acessoTotal === true;
}

function setPage(page) {
  mockupStage.className = "mockup-stage";
  if (page === "dashboard") mockupStage.classList.add(isAdmin() ? "dashboard-admin" : "dashboard-lider");
  else if (page === "escalas") mockupStage.classList.add("escalas");
  else if (page === "banco") mockupStage.classList.add("banco");
  else if (page === "planos") mockupStage.classList.add("planos");
  else if (page === "avisos" || page === "colaboradores") mockupStage.classList.add("avisos");
  else if (page === "eventos") mockupStage.classList.add("eventos");
  else mockupStage.classList.add(isAdmin() ? "dashboard-admin" : "dashboard-lider");

  $("#sendAvisoBtn").style.display = "block";
  $("#newScheduleBtn").style.display = (page === "escalas" || !isAdmin()) ? "block" : "none";
}

function enterApp(user) {
  currentUser = user;
  currentUserDocId = user.id;
  saveRememberedUser(user.usuario);
  sessionStorage.setItem("spaniCurrentUser", user.id);
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  $("#userName").textContent = user.nome || user.usuario || "Usuário";
  $("#userRole").textContent = user.perfil === "admin" ? "Administrador" : `Líder - ${user.setorNome || user.setor || ""}`;
  setPage("dashboard");
  if (!user.senhaAlterada) $("#passwordModal").classList.remove("hidden");
}

async function handleLogin(usuario, senha, msgEl) {
  msgEl.textContent = "Validando acesso...";
  try {
    const user = await findUser(usuario, senha);
    if (!user || user.ativo === false) {
      msgEl.textContent = "Usuário ou senha inválidos.";
      return;
    }
    msgEl.textContent = "";
    enterApp(user);
  } catch (err) {
    console.error(err);
    msgEl.textContent = "Erro ao conectar no Firebase.";
  }
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = $("#usuario").value.trim();
  const senha = $("#senha").value.trim();
  if (!usuario || !senha) {
    loginMsg.textContent = "Preencha usuário e senha.";
    return;
  }
  await handleLogin(usuario, senha, loginMsg);
});

$("#mobileLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = $("#usuarioMobile").value.trim();
  const senha = $("#senhaMobile").value.trim();
  if (!usuario || !senha) {
    loginMsgMobile.textContent = "Preencha usuário e senha.";
    return;
  }
  await handleLogin(usuario, senha, loginMsgMobile);
});

$("#togglePassword").addEventListener("click", () => {
  const input = $("#senha");
  input.type = input.type === "password" ? "text" : "password";
});

$("#rememberMe").addEventListener("change", () => saveRememberedUser($("#usuario").value.trim()));
$("#rememberMeMobile").addEventListener("change", () => saveRememberedUser($("#usuarioMobile").value.trim()));

function openForgotModal() { $("#forgotModal").classList.remove("hidden"); }
function closeForgotModal() { $("#forgotModal").classList.add("hidden"); }
$("#forgotPasswordBtn").addEventListener("click", openForgotModal);
$("#forgotPasswordMobileBtn").addEventListener("click", openForgotModal);
$("#closeForgot").addEventListener("click", closeForgotModal);
$("#forgotOk").addEventListener("click", closeForgotModal);

$("#passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nova = $("#novaSenha").value.trim();
  const confirma = $("#confirmaSenha").value.trim();
  if (!/^\d{4}$/.test(nova)) return showToast("A senha precisa ter exatamente 4 números.");
  if (nova !== confirma) return showToast("As senhas não conferem.");
  try {
    await updateDoc(doc(db, "usuarios", currentUserDocId), {
      senha: nova,
      senhaAlterada: true,
      atualizadoEm: serverTimestamp()
    });
    currentUser.senha = nova;
    currentUser.senhaAlterada = true;
    $("#passwordModal").classList.add("hidden");
    showToast("Senha alterada com sucesso.");
  } catch (err) {
    console.error(err);
    showToast("Não foi possível alterar a senha.");
  }
});

document.querySelectorAll(".nav[data-page]").forEach((btn) => btn.addEventListener("click", () => setPage(btn.dataset.page)));

$("#logoutBtn").addEventListener("click", () => {
  currentUser = null;
  currentUserDocId = null;
  sessionStorage.removeItem("spaniCurrentUser");
  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  $("#senha").value = "";
  $("#senhaMobile").value = "";
  loginMsg.textContent = "";
  loginMsgMobile.textContent = "";
});

$("#sendAvisoBtn").addEventListener("click", () => {
  if (!currentUser) return;
  $("#avisoModal").classList.remove("hidden");
});
$("#closeAviso").addEventListener("click", () => $("#avisoModal").classList.add("hidden"));

$("#avisoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const tipo = $("#avisoTipo").value;
  const colaborador = $("#avisoColaborador").value.trim();
  const mensagem = $("#avisoMensagem").value.trim();
  try {
    await addDoc(collection(db, "avisosRH"), {
      tipo,
      titulo: tipo === "atestado" ? "Atestado" : tipo === "banco_horas" ? "Banco de Horas" : "Faltas",
      colaborador,
      mensagem,
      setor: currentUser.setor || "todos",
      setorNome: currentUser.setorNome || "Todos",
      enviadoPor: currentUser.usuario || currentUser.id,
      enviadoPorNome: currentUser.nome || currentUser.usuario,
      destinatario: "jessica",
      destinatarioNome: "Jessica",
      status: "pendente",
      lido: false,
      ativo: true,
      dataEnvio: new Date().toISOString().slice(0, 10),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    $("#avisoForm").reset();
    $("#avisoModal").classList.add("hidden");
    showToast("Aviso enviado para Jessica/RH.");
  } catch (err) {
    console.error(err);
    showToast("Erro ao enviar aviso para o RH.");
  }
});

$("#newScheduleBtn").addEventListener("click", () => {
  if (!currentUser) return;
  if (!isAdmin() && !currentUser.podeCriarEscala) return showToast("Seu perfil não tem permissão para criar escala.");
  $("#scheduleInfo").textContent = isAdmin()
    ? "Administrador pode criar/acompanhar escalas de todos os setores."
    : `Você está criando escala apenas para o setor: ${currentUser.setorNome}.`;
  $("#scheduleModal").classList.remove("hidden");
});
$("#closeSchedule").addEventListener("click", () => $("#scheduleModal").classList.add("hidden"));

$("#scheduleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  try {
    await addDoc(collection(db, "escalas"), {
      setor: isAdmin() ? "todos" : currentUser.setor,
      setorNome: isAdmin() ? "Todos" : currentUser.setorNome,
      criadoPor: currentUser.usuario || currentUser.id,
      criadoPorNome: currentUser.nome || currentUser.usuario,
      dataInicio: $("#escalaInicio").value,
      dataFim: $("#escalaFim").value,
      observacao: $("#escalaObs").value.trim(),
      status: "rascunho",
      ativo: true,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    $("#scheduleForm").reset();
    $("#scheduleModal").classList.add("hidden");
    showToast("Escala criada com sucesso.");
    setPage("escalas");
  } catch (err) {
    console.error(err);
    showToast("Erro ao criar escala.");
  }
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) event.target.classList.add("hidden");
  });
});

async function clearOldAppCaches() {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !key.includes("spani-rh-v5")).map((key) => caches.delete(key)));
  } catch (error) {
    console.warn("Não foi possível limpar caches antigos:", error);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register(`./service-worker.js?v=${APP_VERSION}`, { updateViaCache: "none" });
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showToast("Atualização encontrada. Recarregando...");
          setTimeout(() => window.location.reload(), 900);
        }
      });
    });
  } catch (error) {
    console.warn("Falha ao registrar service worker:", error);
  }
}

loadRememberedUser();
clearOldAppCaches();
registerServiceWorker();
