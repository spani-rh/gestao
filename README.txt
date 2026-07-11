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
