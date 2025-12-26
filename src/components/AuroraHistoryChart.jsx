import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './AuroraHistoryChart.css';

/**
 * Simple 24-hour aurora history chart component using Recharts
 * @param {Array} history - Array of {value, timestamp} objects
 */
function AuroraHistoryChart({ history = [] }) {
  // Process history data for the last 24 hours
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      return [];
    }

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Filter and sort by timestamp
    const filtered = history
      .map((point) => ({
        value: point.value,
        timestamp: new Date(point.timestamp).getTime(),
      }))
      .filter((point) => point.timestamp >= twentyFourHoursAgo)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Create evenly spaced points for the last 24 hours
    const result = [];
    const hours = 24;
    
    for (let i = 0; i < hours; i++) {
      const targetTime = now - ((hours - 1 - i) * 60 * 60 * 1000);
      const targetHour = new Date(targetTime).getHours();
      
      // Find the closest data point to this time
      let closest = null;
      let minDiff = Infinity;
      
      filtered.forEach((point) => {
        const diff = Math.abs(point.timestamp - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = point;
        }
      });
      
      // Use the closest point if it's within 30 minutes, otherwise null
      result.push({
        hour: targetHour,
        value: closest && minDiff < 30 * 60 * 1000 ? closest.value : null,
        timestamp: targetTime,
        time: new Date(targetTime),
      });
    }

    return result;
  }, [history]);

  // Format hour label (show only every 6 hours to keep it minimal)
  const formatHourLabel = (hour) => {
    if (hour % 6 === 0) {
      return hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
    }
    return '';
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.value === null) return null;
      
      return (
        <div className="aurora-chart-tooltip">
          <div className="aurora-chart-tooltip-value">{data.value}/100</div>
          <div className="aurora-chart-tooltip-time">
            {data.time.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label formatter for X-axis
  const formatXAxisLabel = (hour) => {
    return formatHourLabel(hour);
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
        <ResponsiveContainer width="100%" height={100}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -35, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tickFormatter={formatXAxisLabel}
              tick={{ fontSize: 10, fill: '#999' }}
              tickLine={false}
              axisLine={false}
              interval={0}
              minTickGap={50}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: '#999' }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#667eea', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.7 }}
              allowEscapeViewBox={{ x: true, y: true }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#667eea"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AuroraHistoryChart;
