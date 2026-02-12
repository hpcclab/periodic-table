import { useState } from 'react';
import './ContainerSidebar.css';

const ContainerSidebar = ({ containers, onAddContainer, onRemoveContainer }) => {
    const [newName, setNewName] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    const handleAdd = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            onAddContainer({
                id: crypto.randomUUID(),
                name: newName.trim(),
                x: null,
                y: null,
                width: 0.15,  // 15% of data area width
                height: 0.2  // 20% of data area height
            });
            setNewName('');
        }
    };

    const handleDragStart = (e, container) => {
        e.dataTransfer.setData('containerId', container.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="container-sidebar">
            <h2 className="sidebar-title">Solutions</h2>

            <form className="add-container-form" onSubmit={handleAdd}>
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Solution name"
                    className="container-name-input"
                />
                <button type="submit" className="add-container-btn">
                    Add
                </button>
            </form>

            <div className="container-list">
                {containers.length === 0 ? (
                    <p className="empty-message">No solutions yet. Add one above.</p>
                ) : (
                    containers.map((container) => (
                        <div
                            key={container.id}
                            className={`container-item ${container.x !== null ? 'placed' : ''}`}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, container)}
                        >
                            <div className="drag-handle">
                                <span className="drag-icon">&#x2630;</span>
                            </div>
                            <div className="container-info">
                                <span className="container-name">{container.name}</span>
                            </div>
                            <button
                                className="remove-container-btn"
                                onClick={() => onRemoveContainer(container.id)}
                                title="Remove"
                            >
                                &times;
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="sidebar-help">
                <button
                    className="help-toggle-btn"
                    onClick={() => setShowHelp(!showHelp)}
                >
                    {showHelp ? 'Hide Help' : 'How to Use'}
                    <span className={`help-chevron ${showHelp ? 'open' : ''}`}>&#9662;</span>
                </button>
                {showHelp && (
                    <div className="help-content">
                        <div className="help-section">
                            <h4>What is this?</h4>
                            <p>The Solutions panel lets you map real-world computing solutions (e.g., AWS Lambda, Kubernetes, Raspberry Pi) onto the heatmap to visualize how they perform across different metrics.</p>
                        </div>
                        <div className="help-section">
                            <h4>Adding a solution</h4>
                            <p>Type a name in the input field above and click <strong>Add</strong>. The solution appears in the list below.</p>
                        </div>
                        <div className="help-section">
                            <h4>Placing on the heatmap</h4>
                            <p>Drag a solution from the list and drop it onto the heatmap. Its position represents which tiers (columns) and abstraction levels (rows) it spans.</p>
                        </div>
                        <div className="help-section">
                            <h4>Resizing</h4>
                            <p>Hover over a placed solution to reveal resize handles on its edges and corners. Drag them to cover more or fewer tiers/levels.</p>
                        </div>
                        <div className="help-section">
                            <h4>Reading the indicator</h4>
                            <p>Each placed solution shows a small gradient bar with a dot indicating its average score for the currently selected metric.</p>
                        </div>
                        <div className="help-section">
                            <h4>Removing</h4>
                            <p>Click the <strong>&times;</strong> button next to a solution in the list to remove it.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContainerSidebar;
