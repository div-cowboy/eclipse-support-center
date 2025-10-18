import { prisma } from "./prisma";

// Database utility functions
export async function getUsers() {
  try {
    return await prisma.user.findMany({
      include: {
        posts: true,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function getUserById(id: string) {
  try {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        posts: true,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

export async function getPosts() {
  try {
    return await prisma.post.findMany({
      include: {
        author: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

export async function createPost(data: {
  title: string;
  content?: string;
  authorId: string;
  published?: boolean;
}) {
  try {
    return await prisma.post.create({
      data,
      include: {
        author: true,
      },
    });
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

export async function createUser(data: { email: string; name?: string }) {
  try {
    return await prisma.user.create({
      data,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}
