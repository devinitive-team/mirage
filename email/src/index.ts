import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  mirage_emails: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();
const ALLOWED_CORS_ORIGINS = new Set([
  "http://localhost:4321",
  "https://mirage.lukaszgut.com",
]);

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      const normalizedOrigin = normalizeOrigin(origin);
      if (normalizedOrigin && ALLOWED_CORS_ORIGINS.has(normalizedOrigin)) {
        return normalizedOrigin;
      }

      return null;
    },
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/api/waitlist", async (c) => {
  const payload = await c.req.json().catch(() => null);
  const email =
    payload && typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";

  if (!isValidEmail(email)) {
    return c.json({ error: "Please provide a valid email address." }, 400);
  }

  const source =
    payload && typeof payload.source === "string" && payload.source.trim().length > 0
      ? payload.source.trim().slice(0, 120)
      : "unknown";

  const now = new Date().toISOString();

  await ensureWaitlistSchema(c.env.mirage_emails);

  const existing = await c.env.mirage_emails
    .prepare("SELECT email FROM waitlist_emails WHERE email = ?")
    .bind(email)
    .first<{ email: string }>();

  if (existing) {
    await c.env.mirage_emails
      .prepare(
        "UPDATE waitlist_emails SET source = ?, last_seen_at = ? WHERE email = ?",
      )
      .bind(source, now, email)
      .run();

    return c.json({ ok: true, status: "already_joined" });
  }

  await c.env.mirage_emails
    .prepare(
      "INSERT INTO waitlist_emails (email, source, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?)",
    )
    .bind(email, source, now, now)
    .run();

  return c.json({ ok: true, status: "joined" });
});

function isValidEmail(value: string): boolean {
  if (value.length < 3 || value.length > 320) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeOrigin(origin: string | undefined): string | null {
  if (!origin) {
    return null;
  }

  return origin.replace(/\/+$/, "");
}

async function ensureWaitlistSchema(db: D1Database): Promise<void> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS waitlist_emails (email TEXT PRIMARY KEY NOT NULL, source TEXT NOT NULL, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)",
  );
  await db.exec(
    "CREATE INDEX IF NOT EXISTS waitlist_emails_last_seen_idx ON waitlist_emails (last_seen_at)",
  );
}

export default app;
