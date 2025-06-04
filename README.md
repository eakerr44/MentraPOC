# Mentra - AI-Native Learning Platform

An AI-native learning platform that preserves the essence of education while evolving its function for the post-AI world.

## Overview

Mentra demonstrates intelligent scaffolding, personalized reflection, and multi-stakeholder engagement for students, teachers, and parents. Unlike traditional edtech tools that focus on task completion, Mentra emphasizes the learning journey through meaningful AI-powered interactions.

## Project Structure

```
mentra-proof-of-concept/
├── frontend/          # React TypeScript application
├── backend/           # Node.js Express API
├── database/          # Database migrations and scripts
├── docker-compose.yml # Local development environment
└── tasks/            # Project documentation and task tracking
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (via Docker)

### Installation

1. **Clone and install dependencies:**
```bash
npm run install:all
```

2. **Set up environment variables:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Start development environment:**
```bash
# Start databases with Docker
docker-compose up -d

# Run database migrations
npm run migrate

# Start both frontend and backend
npm run dev
```

4. **Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Development Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run all tests
- `npm run migrate` - Run database migrations
- `npm run clean` - Clean all node_modules

## Testing the System

### Database Testing
```bash
# Test PostgreSQL connection
cd backend && node src/scripts/migrate.js

# Test vector database (ChromaDB)
cd backend && node src/scripts/test-vector-db.js
```

### API Testing
```bash
# Test all services health
curl http://localhost:3001/health

# Test database status
curl http://localhost:3001/api/v1/database/status

# Test vector database status  
curl http://localhost:3001/api/v1/vector-db/status

# Test context manager
curl http://localhost:3001/api/v1/context/status
```

## Core Features

### 🧠 AI Scaffolding Engine
- Dynamic context injection from student learning history
- Configurable scaffolding templates for different learning needs
- Jailbreak protection and educational content filtering

### 📓 Daily Learning Journal
- AI-generated reflection prompts based on daily activities
- Emotional intelligence integration
- Privacy controls for student entries

### 🧩 Guided Problem Solving
- Step-by-step scaffolding without revealing answers
- Mistake analysis through guided questioning
- Process documentation for teacher review

### 📊 Multi-Persona Dashboards
- Student: Learning insights and goal tracking
- Teacher: Class patterns and individual progress
- Parent: Weekly summaries and engagement metrics

## Technology Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL with Sequelize ORM
- **Vector Store:** ChromaDB for context retrieval
- **Authentication:** JWT with bcrypt
- **AI Integration:** Pluggable LLM backends (Llama, OpenAI)

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Forms:** React Hook Form with Zod validation
- **Testing:** Vitest with Testing Library

## Architecture Principles

### Privacy & Security
- FERPA/COPPA compliant data handling
- Encrypted student learning data
- Role-based access control
- AI safety layers preventing inappropriate content

### Scalability
- Microservices architecture ready
- Horizontal scaling capability
- Efficient vector similarity search
- Sub-2-second AI response times

### Educational Focus
- Learning science-backed scaffolding
- Process over product emphasis
- Teacher augmentation, not replacement
- Genuine learning vs. shortcut prevention

## Contributing

This is a proof of concept for demonstrating Mentra's educational AI capabilities. The codebase follows:

- **Code Quality:** ESLint, Prettier, TypeScript strict mode
- **Testing:** Unit tests for all services and components
- **Documentation:** Inline code documentation and API specs
- **Security:** Regular dependency updates and vulnerability scanning

## License

Proprietary - Mentra Team

---

*Mentra exists to amplify the human journey—using AI to deepen reflection, resilience, and individualized support—without replacing the teacher or undermining the student's agency.*
