import { useState } from 'react';
import './ContainerSidebar.css';

const ContainerSidebar = ({ containers, onAddContainer, onRemoveContainer }) => {
    const [newName, setNewName] = useState('');

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
                <p>Drag solutions onto the heatmap to place them.</p>
            </div>
        </div>
    );
};

export default ContainerSidebar;
