# Database Management

This directory contains database migrations, seeds, and initialization scripts for the Mentra application.

## Structure

```
database/
├── migrations/           # Database schema migrations
│   ├── 001_initial_schema.sql
│   ├── 002_journal_tables.sql
│   └── 003_problem_tables.sql
├── seeds/               # Test data and initial setup
├── init/                # Docker initialization scripts
└── scripts/             # Utility scripts for database management
```

## Migration Order

Migrations must be run in numerical order:

1. `001_initial_schema.sql` - Creates base user and authentication tables
2. `002_journal_tables.sql` - Creates journal and reflection-related tables  
3. `003_problem_tables.sql` - Creates problem-solving and session tracking tables

## Usage

### Development Setup

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run migrations
npm run migrate

# Seed development data (optional)
npm run seed
```

### Manual Migration

```bash
# Connect to PostgreSQL
psql postgresql://mentra_user:mentra_dev_password@localhost:5432/mentra_dev

# Run specific migration
\i database/migrations/001_initial_schema.sql
```

## Schema Design Principles

- **Privacy First**: Student data is encrypted at rest
- **Role-Based Access**: Clear separation between student, teacher, and parent data
- **Audit Trail**: All learning interactions are logged for analysis
- **Scalability**: Designed for horizontal scaling with proper indexing 