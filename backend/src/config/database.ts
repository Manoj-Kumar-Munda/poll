import mongoose from "mongoose";
import { config } from "./index.js";

/**
 * Connects to the MongoDB database using the URI configured in the environment.
 * If the connection fails, it throws an error to be handled by the startup handler.
 */
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};
