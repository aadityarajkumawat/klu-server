import path from "path";
import { HNSWLib } from "langchain/vectorstores";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { ChatVectorDBQAChain } from "langchain/chains";
import { OpenAI } from "langchain";

async function chatResponse(
  write: (token: string) => boolean,
  index: string,
  question: string,
  chat_history: string = ""
) {
  const dir = path.resolve(process.cwd(), index);

  try {
    const vectorstore = await HNSWLib.load(dir, new OpenAIEmbeddings());
    const chain = ChatVectorDBQAChain.fromLLM(
      new OpenAI({
        streaming: true,
        cache: false,
        callbackManager: {
          handleNewToken: (token) => {
            write(token);
          },
        },
      }),
      vectorstore
    );
    const res = await chain.call({
      question,
      chat_history,
    });
    const response = res.text as string;
    // state.chatHistory += `${question}\n${response}`;
    return { completion: response, success: true };
  } catch (error) {
    console.log(error.message);
    return { completion: "", success: false };
  }
}

export { chatResponse };
