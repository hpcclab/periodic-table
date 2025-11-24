import { useState } from 'react';
import './HeatmapTable.css';

const HeatmapTable = () => {
  const [selectedMetric, setSelectedMetric] = useState('Latency');
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

  // Define tiers and abstraction levels
  const tiers = [
    { id: 'T1', name: 'Devices' },
    { id: 'T2', name: 'Edge' },
    { id: 'T3', name: 'Fog' },
    { id: 'T4', name: 'Cloud' }
  ];

  const levels = [
    { id: 'L1', name: 'Hardware/Infrastructure' },
    { id: 'L2', name: 'Platform' },
    { id: 'L3', name: 'System Libraries & Middleware' },
    { id: 'L4', name: 'Isolations (Virtualization & Containers)' },
    { id: 'L5', name: 'Programming Frameworks & Runtimes' },
    { id: 'L6', name: 'Applications & Services' },
    { id: 'L7', name: 'User' }
  ];

  // Metric data: each metric has values for each cell [row][col]
  // Values range from 0-100 for heatmap intensity
  const metricsData = {
    'Latency': [
      [15, 30, 50, 85],  // L1
      [20, 35, 55, 88],  // L2
      [25, 40, 60, 90],  // L3
      [30, 45, 65, 92],  // L4
      [35, 50, 70, 94],  // L5
      [40, 55, 75, 96],  // L6
      [45, 60, 80, 98]   // L7
    ],
    'Throughput': [
      [25, 45, 65, 95],  // L1
      [30, 50, 70, 96],  // L2
      [28, 48, 68, 94],  // L3
      [26, 46, 66, 92],  // L4
      [24, 44, 64, 90],  // L5
      [22, 42, 62, 88],  // L6
      [20, 40, 60, 85]   // L7
    ],
    'Availability': [
      [20, 40, 60, 95],  // L1
      [25, 45, 65, 96],  // L2
      [30, 50, 70, 97],  // L3
      [32, 52, 72, 97],  // L4
      [34, 54, 74, 98],  // L5
      [36, 56, 76, 98],  // L6
      [38, 58, 78, 99]   // L7
    ],
    'Cost': [
      [15, 35, 60, 95],  // L1
      [18, 38, 62, 94],  // L2
      [20, 40, 64, 93],  // L3
      [22, 42, 66, 92],  // L4
      [24, 44, 68, 91],  // L5
      [26, 46, 70, 90],  // L6
      [28, 48, 72, 88]   // L7
    ],
    'Elasticity': [
      [10, 30, 60, 98],  // L1
      [12, 32, 62, 97],  // L2
      [14, 34, 64, 96],  // L3
      [16, 36, 66, 95],  // L4
      [18, 38, 68, 94],  // L5
      [20, 40, 70, 93],  // L6
      [22, 42, 72, 92]   // L7
    ],
    'Reliability': [
      [25, 45, 70, 98],  // L1
      [30, 50, 72, 97],  // L2
      [32, 52, 74, 96],  // L3
      [34, 54, 76, 96],  // L4
      [36, 56, 78, 95],  // L5
      [38, 58, 80, 94],  // L6
      [40, 60, 82, 93]   // L7
    ],
    'Mobility': [
      [95, 75, 50, 15],  // L1
      [92, 72, 48, 18],  // L2
      [90, 70, 46, 20],  // L3
      [88, 68, 44, 22],  // L4
      [86, 66, 42, 24],  // L5
      [84, 64, 40, 26],  // L6
      [82, 62, 38, 28]   // L7
    ],
    'Distributedness': [
      [20, 45, 70, 95],  // L1
      [22, 47, 72, 94],  // L2
      [24, 49, 74, 93],  // L3
      [26, 51, 76, 92],  // L4
      [28, 53, 78, 91],  // L5
      [30, 55, 80, 90],  // L6
      [32, 57, 82, 88]   // L7
    ],
    'Democratization (Ease of use & Programming)': [
      [15, 20, 25, 30],  // L1
      [25, 30, 35, 40],  // L2
      [35, 40, 45, 50],  // L3
      [45, 50, 55, 60],  // L4
      [60, 65, 70, 75],  // L5
      [75, 80, 85, 90],  // L6
      [88, 90, 92, 95]   // L7
    ],
    'Governance': [
      [25, 45, 65, 90],  // L1
      [28, 48, 68, 91],  // L2
      [30, 50, 70, 92],  // L3
      [32, 52, 72, 93],  // L4
      [34, 54, 74, 94],  // L5
      [36, 56, 76, 95],  // L6
      [38, 58, 78, 96]   // L7
    ],
    'AI-Friendliness': [
      [15, 35, 60, 95],  // L1
      [18, 38, 62, 94],  // L2
      [20, 40, 64, 93],  // L3
      [22, 42, 66, 92],  // L4
      [30, 50, 72, 96],  // L5
      [35, 55, 75, 97],  // L6
      [38, 58, 78, 95]   // L7
    ],
    'Sustainability': [
      [30, 50, 70, 95],  // L1
      [32, 52, 72, 94],  // L2
      [34, 54, 74, 93],  // L3
      [36, 56, 76, 92],  // L4
      [38, 58, 78, 91],  // L5
      [40, 60, 80, 90],  // L6
      [42, 62, 82, 88]   // L7
    ],
    'Security & Trustworthiness': [
      [85, 70, 50, 40],  // L1
      [82, 68, 52, 42],  // L2
      [80, 66, 54, 44],  // L3
      [78, 64, 56, 46],  // L4
      [76, 62, 58, 50],  // L5
      [74, 60, 60, 55],  // L6
      [72, 58, 62, 60]   // L7
    ]
  };

  const metrics = Object.keys(metricsData);

  // Get color based on intensity (0-100)
  const getHeatmapColor = (value) => {
    // Dark mode color scheme: from dark blue (low) to bright cyan/green (high)
    const intensity = value / 100;

    // Create a gradient from dark blue -> teal -> cyan -> light green
    if (intensity < 0.25) {
      // Dark blue to blue
      const t = intensity / 0.25;
      return `rgb(${Math.round(15 + 20 * t)}, ${Math.round(25 + 35 * t)}, ${Math.round(60 + 40 * t)})`;
    } else if (intensity < 0.5) {
      // Blue to teal
      const t = (intensity - 0.25) / 0.25;
      return `rgb(${Math.round(35 + 15 * t)}, ${Math.round(60 + 60 * t)}, ${Math.round(100 + 30 * t)})`;
    } else if (intensity < 0.75) {
      // Teal to cyan
      const t = (intensity - 0.5) / 0.25;
      return `rgb(${Math.round(50 + 30 * t)}, ${Math.round(120 + 50 * t)}, ${Math.round(130 + 30 * t)})`;
    } else {
      // Cyan to light green
      const t = (intensity - 0.75) / 0.25;
      return `rgb(${Math.round(80 + 75 * t)}, ${Math.round(170 + 45 * t)}, ${Math.round(160 - 10 * t)})`;
    }
  };

  const currentData = metricsData[selectedMetric];

  return (
    <div className="heatmap-container">
      <div className="header-section">
        <h1 className="title">The Hitchhiker's Guide to Computing</h1>
          {/*<p className="subtitle">Tier and Abstraction Level Visualization</p>*/}

        <div className="metric-selector">
          <label htmlFor="metric-dropdown">Select Metric:</label>
          <select
            id="metric-dropdown"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-dropdown">
            {metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="corner-cell">
                <span className="corner-level">Level</span>
                <span className="corner-tier">Tier</span>
              </th>
              {tiers.map((tier) => (
                <th key={tier.id} className="tier-header">
                  <div className="tier-id">{tier.id}</div>
                  <div className="tier-name">{tier.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((level, rowIndex) => (
              <tr key={level.id}>
                <td className="level-header">
                  <div className="level-id">{level.id}</div>
                  <div className="level-name">{level.name}</div>
                </td>
                {tiers.map((tier, colIndex) => {
                  const value = currentData[rowIndex][colIndex];
                  const color = getHeatmapColor(value);
                  return (
                    <td
                      key={`${level.id}-${tier.id}`}
                      className="data-cell"
                      style={{ backgroundColor: color }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          visible: true,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                          content: `${tier.name} - ${level.name}`,
                          metric: selectedMetric,
                          value: value
                        });
                      }}
                      onMouseLeave={() => {
                        setTooltip({ visible: false, x: 0, y: 0, content: '', metric: '', value: 0 });
                      }}
                    >
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <div className="legend-title">Intensity Scale</div>
        <div className="legend-gradient">
          <div className="legend-labels">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
          <div className="gradient-bar"></div>
        </div>
      </div>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
      </footer>

      {tooltip.visible && (
        <div
          className="custom-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`
          }}
        >
          <div className="tooltip-location">{tooltip.content}</div>
        </div>
      )}
    </div>
  );
};

export default HeatmapTable;