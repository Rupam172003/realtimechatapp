import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("MONGO_URL/MONGO_URI is not set. Skipping database connection.");
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
