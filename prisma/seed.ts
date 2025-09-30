import { prisma } from '../src/db/client'
import { Decimal } from '@prisma/client/runtime/library'

async function main() {
  // Tạo sequence cho năm hiện tại
  const currentYear = new Date().getFullYear()

  await prisma.invoiceNumberSeq.upsert({
    where: { year: currentYear },
    update: {},
    create: {
      year: currentYear,
      lastValue: 0
    }
  })

  // Tạo 2 hoá đơn draft mẫu
  const invoice1 = await prisma.invoice.create({
    data: {
      buyerName: 'Công ty ABC',
      buyerTaxId: '0123456789',
      buyerAddress: '123 Đường XYZ, Quận 1, TP.HCM',
      sellerName: 'Công ty BINVOICE',
      sellerTaxId: '9876543210',
      subtotal: new Decimal('1000000'),
      taxTotal: new Decimal('100000'),
      grandTotal: new Decimal('1100000'),
      dueDate: new Date('2024-01-31'),
      notes: 'Thanh toán trong 30 ngày',
      items: {
        create: [
          {
            description: 'Dịch vụ tư vấn IT',
            quantity: new Decimal('10'),
            unitPrice: new Decimal('100000'),
            taxRate: new Decimal('10'),
            lineSubtotal: new Decimal('1000000'),
            lineTax: new Decimal('100000'),
            lineTotal: new Decimal('1100000')
          }
        ]
      }
    },
    include: {
      items: true
    }
  })

  const invoice2 = await prisma.invoice.create({
    data: {
      buyerName: 'Công ty DEF',
      buyerTaxId: '5555666677',
      buyerAddress: '456 Đường QWE, Quận 2, TP.HCM',
      sellerName: 'Công ty BINVOICE',
      sellerTaxId: '9876543210',
      subtotal: new Decimal('2000000'),
      taxTotal: new Decimal('200000'),
      grandTotal: new Decimal('2200000'),
      dueDate: new Date('2024-02-15'),
      notes: 'Hoá đơn dịch vụ phần mềm',
      items: {
        create: [
          {
            description: 'Phần mềm quản lý',
            quantity: new Decimal('1'),
            unitPrice: new Decimal('1500000'),
            taxRate: new Decimal('10'),
            lineSubtotal: new Decimal('1500000'),
            lineTax: new Decimal('150000'),
            lineTotal: new Decimal('1650000')
          },
          {
            description: 'Đào tạo sử dụng',
            quantity: new Decimal('5'),
            unitPrice: new Decimal('100000'),
            taxRate: new Decimal('10'),
            lineSubtotal: new Decimal('500000'),
            lineTax: new Decimal('50000'),
            lineTotal: new Decimal('550000')
          }
        ]
      }
    },
    include: {
      items: true
    }
  })

  console.log('Đã tạo seed data:')
  console.log('Invoice 1:', invoice1.id, '- Status:', invoice1.status)
  console.log('Invoice 2:', invoice2.id, '- Status:', invoice2.status)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
