import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';

export interface CreateTicketInput {
  tenantId: string;
  userId: string;
  category: string;
  subject: string;
  message: string;
  senderName: string;
  companyName?: string;
  priority?: string;
}

export interface AddMessageInput {
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  isAdmin?: boolean;
  replyToEmail?: string;
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createTicket(input: CreateTicketInput) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        category: input.category,
        subject: input.subject,
        priority: input.priority || 'MEDIUM',
      },
    });

    // Create the initial message
    await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: input.userId,
        senderName: input.senderName,
        content: input.message,
        isAdmin: false,
      },
    });

    // Notify all support staff (ATENDENTE + PLATFORM_ADMIN) by email
    this.prisma.user.findMany({
      where: { roles: { hasSome: ['ATENDENTE', 'PLATFORM_ADMIN'] } },
      select: { email: true },
    }).then((staff) => {
      const companyName = input.companyName || input.senderName;
      for (const s of staff) {
        this.emailService
          .sendNewTicketNotification(s.email, input.subject, ticket.id, companyName)
          .catch(() => {});
      }
    }).catch(() => {});

    return ticket;
  }

  async addMessage(input: AddMessageInput) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: input.ticketId,
        senderId: input.senderId,
        senderName: input.senderName,
        content: input.content,
        isAdmin: input.isAdmin || false,
      },
    });

    // If admin replies, move to IN_PROGRESS and notify the ticket creator
    if (input.isAdmin && ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: input.ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Notify the ticket creator when admin/atendente replies
    if (input.isAdmin && input.replyToEmail) {
      this.emailService
        .sendTicketReplyNotification(input.replyToEmail, ticket.subject, ticket.id)
        .catch(() => {});
    }

    return message;
  }

  async getTicketsByTenant(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.supportTicket.count({ where: { tenantId } }),
    ]);

    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTicketById(ticketId: string, tenantId?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // If tenantId is provided, check ownership
    if (tenantId && ticket.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async updateStatus(ticketId: string, status: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }

  // Admin: get all tickets across tenants
  async getAllTickets(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
