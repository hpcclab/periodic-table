import { useState, useEffect, useRef } from 'react';
import './HeatmapTable.css';
import ContainerSidebar from './ContainerSidebar';

const STORAGE_KEY = 'heatmap-containers';

// Metrics whose trend is undetermined: rendered as a uniform neutral fill (no directional claim)
const UNCERTAIN_METRICS = new Set(['Sustainability']);

const HeatmapTable = () => {
    const [selectedMetric, setSelectedMetric] = useState('Responsiveness');
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
    const COLS = 6;
    const ROWS = 7;

    // Define tiers and abstraction levels
    const tiers = [
        { id: 'T1', name: 'Devices' },
        { id: 'T2', name: 'Edge' },
        { id: 'T3', name: 'Fog' },
        { id: 'T4', name: 'Cloud' },
        { id: 'T5', name: 'Sky' },
        { id: 'T6', name: 'Extra-Planetary' }
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
    // Rows: L7-L1 (Agents to Hardware - graph style), Cols: T1-T6 (Devices, Edge, Fog, Cloud, Sky=multi-cloud, Extra-Planetary=orbital)
    const metricsData = {
        // Responsiveness: Higher value = more responsive (better, lower latency)
        // Linear gradient: decreases left→right (cloud/sky less responsive due to network latency), decreases bottom→top (higher abstractions add overhead)
        // Trend continues decreasing to Extra-Planetary (least responsive tier)
        'Responsiveness': [
            [25, 20, 15, 10, 5, 2],     // L7: Agents - least responsive (most layers)
            [35, 30, 25, 20, 10, 6],    // L6: Application
            [45, 40, 35, 30, 15, 10],   // L5: Programming Models
            [55, 50, 45, 40, 20, 14],   // L4: Runtime
            [65, 60, 55, 50, 25, 18],   // L3: Platform
            [75, 70, 65, 60, 30, 22],   // L2: Infrastructure
            [85, 80, 75, 70, 35, 26]    // L1: Hardware - most responsive (direct, minimal overhead)
        ],
        // Capacity: Higher value = better capacity
        // Linear gradient: strong increase left→right (cloud capacity), constant across abstraction levels
        // Trend continues increasing to Extra-Planetary (highest tier)
        'Capacity': [
            [15, 40, 65, 90, 95, 98],   // L7: Agents
            [15, 40, 65, 90, 95, 98],   // L6: Application
            [15, 40, 65, 90, 95, 98],   // L5: Programming Models
            [15, 40, 65, 90, 95, 98],   // L4: Runtime
            [15, 40, 65, 90, 95, 98],   // L3: Platform
            [15, 40, 65, 90, 95, 98],   // L2: Infrastructure
            [15, 40, 65, 90, 95, 98]    // L1: Hardware
        ],
        // Capital Expenditure: Higher value = higher cost
        // U-shaped left→right: high at resource-constrained Device/Edge tiers (specialized hardware),
        // lowest at Cloud (commoditization, economies of scale), slightly above Cloud at Sky (multi-cloud overhead),
        // rising sharply again at Extra-Planetary (launch costs, space-hardened infrastructure).
        // Gradual increase bottom→top (more layers = more cost).
        'Capital Expenditure': [
            [97, 92, 60, 27, 33, 88],   // L7: + agent orchestration - most layers
            [95, 90, 58, 25, 31, 86],   // L6: + application layer
            [93, 88, 56, 23, 29, 84],   // L5: + frameworks
            [91, 86, 54, 21, 27, 82],   // L4: + runtime/containers
            [89, 84, 52, 19, 25, 80],   // L3: + platform services
            [87, 82, 50, 17, 23, 78],   // L2: + infrastructure software
            [85, 80, 48, 15, 21, 76]    // L1: Hardware only
        ],
        // Operational Expenditure: Higher value = higher cost
        // Linear gradient: decreases left→right (across tiers) and decreases bottom→top (across abstractions)
        // Higher abstraction (automation/managed services) and higher tiers reduce recurring operating cost
        'Operational Expenditure': [
            [25, 20, 15, 10, 5, 2],     // L7: Agents - lowest opex (most automated/abstracted)
            [35, 30, 25, 20, 14, 8],    // L6: Application
            [48, 42, 36, 29, 22, 15],   // L5: Programming Models
            [60, 53, 46, 39, 31, 23],   // L4: Runtime
            [72, 65, 57, 49, 41, 33],   // L3: Platform
            [84, 76, 67, 58, 49, 41],   // L2: Infrastructure
            [95, 86, 76, 66, 56, 47]    // L1: Hardware - highest opex (manual, no automation)
        ],
        // Scalability: Higher value = better scalability
        // Linear gradient: strong increase left→right (cloud scaling); constant across abstraction levels
        // Trend continues increasing to Extra-Planetary
        'Scalability': [
            [17, 37, 57, 77, 91, 93],   // L7: Agents
            [17, 37, 57, 77, 91, 93],   // L6: Application
            [17, 37, 57, 77, 91, 93],   // L5: Programming Models
            [17, 37, 57, 77, 91, 93],   // L4: Runtime
            [17, 37, 57, 77, 91, 93],   // L3: Platform
            [17, 37, 57, 77, 91, 93],   // L2: Infrastructure
            [17, 37, 57, 77, 91, 93]    // L1: Hardware
        ],
        // Availability: Higher value = better availability
        // Linear gradient: increases left→right (cloud/sky have redundancy), decreases bottom→top (more layers = more failure points)
        // Trend continues increasing to Extra-Planetary
        'Availability': [
            [30, 40, 50, 60, 70, 75],   // L7: Agents - emerging tech, but benefits from tier redundancy
            [50, 60, 70, 80, 85, 88],   // L6: Application
            [55, 65, 75, 85, 90, 92],   // L5: Programming Models
            [60, 70, 80, 90, 92, 94],   // L4: Runtime
            [65, 75, 85, 92, 94, 96],   // L3: Platform
            [70, 80, 87, 94, 96, 97],   // L2: Infrastructure
            [75, 82, 89, 95, 98, 99]    // L1: Hardware - simple and benefits greatly from cloud redundancy
        ],
        // Mobility: Higher value = better mobility
        // Linear gradient: strong decrease left→right (devices mobile, cloud/sky fixed), constant bottom→top
        // Trend continues decreasing to Extra-Planetary (least mobile)
        'Mobility': [
            [95, 70, 45, 20, 10, 5],   // L7: Agents
            [95, 70, 45, 20, 10, 5],   // L6: Application
            [95, 70, 45, 20, 10, 5],   // L5: Programming Models
            [95, 70, 45, 20, 10, 5],   // L4: Runtime
            [95, 70, 45, 20, 10, 5],   // L3: Platform
            [95, 70, 45, 20, 10, 5],   // L2: Infrastructure
            [95, 70, 45, 20, 10, 5]    // L1: Hardware
        ],
        // Distributedness: Higher value = more distributed
        // Linear gradient: decrease left→right (devices/edge most distributed, cloud centralized), uptick at Sky (multi-cloud)
        // Sky uptick continues to Extra-Planetary (more distributed)
        'Distributedness': [
            [99, 87, 67, 47, 57, 67],   // L7: Agents - Sky uptick (multi-cloud distribution)
            [99, 85, 65, 45, 55, 65],   // L6: Application
            [98, 83, 63, 43, 53, 63],   // L5: Programming Models
            [96, 81, 61, 41, 51, 61],   // L4: Runtime
            [94, 79, 59, 39, 49, 59],   // L3: Platform
            [92, 77, 57, 37, 47, 57],   // L2: Infrastructure
            [90, 75, 55, 35, 45, 55]    // L1: Hardware
        ],
        // Interoperability: Higher value = better interoperability
        // Linear gradient: increase left→right (cloud has standardized APIs, Sky is multicloud by design)
        // Trend continues increasing to Extra-Planetary
        'Interoperability': [
            [35, 52, 70, 88, 99, 99],   // L7: Agents - standard APIs, multicloud agents
            [32, 49, 67, 85, 99, 99],   // L6: Application - containerized, portable apps
            [28, 45, 63, 82, 97, 99],   // L5: Programming Models - standard frameworks
            [24, 41, 59, 78, 94, 97],   // L4: Runtime - container orchestration
            [20, 37, 55, 74, 90, 93],   // L3: Platform - platform services
            [16, 33, 51, 70, 86, 90],   // L2: Infrastructure - IaC standards
            [12, 29, 47, 66, 82, 86]    // L1: Hardware - proprietary protocols
        ],
        // Democratization: Higher value = easier to use
        // Primarily vertical - strong increase with abstraction (bottom→top); Sky adds complexity (multicloud management)
        // Sky complexity dip continues to Extra-Planetary
        'Democratization (Ease of use & Programming)': [
            [92, 95, 97, 99, 95, 90],   // L7: Agents - natural language peak
            [75, 82, 88, 92, 88, 82],   // L6: Application - low-code
            [55, 65, 75, 82, 78, 72],   // L5: Programming Models
            [38, 48, 58, 68, 62, 56],   // L4: Runtime
            [25, 35, 45, 55, 48, 42],   // L3: Platform
            [12, 18, 25, 32, 26, 20],   // L2: Infrastructure
            [5, 8, 12, 18, 12, 7]       // L1: Hardware - very difficult
        ],
        // Controllability: Higher value = more controllable
        // Linear gradient: decreases left→right (cloud/sky less controllable), decreases bottom→top (higher abstractions reduce direct control)
        // Trend continues decreasing to Extra-Planetary (least controllable)
        'Controllability': [
            [25, 20, 15, 10,  5, 3],    // L7: Agents - least controllable (most abstracted)
            [35, 30, 25, 20, 15, 10],   // L6: Application
            [50, 43, 36, 29, 22, 16],   // L5: Programming Models
            [60, 53, 46, 39, 32, 25],   // L4: Runtime
            [70, 63, 56, 49, 42, 34],   // L3: Platform
            [82, 75, 65, 58, 50, 42],   // L2: Infrastructure
            [95, 85, 75, 65, 55, 47]    // L1: Hardware - most controllable (direct control)
        ],
        // AI-Native: Higher value = more AI-native
        // Linear gradient: increase left→right (cloud has AI infrastructure), increase bottom→top
        // Trend continues increasing to Extra-Planetary
        'AI-Native': [
            [47, 64, 80, 97, 99, 99],   // L7: Agents - most AI-friendly
            [40, 57, 73, 90, 99, 99],   // L6: Application
            [33, 50, 66, 83, 93, 96],   // L5: Programming Models
            [26, 43, 59, 76, 86, 90],   // L4: Runtime
            [19, 36, 52, 69, 79, 84],   // L3: Platform
            [12, 29, 45, 62, 72, 78],   // L2: Infrastructure
            [5, 22, 38, 55, 65, 72]     // L1: Hardware
        ],
        // AI-Support: Higher value = better AI workload support
        // Linear gradient: increase left→right (cloud has GPUs, TPUs, ML services), increase bottom→top
        // Trend continues increasing to Extra-Planetary
        'AI-Support': [
            [42, 59, 76, 93, 99, 99],   // L7: Agents - best AI framework support
            [38, 55, 72, 89, 97, 99],   // L6: Application
            [34, 51, 68, 85, 94, 97],   // L5: Programming Models
            [30, 47, 64, 81, 90, 94],   // L4: Runtime
            [26, 43, 60, 77, 86, 90],   // L3: Platform
            [22, 39, 56, 73, 82, 86],   // L2: Infrastructure
            [18, 35, 52, 69, 78, 82]    // L1: Hardware - raw compute, less AI optimization
        ],
        // Sustainability: Higher value = more sustainable
        // Trend is undetermined in both directions (across tiers and abstractions).
        // Rendered as a uniform neutral fill (see UNCERTAIN_METRICS); values kept flat so no trend is implied.
        'Sustainability': [
            [50, 50, 50, 50, 50, 50],   // L7: Agents
            [50, 50, 50, 50, 50, 50],   // L6: Application
            [50, 50, 50, 50, 50, 50],   // L5: Programming Models
            [50, 50, 50, 50, 50, 50],   // L4: Runtime
            [50, 50, 50, 50, 50, 50],   // L3: Platform
            [50, 50, 50, 50, 50, 50],   // L2: Infrastructure
            [50, 50, 50, 50, 50, 50]    // L1: Hardware
        ],
        // Security & Trustworthiness: Higher value = better security
        // Linear gradient: constant left→right, gradual increase bottom→top (more layers = more attack surface)
        // Constant left→right continues at Extra-Planetary
        'Security & Trustworthiness': [
            [42, 42, 42, 42, 42, 42],   // L7: Agents - emerging risks (prompt injection)
            [50, 50, 50, 50, 50, 50],   // L6: Application
            [58, 58, 58, 58, 58, 58],   // L5: Programming Models
            [66, 66, 66, 66, 66, 66],   // L4: Runtime
            [74, 74, 74, 74, 74, 74],   // L3: Platform
            [82, 82, 82, 82, 82, 82],   // L2: Infrastructure
            [90, 90, 90, 90, 90, 90]    // L1: Hardware - physical control, simple
        ]
    };

    const metricDefinitions = {
        'Responsiveness': 'How quickly a solution processes and returns responses to user/client requests.',
        'Capacity': 'How much computational power a solution provides in terms of processing, memory, storage, and network.',
        'Capital Expenditure': 'The total fixed expenditure to develop and establish a solution, including hardware procurement and software licensing.',
        'Operational Expenditure': 'The total recurring expenditure to operate and maintain a solution, including energy, labor, and licensing fees.',
        'Scalability': 'The ability of a solution to increase its resource allocation to handle growing workloads while maintaining performance objectives.',
        'Availability': 'The proportion of time a solution remains operational and accessible, accounting for both failure frequency and recovery time.',
        'Mobility': 'The ability of a solution to work on mobile compute resources (e.g., smartphones or vehicular nodes) while maintaining uninterrupted services.',
        'Distributedness': 'The extent to which computation, data, and control are spread across multiple, geographically or logically distinct nodes.',
        'Interoperability': 'The ability of a solution to operate across platforms, technologies, and administrative domains.',
        'Democratization (Ease of use & Programming)': 'The degree to which a solution lowers barriers to access, development, and deployment through ease of use, programmability, and accessibility.',
        'Controllability': 'The degree to which developers or users can directly configure, manage, and influence infrastructure behavior and execution decisions.',
        'AI-Native': 'AI-optimized solutions where AI is fundamentally integrated into the system\'s design and operation.',
        'AI-Support': 'The solution is built to efficiently support AI workloads.',
        'Sustainability': 'The degree to which a solution minimizes its environmental impact across its full lifecycle, including operational energy consumption, embodied carbon, carbon emissions, water usage, and e-waste.',
        'Security & Trustworthiness': 'The ability of a solution to protect data, operations, and users against threats while ensuring integrity, confidentiality, and trustworthy behavior.'
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

        // Undetermined-trend metrics render as a uniform neutral fill (no gradient, no directional claim)
        if (UNCERTAIN_METRICS.has(selectedMetric)) {
            ctx.fillStyle = 'rgb(120, 122, 132)';
            ctx.fillRect(0, 0, width, height);
            return;
        }

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
                    <h1 className="title">Periodic Space</h1>

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
                        {UNCERTAIN_METRICS.has(selectedMetric) && (
                            <span className="trend-uncertain-badge">Trend: uncertain</span>
                        )}
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
