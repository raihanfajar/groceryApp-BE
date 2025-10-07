import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const callbackURL = `${process.env.BACKEND_URL || "http://localhost:8000"}/user/google-auth/callback`;
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_OAUTH_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
			callbackURL: callbackURL,
		},
		async (_accessToken, _refreshToken, profile, done) => {
			// Just forward profile to controller
			done(null, profile);
		}
	)
);

export default passport;
