import { useState, useEffect, useRef } from 'react';
import './HeatmapTable.css';
import ContainerSidebar from './ContainerSidebar';

const STORAGE_KEY = 'heatmap-containers';

const HeatmapTable = () => {
    const [selectedMetric, setSelectedMetric] = useState('Latency');
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
    const COLS = 5;
    const ROWS = 7;

    // Define tiers and abstraction levels
    const tiers = [
        { id: 'T1', name: 'Devices' },
        { id: 'T2', name: 'Edge' },
        { id: 'T3', name: 'Fog' },
        { id: 'T4', name: 'Cloud' },
        { id: 'T5', name: 'Sky' }
    ];

    const levels = [
        { id: 'L7', name: 'Agents' },
        { id: 'L6', name: 'Application' },
        { id: 'L5', name: 'Programming Models' },
        { id: 'L4', name: 'Execution (Runtime)' },
        { id: 'L3', name: 'Platform' },
        { id: 'L2', name: 'Infrastructure' },
        { id: 'L1', name: 'Hardware (No Abstraction)' }
    ];

    // Metric data: each metric has values for each cell [row][col]
    // Values range from 0-100 for heatmap intensity
    // Rows: L7-L1 (Agents to Hardware - graph style), Cols: T1-T5 (Devices to Sky)
    const metricsData = {
        // Latency: Higher value = higher latency (worse)
        // Linear gradient: strong increase left→right (tier), gradual increase bottom→top (level)
        // Tier (network distance) is the primary driver; abstraction level adds minor overhead
        // Sky (multicloud) adds coordination overhead
        'Latency': [
            [22, 47, 72, 97, 99],   // L7: Agents
            [20, 45, 70, 95, 99],   // L6: Application
            [18, 43, 68, 93, 99],   // L5: Programming Models
            [16, 41, 66, 91, 99],   // L4: Runtime
            [14, 39, 64, 89, 99],   // L3: Platform
            [12, 37, 62, 87, 99],   // L2: Infrastructure
            [10, 35, 60, 85, 97]    // L1: Hardware
        ],
        // Throughput: Higher value = better throughput
        // Linear gradient: strong increase left→right (cloud capacity), gradual increase bottom→top (abstraction overhead)
        // Sky can aggregate throughput from multiple clouds
        'Throughput': [
            [8, 33, 58, 83, 87],    // L7: Agents - lowest throughput
            [10, 35, 60, 85, 89],   // L6: Application
            [12, 37, 62, 87, 91],   // L5: Programming Models
            [14, 39, 64, 89, 93],   // L4: Runtime
            [16, 41, 66, 91, 95],   // L3: Platform
            [18, 43, 68, 93, 97],   // L2: Infrastructure
            [20, 45, 70, 95, 99]    // L1: Hardware - highest throughput
        ],
        // Availability: Higher value = better availability
        // Linear gradient: strong increase left→right (cloud redundancy), gradual increase bottom→top
        // Sky provides ultimate redundancy across providers
        'Availability': [
            [27, 50, 74, 97, 99],   // L7: Agents - benefits from all resilience layers
            [25, 48, 72, 95, 99],   // L6: Application
            [23, 46, 70, 93, 99],   // L5: Programming Models
            [21, 44, 68, 91, 99],   // L4: Runtime
            [19, 42, 66, 89, 99],   // L3: Platform
            [17, 40, 64, 87, 99],   // L2: Infrastructure
            [15, 38, 62, 85, 97]    // L1: Hardware - single point of failure
        ],
        // Infrastructure Cost: Higher value = higher cost
        // Linear gradient: strong decrease left→right (cloud=no upfront hardware), gradual increase bottom→top
        // Sky increases cost (multiple providers)
        'Infrastructure Cost': [
            [97, 74, 50, 27, 32],   // L7: + agent orchestration - most layers
            [95, 72, 48, 25, 30],   // L6: + application layer
            [93, 70, 46, 23, 28],   // L5: + frameworks
            [91, 68, 44, 21, 26],   // L4: + runtime/containers
            [89, 66, 42, 19, 24],   // L3: + platform services
            [87, 64, 40, 17, 22],   // L2: + infrastructure software
            [85, 62, 38, 15, 20]    // L1: Hardware only
        ],
        // Operational Cost: Higher value = higher cost
        // Linear gradient: strong increase left→right (cloud=pay-per-use fees), gradual increase bottom→top
        // Sky adds complexity (managing multiple providers)
        'Operational Cost': [
            [27, 50, 74, 97, 99],   // L7: Agent ops + API costs - most overhead
            [25, 48, 72, 95, 99],   // L6: Application maintenance
            [23, 46, 70, 93, 99],   // L5: Framework updates
            [21, 44, 68, 91, 99],   // L4: Container orchestration
            [19, 42, 66, 89, 99],   // L3: Platform management
            [17, 40, 64, 87, 99],   // L2: Infrastructure ops
            [15, 38, 62, 85, 97]    // L1: Minimal ops overhead
        ],
        // Elasticity: Higher value = better elasticity
        // Linear gradient: strong increase left→right (cloud scaling), moderate increase bottom→top
        // Sky provides ultimate elasticity across providers
        'Elasticity': [
            [29, 49, 69, 89, 99],   // L7: Agents - benefits from all scaling layers
            [25, 45, 65, 85, 99],   // L6: Application
            [21, 41, 61, 81, 96],   // L5: Programming Models
            [17, 37, 57, 77, 92],   // L4: Runtime
            [13, 33, 53, 73, 88],   // L3: Platform
            [9, 29, 49, 69, 84],    // L2: Infrastructure
            [5, 25, 45, 65, 80]     // L1: Hardware - almost none
        ],
        // Reliability: Higher value = better reliability
        // Linear gradient: constant left→right (tier doesn't strongly affect reliability)
        // Gradual increase bottom→top (more layers = more failure points), considerable dip at L7
        'Reliability': [
            [45, 45, 45, 45, 45],   // L7: Agents - considerable dip (emerging, unpredictable)
            [65, 65, 65, 65, 65],   // L6: Application
            [70, 70, 70, 70, 70],   // L5: Programming Models
            [75, 75, 75, 75, 75],   // L4: Runtime
            [80, 80, 80, 80, 80],   // L3: Platform
            [85, 85, 85, 85, 85],   // L2: Infrastructure
            [90, 90, 90, 90, 90]    // L1: Hardware - simple, predictable
        ],
        // Mobility: Higher value = better mobility
        // Linear gradient: strong decrease left→right (devices mobile, cloud fixed)
        // Constant bottom→top (abstraction level doesn't affect physical mobility)
        // Sky is even less mobile (tied to multiple fixed providers)
        'Mobility': [
            [95, 70, 45, 20, 10],   // L7: Agents
            [95, 70, 45, 20, 10],   // L6: Application
            [95, 70, 45, 20, 10],   // L5: Programming Models
            [95, 70, 45, 20, 10],   // L4: Runtime
            [95, 70, 45, 20, 10],   // L3: Platform
            [95, 70, 45, 20, 10],   // L2: Infrastructure
            [95, 70, 45, 20, 10]    // L1: Hardware
        ],
        // Distributedness: Higher value = more distributed
        // Linear gradient: decrease left→right (devices/edge most distributed, cloud centralized)
        // Gradual increase bottom→top
        'Distributedness': [
            [99, 87, 67, 47, 32],   // L7: Agents
            [99, 85, 65, 45, 30],   // L6: Application
            [98, 83, 63, 43, 28],   // L5: Programming Models
            [96, 81, 61, 41, 26],   // L4: Runtime
            [94, 79, 59, 39, 24],   // L3: Platform
            [92, 77, 57, 37, 22],   // L2: Infrastructure
            [90, 75, 55, 35, 20]    // L1: Hardware
        ],
        // Democratization: Higher value = easier to use
        // Primarily vertical - strong increase with abstraction (bottom→top)
        // Sky adds complexity (multicloud management)
        'Democratization (Ease of use & Programming)': [
            [92, 95, 97, 99, 95],   // L7: Agents - natural language peak
            [75, 82, 88, 92, 88],   // L6: Application - low-code
            [55, 65, 75, 82, 78],   // L5: Programming Models
            [38, 48, 58, 68, 62],   // L4: Runtime
            [25, 35, 45, 55, 48],   // L3: Platform
            [12, 18, 25, 32, 26],   // L2: Infrastructure
            [5, 8, 12, 18, 12]      // L1: Hardware - very difficult
        ],
        // Governance: Higher value = better governance
        // Peak at L3-L4 cloud; L7 has governance challenges
        // Sky is harder to govern (multiple providers, policies)
        'Governance': [
            [25, 38, 55, 70, 52],   // L7: Agents - governance gaps
            [38, 52, 68, 82, 65],   // L6: Application
            [48, 65, 80, 92, 75],   // L5: Programming Models
            [62, 78, 92, 99, 85],   // L4: Runtime - peak
            [55, 72, 88, 98, 82],   // L3: Platform - peak
            [40, 55, 72, 88, 70],   // L2: Infrastructure
            [22, 35, 50, 72, 55]    // L1: Hardware
        ],
        // AI-Native: Higher value = more AI-native
        // Linear gradient: increase left→right (cloud has AI infrastructure), increase bottom→top
        // Sky can leverage best AI from each provider
        'AI-Native': [
            [47, 64, 80, 97, 99],   // L7: Agents - most AI-friendly
            [40, 57, 73, 90, 99],   // L6: Application
            [33, 50, 66, 83, 93],   // L5: Programming Models
            [26, 43, 59, 76, 86],   // L4: Runtime
            [19, 36, 52, 69, 79],   // L3: Platform
            [12, 29, 45, 62, 72],   // L2: Infrastructure
            [5, 22, 38, 55, 65]     // L1: Hardware
        ],
        // Sustainability: Higher value = more sustainable
        // Linear gradient: constant left→right, gradual increase bottom→top
        // More layers = more compute/resources = less sustainable
        'Sustainability': [
            [38, 38, 38, 38, 38],   // L7: Agents - AI workloads intensive
            [45, 45, 45, 45, 45],   // L6: Application
            [52, 52, 52, 52, 52],   // L5: Programming Models
            [59, 59, 59, 59, 59],   // L4: Runtime
            [66, 66, 66, 66, 66],   // L3: Platform
            [73, 73, 73, 73, 73],   // L2: Infrastructure
            [80, 80, 80, 80, 80]    // L1: Hardware - simple, efficient
        ],
        // Security & Trustworthiness: Higher value = better security
        // Linear gradient: constant left→right, gradual increase bottom→top
        // More layers = more attack surface = less secure
        'Security & Trustworthiness': [
            [42, 42, 42, 42, 42],   // L7: Agents - emerging risks (prompt injection)
            [50, 50, 50, 50, 50],   // L6: Application
            [58, 58, 58, 58, 58],   // L5: Programming Models
            [66, 66, 66, 66, 66],   // L4: Runtime
            [74, 74, 74, 74, 74],   // L3: Platform
            [82, 82, 82, 82, 82],   // L2: Infrastructure
            [90, 90, 90, 90, 90]    // L1: Hardware - physical control, simple
        ]
    };

    const metricDefinitions = {
        'Latency': 'Response time delay',
        'Throughput': 'Data processing capacity',
        'Availability': 'Uptime and accessibility',
        'Infrastructure Cost': 'Hardware and setup expenses',
        'Operational Cost': 'Ongoing running expenses',
        'Elasticity': 'Ability to scale resources',
        'Reliability': 'Consistent performance',
        'Mobility': 'Physical portability',
        'Distributedness': 'Geographic spread of resources',
        'Democratization (Ease of use & Programming)': 'Accessibility for developers',
        'Governance': 'Policy and compliance control',
        'AI-Native': 'AI/ML integration readiness',
        'Sustainability': 'Environmental efficiency',
        'Security & Trustworthiness': 'Protection and trust level'
    };

    const metrics = Object.keys(metricsData);

    // Get RGB color values based on intensity (0-100)
    // Blue (low) → Purple (mid) → Red (high)
    const getHeatmapRGB = (value) => {
        const intensity = value / 100;

        // Color stops: Blue → Purple → Red
        // Blue:   (30, 80, 200)
        // Purple: (150, 50, 180)
        // Red:    (220, 40, 40)

        if (intensity < 0.5) {
            // Blue to Purple
            const t = intensity / 0.5;
            return [
                Math.round(30 + 120 * t),   // 30 → 150
                Math.round(80 - 30 * t),    // 80 → 50
                Math.round(200 - 20 * t)    // 200 → 180
            ];
        } else {
            // Purple to Red
            const t = (intensity - 0.5) / 0.5;
            return [
                Math.round(150 + 70 * t),   // 150 → 220
                Math.round(50 - 10 * t),    // 50 → 40
                Math.round(180 - 140 * t)   // 180 → 40
            ];
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

        const container = containers.find(c => c.id === containerId);
        const width = container?.width || 0.15;
        const height = container?.height || 0.2;

        const rect = dataAreaRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Clamp position so container stays within grid (accounting for container size)
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const clampedX = Math.max(halfWidth, Math.min(1 - halfWidth, x));
        const clampedY = Math.max(halfHeight, Math.min(1 - halfHeight, y));

        setContainers(prev =>
            prev.map(c =>
                c.id === containerId
                    ? { ...c, x: clampedX, y: clampedY }
                    : c
            )
        );
    };

    // Calculate average container value across its entire coverage area
    const getContainerValue = (container) => {
        if (container.x === null || container.y === null) return null;

        const metricData = metricsData[selectedMetric];
        if (!metricData) return null;

        const width = container.width || 0.15;
        const height = container.height || 0.2;

        // Calculate bounds (container position is center)
        const left = Math.max(0, container.x - width / 2);
        const right = Math.min(1, container.x + width / 2);
        const top = Math.max(0, container.y - height / 2);
        const bottom = Math.min(1, container.y + height / 2);

        // Sample points across the container area for average calculation
        const samplesX = 5;
        const samplesY = 5;
        let total = 0;
        let count = 0;

        for (let i = 0; i < samplesX; i++) {
            for (let j = 0; j < samplesY; j++) {
                const sampleX = left + (right - left) * (i / (samplesX - 1));
                const sampleY = top + (bottom - top) * (j / (samplesY - 1));

                const gridX = sampleX * (COLS - 1);
                const gridY = sampleY * (ROWS - 1);

                total += bilinearInterpolate(metricData, gridX, gridY);
                count++;
            }
        }

        return count > 0 ? total / count : 0;
    };

    // Handle container resize
    // Minimum sizes to ensure text visibility (as percentage of data area)
    const MIN_WIDTH = 0.12;  // 12% minimum width
    const MIN_HEIGHT = 0.15; // 15% minimum height

    const handleResizeStart = (e, containerId, direction) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const container = containers.find(c => c.id === containerId);
        if (!container || !dataAreaRef.current) return;

        const rect = dataAreaRef.current.getBoundingClientRect();
        const startWidth = container.width || 0.15;
        const startHeight = container.height || 0.2;
        const containerX = container.x;
        const containerY = container.y;

        const handleMouseMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / rect.width;
            const deltaY = (moveEvent.clientY - startY) / rect.height;

            setContainers(prev =>
                prev.map(c => {
                    if (c.id !== containerId) return c;

                    let newWidth = startWidth;
                    let newHeight = startHeight;

                    if (direction.includes('e')) newWidth = Math.max(MIN_WIDTH, startWidth + deltaX * 2);
                    if (direction.includes('w')) newWidth = Math.max(MIN_WIDTH, startWidth - deltaX * 2);
                    if (direction.includes('s')) newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY * 2);
                    if (direction.includes('n')) newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY * 2);

                    // Constrain so container stays within grid boundaries
                    // Container position is center, so check if edges would go outside
                    const maxWidth = Math.min(containerX * 2, (1 - containerX) * 2);
                    const maxHeight = Math.min(containerY * 2, (1 - containerY) * 2);
                    newWidth = Math.min(newWidth, maxWidth);
                    newHeight = Math.min(newHeight, maxHeight);

                    return { ...c, width: newWidth, height: newHeight };
                })
            );
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
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
                    <div className="metric-dropdown-wrapper">
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
                        <span className="metric-definition">{metricDefinitions[selectedMetric]}</span>
                    </div>
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
                                    style={{ gridColumn: '2 / -1', gridRow: `1 / ${ROWS + 1}` }}
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
                                                />
                                            ))
                                        ))}
                                    </div>
                                    {/* Placed containers */}
                                    {containers
                                        .filter(c => c.x !== null && c.y !== null)
                                        .map(container => {
                                            const value = getContainerValue(container);
                                            const width = container.width || 0.15;
                                            const height = container.height || 0.2;
                                            return (
                                                <div
                                                    key={container.id}
                                                    className="placed-container resizable"
                                                    style={{
                                                        left: `${container.x * 100}%`,
                                                        top: `${container.y * 100}%`,
                                                        width: `${width * 100}%`,
                                                        height: `${height * 100}%`
                                                    }}
                                                    draggable="true"
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('containerId', container.id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                >
                                                    <div className="container-content">
                                                        <span className="placed-container-name">{container.name}</span>
                                                        <div className="container-gradient-bar">
                                                            <div
                                                                className="container-gradient-indicator"
                                                                style={{ left: `${value}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Resize handles */}
                                                    <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeStart(e, container.id, 'n')} />
                                                    <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeStart(e, container.id, 's')} />
                                                    <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeStart(e, container.id, 'e')} />
                                                    <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeStart(e, container.id, 'w')} />
                                                    <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeStart(e, container.id, 'ne')} />
                                                    <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeStart(e, container.id, 'nw')} />
                                                    <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeStart(e, container.id, 'se')} />
                                                    <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeStart(e, container.id, 'sw')} />
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )}
                        </>
                    ))}

                    {/* Corner cell at bottom-left */}
                    <div className="corner-cell corner-cell-bottom">
                        <span className="corner-level">Level</span>
                        <span className="corner-tier">Tier</span>
                    </div>

                    {/* Tier headers at bottom */}
                    {tiers.map((tier) => (
                        <div key={tier.id} className="tier-header tier-header-bottom">
                            <div className="tier-id">{tier.id}</div>
                            <div className="tier-name">{tier.name}</div>
                        </div>
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
            </div>
        </div>
    );
};

export default HeatmapTable;
