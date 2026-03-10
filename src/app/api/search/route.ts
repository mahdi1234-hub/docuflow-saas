import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get("q") || "";
    const type = req.nextUrl.searchParams.get("type") || "all";
    const userId = (session.user as { id: string }).id;

    const results: Record<string, unknown[]> = {};

    if (type === "all" || type === "documents") {
      results.documents = await prisma.document.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    }

    if (type === "all" || type === "projects") {
      results.projects = await prisma.project.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    }

    if (type === "all" || type === "conversations") {
      results.conversations = await prisma.conversation.findMany({
        where: {
          userId,
          title: { contains: query, mode: "insensitive" },
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
