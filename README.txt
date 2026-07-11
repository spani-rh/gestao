Spani Atacadista - Gestão RH

VERSÃO REAL / USÁVEL - v8

Esta versão NÃO usa as telas de apresentação como imagem de fundo.
O sistema foi refeito em HTML, CSS e JavaScript reais.

O que usa do Firebase:
- usuarios: login, perfil, setor, acessoTotal, podeCriarEscala, senhaAlterada
- setores: lista de setores
- colaboradores: cadastro e consulta
- escalas: criação e consulta de escalas
- avisosRH: envio de aviso para Jessica/RH (Atestado, Banco de Horas, Faltas)
- bancoHoras: saldos por colaborador
- planosAcao: planos para reduzir/pagar horas
- eventos: eventos do mês
- ferias: férias programadas
- faltas/atestados: leitura futura caso você queira manter separado

Importante:
- Não há números falsos.
- Se o Firebase estiver vazio, a tela mostra zero ou “nenhum registro”.
- Líder vê apenas o próprio setor.
- Administrador vê tudo.
- Primeiro acesso solicita troca de senha quando senhaAlterada não estiver true.
- Não usa Storage/PDF.

Para subir:
1. Enviar todos os arquivos para o GitHub.
2. Abrir: https://spani-rh.github.io/gestao/?v=8


VERSÃO v9:
- Mantida a lógica funcional da v8.
- Sem telas de apresentação em imagem.
- Sem botões flutuando.
- Visual melhorado para aproximar do protótipo apresentado.
- Logo centralizado no menu e login mais profissional.
- Cache atualizado para ?v=9.


VERSÃO v10:
- Login voltou ao visual aprovado, mantendo campos reais alinhados dentro das caixas.
- Mantida a base funcional real da v8/v9 no sistema interno.
- Logo do Spani trocado pelo recorte real do mockup aprovado.
- Botões Entrar, Lembrar meu usuário e Esqueceu sua senha mantidos funcionando.
- Cache atualizado para ?v=10.


VERSÃO v11 (redesign visual):
- Login refeito do zero em HTML/CSS real (sem imagem de fundo com "zonas invisíveis" de clique).
  Antes: os campos e botões ficavam sobrepostos a uma imagem estática via posicionamento em %,
  o que quebra fácil em qualquer variação de tela/fonte. Agora é um layout de verdade,
  responsivo e sólido em qualquer dispositivo.
- Paleta alinhada à marca Spani (vermelho/dourado) em vez do azul genérico da versão anterior.
- Tipografia nova (Sora + Inter) via Google Fonts.
- Cards, tabelas, badges, modais e sidebar redesenhados com mais contraste, sombras e acabamento.
- TODA a lógica funcional (Firebase, autenticação, CRUD de cada seção, cache do PWA) foi mantida
  exatamente igual — só o visual mudou. Nenhum id/classe usado pelo script.js foi alterado.
- Cache atualizado para ?v=11 (index.html, style.css, script.js, manifest.json, service-worker.js).
- Removida a imagem assets/login-polished-reference.png (não é mais usada).
