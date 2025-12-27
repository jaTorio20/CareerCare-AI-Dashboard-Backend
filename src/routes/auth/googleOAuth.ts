import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../../models/User";
import { generateToken } from "../../utils/generateToken";

const router = Router();

// --- Google Strategy ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, _accessToken, _refreshToken, profile, done) => {
      try {
        // Step 1: Check if user already linked with Google
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // Step 2: Check if user exists by email
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, { message: "Google account has no email" });
        }

        // if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link Google account
            user.googleId = profile.id;
            user.name = user.name || profile.displayName;

            // Always assign avatar as an object
            if (!user.avatar?.url) {
              user.avatar = {
                url: profile.photos?.[0]?.value || "/images/placeholder.jpg",
                filename: `google-${profile.id}`,
              };
            }

            await user.save();
            return done(null, user);
          }
        // }

        // Step 3: Create new user
        const newUser = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
          avatar: {
            url: profile.photos?.[0]?.value || "/images/placeholder.jpg",
            filename: `google-${profile.id}`,
          },
          isVerified: true, // Google verified email
        });

        return done(null, newUser);
      } catch (err) {
        done(err, false);
      }
    }
  )
);

// --- Google OAuth routes ---
router.get("/google", (req, res, next) => {
  const redirectTo =
    typeof req.query.redirect === "string" ? req.query.redirect : "/resumes";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: redirectTo, // carry redirect path through OAuth
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req, res) => {

    if (!req.user) {
      return res.redirect("/login?error=google");
    }
    const user = req.user as any;

    // Issue JWT tokens
    const payload = { userId: user._id.toString() };
    const accessToken = await generateToken(payload, "15m");
    const refreshToken = await generateToken(payload, "30d");

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Redirect frontend with accessToken
    const redirectTo = req.query.state || "/";
    res.redirect(`${process.env.ALLOWED_ORIGINS}${redirectTo}`);
  }
);

export default router;
