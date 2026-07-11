const firebaseConfig = {
  apiKey: "AIzaSyC9B_LUlxeOC-WRl9uo43pFgGnQ-OmUVn8",
  authDomain: "spani-gestaorh.firebaseapp.com",
  projectId: "spani-gestaorh",
  storageBucket: "spani-gestaorh.firebasestorage.app",
  messagingSenderId: "329068687976",
  appId: "1:329068687976:web:6fef197e23b66ba1ff01dd"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let currentUserId = null;
let currentPage = 'dashboard';
let setoresCache = [];

const menus = [
  ['dashboard','🏠','Dashboard'],
  ['colaboradores','👥','Colaboradores'],
  ['escalas','📅','Escalas'],
  ['avisos','📣','Avisos RH'],
  ['bancoHoras','⏱️','Banco de Horas'],
  ['planosAcao','✅','Planos de Ação'],
  ['eventos','⭐','Eventos'],
  ['ferias','🌴','Férias']
];

const seedUsers = {
  anizia:{nome:'Anizia',cargo:'Coordenadora',perfil:'admin',setor:'todos',acessoTotal:true,ativo:true,usuario:'anizia',senha:'4827'},
  jadson:{nome:'Jadson',cargo:'Subgerente',perfil:'admin',setor:'todos',acessoTotal:true,ativo:true,usuario:'jadson',senha:'7394'},
  jose_mathias:{nome:'José Mathias',cargo:'Gerente',perfil:'admin',setor:'todos',acessoTotal:true,ativo:true,usuario:'jose_mathias',senha:'9158'},
  jessica:{nome:'Jessica',cargo:'RH',perfil:'admin',setor:'todos',acessoTotal:true,ativo:true,usuario:'jessica',senha:'2649'},
  andre:{nome:'André',cargo:'Líder',perfil:'lider',setor:'acougue',setorNome:'Açougue',acessoTotal:false,podeCriarEscala:true,ativo:true,usuario:'andre',senha:'6382'},
  jacqueline:{nome:'Jacqueline',cargo:'Líder',perfil:'lider',setor:'pereciveis',setorNome:'Perecíveis',acessoTotal:false,podeCriarEscala:true,ativo:true,usuario:'jacqueline',senha:'5073'},
  heidi:{nome:'Heidi',cargo:'Líder',perfil:'lider',setor:'flv',setorNome:'FLV',acessoTotal:false,podeCriarEscala:true,ativo:true,usuario:'heidi',senha:'8461'},
  patricia:{nome:'Patrícia',cargo:'Líder',perfil:'lider',setor:'mercearia',setorNome:'Mercearia',acessoTotal:false,podeCriarEscala:true,ativo:true,usuario:'patricia',senha:'1937'},
  josival:{nome:'Josival',cargo:'Líder',perfil:'lider',setor:'prevencao',setorNome:'Prevenção',acessoTotal:false,podeCriarEscala:true,ativo:true,usuario:'josival',senha:'7526'},
  jose_arimateia:{nome:'José de Arimateia',cargo:'Líder',perfil:'lider',setor:'recebimento',setorNome:'Recebimento',acessoTotal:false,podeCriarEscala:true,ativo:true,usuario:'jose_arimateia',senha:'4195'}
};

const $ = id => document.getElementById(id);
const isAdmin = () => currentUser?.perfil === 'admin' || currentUser?.acessoTotal === true;
const safe = v => String(v ?? '').replace(/[&<>"]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
const today = () => new Date().toISOString().slice(0,10);

function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2800); }

async function init(){
  renderMenu();
  $('loginForm').addEventListener('submit', login);
  $('logoutBtn').addEventListener('click', logout);
  $('passwordForm').addEventListener('submit', changePassword);
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}); }
}

function renderMenu(){
  $('menu').innerHTML = menus.map(([key,icon,label])=>`<button class="navbtn ${key===currentPage?'active':''}" onclick="go('${key}')"><span>${icon}</span>${label}</button>`).join('');
}

async function login(e){
  e.preventDefault();
  const usuario = $('loginUser').value.trim().toLowerCase();
  const senha = $('loginPass').value.trim();
  try{
    const q = await db.collection('usuarios').where('usuario','==',usuario).where('senha','==',senha).where('ativo','==',true).limit(1).get();
    if(q.empty){
      const local = Object.entries(seedUsers).find(([id,u])=>u.usuario===usuario && u.senha===senha && u.ativo);
      if(!local) return toast('Usuário ou senha inválidos.');
      currentUserId = local[0]; currentUser = local[1];
    } else {
      const doc = q.docs[0]; currentUserId = doc.id; currentUser = doc.data();
    }
    $('loginScreen').classList.add('hidden'); $('appScreen').classList.remove('hidden');
    $('userName').textContent = currentUser.nome;
    $('userRole').textContent = isAdmin() ? `${currentUser.cargo} • acesso total` : `${currentUser.cargo} • ${currentUser.setorNome}`;
    $('userInitial').textContent = (currentUser.nome || 'RH').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
    await loadSetores();
    await go('dashboard');
    if(!currentUser.alterouSenha) $('passwordModal').classList.remove('hidden');
  }catch(err){ console.error(err); toast('Erro ao entrar. Verifique o Firebase e a internet.'); }
}

async function changePassword(e){
  e.preventDefault();
  const p1=$('newPass').value.trim(), p2=$('confirmPass').value.trim();
  if(!/^\d{4}$/.test(p1)) return toast('A senha precisa ter exatamente 4 números.');
  if(p1!==p2) return toast('As senhas não conferem.');
  if(!currentUserId) return;
  await db.collection('usuarios').doc(currentUserId).update({senha:p1,alterouSenha:true,ultimaTrocaSenha:today()});
  currentUser.senha=p1; currentUser.alterouSenha=true;
  $('passwordModal').classList.add('hidden');
  $('newPass').value=''; $('confirmPass').value='';
  toast('Senha alterada com sucesso.');
}

function logout(){ currentUser=null; currentUserId=null; $('appScreen').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); $('loginPass').value=''; }

async function loadSetores(){ const snap=await db.collection('setores').where('ativo','==',true).get(); setoresCache=snap.docs.map(d=>({id:d.id,...d.data()})); }

async function go(page){ currentPage=page; renderMenu();
  const titles={dashboard:['Dashboard','Visão geral da Gestão de Pessoas'],colaboradores:['Colaboradores','Cadastro e consulta por setor'],escalas:['Escalas','Líder cria escala apenas do próprio setor'],avisos:['Avisos RH','Atestado, Banco de Horas e Faltas enviados para Jessica'],bancoHoras:['Banco de Horas','Saldos e ações de redução/pagamento'],planosAcao:['Planos de Ação','Acompanhamento de pendências por setor'],eventos:['Eventos','Eventos do mês e comunicados'],ferias:['Férias','Férias programadas e retornos']};
  $('pageTitle').textContent=titles[page][0]; $('pageSubtitle').textContent=titles[page][1];
  if(page==='dashboard') return renderDashboard();
  if(page==='colaboradores') return renderColaboradores();
  if(page==='escalas') return renderEscalas();
  if(page==='avisos') return renderAvisos();
  if(page==='bancoHoras') return renderBancoHoras();
  if(page==='planosAcao') return renderPlanos();
  if(page==='eventos') return renderEventos();
  if(page==='ferias') return renderFerias();
}

function scopedQuery(col){
  let ref=db.collection(col);
  if(!isAdmin()) ref=ref.where('setor','==',currentUser.setor);
  return ref;
}

async function countCol(col){ const s=await scopedQuery(col).get(); return s.size; }

async function renderDashboard(){
  const [cols,esc,avisos,bh,planos,ev,fer] = await Promise.all(['colaboradores','escalas','avisosRH','bancoHoras','planosAcao','eventos','ferias'].map(countCol));
  $('content').innerHTML=`
    <div class="grid kpis">
      ${kpi('👥','Colaboradores',cols,'ativos/registrados')}
      ${kpi('📅','Escalas',esc,'criadas no sistema')}
      ${kpi('📣','Avisos RH',avisos,'pendentes e tratados')}
      ${kpi('⏱️','Banco de Horas',bh,'registros')}
    </div>
    <div class="grid layout">
      <div class="card"><h3>${isAdmin()?'Painel Administrativo':'Painel do Líder'}</h3><p class="muted">${isAdmin()?'Você tem acesso a todos os setores, relatórios, eventos, avisos e escalas.':'Você visualiza e altera apenas o setor '+safe(currentUser.setorNome)+'.'}</p><div class="actions"><button onclick="go('escalas')">Criar escala</button><button class="secondary" onclick="go('avisos')">Enviar aviso RH</button></div></div>
      <div class="card"><h3>Permissões</h3><p><span class="tag ${isAdmin()?'green':'orange'}">${isAdmin()?'Acesso total':'Acesso restrito'}</span></p><p class="muted">Regra principal: somente líderes criam escalas do próprio setor. Administradores visualizam e acompanham tudo.</p></div>
    </div>`;
}
function kpi(icon,title,num,sub){return `<div class="card kpi"><div>${icon}</div><div class="num">${num}</div><strong>${title}</strong><br><small>${sub}</small></div>`}
function setorOptions(selected=''){ return setoresCache.filter(s=>isAdmin()||s.id===currentUser.setor).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${safe(s.nome)}</option>`).join(''); }
function setorName(id){ return setoresCache.find(s=>s.id===id)?.nome || currentUser.setorNome || id; }

async function renderColaboradores(){
  const snap=await scopedQuery('colaboradores').get();
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.id!=='modelo');
  $('content').innerHTML=`<div class="grid layout"><div class="card"><h3>Novo colaborador</h3><form id="colForm" class="form-grid"><label>Nome<input name="nome" required></label><label>Setor<select name="setor" ${!isAdmin()?'disabled':''}>${setorOptions(currentUser.setor)}</select></label><button type="submit">Salvar colaborador</button></form></div><div class="card"><h3>Lista</h3>${table(rows,['nome','setorNome','ativo'])}</div></div>`;
  $('colForm').onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); const setor=isAdmin()?f.get('setor'):currentUser.setor; await db.collection('colaboradores').add({nome:f.get('nome'),setor,setorNome:setorName(setor),ativo:true,criadoEm:today()}); toast('Colaborador salvo.'); renderColaboradores();};
}

async function renderEscalas(){
  const snap=await scopedQuery('escalas').get();
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.id!=='modelo');
  $('content').innerHTML=`<div class="grid layout"><div class="card"><h3>Nova escala</h3><p class="muted">${isAdmin()?'Admin pode registrar/ajustar qualquer setor.':'Você só consegue criar escala de '+safe(currentUser.setorNome)+'.'}</p><form id="escalaForm" class="form-grid"><label>Setor<select name="setor" ${!isAdmin()?'disabled':''}>${setorOptions(currentUser.setor)}</select></label><label>Colaborador<input name="colaborador" required></label><label>Data<input name="data" type="date" required></label><label>Turno<select name="turno"><option>Manhã</option><option>Tarde</option><option>Noite</option><option>Folga</option></select></label><label>Horário<input name="horario" placeholder="07:00 - 15:00"></label><label class="full">Observação<textarea name="observacao"></textarea></label><button type="submit">Publicar escala</button></form></div><div class="card"><h3>Escalas cadastradas</h3>${table(rows,['setorNome','colaborador','data','turno','horario','criadoPor'])}</div></div>`;
  $('escalaForm').onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); const setor=isAdmin()?f.get('setor'):currentUser.setor; await db.collection('escalas').add({setor,setorNome:setorName(setor),colaborador:f.get('colaborador'),data:f.get('data'),turno:f.get('turno'),horario:f.get('horario'),observacao:f.get('observacao'),criadoPor:currentUser.usuario,status:'publicada',ativo:true,criadoEm:new Date().toISOString()}); toast('Escala publicada.'); renderEscalas();};
}

async function renderAvisos(){
  const snap=await scopedQuery('avisosRH').get();
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.id!=='modelo');
  $('content').innerHTML=`<div class="grid layout"><div class="card"><h3>Enviar aviso para RH - Jessica</h3><form id="avisoForm" class="form-grid"><label>Tipo<select name="tipo"><option value="atestado">Atestado</option><option value="banco_horas">Banco de Horas</option><option value="faltas">Faltas</option></select></label><label>Setor<select name="setor" ${!isAdmin()?'disabled':''}>${setorOptions(currentUser.setor)}</select></label><label>Colaborador<input name="colaborador" placeholder="Nome do colaborador" required></label><label>Data<input name="dataEnvio" type="date" value="${today()}" required></label><label class="full">Mensagem<textarea name="mensagem" placeholder="Descreva o aviso para o RH" required></textarea></label><button type="submit">Enviar para Jessica</button></form></div><div class="card"><h3>Avisos enviados/recebidos</h3>${table(rows,['tipo','setorNome','colaborador','enviadoPor','status','dataEnvio'])}</div></div>`;
  $('avisoForm').onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); const setor=isAdmin()?f.get('setor'):currentUser.setor; const tipo=f.get('tipo'); await db.collection('avisosRH').add({tipo,titulo:`Aviso de ${tipo.replace('_',' ')}`,colaborador:f.get('colaborador'),mensagem:f.get('mensagem'),setor,setorNome:setorName(setor),enviadoPor:currentUser.usuario,destinatario:'jessica',destinatarioNome:'Jessica',status:'pendente',dataEnvio:f.get('dataEnvio'),lido:false,ativo:true,criadoEm:new Date().toISOString()}); toast('Aviso enviado para Jessica.'); renderAvisos();};
}

async function renderBancoHoras(){ await genericCrud('bancoHoras','Banco de Horas',[
  ['colaborador','Colaborador','text'],['saldoHoras','Saldo de horas','number'],['tipoSaldo','Tipo','select:positivo,negativo,neutro'],['observacao','Observação','textarea']
],['colaborador','setorNome','saldoHoras','tipoSaldo','observacao']); }
async function renderPlanos(){ await genericCrud('planosAcao','Planos de Ação',[
  ['titulo','Título','text'],['prioridade','Prioridade','select:baixa,media,alta'],['prazo','Prazo','date'],['progresso','Progresso %','number'],['descricao','Descrição','textarea']
],['titulo','setorNome','responsavel','prioridade','status','progresso','prazo']); }
async function renderEventos(){ await genericCrud('eventos','Eventos',[
  ['titulo','Título','text'],['dataEvento','Data','date'],['hora','Hora','time'],['tipo','Tipo','select:reuniao,treinamento,campanha,comunicado'],['descricao','Descrição','textarea']
],['titulo','setorNome','dataEvento','hora','tipo']); }
async function renderFerias(){ await genericCrud('ferias','Férias',[
  ['colaborador','Colaborador','text'],['dataInicio','Início','date'],['dataFim','Fim','date'],['dias','Dias','number'],['status','Status','select:programada,em_andamento,finalizada']
],['colaborador','setorNome','dataInicio','dataFim','dias','status']); }

async function genericCrud(collection,title,fields,cols){
  const snap=await scopedQuery(collection).get();
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.id!=='modelo');
  const formFields = `<label>Setor<select name="setor" ${!isAdmin()?'disabled':''}>${setorOptions(currentUser.setor)}</select></label>` + fields.map(([name,label,type])=>{
    if(type==='textarea') return `<label class="full">${label}<textarea name="${name}"></textarea></label>`;
    if(type.startsWith('select:')) return `<label>${label}<select name="${name}">${type.split(':')[1].split(',').map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label>`;
    return `<label>${label}<input name="${name}" type="${type}"></label>`;
  }).join('');
  $('content').innerHTML=`<div class="grid layout"><div class="card"><h3>Novo registro - ${title}</h3><form id="genForm" class="form-grid">${formFields}<button type="submit">Salvar</button></form></div><div class="card"><h3>Registros</h3>${table(rows,cols)}</div></div>`;
  $('genForm').onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); const setor=isAdmin()?f.get('setor'):currentUser.setor; const data={setor,setorNome:setorName(setor),ativo:true,criadoPor:currentUser.usuario,criadoEm:new Date().toISOString()}; fields.forEach(([name,,type])=>{let v=f.get(name)||''; data[name]=type==='number'?Number(v||0):v;}); if(collection==='planosAcao'){data.status='em_andamento';data.responsavel=currentUser.usuario} await db.collection(collection).add(data); toast('Registro salvo.'); go(currentPage);};
}

function table(rows,cols){
  if(!rows.length) return `<div class="empty">Nenhum registro encontrado.</div>`;
  return `<div style="overflow:auto"><table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${formatCell(r[c],c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function formatCell(v,c){
  if(typeof v==='boolean') return v?'<span class="tag green">true</span>':'<span class="tag red">false</span>';
  if(c==='status') return `<span class="tag orange">${safe(v)}</span>`;
  return safe(v);
}

init();
