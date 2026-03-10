import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export async function ensureIndex() {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || "docuflow-index";

  const existingIndexes = await pc.listIndexes();
  const indexNames = existingIndexes.indexes?.map((i) => i.name) || [];

  if (!indexNames.includes(indexName)) {
    await pc.createIndex({
      name: indexName,
      dimension: 1536,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    // Wait for index to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return pc.index(indexName);
}

export async function getIndex() {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || "docuflow-index";
  return pc.index(indexName);
}
