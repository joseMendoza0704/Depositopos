import React from 'react';
import '../styles/Loading.css';

const Loading = () => {
    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="spinner"></div>
                <p>Cargando...</p>
            </div>
        </div>
    );
};

export default Loading;
