/**
 * Entry point index.js for UMD packaging
 */
import 'regenerator-runtime/runtime';

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';

import filesToStudies from './lib/filesToStudies';
import ConnectedViewer from './connectedComponents/ConnectedViewer';
import ViewerLocalFileData from './connectedComponents/ViewerLocalFileData';

function installViewer(config, containerId = 'root', callback, dicomFileUrl) {
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error(
      "No root element found to install viewer. Please add a <div> with the id 'root', or pass a DOM element into the installViewer function."
    );
  }

  return ReactDOM.render(
    <App config={config} dicomFileUrl={dicomFileUrl} />,
    container,
    callback
  );
}

export {
  App,
  installViewer,
  filesToStudies,
  ConnectedViewer,
  ViewerLocalFileData,
};
