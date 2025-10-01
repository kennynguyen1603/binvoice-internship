import { prisma } from '#db/client'
import { ERROR_MESSAGES } from '#constants/messages/invoice.message'
import { BAD_REQUEST } from '#core/error.response'
import {
  InvoiceStatus,
  invoiceInclude,
  type InvoiceWithItems,
  type InvoiceCreateInput,
  type InvoiceUpdateInput,
  type InvoiceWhereInput,
  type PaginationInput,
  type PaginationResult,
  type PrismaTransaction
} from '#db/types'

export class InvoiceRepository {
  async createDraft(input: InvoiceCreateInput): Promise<InvoiceWithItems> {
    return prisma.invoice.create({
      data: {
        ...input,
        status: InvoiceStatus.draft
      },
      include: invoiceInclude
    })
  }

  async updateDraft(id: string, input: InvoiceUpdateInput): Promise<InvoiceWithItems> {
    const existing = await this.findById(id)
    if (!existing || existing.status !== InvoiceStatus.draft) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_UPDATE_DRAFT })
    }

    return prisma.invoice.update({
      where: { id },
      data: input,
      include: {
        items: true,
        replacementOf: true,
        replacedBy: true
      }
    })
  }

  async deleteDraft(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing || existing.status !== InvoiceStatus.draft) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_DELETE_DRAFT })
    }

    await prisma.invoice.delete({
      where: { id }
    })
    return true
  }

  async findById(id: string): Promise<InvoiceWithItems | null> {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        replacementOf: true,
        replacedBy: true
      }
    })
  }

  async findByNumber(number: string): Promise<InvoiceWithItems | null> {
    return prisma.invoice.findUnique({
      where: { number },
      include: {
        items: true,
        replacementOf: true,
        replacedBy: true
      }
    })
  }

  async list(
    filter: InvoiceWhereInput = {},
    pagination: PaginationInput = {}
  ): Promise<PaginationResult<InvoiceWithItems>> {
    const { page = 1, limit = 10 } = pagination
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where: filter,
        include: invoiceInclude,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
      }),
      prisma.invoice.count({ where: filter })
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async markIssued(id: string, number: string, issueDate: Date): Promise<InvoiceWithItems> {
    return prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.issued,
        number,
        issueDate
      },
      include: {
        items: true,
        replacementOf: true,
        replacedBy: true
      }
    })
  }

  async markCanceled(id: string, reason: string): Promise<InvoiceWithItems> {
    return prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.canceled,
        cancelReason: reason,
        canceledAt: new Date()
      },
      include: {
        items: true,
        replacementOf: true,
        replacedBy: true
      }
    })
  }

  async createReplacement(
    originalId: string,
    updateInvoice: InvoiceCreateInput
  ): Promise<{ old: InvoiceWithItems; new: InvoiceWithItems }> {
    return await prisma.$transaction(async (tx: PrismaTransaction) => {
      const { items, replacementOf: _replacementOf, replacedBy: _replacedBy, ...invoiceData } = updateInvoice

      const newInvoice = await tx.invoice.create({
        data: {
          ...invoiceData,
          status: InvoiceStatus.issued,
          replacementOfId: originalId,
          items: items
        },
        include: {
          items: true,
          replacementOf: true,
          replacedBy: true
        }
      })

      const oldInvoice = await tx.invoice.update({
        where: { id: originalId },
        data: {
          replacedById: newInvoice.id
        },
        include: {
          items: true,
          replacementOf: true,
          replacedBy: true
        }
      })

      return { old: oldInvoice, new: newInvoice }
    })
  }

  async getNextInvoiceNumber(year: number): Promise<string> {
    return prisma.$transaction(async (tx: PrismaTransaction) => {
      const seq = await tx.invoiceNumberSeq.upsert({
        where: { year },
        update: {
          lastValue: { increment: 1 }
        },
        create: {
          year,
          lastValue: 1
        }
      })

      return `INV-${year}-${seq.lastValue.toString().padStart(6, '0')}`
    })
  }

  async updatePdfInfo(
    id: string,
    pdfInfo: {
      pdfPath: string
      pdfGeneratedAt: Date
    }
  ): Promise<void> {
    await prisma.invoice.update({
      where: { id },
      data: pdfInfo
    })
  }
}
