const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getWindowsUser: () => ipcRenderer.invoke('get-windows-user'),
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
});
