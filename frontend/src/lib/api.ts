/**
 * Utility function to handle API calls with proper error handling
 */
export async function apiCall<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Response is not JSON')
  }

  return response.json()
}

/**
 * Utility function to handle file uploads with proper error handling
 */
export async function apiFileUpload<T = any>(
  url: string, 
  formData: FormData
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Response is not JSON')
  }

  return response.json()
}
