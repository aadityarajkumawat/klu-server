"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = require("fs");
const prisma_1 = __importDefault(require("./prisma"));
const cors_1 = __importDefault(require("cors"));
const createChatIndices_1 = __importDefault(require("./createChatIndices"));
const chat_1 = require("./chat");
dotenv_1.default.config();
const checkStorage = () => {
    const items = (0, fs_1.readdirSync)(".");
    if (items.includes("storage"))
        return;
    (0, fs_1.mkdirSync)("storage");
};
checkStorage();
const storage = multer_1.default.diskStorage({
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
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 1024 * 10 * 100000 } });
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.static("storage"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (_, res) => {
    res.send("Hello World 1.1");
});
app.post("/create-app", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file)
        return res.status(500).json({ error: "File is required" });
    const { name, userId } = req.body;
    if (!name)
        return res.status(500).json({ error: "Name is required" });
    if (!userId)
        return res.status(500).json({ error: "UserId is required" });
    try {
        const app = await prisma_1.default.app.create({
            data: {
                name,
                userId,
                file: file.filename,
            },
        });
        await (0, createChatIndices_1.default)(app.file);
        return res.status(201).json(app);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.post("/chat", async (req, res) => {
    console.log(req.body);
    const { prompt, appId, chatHistory } = req.body;
    if (!prompt)
        return res.status(400).json({ error: "Prompt is required" });
    if (!appId)
        return res.status(400).json({ error: "AppId is required" });
    const id = parseInt(appId);
    const write = (token) => res.write(token);
    try {
        const app = await prisma_1.default.app.findUnique({
            where: {
                id,
            },
        });
        if (!app)
            return res.status(400).json({ error: "App not found" });
        const { completion, success } = await (0, chat_1.chatResponse)(write, app.file.replace(".txt", ""), prompt, chatHistory);
        if (!success) {
            throw new Error("Something went wrong");
        }
        await prisma_1.default.chat.create({
            data: {
                prompt,
                completion,
                appId: id,
            },
        });
        return res.end("[SUCCESS]");
    }
    catch (error) {
        console.log(error.message);
        return res.status(500).json({ error: error.message });
    }
});
app.get("/apps/:userId", async (req, res) => {
    const apps = await prisma_1.default.app.findMany({
        where: { userId: req.params.userId },
    });
    return res.status(201).json(apps);
});
app.get("/app/:appId", async (req, res) => {
    const app = await prisma_1.default.app.findUnique({
        where: { id: parseInt(req.params.appId) },
    });
    return res.status(201).json(app);
});
app.get("/chats/:appId", async (req, res) => {
    const chats = await prisma_1.default.chat.findMany({
        where: { appId: parseInt(req.params.appId) },
    });
    return res.status(201).json(chats);
});
app.delete("/app/:appId", async (req, res) => {
    if (!req.params.appId) {
        return res.status(400).json({ error: "AppId is required" });
    }
    const appId = parseInt(req.params.appId);
    const app = await prisma_1.default.app.delete({
        where: { id: appId },
        include: {
            chats: true,
        },
    });
    return res.status(201).json(app);
});
app.get("/get-storage", async (_, res) => {
    const files = (0, fs_1.readdirSync)("./storage");
    return res.status(201).json(files);
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map