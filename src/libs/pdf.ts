import fs from 'fs/promises'
import path from 'path'
import puppeteer, { Browser, Page } from 'puppeteer'
import handlebars from 'handlebars'
import { PrismaClient } from '@prisma/client'
import type { Invoice, InvoiceItem } from '@prisma/client'
import { pdfPerformanceMonitor } from './pdf-monitor'

// Types
type InvoiceWithItems = Invoice & {
  items: InvoiceItem[]
}

// Prisma client with optimized configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : []
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Browser instance management
class BrowserManager {
  private static instance: BrowserManager
  private browser: Browser | null = null
  private isInitializing = false
  private initPromise: Promise<Browser> | null = null

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise
    }

    this.isInitializing = true
    this.initPromise = this.initializeBrowser()

    try {
      this.browser = await this.initPromise
      return this.browser
    } finally {
      this.isInitializing = false
      this.initPromise = null
    }
  }

  private async initializeBrowser(): Promise<Browser> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    })

    // Handle browser disconnect
    browser.on('disconnected', () => {
      this.browser = null
    })

    return browser
  }

  async createPage(): Promise<Page> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    // Optimize page for PDF generation
    await page.setViewport({ width: 1280, height: 720 })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    return page
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Register Handlebars helpers once
let helpersRegistered = false

// Optimized Invoice Service with caching
class InvoiceService {
  private cache = new Map<string, { data: InvoiceWithItems; timestamp: number }>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  async findById(id: string): Promise<InvoiceWithItems | null> {
    try {
      // Check cache first
      const cached = this.cache.get(id)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: {
              id: 'asc'
            }
          }
        }
      })

      // Cache the result
      if (invoice) {
        this.cache.set(id, { data: invoice, timestamp: Date.now() })
      }

      return invoice
    } catch (error) {
      throw new Error(`Failed to find invoice: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  clearCache(id?: string): void {
    if (id) {
      this.cache.delete(id)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Force refresh invoice data by clearing cache and fetching fresh data
   */
  async refreshInvoice(id: string): Promise<InvoiceWithItems | null> {
    this.clearCache(id)
    return this.findById(id)
  }
}

export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter'
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
}

export class PdfService {
  private invoiceService: InvoiceService
  private templatePath: string
  private storageDir: string
  private browserManager: BrowserManager
  private compiledTemplate: HandlebarsTemplateDelegate | null = null

  constructor() {
    this.invoiceService = new InvoiceService()
    this.templatePath = path.join(process.cwd(), 'src/templates/invoice.hbs')
    this.storageDir = process.env.PDF_STORAGE_DIR || path.join(process.cwd(), 'storage/pdf')
    this.browserManager = BrowserManager.getInstance()
    this.registerHandlebarsHelpers()
  }

  /**
   * Render invoice HTML từ template Handlebars với caching
   */
  async renderInvoiceHtml(invoice: InvoiceWithItems): Promise<string> {
    try {
      // Load và compile template một lần duy nhất
      if (!this.compiledTemplate) {
        const templateContent = await fs.readFile(this.templatePath, 'utf-8')
        this.compiledTemplate = handlebars.compile(templateContent)
      }

      // Prepare data cho template
      const templateData = {
        ...invoice,
        isCanceled: invoice.status === 'canceled',
        generatedAt: new Date()
      }

      return this.compiledTemplate(templateData)
    } catch (error) {
      throw new Error(`Failed to render invoice HTML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate PDF từ invoice ID với tối ưu hóa tốc độ và performance monitoring
   */
  async generatePdf(
    invoiceId: string,
    options: PdfGenerationOptions = {}
  ): Promise<{ filePath: string; fileName: string }> {
    // Start performance tracking
    const trackingId = pdfPerformanceMonitor.startTracking(invoiceId)
    let page: Page | null = null

    try {
      // IMPORTANT: Clear cache để đảm bảo lấy dữ liệu invoice mới nhất
      this.invoiceService.clearCache(invoiceId)

      // Step 1: Parallel execution - Lấy invoice data và prepare storage
      const step1Start = Date.now()
      const [invoice] = await Promise.all([this.invoiceService.findById(invoiceId), this.ensureStorageDirectory()])
      pdfPerformanceMonitor.recordStep(trackingId, 'templateRenderTime', Date.now() - step1Start)

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Tạo filename dựa trên invoice number hoặc ID
      const fileName = `${invoice.number || `draft-${invoiceId}`}.pdf`
      const filePath = path.join(this.storageDir, fileName)

      // Step 2: Parallel execution - Render HTML và tạo page
      const step2Start = Date.now()
      const [html, newPage] = await Promise.all([this.renderInvoiceHtml(invoice), this.browserManager.createPage()])
      pdfPerformanceMonitor.recordStep(trackingId, 'browserSetupTime', Date.now() - step2Start)

      page = newPage

      // Step 3: Optimize page settings và set content
      const step3Start = Date.now()

      // Optimize page settings for PDF generation
      await page.evaluateOnNewDocument(() => {
        // Disable animations and transitions for faster rendering
        const style = document.createElement('style')
        style.textContent = `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
        document.head.appendChild(style)
      })

      // Set content với optimization
      await page.setContent(html, {
        waitUntil: 'domcontentloaded', // Thay vì networkidle0 để nhanh hơn
        timeout: 15000 // Giảm timeout
      })

      pdfPerformanceMonitor.recordStep(trackingId, 'htmlToContentTime', Date.now() - step3Start)

      // Step 4: Generate PDF
      const step4Start = Date.now()
      await page.pdf({
        path: filePath,
        format: options.format || 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
          ...options.margin
        },
        printBackground: true,
        preferCSSPageSize: true,
        omitBackground: false,
        tagged: false // Disable accessibility features for speed
      })
      pdfPerformanceMonitor.recordStep(trackingId, 'pdfGenerationTime', Date.now() - step4Start)

      // End successful tracking
      pdfPerformanceMonitor.endTracking(trackingId)

      return { filePath, fileName }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      pdfPerformanceMonitor.endTracking(trackingId, errorMessage)
      throw new Error(`Failed to generate PDF: ${errorMessage}`)
    } finally {
      // Close page but keep browser alive for reuse
      if (page) {
        await page.close()
      }
    }
  }

  /**
   * Kiểm tra xem PDF đã tồn tại chưa
   */
  async pdfExists(invoiceId: string): Promise<{ exists: boolean; filePath?: string; fileName?: string }> {
    try {
      // Clear cache để đảm bảo lấy dữ liệu mới nhất
      this.invoiceService.clearCache(invoiceId)
      const invoice = await this.invoiceService.findById(invoiceId)
      if (!invoice) {
        return { exists: false }
      }

      const fileName = `${invoice.number || `draft-${invoiceId}`}.pdf`
      const filePath = path.join(this.storageDir, fileName)

      try {
        await fs.access(filePath)
        return { exists: true, filePath, fileName }
      } catch {
        return { exists: false }
      }
    } catch (error) {
      throw new Error(`Failed to check PDF existence: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Đọc PDF file để stream
   */
  async readPdf(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath)
    } catch (error) {
      throw new Error(`Failed to read PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Xóa PDF file
   */
  async deletePdf(invoiceId: string): Promise<boolean> {
    try {
      const pdfInfo = await this.pdfExists(invoiceId)
      if (!pdfInfo.exists || !pdfInfo.filePath) {
        return false
      }

      await fs.unlink(pdfInfo.filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Đảm bảo storage directory tồn tại
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.storageDir)
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true })
    }
  }

  /**
   * Register Handlebars helpers (chỉ register một lần)
   */
  private registerHandlebarsHelpers(): void {
    // Kiểm tra xem helpers đã được register chưa
    if (helpersRegistered) {
      return
    }

    // Helper format currency with thousand separators
    handlebars.registerHelper('formatMoney', (value: unknown): string => {
      const num = this.parseNumber(value)
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    })

    // Helper format number with thousand separators
    handlebars.registerHelper('formatNumber', (value: unknown): string => {
      const num = this.parseNumber(value)

      if (num % 1 === 0) {
        return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
      }
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    })

    // Helper format date with caching
    const dateFormatCache = new Map<string, string>()
    handlebars.registerHelper('formatDate', (date: unknown): string => {
      if (!date) return ''

      const dateKey = date.toString()
      if (dateFormatCache.has(dateKey)) {
        return dateFormatCache.get(dateKey)!
      }

      let dateObj: Date
      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      } else {
        return ''
      }

      if (isNaN(dateObj.getTime())) {
        return ''
      }

      const formatted = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      dateFormatCache.set(dateKey, formatted)
      return formatted
    })

    // Helper for 1-based index
    handlebars.registerHelper('add1', (value: number): number => {
      return value + 1
    })

    helpersRegistered = true
  }

  /**
   * Optimized number parsing
   */
  private parseNumber(value: unknown): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value
    }

    if (typeof value === 'string') {
      const num = Number.parseFloat(value)
      return isNaN(num) ? 0 : num
    }

    if (value && typeof value === 'object' && 'toString' in value) {
      const num = Number.parseFloat(value.toString())
      return isNaN(num) ? 0 : num
    }

    return 0
  }

  /**
   * Cleanup resources
   */
  /**
   * Warm up browser và preload resources để tăng tốc cho lần generate đầu tiên
   */
  async warmUp(): Promise<void> {
    try {
      // Preload browser instance
      await this.browserManager.getBrowser()

      // Precompile template
      if (!this.compiledTemplate) {
        const templateContent = await fs.readFile(this.templatePath, 'utf-8')
        this.compiledTemplate = handlebars.compile(templateContent)
      }

      // Ensure storage directory exists
      await this.ensureStorageDirectory()

      console.log('PDF Service warmed up successfully')
    } catch (error) {
      console.error('Failed to warm up PDF Service:', error)
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return pdfPerformanceMonitor.getAverageMetrics()
  }

  /**
   * Clear invoice cache (public method for external use)
   */
  clearInvoiceCache(invoiceId?: string): void {
    this.invoiceService.clearCache(invoiceId)
  }

  async cleanup(): Promise<void> {
    await this.browserManager.cleanup()
    this.invoiceService.clearCache()
    this.compiledTemplate = null
    pdfPerformanceMonitor.clearMetrics()
  }
}

// Export singleton instance
export const pdfService = new PdfService()
