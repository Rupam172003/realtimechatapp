import mongoose from "mongoose";

let connectionPromise;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error("MONGO_URL/MONGO_URI is not set.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUri, {
        // Fail fast in serverless to avoid long hangs that become FUNCTION_INVOCATION_FAILED.
        serverSelectionTimeoutMS: 5000,
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  await connectionPromise;
  return mongoose.connection;
};

export default connectDB;
