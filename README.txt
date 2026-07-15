Spani Atacadista - Gestão RH
Versão v20 - Correção visual do login

Base:
- Mantida a base v13, onde o login da Jessica funcionava.

Correção:
- Corrigido o problema em que a tela de entrada continuava aparecendo por cima do sistema após o login.
- O erro era CSS: a classe da fachada usava display:grid!important e vencia a classe hidden.
- Agora #loginScreen.hidden força display:none.
- O texto "Validando acesso..." é limpo após entrar.

Abrir:
https://spani-rh.github.io/gestao/?v=20
