# Alliny Maia

Site e plataforma da consultoria de imagem e estilo de Alliny Maia: site público, painel da consultora, área da cliente com dossiê e servidor MCP para uso com o Claude.

## Estado atual

O repositório contém o plano completo e o app Next.js na raiz. O site público que está no ar é a landing do app, publicada pelo Netlify a partir da `main`. O restante do app é construído task a task, a partir do backlog.

## Por onde começar

| Quero | Leia |
| --- | --- |
| Entender o sistema | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Ver fases, riscos e insumos | [docs/PLANO.md](docs/PLANO.md) |
| Saber o que fazer agora | [BACKLOG.md](BACKLOG.md) |
| Entender o processo com agentes | [agent-pipeline.md](agent-pipeline.md) |
| Montar o ambiente | [docs/SETUP.md](docs/SETUP.md) |
| Ver por que cada decisão foi tomada | [docs/adr/](docs/adr/README.md) |

## Como trabalhar

```bash
git clone https://github.com/BrenoCabral/Alliny-Maia.git
cd Alliny-Maia
code .
```

Abra o Claude Code na raiz e peça a próxima task do backlog. O [CLAUDE.md](CLAUDE.md) manda seguir o pipeline `pm -> architect -> dev-planner -> dev-implementer`. Cada task deixa seus documentos em `tasks/T-XXX-slug/`.

## Stack

Next.js e TypeScript, Supabase (Postgres com RLS, Auth, Storage), MCP próprio com OAuth, Netlify. Ambientes: local em Docker e produção.
