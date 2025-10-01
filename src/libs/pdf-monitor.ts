export interface PdfPerformanceMetrics {
  invoiceId: string
  startTime: number
  endTime?: number
  duration?: number
  templateRenderTime?: number
  browserSetupTime?: number
  htmlToContentTime?: number
  pdfGenerationTime?: number
  cacheHit?: boolean
  error?: string
}

class PdfPerformanceMonitor {
  private static instance: PdfPerformanceMonitor
  private metrics: Map<string, PdfPerformanceMetrics> = new Map()
  private readonly maxMetricsHistory = 1000

  static getInstance(): PdfPerformanceMonitor {
    if (!PdfPerformanceMonitor.instance) {
      PdfPerformanceMonitor.instance = new PdfPerformanceMonitor()
    }
    return PdfPerformanceMonitor.instance
  }

  startTracking(invoiceId: string): string {
    const trackingId = `${invoiceId}-${Date.now()}`

    this.metrics.set(trackingId, {
      invoiceId,
      startTime: Date.now()
    })

    if (this.metrics.size > this.maxMetricsHistory) {
      const oldestKey = this.metrics.keys().next().value
      if (oldestKey) {
        this.metrics.delete(oldestKey)
      }
    }

    return trackingId
  }

  recordStep(trackingId: string, step: keyof PdfPerformanceMetrics, value: number | boolean): void {
    const metric = this.metrics.get(trackingId)
    if (metric) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(metric as any)[step] = value
    }
  }

  endTracking(trackingId: string, error?: string): PdfPerformanceMetrics | null {
    const metric = this.metrics.get(trackingId)
    if (!metric) return null

    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime

    if (error) {
      metric.error = error
    }

    this.logPerformance(metric)

    return metric
  }

  private logPerformance(metric: PdfPerformanceMetrics): void {
    const logLevel = metric.error ? 'error' : metric.duration! > 5000 ? 'warn' : 'info'

    console[logLevel]('PDF Generation Performance:', {
      invoiceId: metric.invoiceId,
      totalDuration: `${metric.duration}ms`,
      templateRender: `${metric.templateRenderTime || 0}ms`,
      browserSetup: `${metric.browserSetupTime || 0}ms`,
      htmlToContent: `${metric.htmlToContentTime || 0}ms`,
      pdfGeneration: `${metric.pdfGenerationTime || 0}ms`,
      cacheHit: metric.cacheHit || false,
      error: metric.error || null
    })
  }

  getAverageMetrics(): {
    averageDuration: number
    cacheHitRate: number
    errorRate: number
    totalGenerations: number
  } {
    const allMetrics = Array.from(this.metrics.values()).filter((m) => m.duration !== undefined)

    if (allMetrics.length === 0) {
      return {
        averageDuration: 0,
        cacheHitRate: 0,
        errorRate: 0,
        totalGenerations: 0
      }
    }

    const totalDuration = allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    const cacheHits = allMetrics.filter((m) => m.cacheHit).length
    const errors = allMetrics.filter((m) => m.error).length

    return {
      averageDuration: Math.round(totalDuration / allMetrics.length),
      cacheHitRate: Math.round((cacheHits / allMetrics.length) * 100),
      errorRate: Math.round((errors / allMetrics.length) * 100),
      totalGenerations: allMetrics.length
    }
  }

  clearMetrics(): void {
    this.metrics.clear()
  }
}

export const pdfPerformanceMonitor = PdfPerformanceMonitor.getInstance()
