import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { mkdirSync, readdirSync } from "fs";
import prisma from "./prisma";
import cors from "cors";
import initializeApp from "./createChatIndices";
import { chatResponse } from "./chat";

dotenv.config();

const checkStorage = () => {
  const items = readdirSync(".");
  if (items.includes("storage")) return;
  mkdirSync("storage");
};

checkStorage();

const storage = multer.diskStorage({
  destination: function (_, __, cb) {
    cb(null, "storage");
  },
  filename: function (_, file, cb) {
    const [name, ext] = file.originalname.split(".");
    console.log(name, ext);

    const fileName = `${name}-${Date.now()}.${ext}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage, limits: { fileSize: 1024 * 10 * 100000 } });

const app = express();

app.use(cors());
app.use(express.static("storage"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.send("Hello World 1.1");
});

/**
 * POST: /create-app
 * Form-Data
 * name: string
 * userId: string
 * file: file <binary data>
 */
app.post("/create-app", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(500).json({ error: "File is required" });

  const { name, userId } = req.body as any;
  if (!name) return res.status(500).json({ error: "Name is required" });
  if (!userId) return res.status(500).json({ error: "UserId is required" });

  try {
    const app = await prisma.app.create({
      data: {
        name,
        userId,
        file: file.filename,
      },
    });

    await initializeApp(app.file);

    return res.status(201).json(app);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST: /chat
 * Body: { prompt: string, appId: number }
 */
app.post("/chat", async (req, res) => {
  console.log(req.body);

  const { prompt, appId, chatHistory } = req.body as {
    prompt: string;
    appId: string;
    chatHistory: string;
  };
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  if (!appId) return res.status(400).json({ error: "AppId is required" });

  const id = parseInt(appId);

  const write = (token: string) => res.write(token);

  try {
    const app = await prisma.app.findUnique({
      where: {
        id,
      },
    });

    if (!app) return res.status(400).json({ error: "App not found" });
    const { completion, success } = await chatResponse(
      write,
      app.file.replace(".txt", ""),
      prompt,
      chatHistory
    );

    if (!success) {
      throw new Error("Something went wrong");
    }

    await prisma.chat.create({
      data: {
        prompt,
        completion,
        appId: id,
      },
    });

    return res.end("[SUCCESS]");
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/apps/:userId", async (req, res) => {
  const apps = await prisma.app.findMany({
    where: { userId: req.params.userId },
  });
  return res.status(201).json(apps);
});

app.get("/app/:appId", async (req, res) => {
  const app = await prisma.app.findUnique({
    where: { id: parseInt(req.params.appId) },
  });
  return res.status(201).json(app);
});

app.get("/chats/:appId", async (req, res) => {
  const chats = await prisma.chat.findMany({
    where: { appId: parseInt(req.params.appId) },
  });
  return res.status(201).json(chats);
});

app.delete("/app/:appId", async (req, res) => {
  if (!req.params.appId) {
    return res.status(400).json({ error: "AppId is required" });
  }

  const appId = parseInt(req.params.appId);
  const app = await prisma.app.delete({
    where: { id: appId },
    include: {
      chats: true,
    },
  });
  return res.status(201).json(app);
});

app.get("/get-storage", async (_, res) => {
  const files = readdirSync("./storage");
  return res.status(201).json(files);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
