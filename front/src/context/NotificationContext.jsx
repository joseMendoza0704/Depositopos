import React, { createContext, useState, useContext, useCallback } from 'react';
import ModalMensaje from '../components/ModalMensaje';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification debe usarse dentro de un NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState({
        visible: false,
        message: '',
        type: 'exito' // 'exito' | 'error' | 'info'
    });

    const showAlert = useCallback((message, type = 'exito') => {
        setNotification({
            visible: true,
            message,
            type
        });
    }, []);

    const closeAlert = useCallback(() => {
        setNotification(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <NotificationContext.Provider value={{ showAlert, closeAlert }}>
            {children}
            {notification.visible && (
                <ModalMensaje
                    mensaje={notification.message}
                    tipo={notification.type}
                    onClose={closeAlert}
                />
            )}
        </NotificationContext.Provider>
    );
};
