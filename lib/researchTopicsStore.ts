import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ResearchTopic = {
  id: string;
  title: string;
  category: 'ml_ai' | 'trading' | 'app_dev' | 'marketing' | 'workflow_tools' | 'other';
  notes?: string;
  links?: string[];
  active: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastUsedAt?: string; // ISO
  usedCount: number;
};

const DEFAULT_TOPICS: Array<Pick<ResearchTopic, 'title' | 'category' | 'notes' | 'links'>> = [
  {
    title: 'QuizzyDots growth: what actually works in 2026 for daily games (Reddit, SEO, share cards, retention loops)',
    category: 'marketing',
    notes: 'Focus on actionable channels + simple experiments we can run this week.'
  },
  {
    title: 'TikTok/Meta ads for the sermon note-taking app: proven creatives, hooks, and landing-flow benchmarks',
    category: 'marketing',
    notes: 'Collect examples + a 2-week testing plan.'
  },
  {
    title: 'OpenClaw / agent security: practical prompt-injection defenses + sandboxing patterns that hold up',
    category: 'ml_ai',
    notes: 'Turn into a checklist we can apply to Clawdbot.'
  },
  {
    title: 'Options trading: covered calls vs. cash-secured puts (rules of thumb + risk cases)',
    category: 'trading',
    notes: 'Make it practical, with “when NOT to do it.”'
  },
  {
    title: 'PM2 + nginx droplet ops: a clean, repeatable deployment pattern (repo layout, env, restarts, logs)',
    category: 'workflow_tools',
    notes: 'Codify a standard so every new subdomain is 10 minutes.'
  },
  {
    title: 'App Store launch checklist for indie apps (privacy, screenshots, onboarding, review gotchas)',
    category: 'app_dev',
    notes: 'Specifically for the sermon app pipeline.'
  },
  {
    title: 'SEO for small tools: what to publish + how to build topical authority without a huge blog',
    category: 'marketing',
    notes: 'Could apply to Sparkpoint and QuizzyDots.'
  },
  {
    title: 'Local-first “second brain” architecture: what to store, naming conventions, and retrieval patterns',
    category: 'workflow_tools',
    notes: 'Improve how we file research + decisions.'
  },
  {
    title: 'Next.js production hardening: caching, env management, monitoring, and avoiding common outages',
    category: 'app_dev',
    notes: 'Tailored to our small droplet + nginx setup.'
  },
  {
    title: 'AI tooling landscape: which models are best for what (quality vs cost vs speed) and how to route tasks',
    category: 'ml_ai',
    notes: 'Give a simple rubric for model choice.'
  }
];

function getTopicsFilePath() {
  return (
    process.env.RESEARCH_TOPICS_PATH ||
    path.join(process.cwd(), '.data', 'research-topics.json')
  );
}

async function atomicWrite(filePath: string, content: string) {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);
}

export async function loadTopics(): Promise<ResearchTopic[]> {
  const filePath = getTopicsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ResearchTopic[];
  } catch {
    // fall through to seed
  }

  const now = new Date().toISOString();
  const seeded: ResearchTopic[] = DEFAULT_TOPICS.map((t) => ({
    id: crypto.randomUUID(),
    title: t.title,
    category: t.category,
    notes: t.notes,
    links: t.links || [],
    active: true,
    createdAt: now,
    updatedAt: now,
    usedCount: 0,
  }));

  await atomicWrite(filePath, JSON.stringify(seeded, null, 2));
  return seeded;
}

export async function saveTopics(topics: ResearchTopic[]): Promise<void> {
  const filePath = getTopicsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await atomicWrite(filePath, JSON.stringify(topics, null, 2));
}
