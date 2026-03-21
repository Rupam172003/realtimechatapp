import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let dbInitPromise;

const ensureDb = async () => {
  if (!dbInitPromise) {
    dbInitPromise = connectDB().catch((error) => {
      dbInitPromise = undefined;
      throw error;
    });
  }

  await dbInitPromise;
};

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(async (_req, res, next) => {
  try {
    await ensureDb();
    return next();
  } catch {
    return res.status(500).json({ message: "Database connection failed." });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 5000;
  ensureDb()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error(`Startup error: ${error.message}`);
      process.exit(1);
    });
}

export default app;
