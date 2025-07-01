import type { PrismaClient, User } from '@prisma/client';
import { hashPassword } from '../utils/hash';
import type { CreateUserInput, UpdateUserInput } from './schema';

// 通过用户名或邮箱查找用户
export async function findUserByIdentifier(
  prisma: PrismaClient,
  identifier: string
): Promise<User | null> {
  return await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier }
      ]
    }
  });
}

// 通过 ID 查找用户
export async function findUserById(
  prisma: PrismaClient,
  id: string
): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id }
  });
}

// 创建新用户
export async function createUser(
  prisma: PrismaClient,
  userData: CreateUserInput
): Promise<User> {
  const hashedPassword = await hashPassword(userData.password);
  
  return await prisma.user.create({
    data: {
      username: userData.username,
      email: userData.email,
      passwordHash: hashedPassword,
      avatar: userData.avatar || null,
    }
  });
}

// 更新用户信息
export async function updateUser(
  prisma: PrismaClient,
  id: string,
  updateData: UpdateUserInput
): Promise<User | null> {
  // 如果没有更新数据，直接返回现有用户
  if (Object.keys(updateData).length === 0) {
    return await findUserById(prisma, id);
  }

  return await prisma.user.update({
    where: { id },
    data: updateData
  });
}

// 删除用户
export async function deleteUser(
  prisma: PrismaClient,
  id: string
): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    return false;
  }
}

// 检查用户是否存在
export async function checkUserExists(
  prisma: PrismaClient,
  username: string,
  email: string,
  excludeId?: string
): Promise<{ usernameExists: boolean; emailExists: boolean }> {
  const whereCondition = excludeId 
    ? { NOT: { id: excludeId } }
    : {};

  const [usernameCount, emailCount] = await Promise.all([
    prisma.user.count({
      where: {
        username,
        ...whereCondition
      }
    }),
    prisma.user.count({
      where: {
        email,
        ...whereCondition
      }
    })
  ]);

  return {
    usernameExists: usernameCount > 0,
    emailExists: emailCount > 0
  };
} 