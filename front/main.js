const { app, BrowserWindow, ipcMain } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function getWindowsUsername() {
  try {
    return execSync('echo %USERNAME%', { encoding: 'utf8' }).trim();
  } catch {
    return 'Usuario';
  }
}

function verifyWindowsPin(password) {
  try {
    const username = getWindowsUsername();
    // Use PowerShell to validate local machine credentials
    const command = `powershell -Command "Add-Type -AssemblyName System.DirectoryServices.AccountManagement; $pc = New-Object System.DirectoryServices.AccountManagement.PrincipalContext([System.DirectoryServices.AccountManagement.ContextType]::Machine); $pc.ValidateCredentials('${username}', '${password.replace(/'/g, "''")}')"`;
    const result = require('child_process').execSync(command, { encoding: 'utf8' }).trim();
    return result.toLowerCase() === 'true';
  } catch (e) {
    console.error('Error validating Windows credentials:', e);
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DepositPOS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-windows-user', () => {
  return getWindowsUsername();
});

ipcMain.handle('verify-pin', (event, pin) => {
  return verifyWindowsPin(pin);
});
