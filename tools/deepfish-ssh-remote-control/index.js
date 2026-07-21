const {
  testCurrentConnection, execCommand, uploadFile, downloadFile,
  testCurrentConnectionDescription, execCommandDescription, uploadFileDescription, downloadFileDescription,
} = require('./controller-ssh');
const {
  addConnection, setCurrentInteractive, listConnections, deleteConnection, switchConnection, getConfigPath,
  addConnectionDescription, setCurrentInteractiveDescription, listConnectionsDescription,
  deleteConnectionDescription, switchConnectionDescription, getConfigPathDescription,
} = require('./config-manager');

const functions = {
  addConnection,
  setCurrentInteractive,
  listConnections,
  deleteConnection,
  switchConnection,
  testCurrentConnection,
  execCommand,
  uploadFile,
  downloadFile,
  getConfigPath,
};

const descriptions = [
  addConnectionDescription,
  setCurrentInteractiveDescription,
  listConnectionsDescription,
  deleteConnectionDescription,
  switchConnectionDescription,
  testCurrentConnectionDescription,
  execCommandDescription,
  uploadFileDescription,
  downloadFileDescription,
  getConfigPathDescription,
];

module.exports = { functions, descriptions };
