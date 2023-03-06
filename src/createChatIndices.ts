import { TextLoader } from "langchain/document_loaders";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HNSWLib } from "langchain/vectorstores";

async function initializeApp(fileName: string) {
  const loader = new TextLoader(`./storage/${fileName}`);
  const rawDocs = await loader.load();
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const d = textSplitter.splitDocuments(rawDocs);
  console.log(`Creating Vector Store for ${fileName}...`);
  const vectorStore = await HNSWLib.fromDocuments(d, new OpenAIEmbeddings());
  const [filenameWithOutExt] = fileName.split(".");
  await vectorStore.save(filenameWithOutExt);
}

export default initializeApp;
