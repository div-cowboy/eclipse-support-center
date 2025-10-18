import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/organizations - Get all organizations for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's organization if they have one
    let organizations: any[] = [];
    if ((user as any).organizationId) {
      const organization = await (prisma as any).organization.findUnique({
        where: { id: (user as any).organizationId },
        include: {
          users: {
            select: { id: true },
          },
          chatbots: {
            select: { id: true },
          },
        },
      });
      if (organization) {
        organizations = [organization];
      }
    }

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check if user already has an organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if ((user as any).organizationId) {
      return NextResponse.json(
        { error: "User already has an organization" },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const existingOrg = await (prisma as any).organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization slug already exists" },
        { status: 400 }
      );
    }

    // Create organization
    const organization = await (prisma as any).organization.create({
      data: {
        name,
        description: description || null,
        slug,
      },
      include: {
        users: {
          select: { id: true },
        },
        chatbots: {
          select: { id: true },
        },
      },
    });

    // Assign user to the organization
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: organization.id } as any,
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
