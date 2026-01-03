import { useState, useEffect, useRef } from 'react';
import './HeatmapTable.css';
import ContainerSidebar from './ContainerSidebar';

const STORAGE_KEY = 'heatmap-containers';

const HeatmapTable = () => {
    const [selectedMetric, setSelectedMetric] = useState('Latency');
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const [showGridLines, setShowGridLines] = useState(true);
    const [containers, setContainers] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const canvasRef = useRef(null);
    const dataAreaRef = useRef(null);

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
    // Rows: L1-L7 (Hardware to Agents), Cols: T1-T4 (Devices to Cloud)
    const metricsData = {
        // Latency: Higher value = higher latency (worse)
        // Sharp contrast: Devices very low, Cloud very high
        // L4/L7 have notable spikes due to abstraction overhead
        'Latency': [
            [5, 20, 50, 80],    // L1: Hardware - minimal overhead
            [8, 25, 55, 85],    // L2: Infrastructure
            [15, 40, 65, 90],   // L3: Platform
            [45, 60, 80, 95],   // L4: Runtime - BIG spike (abstraction overhead)
            [20, 35, 60, 82],   // L5: Programming Models - dips back down
            [35, 50, 70, 88],   // L6: Application
            [65, 78, 90, 98]    // L7: Agents - highest (orchestration latency)
        ],
        // Throughput: Higher value = better throughput
        // Peak at L2-L3 cloud; sharp drop at L7
        'Throughput': [
            [15, 35, 60, 85],   // L1: Hardware
            [25, 55, 82, 98],   // L2: Infrastructure - peak zone
            [30, 60, 88, 99],   // L3: Platform - peak in cloud
            [25, 50, 75, 92],   // L4: Runtime
            [20, 42, 65, 85],   // L5: Programming Models
            [15, 32, 52, 72],   // L6: Application - dropping
            [8, 20, 38, 55]     // L7: Agents - significant drop
        ],
        // Availability: Higher value = better availability
        // Peak at L3-L4 cloud; L7 drops notably
        'Availability': [
            [25, 40, 55, 78],   // L1: Hardware
            [35, 55, 75, 92],   // L2: Infrastructure
            [42, 65, 85, 99],   // L3: Platform - peak
            [45, 68, 88, 99],   // L4: Runtime - peak
            [38, 58, 78, 95],   // L5: Programming Models
            [30, 48, 68, 88],   // L6: Application - complexity reduces
            [20, 35, 52, 72]    // L7: Agents - notable drop
        ],
        // Cost: Higher value = higher cost
        // L1 expensive (operational), L5 cheap (serverless), cloud L3+ expensive
        'Cost': [
            [85, 70, 55, 45],   // L1: Hardware - HIGH operational cost
            [72, 62, 68, 80],   // L2: Infrastructure
            [35, 55, 75, 95],   // L3: Platform - cloud gets expensive
            [28, 42, 58, 78],   // L4: Runtime
            [15, 25, 38, 55],   // L5: Programming Models - CHEAP (serverless)
            [22, 35, 50, 68],   // L6: Application
            [40, 55, 70, 85]    // L7: Agents - API costs rise
        ],
        // Elasticity: Higher value = better elasticity
        // Devices near zero; sharp peak at L4 cloud
        'Elasticity': [
            [2, 8, 25, 50],     // L1: Hardware - almost none
            [5, 20, 48, 78],    // L2: Infrastructure
            [8, 35, 70, 95],    // L3: Platform
            [12, 50, 85, 99],   // L4: Runtime - PEAK (Kubernetes)
            [15, 48, 80, 98],   // L5: Programming Models - FaaS high
            [8, 30, 58, 82],    // L6: Application - drops
            [5, 22, 45, 70]     // L7: Agents - limited by orchestration
        ],
        // Reliability: Higher value = better reliability
        // Peak at L3-L4 cloud; L7 notably lower
        'Reliability': [
            [35, 45, 58, 75],   // L1: Hardware
            [48, 62, 78, 92],   // L2: Infrastructure
            [55, 75, 90, 98],   // L3: Platform - peak
            [60, 78, 92, 99],   // L4: Runtime - peak
            [50, 68, 82, 94],   // L5: Programming Models
            [40, 55, 70, 85],   // L6: Application
            [25, 38, 55, 68]    // L7: Agents - less proven
        ],
        // Mobility: Higher value = better mobility
        // Devices very high; sharp drop to cloud at L1-L3
        // Higher levels more uniform (location-independent)
        'Mobility': [
            [98, 55, 25, 10],   // L1: Hardware - sharp contrast
            [95, 50, 30, 15],   // L2: Infrastructure
            [88, 55, 40, 28],   // L3: Platform
            [92, 68, 52, 42],   // L4: Runtime - containers more portable
            [82, 75, 68, 60],   // L5: Programming Models - flattening
            [75, 72, 70, 68],   // L6: Application - nearly flat
            [70, 68, 66, 65]    // L7: Agents - very flat (API-based)
        ],
        // Distributedness: Higher value = more distributed
        // Devices isolated; sharp increase to cloud; L4 peaks
        'Distributedness': [
            [5, 30, 62, 85],    // L1: Hardware
            [10, 45, 78, 95],   // L2: Infrastructure
            [15, 58, 88, 98],   // L3: Platform - microservices
            [22, 68, 92, 99],   // L4: Runtime - peak (orchestration)
            [28, 60, 82, 95],   // L5: Programming Models
            [18, 48, 70, 88],   // L6: Application
            [35, 58, 78, 92]    // L7: Agents - multi-agent boost
        ],
        // Democratization: Higher value = easier to use
        // Primarily vertical - strong increase with abstraction
        // L7 peaks dramatically; L1 very low across all tiers
        'Democratization (Ease of use & Programming)': [
            [5, 8, 12, 18],     // L1: Hardware - very difficult
            [12, 18, 25, 32],   // L2: Infrastructure
            [25, 35, 45, 55],   // L3: Platform
            [38, 48, 58, 68],   // L4: Runtime
            [55, 65, 75, 82],   // L5: Programming Models
            [75, 82, 88, 92],   // L6: Application - low-code
            [92, 95, 97, 99]    // L7: Agents - natural language peak
        ],
        // Governance: Higher value = better governance
        // Peak at L3-L4 cloud; L7 has governance challenges
        'Governance': [
            [22, 35, 50, 72],   // L1: Hardware
            [40, 55, 72, 88],   // L2: Infrastructure
            [55, 72, 88, 98],   // L3: Platform - peak
            [62, 78, 92, 99],   // L4: Runtime - peak
            [48, 65, 80, 92],   // L5: Programming Models
            [38, 52, 68, 82],   // L6: Application
            [25, 38, 55, 70]    // L7: Agents - governance gaps
        ],
        // AI-Friendliness: Higher value = more AI-friendly
        // DRAMATIC spike at L5-L7; lower levels much lower
        // Cloud always higher than devices
        'AI-Friendliness': [
            [40, 50, 58, 72],   // L1: Hardware - GPUs help cloud
            [18, 28, 42, 62],   // L2: Infrastructure - low
            [22, 35, 52, 75],   // L3: Platform
            [35, 48, 65, 85],   // L4: Runtime
            [68, 80, 90, 97],   // L5: Programming Models - BIG jump
            [78, 88, 95, 99],   // L6: Application - AI APIs
            [85, 92, 97, 99]    // L7: Agents - peak
        ],
        // Sustainability: Higher value = more sustainable
        // L4 peaks (utilization); L1-L2 lower; L7 drops (AI intensive)
        'Sustainability': [
            [38, 45, 55, 65],   // L1: Hardware
            [32, 48, 62, 75],   // L2: Infrastructure
            [50, 65, 80, 92],   // L3: Platform
            [62, 78, 90, 98],   // L4: Runtime - peak utilization
            [55, 70, 82, 92],   // L5: Programming Models
            [45, 58, 70, 82],   // L6: Application
            [28, 40, 52, 65]    // L7: Agents - AI workloads intensive
        ],
        // Security & Trustworthiness: Higher value = better security
        // Complex pattern: L3-L4 peak; devices have data sovereignty
        // L7 notably lower (prompt injection risks)
        'Security & Trustworthiness': [
            [82, 50, 42, 38],   // L1: Hardware - device sovereignty vs cloud risk
            [75, 58, 52, 48],   // L2: Infrastructure
            [70, 72, 78, 85],   // L3: Platform - managed security good
            [68, 70, 80, 88],   // L4: Runtime - container isolation
            [60, 58, 68, 75],   // L5: Programming Models
            [52, 48, 55, 62],   // L6: Application - attack surface
            [30, 28, 35, 42]    // L7: Agents - LOW (emerging risks)
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

    // Save containers to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(containers));
    }, [containers]);

    // Container management handlers
    const handleAddContainer = (container) => {
        setContainers(prev => [...prev, container]);
    };

    const handleRemoveContainer = (id) => {
        setContainers(prev => prev.filter(c => c.id !== id));
    };

    // Drop zone handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const containerId = e.dataTransfer.getData('containerId');
        if (!containerId || !dataAreaRef.current) return;

        const rect = dataAreaRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Clamp to 0-1 range
        const clampedX = Math.max(0, Math.min(1, x));
        const clampedY = Math.max(0, Math.min(1, y));

        setContainers(prev =>
            prev.map(c =>
                c.id === containerId
                    ? { ...c, x: clampedX, y: clampedY }
                    : c
            )
        );
    };

    // Calculate container value and color based on position and selected metric
    const getContainerValue = (container) => {
        if (container.x === null || container.y === null) return null;

        const metricData = metricsData[selectedMetric];
        if (!metricData) return null;

        const gridX = container.x * (COLS - 1);
        const gridY = container.y * (ROWS - 1);
        return bilinearInterpolate(metricData, gridX, gridY);
    };

    return (
        <div className="heatmap-layout">
            <ContainerSidebar
                containers={containers}
                onAddContainer={handleAddContainer}
                onRemoveContainer={handleRemoveContainer}
            />
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
                    <label className="grid-toggle">
                        <input
                            type="checkbox"
                            checked={showGridLines}
                            onChange={(e) => setShowGridLines(e.target.checked)}
                        />
                        Show Grid Lines
                    </label>
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
                                    ref={dataAreaRef}
                                    className="data-area"
                                    style={{ gridColumn: '2 / -1', gridRow: `2 / ${ROWS + 2}` }}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                >
                                    <canvas ref={canvasRef} className="gradient-canvas" />
                                    <div className={`data-grid-overlay ${showGridLines ? 'show-grid' : 'hide-grid'}`}>
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
                                    {/* Placed containers */}
                                    {containers
                                        .filter(c => c.x !== null && c.y !== null)
                                        .map(container => {
                                            const value = getContainerValue(container);
                                            return (
                                                <div
                                                    key={container.id}
                                                    className="placed-container"
                                                    style={{
                                                        left: `${container.x * 100}%`,
                                                        top: `${container.y * 100}%`
                                                    }}
                                                    draggable="true"
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('containerId', container.id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                >
                                                    <span className="placed-container-name">{container.name}</span>
                                                    <div className="container-gradient-bar">
                                                        <div
                                                            className="container-gradient-indicator"
                                                            style={{ left: `${value}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
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
        </div>
    );
};

export default HeatmapTable;
