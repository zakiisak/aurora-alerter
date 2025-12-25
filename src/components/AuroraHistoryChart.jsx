import React from 'react';
import './AuroraHistoryChart.css';

/**
 * Simple 24-hour aurora history chart component
 * @param {Array} history - Array of {value, timestamp} objects
 */
function AuroraHistoryChart({ history = [] }) {
  // Process history data for the last 24 hours
  const chartData = React.useMemo(() => {
    if (!history || history.length === 0) {
      return [];
    }

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Filter and group by hour
    const hourlyData = {};
    
    history.forEach((point) => {
      const timestamp = new Date(point.timestamp).getTime();
      if (timestamp >= twentyFourHoursAgo) {
        const hour = new Date(timestamp).getHours();
        const date = new Date(timestamp).toDateString();
        const key = `${date}-${hour}`;
        
        if (!hourlyData[key]) {
          hourlyData[key] = {
            hour,
            date,
            values: [],
            timestamp: timestamp,
          };
        }
        hourlyData[key].values.push(point.value);
      }
    });

    // Calculate average for each hour and sort by timestamp
    const processed = Object.values(hourlyData)
      .map(({ hour, date, values, timestamp }) => ({
        hour,
        date,
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        timestamp,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Fill in missing hours with null values for better visualization
    const result = [];
    const hours = 24;
    const nowDate = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
      const targetTime = now - (i * 60 * 60 * 1000);
      const targetHour = new Date(targetTime).getHours();
      const targetDate = new Date(targetTime).toDateString();
      
      const existing = processed.find(
        (p) => p.hour === targetHour && p.date === targetDate
      );
      
      result.push({
        hour: targetHour,
        value: existing ? existing.value : null,
        timestamp: targetTime,
      });
    }

    return result;
  }, [history]);

  // Calculate chart dimensions
  const maxValue = 9;
  const minValue = 0;
  const chartHeight = 80;
  const chartWidth = 100; // percentage

  // Get current hour for reference
  const currentHour = new Date().getHours();

  // Format hour label (show only every 6 hours to keep it minimal)
  const formatHourLabel = (hour) => {
    if (hour % 6 === 0) {
      return hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
    }
    return '';
  };

  if (chartData.length === 0) {
    return (
      <div className="aurora-chart-empty">
        <p>No history data yet. Data will appear after the first check.</p>
      </div>
    );
  }

  return (
    <div className="aurora-chart-container">
      <div className="aurora-chart-title">24-Hour History</div>
      <div className="aurora-chart">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="aurora-chart-svg">
          {/* Y-axis grid lines */}
          {[0, 3, 6, 9].map((value) => {
            const y = chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
            return (
              <line
                key={`grid-${value}`}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                className="aurora-chart-grid"
              />
            );
          })}

          {/* Data points and line */}
          <polyline
            points={chartData
              .map((point, index) => {
                if (point.value === null) return null;
                const x = (index / (chartData.length - 1)) * chartWidth;
                const y = chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
                return `${x},${y}`;
              })
              .filter(Boolean)
              .join(' ')}
            className="aurora-chart-line"
            fill="none"
          />

          {/* Data points */}
          {chartData.map((point, index) => {
            if (point.value === null) return null;
            const x = (index / (chartData.length - 1)) * chartWidth;
            const y = chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            return (
              <circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r="1.5"
                className="aurora-chart-point"
              />
            );
          })}
        </svg>

        {/* X-axis labels (minimal - only every 6 hours) */}
        <div className="aurora-chart-labels">
          {chartData.map((point, index) => {
            const label = formatHourLabel(point.hour);
            if (!label) return null;
            return (
              <span
                key={`label-${index}`}
                className="aurora-chart-label"
                style={{ left: `${(index / (chartData.length - 1)) * 100}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* Y-axis labels */}
        <div className="aurora-chart-y-labels">
          <span className="aurora-chart-y-label">9</span>
          <span className="aurora-chart-y-label">6</span>
          <span className="aurora-chart-y-label">3</span>
          <span className="aurora-chart-y-label">0</span>
        </div>
      </div>
    </div>
  );
}

export default AuroraHistoryChart;

