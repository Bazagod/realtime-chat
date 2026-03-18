# RealChat — Guide complet

## Vue d'ensemble

RealChat est une application de messagerie en temps reel construite avec une architecture moderne. Elle utilise **Next.js 14** cote frontend, **Express + Socket.io** cote backend, **PostgreSQL** pour la persistance et **Redis** pour le cache et la gestion de presence.

```
Client (Next.js :3000)
   |
   |-- REST API (HTTP) -----> Express (:4000) ----> PostgreSQL (:5433)
   |                              |
   |-- WebSocket (Socket.io) ---->|----> Redis (:6379)
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, socket.io-client, date-fns |
| Backend | Node.js, Express 4, Socket.io 4, Sequelize 6 |
| Base de donnees | PostgreSQL 16 |
| Cache / PubSub | Redis 7, ioredis, @socket.io/redis-adapter |
| Authentification | JWT (jsonwebtoken), bcryptjs |
| Proxy (prod) | Nginx |
| Deploiement | Docker, Docker Compose |

---

## Structure du projet

```
realtime-chat/
├── docker-compose.yml          # Orchestration Docker (prod)
├── nginx/
│   └── nginx.conf              # Reverse proxy + rate limiting
│
├── backend/
│   ├── .env                    # Variables d'environnement
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── index.js            # Point d'entree (Express + HTTP server)
│       ├── config/
│       │   ├── database.js     # Connexion Sequelize (PostgreSQL)
│       │   ├── redis.js        # Clients Redis (general + pub/sub)
│       │   └── env.js          # Chargement des variables .env
│       ├── middleware/
│       │   ├── auth.js         # JWT auth (HTTP + Socket.io)
│       │   └── rateLimit.js    # Limitation de debit
│       ├── models/
│       │   ├── index.js        # Associations Sequelize
│       │   ├── User.js
│       │   ├── Conversation.js
│       │   ├── ConversationMember.js
│       │   ├── Message.js
│       │   └── Notification.js
│       ├── routes/
│       │   ├── auth.js         # Register / Login / Me
│       │   ├── conversations.js# CRUD conversations
│       │   ├── messages.js     # Historique messages (pagine)
│       │   ├── users.js        # Recherche utilisateurs
│       │   └── notifications.js# Notifications non lues
│       └── services/
│           ├── socketService.js    # Logique Socket.io
│           ├── messageService.js   # Creation + cache messages
│           ├── presenceService.js  # Presence (Redis sorted set)
│           └── notificationService.js
│
└── frontend/
    ├── .env.local              # Variables d'environnement
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── layout.js       # Layout racine (AuthProvider + SocketProvider)
        │   ├── page.js         # Redirection / -> /chat ou /login
        │   ├── globals.css     # Styles Tailwind + composants custom
        │   ├── login/page.js   # Page de connexion
        │   ├── register/page.js# Page d'inscription
        │   └── chat/page.js    # Page principale du chat
        ├── components/
        │   ├── ChatSidebar.js          # Barre laterale (conversations)
        │   ├── ChatWindow.js           # Fenetre de chat (messages)
        │   ├── MessageBubble.js        # Bulle de message
        │   ├── MessageInput.js         # Zone de saisie
        │   ├── TypingIndicator.js      # Indicateur de frappe
        │   └── NewConversationModal.js # Modal nouvelle conversation
        ├── contexts/
        │   ├── AuthContext.js   # Etat d'authentification global
        │   └── SocketContext.js # Instance Socket.io globale
        └── lib/
            ├── api.js           # Client HTTP (fetch wrapper)
            └── socket.js        # Client Socket.io
```

---

## Fonctionnalites

- **Messagerie en temps reel** via WebSocket (Socket.io)
- **Conversations privees** (1-a-1) et **groupes**
- **Presence en ligne** (indicateur vert, heartbeat toutes les 30s)
- **Indicateurs de frappe** ("Alice is typing...")
- **Compteurs de messages non lus** par conversation
- **Pagination cursor-based** pour l'historique des messages
- **Recherche d'utilisateurs** par nom ou email
- **Notifications** pour les messages recus hors conversation active
- **Authentification JWT** (token dans localStorage + header HTTP + handshake Socket)
- **Limitation de debit** (Express + Nginx)
- **Reconnexion automatique** avec backoff exponentiel
- **Cache Redis** pour les messages recents (TTL 10 min)
- **Mode gracieux** si Redis est indisponible (fonctionne sans cache)
- **Responsive mobile** (sidebar toggle, bouton retour)

---

## Comment ca fonctionne

### 1. Authentification

```
[Client]                         [Backend]
   |                                |
   |-- POST /api/auth/register ---->| Cree l'utilisateur (bcrypt hash)
   |<---- { token, user } ---------|  Genere un JWT (expire 7j)
   |                                |
   |-- Stocke token localStorage    |
   |-- connectSocket(token) ------->| Socket.io handshake avec auth.token
   |<---- connection etablie -------|  JWT verifie, user attache au socket
```

Le JWT contient `{ userId }` et est verifie a chaque requete HTTP (header `Authorization: Bearer <token>`) et a chaque connexion Socket.io (dans `socket.handshake.auth.token`).

### 2. Envoi et reception de messages

```
[User A]                    [Serveur]                   [User B]
   |                           |                           |
   |-- socket.emit             |                           |
   |   "message:send"          |                           |
   |   {conversationId,        |                           |
   |    content} ------------->|                           |
   |                           |-- Sauvegarde en BDD       |
   |                           |-- Invalide cache Redis    |
   |                           |-- Met a jour updated_at   |
   |                           |                           |
   |<-- "message:new" --------|-- "message:new" --------->|
   |   (broadcast conv room)   |   (broadcast conv room)   |
   |                           |                           |
   |                           |-- Notification si B       |
   |                           |   est hors conversation   |
```

Les messages sont envoyes via Socket.io (`message:send`) et diffuses a tous les membres de la conversation via la room `conv:{conversationId}`. L'historique est charge via REST (`GET /api/messages/:conversationId`).

### 3. Systeme de presence

```
[Client]                    [Redis]                    [PostgreSQL]
   |                           |                           |
   |-- heartbeat (30s) ------->| ZADD online_users         |
   |                           | score=timestamp           |
   |                           |                           |
   |-- connect --------------->| ZADD online_users         |
   |                           |                     UPDATE users
   |                           |                     SET is_online=true
   |                           |                           |
   |-- disconnect ------------>| ZREM online_users         |
   |                           |                     UPDATE users
   |                           |                     SET is_online=false
   |                           |                           |
   |   (toutes les 60s)        |                           |
   |                           | Prune stale entries       |
   |                           | (score < now - 5min)      |
```

La presence utilise un **sorted set Redis** ou le score est le timestamp du dernier heartbeat. Les entrees plus vieilles que 5 minutes sont nettoyees automatiquement.

### 4. Rooms Socket.io

Chaque utilisateur connecte rejoint :
- `user:{userId}` — pour recevoir des events personnels (notifications, nouvelles conversations)
- `conv:{conversationId}` — pour chaque conversation dont il est membre

Quand une nouvelle conversation est creee, le createur emet `conversation:join` qui :
1. Le fait rejoindre la room `conv:{id}`
2. Notifie les autres membres via `conversation:created`
3. Fait rejoindre automatiquement les sockets des autres membres

### 5. Systeme de notifications

Quand un message est envoye :
1. Le message est diffuse a la room de conversation (`message:new`)
2. Pour chaque membre (sauf l'expediteur) :
   - Si le membre est **hors ligne** : une notification est creee en BDD
   - Un event `notification:new` est envoye a la room personnelle du membre

Cote frontend, les notifications sont affichees comme badges de compteur sur chaque conversation dans la sidebar.

---

## Endpoints API

### Authentification

| Methode | Endpoint | Description | Auth requise |
|---------|----------|-------------|:------------:|
| POST | `/api/auth/register` | Creer un compte (`{ username, email, password }`) | Non |
| POST | `/api/auth/login` | Se connecter (`{ email, password }`) | Non |
| GET | `/api/auth/me` | Utilisateur courant | Oui |

### Conversations

| Methode | Endpoint | Description | Auth requise |
|---------|----------|-------------|:------------:|
| GET | `/api/conversations` | Lister mes conversations (avec lastMessage + unreadCount) | Oui |
| POST | `/api/conversations/private` | Creer un chat prive (`{ userId }`) | Oui |
| POST | `/api/conversations/group` | Creer un groupe (`{ name, memberIds[] }`) | Oui |

### Messages

| Methode | Endpoint | Description | Auth requise |
|---------|----------|-------------|:------------:|
| GET | `/api/messages/:conversationId` | Historique pagine (`?before=&limit=`) | Oui |

### Utilisateurs

| Methode | Endpoint | Description | Auth requise |
|---------|----------|-------------|:------------:|
| GET | `/api/users/search?q=` | Rechercher (min 2 caracteres) | Oui |
| GET | `/api/users/online` | Liste des utilisateurs en ligne | Oui |

### Notifications

| Methode | Endpoint | Description | Auth requise |
|---------|----------|-------------|:------------:|
| GET | `/api/notifications` | Notifications non lues | Oui |
| POST | `/api/notifications/read` | Marquer comme lues (`{ notificationId? }`) | Oui |

### Sante

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Retourne `{ status: "ok" }` |

---

## Events Socket.io

### Client vers Serveur

| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ conversationId, content }` | Envoyer un message |
| `typing:start` | `{ conversationId }` | Indiquer que je tape |
| `typing:stop` | `{ conversationId }` | Arreter l'indicateur |
| `conversation:read` | `{ conversationId }` | Marquer comme lu |
| `conversation:join` | `{ conversationId }` | Rejoindre une room |
| `heartbeat` | — | Maintenir la presence |

### Serveur vers Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | Message complet avec sender | Nouveau message recu |
| `typing:start` | `{ userId, username, conversationId }` | Quelqu'un tape |
| `typing:stop` | `{ userId, conversationId }` | Arret de frappe |
| `user:online` | `{ userId, username }` | Utilisateur connecte |
| `user:offline` | `{ userId, username }` | Utilisateur deconnecte |
| `conversation:created` | `{ conversationId }` | Nouvelle conversation |
| `notification:new` | `{ conversationId, senderName, preview }` | Notification |

---

## Modeles de donnees

### User
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Cle primaire |
| username | VARCHAR(50) | Unique |
| email | VARCHAR(255) | Unique |
| password_hash | VARCHAR(255) | Hash bcrypt (salt 12) |
| avatar_url | VARCHAR(500) | URL avatar (optionnel) |
| is_online | BOOLEAN | Statut en ligne |
| last_seen | TIMESTAMP | Derniere activite |

### Conversation
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Cle primaire |
| type | ENUM('private','group') | Type de conversation |
| name | VARCHAR(100) | Nom du groupe (null pour prive) |
| created_by | UUID | Createur (FK -> User) |

### ConversationMember
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Cle primaire |
| conversation_id | UUID | FK -> Conversation |
| user_id | UUID | FK -> User |
| role | ENUM('admin','member') | Role dans la conversation |
| last_read_at | TIMESTAMP | Dernier message lu |

### Message
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Cle primaire |
| conversation_id | UUID | FK -> Conversation |
| sender_id | UUID | FK -> User |
| content | TEXT | Contenu du message |
| type | ENUM('text','system') | Type de message |

### Notification
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Cle primaire |
| user_id | UUID | FK -> User |
| type | VARCHAR(50) | Type de notification |
| data | JSONB | Donnees supplementaires |
| read | BOOLEAN | Lu ou non |

---

## Variables d'environnement

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://chatuser:chatpass@localhost:5433/chatdb
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-me
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

---

## Demarrage en developpement

### Prerequis

- Node.js 20+
- PostgreSQL 16
- Redis 7 (optionnel, l'app fonctionne sans)

### 1. Base de donnees

```bash
# Creer une instance PostgreSQL locale (si necessaire)
/usr/lib/postgresql/16/bin/initdb -D .pgdata -A trust -U chatuser
/usr/lib/postgresql/16/bin/pg_ctl -D .pgdata -o "-p 5433 -k /tmp" start
/usr/lib/postgresql/16/bin/createdb -h localhost -p 5433 -U chatuser chatdb
```

### 2. Backend

```bash
cd backend
npm install
# Verifier/modifier .env si besoin
node src/index.js
# => Server running on port 4000
```

Les tables sont creees automatiquement au demarrage (`sequelize.sync({ alter: true })`).

### 3. Frontend

```bash
cd frontend
npm install
npx next dev --port 3000
# => http://localhost:3000
```

### 4. Utilisation

1. Ouvrir http://localhost:3000
2. Creer un compte sur `/register`
3. Ouvrir un deuxieme navigateur (ou navigation privee) et creer un deuxieme compte
4. Rechercher l'autre utilisateur et demarrer une conversation
5. Envoyer des messages en temps reel

---

## Deploiement en production (Docker)

```bash
docker compose up --build -d
```

Cela demarre 5 services : PostgreSQL, Redis, Backend, Frontend, Nginx.

L'application est accessible sur le port **80** via Nginx.

Pour scaler le backend :

```bash
docker compose up --scale backend=3 --build -d
```

Le Redis adapter de Socket.io permet a plusieurs instances backend de partager les events en temps reel.

---

## Flux de donnees resume

```
1. L'utilisateur se connecte (POST /api/auth/login)
   -> Recoit un JWT + connecte le WebSocket

2. Le WebSocket rejoint les rooms :
   -> user:{id} (events personnels)
   -> conv:{id} (pour chaque conversation)

3. L'utilisateur envoie un message (socket "message:send")
   -> Backend sauvegarde en BDD
   -> Broadcast "message:new" a la room conv:{id}
   -> Notifications aux membres hors conversation

4. Le heartbeat maintient la presence (toutes les 30s)
   -> Redis sorted set mis a jour
   -> Nettoyage des presences inactives (>5 min) toutes les 60s

5. L'utilisateur se deconnecte
   -> Presence retiree de Redis
   -> Broadcast "user:offline" a tous
```
