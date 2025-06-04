# 🚀 AI Dev Tasks for Cursor 🤖

Welcome to **AI Dev Tasks**! This repository provides a collection of `.mdc` (Markdown Command) files designed to supercharge your feature development workflow within the [Cursor](https://cursor.sh/) editor. By leveraging these commands with Cursor's AI Agent, you can systematically approach building features, from ideation to implementation, with built-in checkpoints for verification.

Stop wrestling with monolithic AI requests and start guiding your AI collaborator step-by-step!

## ✨ The Core Idea

Building complex features with AI can sometimes feel like a black box. This workflow aims to bring structure, clarity, and control to the process by:

1.  **Defining Scope:** Clearly outlining what needs to be built with a Product Requirement Document (PRD).
2.  **Detailed Planning:** Breaking down the PRD into a granular, actionable task list.
3.  **Iterative Implementation:** Guiding the AI to tackle one task at a time, allowing you to review and approve each change.

This structured approach helps ensure the AI stays on track, makes it easier to debug issues, and gives you confidence in the generated code.

## Workflow: From Idea to Implemented Feature 💡➡️💻

Here's the step-by-step process using the `.mdc` files in this repository:

### 1️⃣ Create a Product Requirement Document (PRD)

First, lay out the blueprint for your feature. A PRD clarifies what you're building, for whom, and why.

You can create a lightweight PRD directly within Cursor:

1.  Ensure you have the `create-prd.mdc` file from this repository accessible.
2.  In Cursor's Agent chat, initiate PRD creation:

    ```
    Use @create-prd.mdc
    Here's the feature I want to build: [Describe your feature in detail]
    Reference these files to help you: [Optional: @file1.py @file2.ts]
    ```
    *(Pro Tip: For complex PRDs, using MAX mode in Cursor is highly recommended if your budget allows for more comprehensive generation.)*

    ![Example of initiating PRD creation](https://pbs.twimg.com/media/Go6DDlyX0AAS7JE?format=jpg&name=large)

### 2️⃣ Generate Your Task List from the PRD

With your PRD drafted (e.g., `MyFeature-PRD.md`), the next step is to generate a detailed, step-by-step implementation plan for your AI Developer.

1.  Ensure you have `generate-tasks-from-prd.mdc` accessible.
2.  In Cursor's Agent chat, use the PRD to create tasks:

    ```
    Now take @MyFeature-PRD.md and create tasks using @generate-tasks-from-prd.mdc
    ```
    *(Note: Replace `@MyFeature-PRD.md` with the actual filename of the PRD you generated in step 1.)*

    ![Example of generating tasks from PRD](https://pbs.twimg.com/media/Go6FITbWkAA-RCT?format=jpg&name=medium)

### 3️⃣ Examine Your Task List

You'll now have a well-structured task list, often with tasks and sub-tasks, ready for the AI to start working on. This provides a clear roadmap for implementation.

![Example of a generated task list](https://pbs.twimg.com/media/Go6GNuOWsAEcSDm?format=jpg&name=medium)

### 4️⃣ Instruct the AI to Work Through Tasks (and Mark Completion)

To ensure methodical progress and allow for verification, we'll use `process-task-list.mdc`. This command instructs the AI to focus on one task at a time and wait for your go-ahead before moving to the next.

1.  Create or ensure you have the `process-task-list.mdc` file accessible.
2.  In Cursor's Agent chat, tell the AI to start with the first task (e.g., `1.1`):

    ```
    Please start on task 1.1 and use @process-task-list.mdc
    ```
    *(Important: You only need to reference `@process-task-list.mdc` for the *first* task. The instructions within it guide the AI for subsequent tasks.)*

    The AI will attempt the task and then prompt you to review.

    ![Example of starting on a task with process-task-list.mdc](https://pbs.twimg.com/media/Go6I41KWcAAAlHc?format=jpg&name=medium)

### 5️⃣ Review, Approve, and Progress ✅

As the AI completes each task, you review the changes.
*   If the changes are good, simply reply with "yes" (or a similar affirmative) to instruct the AI to mark the task complete and move to the next one.
*   If changes are needed, provide feedback to the AI to correct the current task before moving on.

You'll see a satisfying list of completed items grow, providing a clear visual of your feature coming to life!

![Example of a progressing task list with completed items](https://pbs.twimg.com/media/Go6KrXZWkAA_UuX?format=jpg&name=medium)

While it's not always perfect, this method has proven to be a very reliable way to build out larger features with AI assistance.

### Video Demonstration 🎥

If you'd like to see this in action, I demonstrated it on [Claire Vo's "How I AI" podcast](https://www.youtube.com/watch?v=fD4ktSkNCw4).

![Demonstration of AI Dev Tasks on How I AI Podcast](https://img.youtube.com/vi/fD4ktSkNCw4/maxresdefault.jpg)

## 🗂️ Files in this Repository

*   **`create-prd.mdc`**: Guides the AI in generating a Product Requirement Document for your feature.
*   **`generate-tasks-from-prd.mdc`**: Takes a PRD markdown file as input and helps the AI break it down into a detailed, step-by-step implementation task list.
*   **`process-task-list.mdc`**: Instructs the AI on how to process the generated task list, tackling one task at a time and waiting for your approval before proceeding. (This file also contains logic for the AI to mark tasks as complete).

## 🌟 Benefits

*   **Structured Development:** Enforces a clear process from idea to code.
*   **Step-by-Step Verification:** Allows you to review and approve AI-generated code at each small step, ensuring quality and control.
*   **Manages Complexity:** Breaks down large features into smaller, digestible tasks for the AI, reducing the chance of it getting lost or generating overly complex, incorrect code.
*   **Improved Reliability:** Offers a more dependable approach to leveraging AI for significant development work compared to single, large prompts.
*   **Clear Progress Tracking:** Provides a visual representation of completed tasks, making it easy to see how much has been done and what's next.

## 🛠️ How to Use

1.  **Clone or Download:** Get these `.mdc` files into your project or a central location where Cursor can access them.
2.  **Follow the Workflow:** Systematically use the `.mdc` files in Cursor's Agent chat as described in the 5-step workflow above.
3.  **Adapt and Iterate:**
    *   Feel free to modify the prompts within the `.mdc` files to better suit your specific needs or coding style.
    *   If the AI struggles with a task, try rephrasing your initial feature description or breaking down tasks even further.

## 💡 Tips for Success

*   **Be Specific:** The more context and clear instructions you provide (both in your initial feature description and any clarifications), the better the AI's output will be.
*   **MAX Mode for PRDs:** As mentioned, using MAX mode in Cursor for PRD creation (`create-prd.mdc`) can yield more thorough and higher-quality results if your budget supports it.
*   **Correct File Tagging:** Always ensure you're accurately tagging the PRD filename (e.g., `@MyFeature-PRD.md`) when generating tasks.
*   **Patience and Iteration:** AI is a powerful tool, but it's not magic. Be prepared to guide, correct, and iterate. This workflow is designed to make that iteration process smoother.

## 🤝 Contributing

Got ideas to improve these `.mdc` files or have new ones that fit this workflow? Contributions are welcome!
Please feel free to:
*   Open an issue to discuss changes or suggest new features.
*   Submit a pull request with your enhancements.

---

Happy AI-assisted developing!

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
