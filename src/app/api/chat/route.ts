import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGroqClient } from "@/lib/groq";
import { getIndex } from "@/lib/pinecone";
import { generateEmbedding } from "@/lib/groq";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, conversationId, model = "llama-3.3-70b-versatile", useWebSearch = false, useDocuments = false } = await req.json();

    const lastMessage = messages[messages.length - 1];
    let context = "";
    let sources: string[] = [];

    // Search documents in Pinecone if enabled
    if (useDocuments) {
      try {
        const embedding = await generateEmbedding(lastMessage.content);
        const index = await getIndex();
        const queryResponse = await index.query({
          vector: embedding,
          topK: 5,
          includeMetadata: true,
        });

        if (queryResponse.matches && queryResponse.matches.length > 0) {
          const relevantChunks = queryResponse.matches
            .filter((match) => (match.score || 0) > 0.3)
            .map((match) => ({
              content: (match.metadata as Record<string, string>)?.text || "",
              source: (match.metadata as Record<string, string>)?.documentTitle || "Document",
              score: match.score || 0,
            }));

          if (relevantChunks.length > 0) {
            context = "\n\nRelevant document context:\n" +
              relevantChunks.map((c) => `[${c.source}]: ${c.content}`).join("\n\n");
            sources = relevantChunks.map((c) => c.source);
          }
        }
      } catch (err) {
        console.error("Pinecone search error:", err);
      }
    }

    // Web search using Firecrawl if enabled
    if (useWebSearch) {
      try {
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            query: lastMessage.content,
            limit: 5,
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            const webResults = searchData.data.map((r: { title?: string; url?: string; markdown?: string }) => ({
              title: r.title || "Web Result",
              url: r.url || "",
              content: r.markdown?.substring(0, 500) || "",
            }));

            context += "\n\nWeb search results:\n" +
              webResults.map((r: { title: string; url: string; content: string }) => `[${r.title}](${r.url}): ${r.content}`).join("\n\n");
            sources = [...sources, ...webResults.map((r: { url: string }) => r.url)];
          }
        }
      } catch (err) {
        console.error("Firecrawl search error:", err);
      }
    }

    const systemMessage = {
      role: "system",
      content: `You are DocuFlow AI Assistant, an intelligent and helpful AI that helps users with document processing, analysis, and research. You provide accurate, detailed, and well-structured responses. When you have context from documents or web searches, use it to provide informed answers and cite your sources.${context}`,
    };

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    // Save conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await prisma.conversation.create({
        data: {
          title: lastMessage.content.substring(0, 100),
          userId: (session.user as { id: string }).id,
        },
      });
      convId = conversation.id;
    }

    // Save user message
    await prisma.message.create({
      data: {
        role: "user",
        content: lastMessage.content,
        conversationId: convId,
      },
    });

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content, sources, conversationId: convId })}\n\n`
                )
              );
            }
          }

          // Save assistant message
          await prisma.message.create({
            data: {
              role: "assistant",
              content: fullResponse,
              sources: JSON.stringify(sources),
              conversationId: convId,
            },
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
