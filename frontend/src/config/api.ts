/**
 * API Configuration for different environments
 */

const getApiBaseUrl = (): string => {
  // In development, use the Vite proxy
  if (import.meta.env.DEV) {
    return ''
  }
  
  // In production, use the deployed backend URL
  // Replace this with your actual deployed backend URL
  const productionApiUrl = import.meta.env.VITE_API_URL || 'https://your-app-name.onrender.com'
  
  return productionApiUrl
}

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    HEALTH: '/api/health',
    QR_CODE: {
      GENERATE: '/api/qr-code/generate',
      GENERATE_BULK: '/api/qr-code/generate-bulk',
      DOWNLOAD: '/api/qr-code/download'
    },
    PASSWORD_GENERATOR: {
      GENERATE: '/api/password-generator/generate',
      GENERATE_BULK: '/api/password-generator/generate-bulk',
      DOWNLOAD: '/api/password-generator/download'
    },
    DOCUMENT_FETCHER: {
      PROCESS: '/api/document-fetcher/process-documents',
      DOWNLOAD: '/api/document-fetcher/download'
    },
    FILE_CONVERTER: {
      CONVERT: '/api/file-converter/convert',
      CONVERT_BULK: '/api/file-converter/convert-bulk',
      DOWNLOAD: '/api/file-converter/download'
    },
    IMAGE_RESIZER: {
      RESIZE: '/api/image-resizer/resize',
      RESIZE_BULK: '/api/image-resizer/resize-bulk',
      DOWNLOAD: '/api/image-resizer/download'
    }
  }
}

/**
 * Helper function to build full API URLs
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}
