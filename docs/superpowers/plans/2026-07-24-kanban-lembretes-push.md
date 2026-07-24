# Kanban Por Setores & Lembretes Push Nativos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar sistema completo de Kanban por Setores/Categorias e Lembretes Diários/Avulsos com Notificação Push Nativa (Web Push API) no Vet Farias.

**Architecture:** Tabelas `kanban_*`, `reminders_recurring` e `push_subscriptions` no Neon Postgres via `@neondatabase/serverless`. Service Worker público `/sw.js` escutando eventos de Push do navegador. Endpoint de verificação `/api/push/check-reminders` processa cartões com lembrete atingido e gera cartões automáticos para lembretes diários.

**Tech Stack:** Next.js 16 (App Router), React 19, `@neondatabase/serverless`, `web-push`, `react-icons`, Vanilla CSS (variáveis do Vet Farias).

## Global Constraints

- **Sem Tailwind CSS** nas páginas do site (usar Vanilla CSS e variáveis do `globals.css`).
- **Nenhum arquivo existente modificado** exceto `src/lib/db.js` (novas tabelas em `initDB`) e `src/components/Sidebar.js` (1 item de menu).
- **Driver de DB**: `@neondatabase/serverless` via `getSQL()` de `src/lib/db.js`.
- **Vanilla JS**: Arquivos `.js` e `.jsx` apenas (sem TypeScript).

---

### Task 1: Instalação de Dependências & VAPID Setup

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: Node.js runtime
- Produces: `web-push` package

- [ ] **Step 1: Instalar pacote web-push**

```bash
cmd /c "npm install web-push 2>&1"
```

- [ ] **Step 2: Verificar instalação no package.json**

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add web-push dependency"
```

---

### Task 2: Schema de Banco de Dados (Neon Postgres)

**Files:**
- Modify: `src/lib/db.js`

**Interfaces:**
- Consumes: `getSQL()` de `src/lib/db.js`
- Produces: Tabelas `kanban_boards`, `kanban_columns`, `kanban_cards`, `reminders_recurring`, `push_subscriptions` + funções helper de CRUD

- [ ] **Step 1: Adicionar criação de tabelas em `src/lib/db.js`**

Adicionar a função `initKanbanAndRemindersDB()` dentro de `initDB()` no `src/lib/db.js` criando as 5 tabelas e populando os 3 quadros padrão ("Recepção", "Clínica", "Cirurgias") com 3 colunas ("A Fazer", "Em Andamento", "Concluído").

- [ ] **Step 2: Adicionar funções exportadas de helper**
  - `getKanbanBoards()`
  - `getKanbanBoard(id)`
  - `createKanbanCard({ column_id, titulo, descricao, prioridade, dues_at, etiquetas })`
  - `updateKanbanCard(id, data)`
  - `moveKanbanCard(card_id, new_column_id)`
  - `deleteKanbanCard(id)`
  - `getRemindersRecurring()`
  - `createReminderRecurring({ titulo, descricao, horario, dias_semana, board_id, column_id })`
  - `savePushSubscription({ endpoint, keys, user_agent })`
  - `getPushSubscriptions()`

- [ ] **Step 3: Testar execução do script via node**

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.js
git commit -m "feat: add kanban and push reminders database tables and queries"
```

---

### Task 3: Service Worker & Web Push API Server Routes

**Files:**
- Create: `public/sw.js`
- Create: `src/app/api/push/subscribe/route.js`
- Create: `src/app/api/push/check-reminders/route.js`

**Interfaces:**
- Consumes: Browser Push API, Neon DB queries
- Produces: Endpoints `/api/push/subscribe` e `/api/push/check-reminders`

- [ ] **Step 1: Criar `public/sw.js`**

```js
self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Lembrete Vet Farias 🐾';
  const options = {
    body: data.body || 'Você tem um novo lembrete pendente!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'vet-farias-reminder',
    data: { url: data.url || '/kanban' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/kanban';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes('/kanban') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
```

- [ ] **Step 2: Criar `src/app/api/push/subscribe/route.js`**

Endpoint POST para receber subscrição Push do navegador e salvar em `push_subscriptions`.

- [ ] **Step 3: Criar `src/app/api/push/check-reminders/route.js`**

Endpoint GET/POST que busca lembretes vencidos e diários recorrentes do horário atual, gera cartões e envia notificações via `web-push`.

- [ ] **Step 4: Commit**

```bash
git add public/sw.js src/app/api/push/subscribe/route.js src/app/api/push/check-reminders/route.js
git commit -m "feat: add web push service worker and reminder check endpoints"
```

---

### Task 4: API Routes do Kanban & Lembretes

**Files:**
- Create: `src/app/api/kanban/boards/route.js`
- Create: `src/app/api/kanban/cards/route.js`
- Create: `src/app/api/reminders/route.js`

**Interfaces:**
- Consumes: Queries de `src/lib/db.js`
- Produces: REST APIs `/api/kanban/boards`, `/api/kanban/cards`, `/api/reminders`

- [ ] **Step 1: Criar `src/app/api/kanban/boards/route.js`** (GET para listar quadros com colunas e cartões)
- [ ] **Step 2: Criar `src/app/api/kanban/cards/route.js`** (POST para criar cartão, PATCH para mover/editar, DELETE para remover)
- [ ] **Step 3: Criar `src/app/api/reminders/route.js`** (GET para listar lembretes recorrentes, POST para criar, DELETE para remover)
- [ ] **Step 4: Commit**

```bash
git add src/app/api/kanban/boards/route.js src/app/api/kanban/cards/route.js src/app/api/reminders/route.js
git commit -m "feat: add kanban and reminders REST API routes"
```

---

### Task 5: Componente de Permissão Push & Polling de Lembretes

**Files:**
- Create: `src/components/PushNotificationBanner.js`

**Interfaces:**
- Consumes: Browser Notification API & ServiceWorkerContainer
- Produces: Banner discreto solicitando ativação de notificações Push no Windows/Celular + timer de polling para `/api/push/check-reminders`

- [ ] **Step 1: Criar `src/components/PushNotificationBanner.js`**
  - Registra `/sw.js`
  - Se permissão for `default`, exibe banner "Ativar Notificações no Celular/Windows 🔔"
  - Ao clicar, chama `Notification.requestPermission()` e faz POST para `/api/push/subscribe`
  - Inicia timer (a cada 60s) que faz chamada silenciosa para `/api/push/check-reminders`

- [ ] **Step 2: Adicionar `<PushNotificationBanner />` no `src/app/layout.js`**

- [ ] **Step 3: Commit**

```bash
git add src/components/PushNotificationBanner.js src/app/layout.js
git commit -m "feat: add push notification subscription banner and background reminder timer"
```

---

### Task 6: Interface do Kanban e Gerenciador de Lembretes (`/kanban`)

**Files:**
- Create: `src/app/kanban/page.js`
- Modify: `src/components/Sidebar.js`

**Interfaces:**
- Consumes: REST APIs `/api/kanban/*` e `/api/reminders`
- Produces: Página `/kanban` com visualização de quadros por setor, colunas, cartões arrastáveis e modal de lembretes diários.

- [ ] **Step 1: Modificar `src/components/Sidebar.js`** (Adicionar item `{ href: '/kanban', label: 'Kanban & Lembretes', icon: FiLayout }`)
- [ ] **Step 2: Criar `src/app/kanban/page.js`**
  - Tabs superiores (Recepção, Clínica, Cirurgias, Geral)
  - Quadros com colunas (A Fazer, Em Andamento, Concluído)
  - Botão "+ Novo Cartão" com modal para título, descrição, prioridade e data/hora do lembrete avulso
  - Botão "⏰ Lembretes Diários" para abrir modal de gestão de tarefas diárias recorrentes
  - Drag and drop / botões rápidos para mover cartão entre colunas
  - Estilização Vanilla CSS em conformidade com o Dark Theme do Vet Farias (`#0f0f14`, `#1a1a24`, `#8c69ac`)

- [ ] **Step 3: Commit**

```bash
git add src/app/kanban/page.js src/components/Sidebar.js
git commit -m "feat: add kanban board interface with reminders management"
```

---

### Task 7: Verificação do Build e Teste de Integração

- [ ] **Step 1: Testar o build local**
```bash
cmd /c "npm run build 2>&1"
```
- [ ] **Step 2: Commit final & Push para Vercel**
```bash
git push origin main
```
