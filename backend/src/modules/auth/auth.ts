import { MongoClient } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { config } from "@/config/index.js";

const client = new MongoClient(config.mongodbUri);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    // client, // Commented out to disable transactions on standalone MongoDB (useful for local development)
  }),
  trustedOrigins: [config.clientUrl],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  session: {
    // Session expires in 7 days
    expiresIn: 60 * 60 * 24 * 7,
    // Session duration extended after 1 day
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          secure: config.nodeEnv === "production",
          sameSite: "lax",
        },
      },
    },
  },
  socialProviders: {
    /* 
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    }
    */
  },
});
