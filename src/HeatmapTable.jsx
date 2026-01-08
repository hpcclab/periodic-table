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
        // Linear gradient: strong increase left→right (tier), gradual increase top→bottom (level)
        // Tier (network distance) is the primary driver; abstraction level adds minor overhead
        'Latency': [
            [10, 35, 60, 85],   // L1: Hardware
            [12, 37, 62, 87],   // L2: Infrastructure
            [14, 39, 64, 89],   // L3: Platform
            [16, 41, 66, 91],   // L4: Runtime
            [18, 43, 68, 93],   // L5: Programming Models
            [20, 45, 70, 95],   // L6: Application
            [22, 47, 72, 97]    // L7: Agents
        ],
        // Throughput: Higher value = better throughput
        // Linear gradient: strong increase left→right (cloud capacity), gradual decrease top→bottom (abstraction overhead)
        'Throughput': [
            [20, 45, 70, 95],   // L1: Hardware - highest throughput
            [18, 43, 68, 93],   // L2: Infrastructure
            [16, 41, 66, 91],   // L3: Platform
            [14, 39, 64, 89],   // L4: Runtime
            [12, 37, 62, 87],   // L5: Programming Models
            [10, 35, 60, 85],   // L6: Application
            [8, 33, 58, 83]     // L7: Agents - lowest throughput
        ],
        // Availability: Higher value = better availability
        // Linear gradient: strong increase left→right (cloud redundancy), gradual increase top→bottom
        // End user perspective: higher layers add resilience mechanisms (auto-healing, retries, failover)
        'Availability': [
            [15, 38, 62, 85],   // L1: Hardware - single point of failure
            [17, 40, 64, 87],   // L2: Infrastructure
            [19, 42, 66, 89],   // L3: Platform
            [21, 44, 68, 91],   // L4: Runtime
            [23, 46, 70, 93],   // L5: Programming Models
            [25, 48, 72, 95],   // L6: Application
            [27, 50, 74, 97]    // L7: Agents - benefits from all resilience layers
        ],
        // Infrastructure Cost: Higher value = higher cost
        // Linear gradient: strong decrease left→right (cloud=no upfront hardware), gradual increase top→bottom
        // Each layer builds on previous, requiring more infrastructure underneath
        'Infrastructure Cost': [
            [85, 62, 38, 15],   // L1: Hardware only
            [87, 64, 40, 17],   // L2: + infrastructure software
            [89, 66, 42, 19],   // L3: + platform services
            [91, 68, 44, 21],   // L4: + runtime/containers
            [93, 70, 46, 23],   // L5: + frameworks
            [95, 72, 48, 25],   // L6: + application layer
            [97, 74, 50, 27]    // L7: + agent orchestration - most layers
        ],
        // Operational Cost: Higher value = higher cost
        // Linear gradient: strong increase left→right (cloud=pay-per-use fees), gradual increase top→bottom
        // Each layer adds operational overhead (monitoring, maintenance, updates)
        'Operational Cost': [
            [15, 38, 62, 85],   // L1: Minimal ops overhead
            [17, 40, 64, 87],   // L2: Infrastructure ops
            [19, 42, 66, 89],   // L3: Platform management
            [21, 44, 68, 91],   // L4: Container orchestration
            [23, 46, 70, 93],   // L5: Framework updates
            [25, 48, 72, 95],   // L6: Application maintenance
            [27, 50, 74, 97]    // L7: Agent ops + API costs - most overhead
        ],
        // Elasticity: Higher value = better elasticity
        // Linear gradient: strong increase left→right (cloud scaling), moderate increase top→bottom
        // Each layer adds elasticity mechanisms (auto-scaling, serverless, orchestration)
        'Elasticity': [
            [5, 25, 45, 65],    // L1: Hardware - almost none
            [9, 29, 49, 69],    // L2: Infrastructure
            [13, 33, 53, 73],   // L3: Platform
            [17, 37, 57, 77],   // L4: Runtime
            [21, 41, 61, 81],   // L5: Programming Models
            [25, 45, 65, 85],   // L6: Application
            [29, 49, 69, 89]    // L7: Agents - benefits from all scaling layers
        ],
        // Reliability: Higher value = better reliability
        // Linear gradient: constant left→right (tier doesn't strongly affect reliability)
        // Gradual decrease top→bottom (more layers = more failure points), considerable dip at L7
        'Reliability': [
            [90, 90, 90, 90],   // L1: Hardware - simple, predictable
            [85, 85, 85, 85],   // L2: Infrastructure
            [80, 80, 80, 80],   // L3: Platform
            [75, 75, 75, 75],   // L4: Runtime
            [70, 70, 70, 70],   // L5: Programming Models
            [65, 65, 65, 65],   // L6: Application
            [45, 45, 45, 45]    // L7: Agents - considerable dip (emerging, unpredictable)
        ],
        // Mobility: Higher value = better mobility
        // Linear gradient: strong decrease left→right (devices mobile, cloud fixed)
        // Constant top→bottom (abstraction level doesn't affect physical mobility)
        'Mobility': [
            [95, 70, 45, 20],   // L1: Hardware
            [95, 70, 45, 20],   // L2: Infrastructure
            [95, 70, 45, 20],   // L3: Platform
            [95, 70, 45, 20],   // L4: Runtime
            [95, 70, 45, 20],   // L5: Programming Models
            [95, 70, 45, 20],   // L6: Application
            [95, 70, 45, 20]    // L7: Agents
        ],
        // Distributedness: Higher value = more distributed
        // Linear gradient: strong increase left→right (cloud is distributed), gradual increase top→bottom
        // Higher abstraction enables more distribution patterns
        'Distributedness': [
            [10, 32, 54, 75],   // L1: Hardware
            [12, 34, 56, 77],   // L2: Infrastructure
            [14, 36, 58, 79],   // L3: Platform
            [16, 38, 60, 81],   // L4: Runtime
            [18, 40, 62, 83],   // L5: Programming Models
            [20, 42, 64, 85],   // L6: Application
            [22, 44, 66, 87]    // L7: Agents
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
        // Linear gradient: increase left→right (cloud has AI infrastructure), increase top→bottom
        // Higher abstraction = more AI-friendly (L7 agents are purpose-built for AI)
        'AI-Friendliness': [
            [5, 22, 38, 55],    // L1: Hardware
            [12, 29, 45, 62],   // L2: Infrastructure
            [19, 36, 52, 69],   // L3: Platform
            [26, 43, 59, 76],   // L4: Runtime
            [33, 50, 66, 83],   // L5: Programming Models
            [40, 57, 73, 90],   // L6: Application
            [47, 64, 80, 97]    // L7: Agents - most AI-friendly
        ],
        // Sustainability: Higher value = more sustainable
        // Linear gradient: constant left→right, gradual decrease top→bottom
        // More layers = more compute/resources = less sustainable
        'Sustainability': [
            [80, 80, 80, 80],   // L1: Hardware - simple, efficient
            [73, 73, 73, 73],   // L2: Infrastructure
            [66, 66, 66, 66],   // L3: Platform
            [59, 59, 59, 59],   // L4: Runtime
            [52, 52, 52, 52],   // L5: Programming Models
            [45, 45, 45, 45],   // L6: Application
            [38, 38, 38, 38]    // L7: Agents - AI workloads intensive
        ],
        // Security & Trustworthiness: Higher value = better security
        // Linear gradient: constant left→right, gradual decrease top→bottom
        // More layers = more attack surface = less secure
        'Security & Trustworthiness': [
            [90, 90, 90, 90],   // L1: Hardware - physical control, simple
            [82, 82, 82, 82],   // L2: Infrastructure
            [74, 74, 74, 74],   // L3: Platform
            [66, 66, 66, 66],   // L4: Runtime
            [58, 58, 58, 58],   // L5: Programming Models
            [50, 50, 50, 50],   // L6: Application
            [42, 42, 42, 42]    // L7: Agents - emerging risks (prompt injection)
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
