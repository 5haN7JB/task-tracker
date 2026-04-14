import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { hashPassword, requireAuth } from "../lib/auth";
import passport, { googleOAuthEnabled } from "../lib/passport";
import type { User } from "@workspace/db";

const router: IRouter = Router();

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://task-tracker-task-tracker.vercel.app";

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { email, password } = parsed.data;
  const passwordHash = hashPassword(password);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!user || user.passwordHash !== passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    message: "Login successful",
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.userId = undefined;
  req.session.role = undefined;
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

// Step 1: redirect the browser to Google's consent screen
router.get("/auth/google", (req, res, next): void => {
  if (!googleOAuthEnabled) {
    res.status(503).json({ error: "Google OAuth is not configured on this server." });
    return;
  }
  passport.authenticate("google", { scope: ["email", "profile"] })(req, res, next);
});

// Step 2: Google redirects back here after the user grants / denies consent
router.get("/auth/google/callback", (req, res, next): void => {
  if (!googleOAuthEnabled) {
    res.redirect(`${FRONTEND_URL}/login?error=google_oauth_not_configured`);
    return;
  }
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
    session: true,
  })(req, res, (err) => {
    if (err) return next(err);
    const user = req.user as User;
    // Mirror into our own express-session vars so requireAuth works as normal
    req.session.userId = user.id;
    req.session.role   = user.role;
    res.redirect(FRONTEND_URL);
  });
});

export default router;
