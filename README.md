# CodeCanvas: AI-Powered Real-Time Visual Website Editor

CodeCanvas is a professional, production-oriented visual website editor and developer platform. It allows users to import HTML, CSS, and JavaScript websites, preview them inside an isolated sandboxed environment, and visually edit elements—updating text, tweaking styles, replacing images, and dragging elements—while maintaining full two-way synchronization with the underlying source code in Monaco Editor.

---

## 1. Key Features

- **Modern SaaS Dashboard**: Create new projects from templates, import existing websites (via HTML/CSS/JS code paste or ZIP upload), view recent projects, rename, delete, and export.
- **Visual Website Editor (Core Feature)**:
  - **Click-to-Edit Text**: Inline double-click text editing and sidebar text editing with instant live updates and source synchronization.
  - **Image Replacement Panel**: Select any image, input a new URL or upload replacement images with real-time asset hosting.
  - **Style Controls**: Background color, text color, typography (font family, size, weight, alignment), dimensions, layout (block, flex, grid), margins, paddings, borders, and border radius.
  - **Element Selection & Outlines**: Visual hover outlines and active selection frames.
  - **DOM Hierarchy Tree**: Interactive DOM element tree synchronized with the live preview.
- **Monaco Code Editor**:
  - Multi-tab file switching (`index.html`, `styles.css`, `script.js`, etc.).
  - Syntax highlighting, line numbers, automatic code formatting (Alt+Shift+F), search & replace.
  - Real-time debounced preview synchronization.
- **Isolated Live Preview**:
  - Sandboxed iframe with restrictive security policies (`allow-scripts allow-modals allow-same-origin`).
  - Desktop (100%), Tablet (768px), and Mobile (375px) responsive viewport toggles.
  - Live console capture: runtime errors, warnings, and console logs are routed directly into the bottom console drawer.
  - Untrusted user code is completely isolated from the FastAPI server process.
- **WebSocket Real-Time Collaboration**:
  - Real-time code and visual edit broadcasting.
  - Live collaborator presence and cursor tracking over the preview canvas.
  - User join/leave notifications and project save broadcasts.
  - Redis Pub/Sub support for multi-instance horizontal scaling.
- **Save, Snapshots & Version History**:
  - Auto-save indicators and manual version snapshot creation.
  - Complete version history with timestamps and one-click restore.
  - Project ZIP export and single-file download.
- **AI Assistant Architecture**:
  - Clean service abstraction supporting natural language visual editing commands (e.g. *"Change the header background to blue"*, *"Make this button bigger"*, *"Make the layout mobile-friendly"*).
  - Generates structured editing operations rather than blindly replacing the whole project.
  - Built-in rule-based structured assistant fallback when no OpenAI API key is configured.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS
- **Code Editor**: `@monaco-editor/react`
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Real-Time Communication**: Native WebSocket API
- **Icons**: Lucide React

### Backend
- **Framework**: Python 3.12+ / FastAPI
- **Server**: Uvicorn
- **ORM & Database**: SQLAlchemy 2.0 (Async), SQLite / PostgreSQL
- **Data Validation**: Pydantic v2
- **Real-Time**: FastAPI WebSockets + Redis Pub/Sub
- **Migrations**: Alembic
- **HTML Parsing & Sync**: BeautifulSoup4

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7
- Sandboxed preview execution environment

---

## 3. Getting Started Locally

### Prerequisites
- Python 3.12+ (or 3.14)
- Node.js 18+ and npm

### Step 1: Backend Setup
```bash
# 1. Activate virtual environment or create one
python3 -m venv .venv
source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Run database migrations (optional, migrations run automatically on startup)
cd backend
alembic upgrade head
cd ..

# 4. Start the FastAPI backend
python main.py
# Backend API will run on http://127.0.0.1:8000
# Interactive Swagger docs: http://127.0.0.1:8000/docs
```

### Step 2: Frontend Setup
```bash
# 1. In a new terminal, enter the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
# Frontend will be accessible at http://localhost:5173
```

---

## 4. Running with Docker Compose

To run the complete production-ready stack (FastAPI backend, React/Nginx frontend, PostgreSQL, and Redis):

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PostgreSQL**: `localhost:5438`
- **Redis**: `localhost:6380`

---

## 5. WebSocket Real-Time Event Protocol

WebSocket endpoint: `ws://localhost:8000/ws/projects/{project_id}`

### Client-to-Server Events
| Event | Description |
|---|---|
| `project.join` | Join collaboration room for project |
| `code.update` | Update file source code |
| `element.update` | Update element styles, text, or attributes visually |
| `element.select` | Broadcast selected element ID |
| `cursor.move` | Broadcast live mouse coordinates `(x, y)` |
| `project.save` | Trigger snapshot version creation |

### Server-to-Client Events
| Event | Description |
|---|---|
| `project.joined` | Confirms room entry with active presence list |
| `code.updated` | Relays source code update to other collaborators |
| `element.updated` | Relays synchronized visual update to other collaborators |
| `element.selected` | Highlights collaborator's selected element |
| `cursor.moved` | Updates collaborator cursor position on preview |
| `project.saved` | Broadcasts version snapshot created |
| `user.joined` / `user.left` | Collaborator presence updates |
| `error` | Error payload |

---

## 6. Running Tests

### Backend Tests
```bash
PYTHONPATH=backend pytest backend/app/tests -v
```

### Frontend Tests & Build Check
```bash
cd frontend
npm run build
```
