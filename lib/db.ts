import { prisma } from "./prisma";

// Database utility functions
export async function getUsers() {
  try {
    return await prisma.user.findMany({
      include: {
        accounts: true,
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
        accounts: true,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
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
