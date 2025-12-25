/**
 * Reverse geocoding service
 * Gets city name from latitude/longitude coordinates
 */

import fetch from 'node-fetch';

/**
 * Get city name from coordinates using a free reverse geocoding API
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string>} City name or "Unknown Location"
 */
export async function getCityName(latitude, longitude) {
  try {
    // Using OpenStreetMap Nominatim API (free, no API key required)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AuroraAlerter/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract city name from address components
    const address = data.address || {};
    
    // Try different address components in order of preference
    const cityName = 
      address.city || 
      address.town || 
      address.village || 
      address.municipality ||
      address.county ||
      address.state ||
      address.country ||
      'Unknown Location';

    return cityName;
  } catch (error) {
    console.error('Error getting city name:', error);
    return 'Unknown Location';
  }
}

/**
 * Cache city names to avoid repeated API calls
 * Simple in-memory cache with 24-hour expiration
 */
const cityCache = new Map();

export async function getCachedCityName(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  // Check cache
  const cached = cityCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.cityName;
  }

  // Fetch and cache
  const cityName = await getCityName(latitude, longitude);
  cityCache.set(cacheKey, {
    cityName,
    timestamp: Date.now(),
  });

  return cityName;
}

