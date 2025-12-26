import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { apiRequest } from '../utils/api';
import './AuroraMapView.css';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Convert aurora value (0-100) to color based on ranges
 */
function getAuroraColor(value) {
  if (value === null || value === undefined || value === 0) {
    return 'rgba(0, 0, 0, 0)';
  }

  let r, g, b, a;

  if (value <= 10) {
    const ratio = value / 10;
    r = 0;
    g = Math.round(100 + (155 * ratio));
    b = 0;
    a = 0.15 + (0.25 * ratio);
  } else if (value <= 50) {
    const ratio = (value - 10) / 40;
    r = Math.round(255 * ratio);
    g = 255;
    b = 0;
    a = 0.4 + (0.3 * ratio);
  } else if (value <= 90) {
    const ratio = (value - 50) / 40;
    r = 255;
    g = Math.round(255 * (1 - 0.35 * ratio));
    b = 0;
    a = 0.7 + (0.2 * ratio);
  } else {
    const ratio = (value - 90) / 10;
    r = 255;
    g = Math.round(165 * (1 - ratio));
    b = 0;
    a = 0.9 + (0.1 * ratio);
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Interpolate aurora value at a given point using inverse distance weighting (IDW)
 */
function interpolateValue(lat, lng, dataPoints, power = 2, maxDistance = 2000) {
  if (!dataPoints || dataPoints.length === 0) {
    return null;
  }

  let numerator = 0;
  let denominator = 0;

  for (const point of dataPoints) {
    const distance = haversineDistance(lat, lng, point.latitude, point.longitude);
    
    if (distance > maxDistance) continue;
    if (distance < 0.1) {
      return point.value;
    }

    const weight = 1 / Math.pow(distance, power);
    numerator += weight * point.value;
    denominator += weight;
  }

  if (denominator === 0) {
    return null;
  }

  return Math.round(numerator / denominator);
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
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

// Simple canvas overlay component
function CanvasOverlay({ dataPoints }) {
  const map = useMap();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!map || !dataPoints || dataPoints.length === 0) return;

    // Create container for canvas
    const container = map.getContainer();
    if (!container) return;

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.className = 'aurora-heatmap-canvas';
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 650;
    `;
    
    container.appendChild(canvas);
    canvasRef.current = canvas;
    containerRef.current = container;
    
    console.log('Canvas added to container:', {
      container: container.className || container.id || 'map container',
      canvasSize: `${canvas.width}x${canvas.height}`,
      containerSize: `${container.offsetWidth}x${container.offsetHeight}`
    });

    const updateCanvas = () => {
      if (!canvas || !map || !dataPoints || dataPoints.length === 0) {
        console.log('Canvas update skipped:', { canvas: !!canvas, map: !!map, dataPoints: dataPoints?.length || 0 });
        return;
      }

      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        console.log('Map size is zero, skipping render');
        return;
      }

      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const zoom = map.getZoom();
      const bounds = map.getBounds();
      const mapSize = map.getSize();
      
      // Adjust radius based on zoom - smaller at higher zoom for better detail
      const radiusPixels = Math.max(1, Math.min(20, 20 / Math.max(1, zoom - 1)));
      
      console.log('Map state:', {
        zoom,
        canvasSize: `${canvas.width}x${canvas.height}`,
        mapSize: `${mapSize.x}x${mapSize.y}`,
        bounds: bounds.toBBoxString(),
        center: map.getCenter().toString(),
        radiusPixels: radiusPixels.toFixed(1),
        dataPoints: dataPoints.length
      });
      
      let rendered = 0;
      let skippedInvalid = 0;
      let skippedBounds = 0;
      let skippedAlpha = 0;
      let skippedColor = 0;
      
      // Sample first few points for debugging
      if (dataPoints.length > 0) {
        const sample = dataPoints.slice(0, 5);
        console.log('Sample points:', sample.map(p => ({
          lat: parseFloat(p.latitude),
          lng: parseFloat(p.longitude),
          value: parseInt(p.value),
          raw: p
        })));
      }
      
      dataPoints.forEach((point, index) => {
        try {
          // Ensure coordinates are valid numbers
          const lat = parseFloat(point.latitude);
          const lng = parseFloat(point.longitude);
          const value = parseInt(point.value);
          
          if (isNaN(lat) || isNaN(lng) || isNaN(value) || value < 1) {
            skippedInvalid++;
            return;
          }
          
          // Convert to container point - Leaflet handles coordinate wrapping
          // Don't pre-filter by bounds - let container point conversion handle it
          let containerPoint;
          try {
            containerPoint = map.latLngToContainerPoint([lat, lng]);
            
            // Debug: Log first few points to see where they're being placed
            if (index < 10 && (index % 2 === 0)) {
              const inViewport = bounds.contains([lat, lng]);
              console.log(`Point ${index}:`, {
                lat: lat.toFixed(2),
                lng: lng.toFixed(2),
                value,
                containerX: containerPoint.x.toFixed(1),
                containerY: containerPoint.y.toFixed(1),
                canvasSize: `${canvas.width}x${canvas.height}`,
                inViewport,
                bounds: bounds.toBBoxString()
              });
            }
          } catch (e) {
            // Point might be outside valid range, skip it
            if (index < 5) console.log(`Point ${index} conversion failed:`, e);
            skippedBounds++;
            return;
          }
          
          // Check if point is visible on canvas
          // Use a very generous margin to catch points near the edges
          const margin = radiusPixels * 10; // Very generous margin
          const inBounds = containerPoint.x >= -margin && containerPoint.x <= canvas.width + margin &&
                          containerPoint.y >= -margin && containerPoint.y <= canvas.height + margin;
          
          if (!inBounds) {
            skippedBounds++;
            return;
          }
          
          const color = getAuroraColor(value);
          
          // Parse rgba string properly - extract numbers including decimals
          // Format: "rgba(r, g, b, a)" or "rgba(r, g, b, a)"
          const rgbaMatch = color.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*([\d.]+)\)/);
          
          if (!rgbaMatch || rgbaMatch.length < 5) {
            if (index < 5) console.log(`[${index}] Color parse failed:`, { value, color });
            skippedColor++;
            return;
          }
          
          const r = parseFloat(rgbaMatch[1]);
          const g = parseFloat(rgbaMatch[2]);
          const b = parseFloat(rgbaMatch[3]);
          const alpha = parseFloat(rgbaMatch[4]);
          
          // Debug first few points
          if (index < 5) {
            console.log(`[${index}] Color check:`, {
              value,
              color,
              r, g, b, alpha,
              alphaCheck: alpha <= 0.01
            });
          }
          
          // Render if alpha is meaningful
          if (alpha <= 0.01) {
            skippedAlpha++;
            return;
          }
          
          // Actually render the point
          const gradient = ctx.createRadialGradient(
            containerPoint.x, containerPoint.y, 0,
            containerPoint.x, containerPoint.y, radiusPixels
          );
          
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(containerPoint.x, containerPoint.y, radiusPixels, 0, Math.PI * 2);
          ctx.fill();
          rendered++;
          
        } catch (e) {
          // Silently skip errors for performance
          skippedInvalid++;
        }
      });
      
      console.log(`✅ Canvas: ${rendered} rendered | ❌ Skipped: ${skippedInvalid} invalid, ${skippedBounds} bounds, ${skippedAlpha} alpha, ${skippedColor} color`);
    };

    // Initial render
    setTimeout(updateCanvas, 100);

    // Update on map events
    map.on('moveend', updateCanvas);
    map.on('zoomend', updateCanvas);
    map.on('resize', updateCanvas);

    return () => {
      map.off('moveend', updateCanvas);
      map.off('zoomend', updateCanvas);
      map.off('resize', updateCanvas);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [map, dataPoints]);

  return null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick, dataPoints }) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e) => {
      const interpolatedValue = interpolateValue(
        e.latlng.lat,
        e.latlng.lng,
        dataPoints,
        2,
        2000
      );
      onMapClick(e.latlng, interpolatedValue);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, dataPoints, onMapClick]);

  return null;
}

function AuroraMapView({ user, onBack }) {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHoursAgo, setSelectedHoursAgo] = useState(0);
  const [error, setError] = useState('');
  const [clickedPoint, setClickedPoint] = useState(null);
  const [clickedValue, setClickedValue] = useState(null);

  useEffect(() => {
    fetchMapData();
  }, [selectedHoursAgo]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest(`/api/alerts/map-data?hoursAgo=${selectedHoursAgo}`, {
        headers: {
          'x-user-email': user.email,
        },
      });
      const data = await response.json();
      if (data.success) {
        console.log('Map data loaded:', data.data?.length, 'points');
        setMapData(data.data || []);
      } else {
        setError('Failed to load map data');
      }
    } catch (err) {
      console.error('Error fetching map data:', err);
      setError('Failed to load map data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (latlng, interpolatedValue) => {
    setClickedPoint(latlng);
    setClickedValue(interpolatedValue);
  };

  const formatTimeLabel = (hoursAgo) => {
    if (hoursAgo === 0) {
      return 'Now';
    }
    const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Filter and sample data for performance
  const filteredData = useMemo(() => {
    if (!mapData || mapData.length === 0) {
      console.log('No map data available');
      return [];
    }

    // Filter out invalid points and very low values
    const filtered = mapData.filter(point => {
      if (!point) return false;
      
      const value = parseInt(point.value);
      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      
      return !isNaN(value) && !isNaN(lat) && !isNaN(lng) && 
             value >= 1 && // Only show values >= 1
             lat >= -90 && lat <= 90 &&
             lng >= -180 && lng <= 180;
    });
    
    console.log('Filtered data points:', filtered.length, 'out of', mapData.length);
    
    // Sample data if too many points (keep every Nth point)
    if (filtered.length > 10000) {
      const step = Math.ceil(filtered.length / 10000);
      const sampled = filtered.filter((_, index) => index % step === 0);
      console.log('Sampled to', sampled.length, 'points for performance');
      return sampled;
    }
    
    return filtered;
  }, [mapData]);

  if (error && !mapData.length) {
    return (
      <div className="aurora-map-container">
        <div className="aurora-map-error">
          <p>{error}</p>
          <button onClick={fetchMapData} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-map-container">
      <div className="aurora-map-header">
        <button onClick={onBack} className="btn-back">
          ← Back to Alerts
        </button>
        <h1>🌌 Aurora Map View</h1>
        <p className="map-subtitle">Real-time Aurora Forecast Data</p>
      </div>

      <div className="aurora-map-controls">
        <label className="time-slider-label">
          <span>Time:</span>
          <span className="time-display">{formatTimeLabel(selectedHoursAgo)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="24"
          value={selectedHoursAgo}
          onChange={(e) => setSelectedHoursAgo(parseInt(e.target.value))}
          className="time-slider"
        />
        <div className="time-slider-labels">
          <span>Now</span>
          <span>24h ago</span>
        </div>
      </div>

      <div className="aurora-map-legend">
        <div className="legend-title">Aurora Intensity</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getAuroraColor(5) }}></div>
            <span>0-10</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getAuroraColor(30) }}></div>
            <span>10-50</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getAuroraColor(70) }}></div>
            <span>50-90</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getAuroraColor(95) }}></div>
            <span>90-100</span>
          </div>
        </div>
        <div className="legend-hint">Click anywhere on the map to see interpolated values</div>
      </div>

      <div className="aurora-map-wrapper">
        {loading && (
          <div className="aurora-map-loading-overlay">
            <div className="spinner"></div>
            <p>Loading map data...</p>
          </div>
        )}
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <CanvasOverlay dataPoints={filteredData} />
          
          <MapClickHandler 
            onMapClick={handleMapClick}
            dataPoints={filteredData}
          />

          {clickedPoint && (
            <Popup position={[clickedPoint.lat, clickedPoint.lng]}>
              <div className="map-popup">
                {clickedValue !== null ? (
                  <>
                    <div className="popup-value">
                      <strong>{clickedValue}/100</strong>
                    </div>
                    <div className="popup-label">Interpolated Value</div>
                    <div className="popup-coords">
                      {clickedPoint.lat.toFixed(4)}°, {clickedPoint.lng.toFixed(4)}°
                    </div>
                  </>
                ) : (
                  <>
                    <div className="popup-value">No Data</div>
                    <div className="popup-coords">
                      {clickedPoint.lat.toFixed(4)}°, {clickedPoint.lng.toFixed(4)}°
                    </div>
                    <div className="popup-hint">Outside data coverage area</div>
                  </>
                )}
              </div>
            </Popup>
          )}
        </MapContainer>
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="aurora-map-empty">
          <p>No aurora data available for the selected time.</p>
          <p className="empty-hint">Data points loaded: {mapData.length}</p>
        </div>
      )}
    </div>
  );
}

export default AuroraMapView;
