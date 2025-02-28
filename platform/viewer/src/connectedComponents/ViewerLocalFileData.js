/* eslint-disable no-console */
import React, { Component } from 'react';
import { metadata, utils } from '@ohif/core';

import ConnectedViewer from './ConnectedViewer.js';
import PropTypes from 'prop-types';
import { extensionManager } from './../App.js';
import Dropzone from 'react-dropzone';
import filesToStudies from '../lib/filesToStudies';
import './ViewerLocalFileData.css';
import { withTranslation } from 'react-i18next';

import axios from 'axios';

const { OHIFStudyMetadata } = metadata;
const { studyMetadataManager } = utils;

const USE_TEST_VALUE = true;

const dropZoneLinkDialog = (onDrop, i18n, dir) => {
  return (
    <Dropzone onDrop={onDrop} noDrag>
      {({ getRootProps, getInputProps }) => (
        <span {...getRootProps()} className="link-dialog">
          {dir ? (
            <span>
              {i18n('Load folders')}
              <input
                {...getInputProps()}
                webkitdirectory="true"
                mozdirectory="true"
              />
            </span>
          ) : (
            <span>
              {i18n('Load files')}
              <input {...getInputProps()} />
            </span>
          )}
        </span>
      )}
    </Dropzone>
  );
};

const linksDialogMessage = (onDrop, i18n) => {
  return (
    <>
      {i18n('Or click to ')}
      {dropZoneLinkDialog(onDrop, i18n)}
      {i18n(' or ')}
      {dropZoneLinkDialog(onDrop, i18n, true)}
      {i18n(' from dialog')}
    </>
  );
};

class ViewerLocalFileData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      studies: null,
      loading: false,
      error: null,
      dicomFile: null,
    };
    console.log('constructor props dicomFileUrl: ', this.props.dicomFileUrl);

    // If files have been provided then use them as the studies
  }

  static propTypes = {
    studies: PropTypes.array,
    dicomFileUrl: PropTypes.string,
  };

  updateStudies = studies => {
    // Render the viewer when the data is ready
    studyMetadataManager.purge();

    console.log('updateStudies memoised fn(): ', studies);

    // Map studies to new format, update metadata manager?
    const updatedStudies = studies.map(study => {
      const studyMetadata = new OHIFStudyMetadata(
        study,
        study.StudyInstanceUID
      );
      const sopClassHandlerModules =
        extensionManager.modules['sopClassHandlerModule'];

      study.displaySets =
        study.displaySets ||
        studyMetadata.createDisplaySets(sopClassHandlerModules);

      studyMetadata.forEachDisplaySet(displayset => {
        displayset.localFile = true;
      });

      studyMetadataManager.add(studyMetadata);

      return study;
    });

    console.log('setting this state studies', updatedStudies);
    this.setState({
      studies: updatedStudies,
    });
  };

  updatedStudiesFromFile = async studyFiles => {
    console.log('Updating studies from file');
    const studies = await filesToStudies(studyFiles);

    return studies.map(study => {
      const studyMetadata = new OHIFStudyMetadata(
        study,
        study.StudyInstanceUID
      );
      const sopClassHandlerModules =
        extensionManager.modules['sopClassHandlerModule'];

      study.displaySets =
        study.displaySets ||
        studyMetadata.createDisplaySets(sopClassHandlerModules);

      studyMetadata.forEachDisplaySet(displayset => {
        displayset.localFile = true;
      });

      studyMetadataManager.add(studyMetadata);

      return study;
    });
  };

  studiesFromFiles = async dicomFiles => {
    console.log('studiesFromFiles fn()');
    const studies = await filesToStudies(dicomFiles);
    return this.updateStudies(studies);
  };

  componentDidMount() {
    console.log('componentDidMount fn()');
    this.getNewFiles();
  }

  componentDidUpdate(prevProps) {
    if (this.props.dicomFileUrl !== prevProps.dicomFileUrl) {
      console.log('componentDidUpdate fn()');
      this.getNewFiles();
    }
  }

  getNewFiles = async () => {
    const config = { responseType: 'blob' };

    const blobUrls = this.getUrls();
    const filesToLoad = [];

    console.log('blobUrls to get: ', blobUrls);

    // Get the file of each url needed
    for (var i = 0; i < blobUrls.length; i++) {
      const blobUrl = blobUrls[i];
      await axios.get(blobUrl, config).then(response => {
        const newDicomFile = new File([response.data], 'dicomFile');
        console.log('Successfully got dicom file: ', newDicomFile);
        filesToLoad.push(newDicomFile);
      });
    }

    console.log('filesToLoad ', filesToLoad);

    // Transform each file into a study
    this.studiesFromFiles(filesToLoad);
  };

  getUrls = () => {
    const blobUrls = [];

    // If we want to test using an example dicom in /public/
    if (USE_TEST_VALUE) {
      blobUrls.push(
        'http://localhost:3000/radiology_example/LUNG1-021_1-001.dcm'
      );
      blobUrls.push(
        'http://localhost:3000/radiology_example/LUNG1-021_1-002.dcm'
      );
      return blobUrls;
    }

    blobUrls.push(this.props.dicomFileUrl);
    return blobUrls;
  };

  render() {
    const onDrop = async acceptedFiles => {
      console.log('onDrop fn()');
      this.setState({ loading: true });

      console.log('acceptedFiles', acceptedFiles);
      const studies = await filesToStudies(acceptedFiles);
      const updatedStudies = this.updateStudies(studies);

      if (!updatedStudies) {
        return;
      }

      this.setState({ studies: updatedStudies, loading: false });
    };

    if (this.state.error) {
      return <div>Error: {JSON.stringify(this.state.error)}</div>;
    }

    return (
      <Dropzone onDrop={onDrop} noClick>
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()} style={{ width: '100%', height: '100%' }}>
            {this.state.studies ? (
              <ConnectedViewer
                studies={this.state.studies}
                studyInstanceUIDs={
                  this.state.studies &&
                  this.state.studies.map(a => a.StudyInstanceUID)
                }
              />
            ) : (
              <div className={'drag-drop-instructions'}>
                <div className={'drag-drop-contents'}>
                  {this.state.loading ? (
                    <h3>{this.props.t('Loading...')}</h3>
                  ) : (
                    <>
                      <h3>
                        {this.props.t(
                          'Drag and Drop DICOM files here to load them in the Viewer'
                        )}
                      </h3>
                      <h4>{linksDialogMessage(onDrop, this.props.t)}</h4>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Dropzone>
    );
  }
}

export default withTranslation('Common')(ViewerLocalFileData);
