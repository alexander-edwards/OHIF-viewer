/* eslint-disable no-console */
import React, { PureComponent } from 'react';
import { metadata, utils } from '@ohif/core';

import ConnectedViewer from './ConnectedViewer.js';
import PropTypes from 'prop-types';
import { extensionManager } from './../App.js';
import Dropzone from 'react-dropzone';
import filesToStudies from '../lib/filesToStudies';
import './ViewerLocalFileData.css';
import { withTranslation } from 'react-i18next';

import memoize from 'memoize-one';

const { OHIFStudyMetadata } = metadata;
const { studyMetadataManager } = utils;

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

class ViewerLocalFileData extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      studies: null,
      loading: false,
      error: null,
    };
    console.log('constructor props dicomFiles: ', this.props.dicomFiles);

    // If files have been provided then use them as the studies
    this.studiesFromFiles([this.props.dicomFiles]);
  }

  static propTypes = {
    studies: PropTypes.array,
    dicomFiles: PropTypes.object,
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

  static getDerivedStateFromProps(props, state) {
    return {
      dicomFiles: props.dicomFiles,
    };
    // console.log('getDerivedStateFromProps fn()', props.dicomFiles);
    // if (
    //   Object.keys(props.dicomFiles).length !== 0 &&
    //   props.dicomFiles !== state.dicomFiles
    // ) {
    //   console.log('Not the same: ', props.dicomFiles, state.dicomFiles);
    //   this.studiesFromFiles([props.dicomFiles]);
    //   return {
    //     dicomFiles: props.dicomFiles,
    //   };
    // }
    // return null;
  }

  handleChange;

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
