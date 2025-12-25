import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { apiRequest } from '../utils/api';
import './AlertModal.css';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function AlertModal({ alert, user, onClose, onSave }) {
  const [latitude, setLatitude] = useState(alert?.latitude || 64.8378); // Default: Fairbanks, Alaska
  const [longitude, setLongitude] = useState(alert?.longitude || -147.7164);
  const [threshold, setThreshold] = useState(alert?.threshold || 15);
  const [incrementThreshold, setIncrementThreshold] = useState(alert?.increment_threshold || 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMapClick = (latlng) => {
    setLatitude(latlng.lat);
    setLongitude(latlng.lng);
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      const url = alert ? `/api/alerts/${alert.id}` : '/api/alerts';
      const method = alert ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        headers: {
          'x-user-email': user.email,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          threshold,
          increment_threshold: incrementThreshold,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save alert');
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{alert ? 'Edit Alert' : 'Add New Alert'}</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3>1. Select Location on Map</h3>
            <p className="section-description">
              Click on the map to select your alert location
            </p>
            <div className="map-container">
              <MapContainer
                center={[latitude, longitude]}
                zoom={4}
                style={{ height: '400px', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[latitude, longitude]} />
                <MapClickHandler onMapClick={handleMapClick} />
              </MapContainer>
            </div>
            <div className="coordinates-display">
              <div className="coordinate-item">
                <label>Latitude:</label>
                <input
                  type="number"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  step="0.0001"
                  min="-90"
                  max="90"
                />
              </div>
              <div className="coordinate-item">
                <label>Longitude:</label>
                <input
                  type="number"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  step="0.0001"
                  min="-180"
                  max="180"
                />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>2. Set Aurora Threshold</h3>
            <p className="section-description">
              Choose the minimum aurora probability level (1-100) to trigger an alert
            </p>
            <div className="threshold-container">
              <input
                type="range"
                min="1"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="threshold-slider"
              />
              <div className="threshold-value-display">
                <span className="threshold-number">{threshold}</span>
                <span className="threshold-label">/ 100</span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>3. Set Notification Increment</h3>
            <p className="section-description">
              Only notify when aurora value increases by this amount (1-50). Prevents spam notifications for small fluctuations.
            </p>
            <div className="threshold-container">
              <input
                type="range"
                min="1"
                max="50"
                value={incrementThreshold}
                onChange={(e) => setIncrementThreshold(parseInt(e.target.value))}
                className="threshold-slider"
              />
              <div className="threshold-value-display">
                <span className="threshold-number">{incrementThreshold}</span>
                <span className="threshold-label">units</span>
              </div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Close
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;

