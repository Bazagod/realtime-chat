# RealChat — Real-time Chat Application

A production-grade, scalable real-time chat application built with modern web technologies.

## Architecture Overview

```
┌─────────┐      ┌─────────────┐      ┌──────────────┐
│  Nginx  │──────│  Next.js    │      │  PostgreSQL  │
│  :80    │      │  Frontend   │      │  :5432       │
│         │      │  :3000      │      └──────┬───────┘
│         │      └─────────────┘             │
│         │      ┌─────────────┐      ┌──────┴───────┐
│         │──────│  Express +  │──────│   Redis      │
│         │      │  Socket.io  │      │   :6379      │
│         │      │  :4000      │      │  (pub/sub +  │
└─────────┘      └─────────────┘      │   caching)   │
                                      └──────────────┘
```

### Key Design Decisions

- **Event-driven architecture**: Socket.io with Redis adapter enables horizontal scaling — multiple backend instances share real-time events through Redis pub/sub
- **Presence via Redis sorted sets**: User heartbeats stored with timestamps allow efficient stale-session pruning
- **Cursor-based pagination**: Messages use `before` timestamp cursor instead of offset, ensuring consistent pagination under concurrent writes
- **Separation of concerns**: REST API for CRUD operations, WebSocket for real-time events

## Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Frontend   | Next.js 14, React, Tailwind CSS |
| Backend    | Node.js, Express, Socket.io   |
| Database   | PostgreSQL 16                  |
| Cache/PubSub | Redis 7                      |
| Proxy      | Nginx                          |
| Containers | Docker, Docker Compose         |

## Features

- **Real-time messaging** — instant message delivery via WebSocket
- **Online/offline status** — Redis-backed presence with heartbeat
- **Typing indicators** — broadcast to conversation members
- **Private & group chats** — flexible conversation model
- **Message persistence** — PostgreSQL with Sequelize ORM
- **Notifications** — in-app notifications for offline users
- **JWT authentication** — secure token-based auth
- **Rate limiting** — Express + Nginx dual-layer protection
- **Reconnect logic** — automatic reconnection with exponential backoff
- **Message caching** — Redis caches recent messages (10 min TTL)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker (recommended)

```bash
cd realtime-chat
docker compose up --build
```

The app will be available at:
- **Frontend**: http://localhost (via Nginx) or http://localhost:3000
- **Backend API**: http://localhost/api or http://localhost:4000/api
- **WebSocket**: ws://localhost/socket.io

### Local Development

**1. Start infrastructure:**

```bash
docker compose up postgres redis -d
```

**2. Backend:**

```bash
cd backend
npm install
npm run dev
```

**3. Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
realtime-chat/
├── docker-compose.yml          # Service orchestration
├── nginx/
│   └── nginx.conf              # Reverse proxy + rate limiting
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Entry point — Express + Socket.io server
│       ├── config/
│       │   ├── database.js     # Sequelize (PostgreSQL) connection pool
│       │   ├── redis.js        # Redis clients (general + pub/sub pair)
│       │   └── env.js          # Centralised environment config
│       ├── middleware/
│       │   ├── auth.js         # JWT verification (HTTP + WebSocket)
│       │   └── rateLimit.js    # Express rate limiting
│       ├── models/
│       │   ├── User.js
│       │   ├── Conversation.js
│       │   ├── ConversationMember.js
│       │   ├── Message.js
│       │   ├── Notification.js
│       │   └── index.js        # Associations & model registry
│       ├── routes/
│       │   ├── auth.js         # Register / Login / Me
│       │   ├── conversations.js # CRUD conversations
│       │   ├── messages.js     # Paginated message history
│       │   ├── users.js        # User search + online list
│       │   └── notifications.js
│       └── services/
│           ├── socketService.js     # Socket.io event handlers
│           ├── messageService.js    # Message creation + caching
│           ├── presenceService.js   # Online/offline via Redis
│           └── notificationService.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.js       # Root layout with providers
│       │   ├── page.js         # Auth redirect
│       │   ├── login/page.js
│       │   ├── register/page.js
│       │   └── chat/page.js    # Main chat interface
│       ├── components/
│       │   ├── ChatSidebar.js
│       │   ├── ChatWindow.js
│       │   ├── MessageBubble.js
│       │   ├── MessageInput.js
│       │   ├── TypingIndicator.js
│       │   └── NewConversationModal.js
│       ├── contexts/
│       │   ├── AuthContext.js   # Auth state + token management
│       │   └── SocketContext.js # Socket.io connection state
│       └── lib/
│           ├── api.js          # REST API client
│           └── socket.js       # Socket.io client + reconnection
└── README.md
```

## API Endpoints

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| POST   | /api/auth/register      | Create new account       |
| POST   | /api/auth/login         | Sign in                  |
| GET    | /api/auth/me            | Get current user         |
| GET    | /api/conversations      | List user conversations  |
| POST   | /api/conversations/private | Create private chat    |
| POST   | /api/conversations/group | Create group chat       |
| GET    | /api/messages/:convId   | Get messages (paginated) |
| GET    | /api/users/search?q=    | Search users             |
| GET    | /api/users/online       | List online users        |
| GET    | /api/notifications      | Get unread notifications |
| POST   | /api/notifications/read | Mark notifications read  |

## WebSocket Events

| Event              | Direction       | Description                          |
| ------------------ | --------------- | ------------------------------------ |
| message:send       | Client → Server | Send a message                       |
| message:new        | Server → Client | New message in a conversation        |
| typing:start       | Bidirectional   | User started typing                  |
| typing:stop        | Bidirectional   | User stopped typing                  |
| user:online        | Server → Client | User came online                     |
| user:offline       | Server → Client | User went offline                    |
| conversation:read  | Client → Server | Mark conversation as read            |
| conversation:join  | Client → Server | Join a conversation room             |
| notification:new   | Server → Client | New notification                     |
| heartbeat          | Client → Server | Keep presence alive                  |

## Scaling

To scale the backend horizontally:

```bash
docker compose up --scale backend=3 --build
```

The Redis adapter ensures all Socket.io instances share events. Nginx automatically load-balances across backend replicas.

## Environment Variables

### Backend
| Variable       | Default                                        | Description           |
| -------------- | ---------------------------------------------- | --------------------- |
| PORT           | 4000                                           | Server port           |
| DATABASE_URL   | postgres://chatuser:chatpass@localhost:5432/chatdb | PostgreSQL URL     |
| REDIS_URL      | redis://localhost:6379                          | Redis URL             |
| JWT_SECRET     | dev-secret-change-me                           | JWT signing secret    |
| JWT_EXPIRY     | 7d                                             | Token expiry          |
| CORS_ORIGIN    | http://localhost:3000                           | Allowed CORS origin   |

### Frontend
| Variable              | Default                    | Description       |
| --------------------- | -------------------------- | ----------------- |
| NEXT_PUBLIC_API_URL   | http://localhost:4000/api  | Backend API URL   |
| NEXT_PUBLIC_WS_URL    | http://localhost:4000      | WebSocket URL     |

## License

MIT
