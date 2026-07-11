Spani Atacadista - Aplicativo RH - Gestão de Pessoas

VERSÃO FIEL AO PROTÓTIPO VISUAL

Esta versão usa as telas/mockups aprovadas como base visual em tela cheia:
- Login
- Dashboard administrativo
- Dashboard do líder
- Escalas
- Atestados/Faltas/Avisos RH
- Planos de ação
- Banco de horas
- Eventos/Férias

Firebase:
projectId: spani-gestaorh

Login inicial:
- anizia / 4827
- jadson / 7394
- jose_mathias / 9158
- jessica / 2649
- andre / 6382
- jacqueline / 5073
- heidi / 8461
- patricia / 1937
- josival / 7526
- jose_arimateia / 4195

Observações:
- No primeiro acesso, o sistema pede troca de senha.
- Líder acessa apenas seu setor.
- Líder pode enviar aviso para Jessica/RH nas opções: Atestado, Banco de Horas e Faltas.
- Líder pode criar escala apenas referente ao seu setor.
- Não usa Storage, pois não haverá anexo de PDF.


Alteração desta versão:
- Troca visual de "Dashboard" para "Início" no menu.
- Título administrativo ajustado para "Resumo Geral".
- Para líderes, a tela principal fica como "Minha Área"/resumo do setor na experiência do sistema.

- Correção da tela de login: campos e botão ficaram invisíveis sobre a arte, evitando duplicação visual.


Correções v3:
- Tela de login reconstruída com campos reais dentro da caixa correta.
- Checkbox "Lembrar meu acesso" funcional.
- Botão "Esqueceu sua senha?" funcional com orientação ao RH/Jessica.
- Cache do PWA corrigido para buscar atualizações do servidor sem depender de limpar histórico/cookies.
- Service Worker atualizado para evitar abrir versões antigas do site.


Correções v4:
- Tela de login refeita de verdade, sem usar imagem de fundo com campos/botões desenhados.
- Login limpo: apenas logo + “Gestão RH”.
- Removidos textos repetitivos “Spani Atacadista / Aplicativo RH / Gestão de Pessoas”.
- Versão responsiva para PC e celular.
- No celular, a tela de login passa a ser uma versão própria, sem sumir textos.
- Service worker alterado para não manter HTML/CSS/JS antigos em cache.
- Mantido cache apenas para imagens do app.
