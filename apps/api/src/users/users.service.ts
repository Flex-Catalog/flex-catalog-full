import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '@product-catalog/shared';

interface CreateUserInput {
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  roles: Role[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
        roles: input.roles,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string, tenantId: string) {
    return this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
    });
  }

  async findByEmailGlobal(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });
  }

  async findAllByTenant(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateRefreshToken(id: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }

  async updateUser(
    id: string,
    tenantId: string,
    data: { name?: string; roles?: Role[]; isActive?: boolean },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createUser(
    tenantId: string,
    data: { email: string; name: string; password: string; roles: Role[] },
  ) {
    const existing = await this.findByEmail(data.email, tenantId);
    if (existing) {
      throw new ConflictException('Email already registered in this tenant');
    }

    const passwordHash = await argon2.hash(data.password);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        roles: data.roles,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
