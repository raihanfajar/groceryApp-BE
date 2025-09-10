import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_OAUTH_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
            callbackURL: "http://localhost:8000/user/google-auth/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
            // Just forward profile to controller
            done(null, profile);
        }
    )
);

export default passport;
