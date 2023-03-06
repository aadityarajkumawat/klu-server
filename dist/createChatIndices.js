"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_loaders_1 = require("langchain/document_loaders");
const embeddings_1 = require("langchain/embeddings");
const text_splitter_1 = require("langchain/text_splitter");
const vectorstores_1 = require("langchain/vectorstores");
async function initializeApp(fileName) {
    const loader = new document_loaders_1.TextLoader(`./storage/${fileName}`);
    const rawDocs = await loader.load();
    const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const d = textSplitter.splitDocuments(rawDocs);
    console.log(`Creating Vector Store for ${fileName}...`);
    const vectorStore = await vectorstores_1.HNSWLib.fromDocuments(d, new embeddings_1.OpenAIEmbeddings());
    const [filenameWithOutExt] = fileName.split(".");
    await vectorStore.save(filenameWithOutExt);
}
exports.default = initializeApp;
//# sourceMappingURL=createChatIndices.js.map