"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatResponse = void 0;
const path_1 = __importDefault(require("path"));
const vectorstores_1 = require("langchain/vectorstores");
const embeddings_1 = require("langchain/embeddings");
const chains_1 = require("langchain/chains");
const langchain_1 = require("langchain");
async function chatResponse(write, index, question, chat_history = "") {
    const dir = path_1.default.resolve(process.cwd(), index);
    try {
        const vectorstore = await vectorstores_1.HNSWLib.load(dir, new embeddings_1.OpenAIEmbeddings());
        const chain = chains_1.ChatVectorDBQAChain.fromLLM(new langchain_1.OpenAI({
            streaming: true,
            cache: false,
            callbackManager: {
                handleNewToken: (token) => {
                    write(token);
                },
            },
        }), vectorstore);
        const res = await chain.call({
            question,
            chat_history,
        });
        const response = res.text;
        return { completion: response, success: true };
    }
    catch (error) {
        console.log(error.message);
        return { completion: "", success: false };
    }
}
exports.chatResponse = chatResponse;
//# sourceMappingURL=chat.js.map