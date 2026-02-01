# Henry, Rusty — Task Tracker

A Kanban-style task tracker for Henry Bottholomew (Clawdbot agent).

## Features

- **Kanban Board**: TO DO → IN PROGRESS → DONE → ARCHIVE
- **Today's Schedule**: Shows recurring tasks from cron jobs with completion checkmarks
- **API Access**: Henry can update tasks programmatically
- **Drag & Drop**: Move tasks between columns
- **Supabase Backend**: Persistent storage accessible from anywhere

## Setup

1. Create a Supabase project at https://supabase.com
2. Run the schema in `supabase-schema.sql` in the SQL Editor
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
4. `npm install`
5. `npm run dev`

## API Endpoints

### Tasks

- `GET /api/tasks` — List all tasks
- `POST /api/tasks` — Create task
  ```json
  { "title": "Task name", "description": "optional", "status": "todo", "source": "telegram" }
  ```
- `PATCH /api/tasks/:id` — Update task
  ```json
  { "status": "done" }
  ```
- `DELETE /api/tasks/:id` — Delete task

### Recurring Tasks

- `GET /api/recurring` — List recurring tasks with today's completion status
- `POST /api/recurring/:id/complete` — Toggle completion
  ```json
  { "completed": true }
  ```

### Sync

- `POST /api/sync` — Sync cron jobs to recurring tasks
  ```json
  { "cron_jobs": [...] }
  ```

## Usage by Henry

```bash
# Add a task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Review QuizzyDots quiz", "source": "cron"}'

# Move task to done
curl -X PATCH http://localhost:3001/api/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Mark recurring task complete
curl -X POST http://localhost:3001/api/recurring/<id>/complete \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

## Deployment

Local: http://localhost:3001
Production: https://tasks.sparkpoint.studio
