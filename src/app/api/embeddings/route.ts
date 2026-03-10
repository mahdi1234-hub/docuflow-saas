import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/groq";
import { ensureIndex } from "@/lib/pinecone";

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, content, title } = await req.json();

    if (!documentId || !content) {
      return NextResponse.json(
        { error: "Missing documentId or content" },
        { status: 400 }
      );
    }

    // Chunk the text
    const chunks = chunkText(content);

    // Get or create Pinecone index
    const index = await ensureIndex();

    // Process each chunk
    const processedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);
      const pineconeId = `${documentId}-chunk-${i}`;

      // Store in Pinecone
      await index.upsert({
        records: [
          {
            id: pineconeId,
            values: embedding,
            metadata: {
              documentId,
              documentTitle: title || "Untitled",
              text: chunk,
              chunkIndex: i,
              userId: (session.user as { id: string }).id,
            },
          },
        ],
      });

      // Store chunk in database
      const dbChunk = await prisma.documentChunk.create({
        data: {
          documentId,
          content: chunk,
          chunkIndex: i,
          pineconeId,
        },
      });

      processedChunks.push(dbChunk);
    }

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ready" },
    });

    return NextResponse.json({
      message: "Document embedded successfully",
      chunksProcessed: processedChunks.length,
    });
  } catch (error) {
    console.error("Embedding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
