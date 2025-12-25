/**
 * API utility for making requests to the backend
 * Handles different base URLs for development and production
 */

// Determine the API base URL
// In production, use the backend subdomain
// In development, use relative paths (Vite proxy handles it)
const getApiBaseUrl = () => {
  // Check if we're in production (built app, not dev server)
  // Vite sets import.meta.env.MODE to 'production' when building
  // and import.meta.env.PROD to true in production builds
  if (import.meta.env.MODE === 'production' || import.meta.env.PROD) {
    // Production: use the backend subdomain
    return 'https://backend.aurora.icurety.com';
  }
  
  // Development: use relative paths (Vite proxy will forward to localhost:4747)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Make an API request
 * @param {string} endpoint - API endpoint (e.g., '/api/alerts')
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
  });

  return response;
}

