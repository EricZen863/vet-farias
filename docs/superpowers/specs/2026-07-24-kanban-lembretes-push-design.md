# Especificação Técnica: Kanban Por Setores & Sistema de Lembretes Push Nativos

**Data:** 2026-07-24  
**Projeto:** Vet Farias - Gestão Interna  
**Status:** Aprovado  

---

## 1. Visão Geral

Integrar ao sistema Vet Farias um gerenciador completo de **Kanban por Setores/Categorias** e um **Sistema de Lembretes Diários e Avulsos com Notificação Push Nativa** (Web Push API + Service Worker) compatível com Windows Desktop e Celulares (Android/iOS PWA).

Os lembretes diários recorrentes criam automaticamente cartões no Kanban no setor/coluna configurados no momento em que a notificação Push é disparada.

---

## 2. Arquitetura de Banco de Dados (Neon Postgres)

Serão criadas 5 novas tabelas no banco de dados Neon Postgres através de `initKanbanAndRemindersDB()` em `src/lib/db.js`:

### 2.1 `kanban_boards`
- `id` SERIAL PRIMARY KEY
- `nome` VARCHAR(100) NOT NULL (ex: "Recepção", "Clínica", "Cirurgias", "Geral")
- `cor` VARCHAR(20) DEFAULT '#8c69ac'
- `created_at` TIMESTAMP DEFAULT NOW()

### 2.2 `kanban_columns`
- `id` SERIAL PRIMARY KEY
- `board_id` INTEGER REFERENCES kanban_boards(id) ON DELETE CASCADE
- `nome` VARCHAR(100) NOT NULL (ex: "A Fazer", "Em Andamento", "Concluído")
- `ordem` INTEGER NOT NULL DEFAULT 0
- `created_at` TIMESTAMP DEFAULT NOW()

### 2.3 `kanban_cards`
- `id` SERIAL PRIMARY KEY
- `column_id` INTEGER REFERENCES kanban_columns(id) ON DELETE CASCADE
- `titulo` VARCHAR(250) NOT NULL
- `descricao` TEXT
- `prioridade` VARCHAR(20) DEFAULT 'media' ('alta', 'media', 'baixa')
- `dues_at` TIMESTAMP (Data/hora do lembrete avulso)
- `lembrete_enviado` BOOLEAN DEFAULT false
- `etiquetas` JSONB DEFAULT '[]'
- `ordem` INTEGER DEFAULT 0
- `created_at` TIMESTAMP DEFAULT NOW()

### 2.4 `reminders_recurring`
- `id` SERIAL PRIMARY KEY
- `titulo` VARCHAR(250) NOT NULL
- `descricao` TEXT
- `horario` VARCHAR(5) NOT NULL (Formato "HH:mm", ex: "08:00")
- `dias_semana` JSONB DEFAULT '[0,1,2,3,4,5,6]' (Array de dias 0-Domingo a 6-Sábado)
- `board_id` INTEGER REFERENCES kanban_boards(id) ON DELETE CASCADE
- `column_id` INTEGER REFERENCES kanban_columns(id) ON DELETE CASCADE
- `ativo` BOOLEAN DEFAULT true
- `ultimo_disparo` DATE
- `created_at` TIMESTAMP DEFAULT NOW()

### 2.5 `push_subscriptions`
- `id` SERIAL PRIMARY KEY
- `endpoint` TEXT UNIQUE NOT NULL
- `keys` JSONB NOT NULL (p256dh, auth)
- `user_agent` TEXT
- `created_at` TIMESTAMP DEFAULT NOW()

---

## 3. Web Push API & Service Worker

- **VAPID Keys**: Geradas e salvas em `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `process.env.VAPID_PRIVATE_KEY` (com fallback auto-gerado para dev).
- **Service Worker (`public/sw.js`)**:
  - Escuta evento `'push'` e exibe notificação nativa do Windows/OS com título, ícone da clínica 🐾, mensagem e tag.
  - Escuta evento `'notificationclick'` para focar/abrir a aba do Kanban `/kanban`.
- **Inscrição do Cliente**: Componente `PushNotificationBanner.js` solicita permissão nativa de notificação no topo do app e registra a subscrição via `POST /api/push/subscribe`.

---

## 4. Cron Job & Verificação de Lembretes

- **Endpoint `/api/push/check-reminders`**:
  - Verificação de Lembretes Avulsos: busca `kanban_cards` onde `dues_at <= NOW()` e `lembrete_enviado = false`. Dispara Push + marca `lembrete_enviado = true`.
  - Verificação de Lembretes Diários: busca `reminders_recurring` ativos onde horário bate com horário atual e `ultimo_disparo < HOJE`. Cria cartão automático na coluna do Kanban configurada + dispara Push + atualiza `ultimo_disparo = HOJE`.

---

## 5. Interface do Usuário (`/kanban`)

- **Seletor de Setores/Quadros**: Tabs superiores para alternar entre Recepção, Clínica, Cirurgias ou criar novo Quadro.
- **Quadro Kanban**:
  - Colunas arrastáveis/reordenáveis com indicador de contagem de cartões.
  - Cartões com tag de prioridade colorida, data de vencimento/lembrete e botão de mover/deletar.
- **Gerenciador de Lembretes Diários**: Modal para cadastrar tarefas recorrentes diárias ("Limpeza de Canil às 08:00", "Balanço às 18:00").
- **Design System**: Vanilla CSS usando variáveis existentes do Vet Farias (`--bg-card`, `--primary`, `--border`, etc.).

---

## 6. Navegação

- Item adicionado ao `src/components/Sidebar.js`:
  - `href: '/kanban'`, `label: 'Kanban & Lembretes'`, `icon: FiLayout`
