# SAER — Painel Administrativo & Portal da Transparência

Sistema de gestão interna do **SAER (Serviço Aeropolicial)** para controle de membros, metas semanais, strikes e transparência pública.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Regras de Negócio](#-regras-de-negócio)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Configuração do Supabase](#-configuração-do-supabase)
- [Deploy](#-deploy)
- [Formato do Prompt](#-formato-do-prompt)
- [Segurança](#-segurança)
- [Roadmap](#-roadmap)

---

## 🎯 Visão Geral

O projeto é dividido em **duas áreas**:

### 🔐 Área Administrativa (requer login)

- Cadastro, edição e remoção de membros
- Registro de strikes (1x, 2x, 3x) com motivo
- Processamento automático de prompts de atividade
- Cálculo automático de metas semanais
- Painel completo de gestão

### 🌐 Portal da Transparência (público, sem login)

- Lista de membros ativos
- Status de cumprimento de meta
- Contagem de strikes
- Resumo estatístico geral
- Filtros por nome, cargo, divisão e status

---

## ✨ Funcionalidades

### Painel Administrativo

- [x] Autenticação por email e senha (Supabase Auth)
- [x] Cadastro de membros (ID, nome, divisão, cargo)
- [x] Reativação automática de membros removidos
- [x] Edição de membros com recálculo automático de meta
- [x] Remoção via soft delete (`is_active = false`)
- [x] Registro de strikes com motivo
- [x] Remoção de strike (com correção no banco)
- [x] Histórico completo de strikes por membro
- [x] Processamento em lote de prompts de atividade
- [x] Cálculo automático de meta semanal
- [x] Busca e filtros em tempo real
- [x] Toasts, modais e feedback visual

### Portal da Transparência

- [x] Lista pública de membros ativos
- [x] Status de meta (Cumprida / Incompleta / Isento)
- [x] Contagem de strikes (sem expor motivo)
- [x] Filtros por nome, cargo, divisão e status
- [x] Modal com detalhes individuais
- [x] Resumo estatístico no topo

---

## 📐 Regras de Negócio

### Metas Semanais

| Cargo / Divisão                   | Meta Semanal |
| --------------------------------- | ------------ |
| Comandante                        | **Isento**   |
| Administrador                     | **Isento**   |
| Anjo Negro Elite                  | 2h           |
| Anjo Negro (divisão PCERJ)        | 1h           |
| Anjo Negro / Elite (divisão CORE) | 30min (0.5h) |

> **Observação**: Membros da divisão **CORE** têm meta de 30 minutos, independentemente do cargo (exceto cargos isentos).

### Cálculo Automático

1. O administrador cola um ou mais prompts no painel.
2. O sistema extrai o **ID** e as **horas** de cada linha.
3. Horas do mesmo ID são **somadas**.
4. A meta do membro é recalculada conforme cargo/divisão.
5. O status final é **Cumprida** ou **Incompleta**.
6. Membros que **não aparecem** em nenhum prompt ficam com **0h** e status **Incompleta**.

### Strikes

- Máximo de **3 strikes** por membro.
- Cada strike guarda **motivo** e **data**.
- O motivo é visível **apenas no painel administrativo**.
- O portal público exibe apenas a **contagem**.

---

## 🛠 Stack Tecnológica

| Camada        | Tecnologia                           |
| ------------- | ------------------------------------ |
| Frontend      | HTML5, CSS3, JavaScript (ES Modules) |
| Backend       | Supabase (PostgreSQL + Auth + RLS)   |
| Hospedagem    | Vercel                               |
| Versionamento | Git + GitHub                         |
| Fontes        | Inter (Google Fonts)                 |

---

## 📁 Estrutura do Projeto

```
painel-admin/
├── index.html              # Tela de login (administrativo)
├── painel.html             # Painel administrativo principal
├── transparencia.html      # Portal público da transparência
├── css/
│   ├── style.css           # Estilos globais (paleta SAER)
│   └── transparencia.css   # Estilos específicos do portal público
├── js/
│   ├── supabase.js         # Cliente e configuração do Supabase
│   ├── auth.js             # Autenticação e logout
│   ├── painel.js           # Lógica do painel administrativo
│   └── transparencia.js    # Lógica do portal público
├── img/
│   ├── saer-logo.png       # Logotipo oficial do SAER
│   └── favicon.png         # Ícone da aba do navegador
├── sql/
│   └── schema.sql          # Script para configurar o banco no Supabase
└── README.md
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Node.js instalado (para servidor local)
- Uma conta no Supabase com o projeto configurado

### Passo a passo

1. **Clone o repositório**

   ```bash
   git clone https://github.com/seu-usuario/painel-admin.git
   cd painel-admin
   ```

2. **Configure o Supabase**
   - Abra `js/supabase.js`
   - Cole sua `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Settings → API no Supabase)

3. **Inicie um servidor local**

   ```bash
   npx serve .
   # ou
   python -m http.server 8080
   ```

4. **Acesse no navegador**

   ```
   http://localhost:8080
   ```

> ⚠️ **Importante**: o projeto usa `type="module"` no JavaScript, que **não funciona** abrindo o arquivo HTML diretamente (`file://`). É obrigatório usar um servidor local.

---

## 🗄 Configuração do Supabase

### 1. Criar o projeto

Acesse [supabase.com](https://supabase.com), crie um novo projeto e guarde:

- **Project URL** (Settings → API)
- **Anon Public Key** (Settings → API)

### 2. Rodar o script SQL

No painel do Supabase, vá em **SQL Editor** e cole todo o conteúdo de `sql/schema.sql`. Isso cria:

- Tabelas `members`, `weekly_records`, `strikes`
- Políticas de RLS (autenticados podem escrever, público pode ler)
- Função `calc_meta()` para cálculo de metas

### 3. Criar usuário administrador

Em **Authentication → Users → Add User**, crie um usuário com email e senha. Use essas credenciais para logar no painel.

### 4. Configurar Redirect URLs

Em **Authentication → URL Configuration**, adicione:

```
http://localhost:8080
https://seu-projeto.vercel.app
```

---

## 🌐 Deploy

### Vercel (recomendado)

1. Faça o push do repositório para o GitHub
2. Acesse [vercel.com/new](https://vercel.com/new)
3. Conecte a conta do GitHub e importe o repositório
4. Configuração:
   - **Framework Preset**: `Other`
   - **Build Command**: (deixe vazio)
   - **Output Directory**: (deixe vazio)
5. Clique em **Deploy**

A partir daí, todo `git push` na branch `main` atualiza o site automaticamente em ~30 segundos.

### Variáveis de ambiente (opcional)

Para não expor as chaves do Supabase no código, configure em **Settings → Environment Variables** do Vercel:

| Nome                | Valor                     |
| ------------------- | ------------------------- |
| `SUPABASE_URL`      | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `sua-anon-key`            |

---

## 📝 Formato do Prompt

O painel administrativo aceita prompts no seguinte formato (um por linha):

```
@[INV 2ª] Panda Tenebras | 2111 | 998727354908155988 — 22h:51min:26s
```

### Como o sistema interpreta

- **`2111`** → ID do membro (usado para localizar o cadastro)
- **`22h:51min:26s`** → tempo total (convertido para horas decimais)

### Comportamento

- Múltiplas linhas com o **mesmo ID** somam as horas
- IDs não cadastrados são listados em uma mensagem de aviso
- Membros cadastrados que **não aparecem** no prompt ficam com 0h

---

## 🔐 Segurança

O projeto usa **Row Level Security (RLS)** do Supabase para proteger os dados.

| Tabela           | Anon (público)               | Authenticated (admin)             |
| ---------------- | ---------------------------- | --------------------------------- |
| `members`        | SELECT apenas membros ativos | SELECT / INSERT / UPDATE / DELETE |
| `weekly_records` | SELECT                       | SELECT / INSERT / UPDATE / DELETE |
| `strikes`        | ❌ sem acesso                | SELECT / INSERT / UPDATE / DELETE |

**Boas práticas implementadas:**

- Chave `anon` do Supabase é pública por design — a proteção está no RLS
- Portal público **nunca** expõe motivos de strikes
- Membros inativos não aparecem na listagem pública
- Toda escrita exige autenticação

---

## 🗺 Roadmap

Ideias para evoluções futuras:

- [ ] Histórico de semanas anteriores no portal público
- [ ] Seletor de semana no painel administrativo
- [ ] Página individual por membro (`transparencia.html?id=2111`)
- [ ] Exportação em CSV dos dados
- [ ] Gráficos de desempenho por divisão
- [ ] Notificações por Discord (webhook) ao receber strike
- [ ] Dashboard com métricas históricas
- [ ] Múltiplos níveis de admin (super admin / moderador)

---

## 📄 Licença

Projeto de uso interno do **SAER — Serviço Aeropolicial**. Todos os direitos reservados.

---

## 👥 Créditos

Desenvolvido para a **Polícia Civil RJ / CORE** — Operações Aéreas.