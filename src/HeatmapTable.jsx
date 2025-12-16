import { useState, useEffect, useRef } from 'react';
import './HeatmapTable.css';

const HeatmapTable = () => {
    const [selectedMetric, setSelectedMetric] = useState('Latency');
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const canvasRef = useRef(null);

    // Grid dimensions
    const CELL_WIDTH = 150;
    const CELL_HEIGHT = 60;
    const COLS = 4;
    const ROWS = 7;

    // Define tiers and abstraction levels
    const tiers = [
        { id: 'T1', name: 'Devices' },
        { id: 'T2', name: 'Edge' },
        { id: 'T3', name: 'Fog' },
        { id: 'T4', name: 'Cloud' }
    ];

    const levels = [
        { id: 'L1', name: 'Hardware (No Abstraction)' },
        { id: 'L2', name: 'Infrastructure' },
        { id: 'L3', name: 'Platform' },
        { id: 'L4', name: 'Execution (Runtime)' },
        { id: 'L5', name: 'Programming Models' },
        { id: 'L6', name: 'Application' },
        { id: 'L7', name: 'Agents' }
    ];

    // Metric data: each metric has values for each cell [row][col]
    // Values range from 0-100 for heatmap intensity
    const metricsData = {
        'Latency': [
            [15, 30, 50, 85],
            [20, 35, 55, 88],
            [25, 40, 60, 90],
            [30, 45, 65, 92],
            [35, 50, 70, 94],
            [40, 55, 75, 96],
            [45, 60, 80, 98]
        ],
        'Throughput': [
            [25, 45, 65, 95],
            [30, 50, 70, 96],
            [28, 48, 68, 94],
            [26, 46, 66, 92],
            [24, 44, 64, 90],
            [22, 42, 62, 88],
            [20, 40, 60, 85]
        ],
        'Availability': [
            [20, 40, 60, 95],
            [25, 45, 65, 96],
            [30, 50, 70, 97],
            [32, 52, 72, 97],
            [34, 54, 74, 98],
            [36, 56, 76, 98],
            [38, 58, 78, 99]
        ],
        'Cost': [
            [15, 35, 60, 95],
            [18, 38, 62, 94],
            [20, 40, 64, 93],
            [22, 42, 66, 92],
            [24, 44, 68, 91],
            [26, 46, 70, 90],
            [28, 48, 72, 88]
        ],
        'Elasticity': [
            [10, 30, 60, 98],
            [12, 32, 62, 97],
            [14, 34, 64, 96],
            [16, 36, 66, 95],
            [18, 38, 68, 94],
            [20, 40, 70, 93],
            [22, 42, 72, 92]
        ],
        'Reliability': [
            [25, 45, 70, 98],
            [30, 50, 72, 97],
            [32, 52, 74, 96],
            [34, 54, 76, 96],
            [36, 56, 78, 95],
            [38, 58, 80, 94],
            [40, 60, 82, 93]
        ],
        'Mobility': [
            [95, 75, 50, 15],
            [92, 72, 48, 18],
            [90, 70, 46, 20],
            [88, 68, 44, 22],
            [86, 66, 42, 24],
            [84, 64, 40, 26],
            [82, 62, 38, 28]
        ],
        'Distributedness': [
            [20, 45, 70, 95],
            [22, 47, 72, 94],
            [24, 49, 74, 93],
            [26, 51, 76, 92],
            [28, 53, 78, 91],
            [30, 55, 80, 90],
            [32, 57, 82, 88]
        ],
        'Democratization (Ease of use & Programming)': [
            [15, 20, 25, 30],
            [25, 30, 35, 40],
            [35, 40, 45, 50],
            [45, 50, 55, 60],
            [60, 65, 70, 75],
            [75, 80, 85, 90],
            [88, 90, 92, 95]
        ],
        'Governance': [
            [25, 45, 65, 90],
            [28, 48, 68, 91],
            [30, 50, 70, 92],
            [32, 52, 72, 93],
            [34, 54, 74, 94],
            [36, 56, 76, 95],
            [38, 58, 78, 96]
        ],
        'AI-Friendliness': [
            [15, 35, 60, 95],
            [18, 38, 62, 94],
            [20, 40, 64, 93],
            [22, 42, 66, 92],
            [30, 50, 72, 96],
            [35, 55, 75, 97],
            [38, 58, 78, 95]
        ],
        'Sustainability': [
            [30, 50, 70, 95],
            [32, 52, 72, 94],
            [34, 54, 74, 93],
            [36, 56, 76, 92],
            [38, 58, 78, 91],
            [40, 60, 80, 90],
            [42, 62, 82, 88]
        ],
        'Security & Trustworthiness': [
            [85, 70, 50, 40],
            [82, 68, 52, 42],
            [80, 66, 54, 44],
            [78, 64, 56, 46],
            [76, 62, 58, 50],
            [74, 60, 60, 55],
            [72, 58, 62, 60]
        ]
    };

    const metrics = Object.keys(metricsData);

    // Get RGB color values based on intensity (0-100)
    const getHeatmapRGB = (value) => {
        const intensity = value / 100;

        if (intensity < 0.25) {
            const t = intensity / 0.25;
            return [Math.round(15 + 20 * t), Math.round(25 + 35 * t), Math.round(60 + 40 * t)];
        } else if (intensity < 0.5) {
            const t = (intensity - 0.25) / 0.25;
            return [Math.round(35 + 15 * t), Math.round(60 + 60 * t), Math.round(100 + 30 * t)];
        } else if (intensity < 0.75) {
            const t = (intensity - 0.5) / 0.25;
            return [Math.round(50 + 30 * t), Math.round(120 + 50 * t), Math.round(130 + 30 * t)];
        } else {
            const t = (intensity - 0.75) / 0.25;
            return [Math.round(80 + 75 * t), Math.round(170 + 45 * t), Math.round(160 - 10 * t)];
        }
    };

    const currentData = metricsData[selectedMetric];

    // Bilinear interpolation for smooth gradients
    const bilinearInterpolate = (data, x, y) => {
        const maxRow = data.length - 1;
        const maxCol = data[0].length - 1;

        // Clamp coordinates
        x = Math.max(0, Math.min(maxCol, x));
        y = Math.max(0, Math.min(maxRow, y));

        const x0 = Math.floor(x);
        const x1 = Math.min(x0 + 1, maxCol);
        const y0 = Math.floor(y);
        const y1 = Math.min(y0 + 1, maxRow);

        const xFrac = x - x0;
        const yFrac = y - y0;

        // Get the four corner values
        const v00 = data[y0][x0];
        const v10 = data[y0][x1];
        const v01 = data[y1][x0];
        const v11 = data[y1][x1];

        // Interpolate
        const top = v00 * (1 - xFrac) + v10 * xFrac;
        const bottom = v01 * (1 - xFrac) + v11 * xFrac;
        return top * (1 - yFrac) + bottom * yFrac;
    };

    // Draw smooth gradient on canvas with full color range
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = COLS * CELL_WIDTH;
        const height = ROWS * CELL_HEIGHT;

        canvas.width = width;
        canvas.height = height;

        // Find min and max values in current data to normalize to full range
        let minVal = Infinity;
        let maxVal = -Infinity;
        for (let row of currentData) {
            for (let val of row) {
                if (val < minVal) minVal = val;
                if (val > maxVal) maxVal = val;
            }
        }
        const range = maxVal - minVal || 1;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                // Map pixel position to data grid coordinates
                const gridX = (px / width) * (COLS - 1);
                const gridY = (py / height) * (ROWS - 1);

                const rawValue = bilinearInterpolate(currentData, gridX, gridY);
                // Normalize to full 0-100 range for better color contrast
                const normalizedValue = ((rawValue - minVal) / range) * 100;
                const [r, g, b] = getHeatmapRGB(normalizedValue);

                const idx = (py * width + px) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }, [selectedMetric, currentData]);

    return (
        <div className="heatmap-container">
            <div className="header-section">
                <h1 className="title">The Hitchhiker's Guide to Computing</h1>

                <div className="metric-selector">
                    <label htmlFor="metric-dropdown">Select Metric:</label>
                    <select
                        id="metric-dropdown"
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        className="metric-dropdown"
                    >
                        {metrics.map((metric) => (
                            <option key={metric} value={metric}>
                                {metric}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid-wrapper">
                {/* Main grid layout */}
                <div className="main-grid">
                    {/* Corner cell */}
                    <div className="corner-cell">
                        <span className="corner-level">Level</span>
                        <span className="corner-tier">Tier</span>
                    </div>

                    {/* Tier headers */}
                    {tiers.map((tier) => (
                        <div key={tier.id} className="tier-header">
                            <div className="tier-id">{tier.id}</div>
                            <div className="tier-name">{tier.name}</div>
                        </div>
                    ))}

                    {/* Level headers and data rows */}
                    {levels.map((level, rowIndex) => (
                        <>
                            <div key={`header-${level.id}`} className="level-header">
                                <div className="level-id">{level.id}</div>
                                <div className="level-name">{level.name}</div>
                            </div>
                            {rowIndex === 0 && (
                                <div
                                    key="data-area"
                                    className="data-area"
                                    style={{ gridColumn: '2 / -1', gridRow: `2 / ${ROWS + 2}` }}
                                >
                                    <canvas ref={canvasRef} className="gradient-canvas" />
                                    <div className="data-grid-overlay">
                                        {levels.map((lvl) => (
                                            tiers.map((tier) => (
                                                <div
                                                    key={`${lvl.id}-${tier.id}`}
                                                    className="data-cell"
                                                    onMouseEnter={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTooltip({
                                                            visible: true,
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top - 10,
                                                            content: `${tier.name} - ${lvl.name}`
                                                        });
                                                    }}
                                                    onMouseLeave={() => {
                                                        setTooltip({ visible: false, x: 0, y: 0, content: '' });
                                                    }}
                                                />
                                            ))
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ))}
                </div>
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
