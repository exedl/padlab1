const {app, BrowserWindow} = require('electron')
const path = require('path')
const ipc = require('electron').ipcMain;
const dialog = require('electron').dialog;
const console = require('console');

let MessageBrokerAPI = require('../MessageBrokerAPI');

app.console = new console.Console(process.stdout, process.stderr);

let mainWindow = null;
let api = null;

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 510,
        useContentSize: true,
        resizable: false,
        maximizable: false,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadFile('MainWindow.html');
    mainWindow.removeMenu();

    //mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

ipc.on('close-app', (event, message) => {
    mainWindow.close();
});

ipc.on('error-box', (event, message) => {
    dialog.showMessageBox(mainWindow, {
        message: message,
        type: 'error'
    });
});

ipc.on('selectProto', (event, message) => {
    api = new MessageBrokerAPI({
        proto: message.proto,
        type: 'sender',
        callback: (data) => {
            if (data.type == 'start') {
                mainWindow.webContents.send('start', {topic: data.topic});
            }
        }
    });
});

ipc.on('start-connection', (event, message) => {
    api.createTopic(message.topic, (data) => {
        mainWindow.webContents.send('start', {topic: message.topic});
    });
});

ipc.on('send-message', (event, message) => {
    api.updateTopic(message.message, (data) => {

    });
});