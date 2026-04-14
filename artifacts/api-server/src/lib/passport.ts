import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "https://workspaceapi-server-production-ed1b.up.railway.app/api/auth/google/callback";

// Serialize/deserialize using our own session (userId stored in req.session.userId).
// Passport needs these to exist but we do the actual auth via express-session directly.
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser((id: number, done) => {
  done(null, { id } as Express.User);
});

// Only register the Google strategy when credentials are provided.
// If GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing the server still
// starts normally; the /auth/google routes will return 503 instead of crashing.
export const googleOAuthEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

if (googleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google account has no email address"));
          }

          // Find existing user
          const [existing] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

          if (existing) {
            return done(null, existing);
          }

          // First-time Google sign-in: create user with employee role
          const [created] = await db
            .insert(usersTable)
            .values({
              email,
              name: profile.displayName || email.split("@")[0],
              passwordHash: "", // no password for OAuth-only users
              role: "employee",
            })
            .returning();

          return done(null, created);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

export default passport;
