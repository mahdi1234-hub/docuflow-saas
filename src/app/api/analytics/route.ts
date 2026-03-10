import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const [documentsCount, projectsCount, conversationsCount, recentDocuments] = await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.conversation.count({ where: { userId } }),
      prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { createdAt: true, fileSize: true },
      }),
    ]);

    // Generate analytics data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    const documentsByDay = last7Days.map((day) => ({
      date: day,
      count: recentDocuments.filter(
        (d) => d.createdAt.toISOString().split("T")[0] === day
      ).length,
    }));

    const totalStorage = recentDocuments.reduce((sum, d) => sum + d.fileSize, 0);

    return NextResponse.json({
      overview: {
        documents: documentsCount,
        projects: projectsCount,
        conversations: conversationsCount,
        storage: totalStorage,
      },
      documentsByDay,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
