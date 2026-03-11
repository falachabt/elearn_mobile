import React from 'react';
import { Platform } from 'react-native';

import type { FileViewerProps } from './FileViewer.native';

const NativeFileViewer = require('./FileViewer.native').FileViewer as React.ComponentType<FileViewerProps>;
const WebFileViewer = require('./FileViewer.web').FileViewer as React.ComponentType<FileViewerProps>;

export type { FileViewerFile, FileViewerProps } from './FileViewer.native';

export const FileViewer: React.FC<FileViewerProps> = (props) => {
  const Component = Platform.OS === 'web' ? WebFileViewer : NativeFileViewer;
  return <Component {...props} />;
};
