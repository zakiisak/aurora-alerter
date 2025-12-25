/**
 * Aurora data fetching service
 * Fetches latest aurora forecast data from NOAA
 */

import fetch from 'node-fetch';

const AURORA_API_URL = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';

/**
 * Fetch latest aurora forecast data
 * @returns {Promise<Object>} Aurora data with coordinates array
 */
export async function fetchAuroraData() {
  try {
    const response = await fetch(AURORA_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch aurora data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching aurora data:', error);
    throw error;
  }
}

/**
 * Find the closest coordinate to a given lat/lng in the aurora data
 * Uses simple Euclidean distance (good enough for this use case)
 * @param {Array} coordinates - Array of [longitude, latitude, aurora] tuples
 * @param {number} targetLat - Target latitude
 * @param {number} targetLng - Target longitude
 * @returns {Object|null} Object with {longitude, latitude, aurora} or null if no data
 */
export function findClosestCoordinate(coordinates, targetLat, targetLng) {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let closest = null;
  let minDistance = Infinity;

  for (const coord of coordinates) {
    const [lng, lat, aurora] = coord;
    
    // Calculate distance using Haversine formula (more accurate for lat/lng)
    const distance = haversineDistance(targetLat, targetLng, lat, lng);
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = { longitude: lng, latitude: lat, aurora };
    }
  }

  return closest;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

