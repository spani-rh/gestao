Spani Atacadista - Aplicativo RH - Gestão de Pessoas

Arquivos do PWA:
- index.html
- style.css
- script.js
- manifest.json
- service-worker.js
- assets/

Firebase já configurado no script.js:
projectId: spani-gestaorh

Login inicial conforme usuários cadastrados no Firestore:
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

Ao entrar pela primeira vez, o sistema pede troca da senha para uma nova senha de 4 dígitos.

Importante:
Este projeto usa login interno via coleção usuarios no Firestore, sem Firebase Authentication.
Antes de publicar oficialmente, revise as regras de segurança do Firestore.
