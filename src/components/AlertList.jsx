import React, { useState, useEffect } from 'react';
import AlertModal from './AlertModal';
import AuroraHistoryChart from './AuroraHistoryChart';
import AuroraMapView from './AuroraMapView';
import { apiRequest } from '../utils/api';
import './AlertList.css';

function AlertList({ user, onLogout }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [showMapView, setShowMapView] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await apiRequest('/api/alerts', {
        headers: {
          'x-user-email': user.email,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = () => {
    setEditingAlert(null);
    setShowModal(true);
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setShowModal(true);
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/alerts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': user.email,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchAlerts();
      } else {
        alert('Failed to delete alert');
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Failed to delete alert');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingAlert(null);
  };

  const handleModalSave = () => {
    fetchAlerts();
    handleModalClose();
  };

  if (showMapView) {
    return <AuroraMapView user={user} onBack={() => setShowMapView(false)} />;
  }

  if (loading) {
    return (
      <div className="alert-list-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="alert-list-container">
      <header className="alert-list-header">
        <div>
          <h1>🌌 Aurora Alerts</h1>
          <p className="user-email">{user.email}</p>
        </div>
        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </header>

      <div className="alert-list-content">
        <div className="alert-list-actions">
          <button onClick={handleAddAlert} className="btn-add-alert">
            + Add Alert
          </button>
          <button onClick={() => setShowMapView(true)} className="btn-view-map">
            🗺️ View Map
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state">
            <p>No alerts yet. Click "Add Alert" to create your first aurora alert!</p>
          </div>
        ) : (
          <div className="alerts-grid">
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-card">
                <div className="alert-card-header">
                  <h3>Alert #{alert.id}</h3>
                  <div className="alert-card-actions">
                    <button
                      onClick={() => handleEditAlert(alert)}
                      className="btn-icon"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="btn-icon"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="alert-card-body">
                  <div className="alert-info">
                    <div className="info-item">
                      <span className="info-label">Location:</span>
                      <span className="info-value">
                        {alert.cityName || 'Loading...'}
                      </span>
                      <span className="info-coords">
                        {alert.latitude.toFixed(4)}°, {alert.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Threshold:</span>
                      <span className="info-value threshold-value">
                        {alert.threshold}/100
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Notify on Increase:</span>
                      <span className="info-value">
                        {alert.increment_threshold || 10} units
                      </span>
                    </div>
                    {alert.latestAuroraValue !== null && (
                      <div className="info-item">
                        <span className="info-label">Latest Value:</span>
                        <span className="info-value latest-value">
                          {alert.latestAuroraValue}/100
                        </span>
                        {alert.latestAuroraValueAt && (
                          <span className="info-time">
                            {new Date(alert.latestAuroraValueAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {alert.last_notified_value !== null && (
                      <div className="info-item">
                        <span className="info-label">Last Notified:</span>
                        <span className="info-value">
                          Value {alert.last_notified_value}/100
                        </span>
                        {alert.last_notified_at && (
                          <span className="info-time">
                            {new Date(alert.last_notified_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 24-hour history chart */}
                  <AuroraHistoryChart history={alert.history || []} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AlertModal
          alert={editingAlert}
          user={user}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

export default AlertList;

