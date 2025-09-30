export const INVOICE_MESSAGES = {
  // === SUCCESS MESSAGES ===
  SUCCESS: {
    // Create operations
    DRAFT_CREATED: 'Hoá đơn draft đã được tạo thành công',
    REPLACEMENT_CREATED: 'Hoá đơn thay thế đã được tạo thành công',

    // Read operations
    LIST_RETRIEVED: 'Lấy danh sách hoá đơn thành công',
    DETAIL_RETRIEVED: 'Lấy thông tin hoá đơn thành công',

    // Update operations
    DRAFT_UPDATED: 'Hoá đơn đã được cập nhật thành công',

    // Delete operations
    DRAFT_DELETED: 'Hoá đơn đã được xoá thành công',

    // State change operations
    ISSUED: 'Hoá đơn đã được xuất thành công',
    CANCELLED: 'Hoá đơn đã được huỷ thành công'
  },

  // === ERROR MESSAGES ===
  ERRORS: {
    // Not found errors
    NOT_FOUND: 'Không tìm thấy hoá đơn',
    NOT_EXISTS: 'Hoá đơn không tồn tại',
    REPLACEMENT_TARGET_NOT_FOUND: 'Hoá đơn cần thay thế không tồn tại',

    // Status validation errors
    ONLY_UPDATE_DRAFT: 'Chỉ có thể cập nhật hoá đơn ở trạng thái draft',
    ONLY_DELETE_DRAFT: 'Chỉ có thể xoá hoá đơn ở trạng thái draft',
    ONLY_ISSUE_DRAFT: 'Chỉ có thể xuất hoá đơn ở trạng thái draft',
    ONLY_CANCEL_ISSUED: 'Chỉ có thể huỷ hoá đơn đã được xuất (issued)',
    ONLY_REPLACE_ISSUED: 'Chỉ có thể thay thế hoá đơn đã được xuất (issued)',

    // Business rule errors
    MISSING_REQUIRED_DATA: 'Hoá đơn phải có tên người mua và ít nhất 1 item',
    CANCEL_REASON_REQUIRED: 'Phải có lý do huỷ hoá đơn',
    ALREADY_REPLACED: 'Hoá đơn này đã được thay thế trước đó',
    CANNOT_CANCEL_REPLACED: 'Không thể huỷ hoá đơn đã bị thay thế',

    // Validation errors
    INVALID_INPUT_DATA: 'Dữ liệu đầu vào không hợp lệ',
    INVALID_QUERY_PARAMS: 'Query parameters không hợp lệ',
    INVALID_ROUTE_PARAMS: 'Route parameters không hợp lệ'
  }
} as const

// Type-safe message keys cho TypeScript intellisense
export type InvoiceSuccessMessageKey = keyof typeof INVOICE_MESSAGES.SUCCESS
export type InvoiceErrorMessageKey = keyof typeof INVOICE_MESSAGES.ERRORS

/**
 * Helper functions để get messages với type safety
 */
export const getSuccessMessage = (key: InvoiceSuccessMessageKey): string => {
  return INVOICE_MESSAGES.SUCCESS[key]
}

export const getErrorMessage = (key: InvoiceErrorMessageKey): string => {
  return INVOICE_MESSAGES.ERRORS[key]
}

/**
 * Shorthand exports cho convenience
 */
export const SUCCESS_MESSAGES = INVOICE_MESSAGES.SUCCESS
export const ERROR_MESSAGES = INVOICE_MESSAGES.ERRORS
