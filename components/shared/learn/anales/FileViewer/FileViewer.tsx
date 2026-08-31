import React from 'react';
import { Platform } from 'react-native';

import type { FileViewerProps } from './FileViewer.native';
import { Platform } from 'react-native';

let NativeFileViewer: React.ComponentType<FileViewerProps> | null = null;
let WebFileViewer: React.ComponentType<FileViewerProps> | null = null;

if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebFileViewer = require('./FileViewer.web').FileViewer as React.ComponentType<FileViewerProps>;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeFileViewer = require('./FileViewer.native').FileViewer as React.ComponentType<FileViewerProps>;
}

export type { FileViewerFile, FileViewerProps } from './FileViewer.native';

export const FileViewer: React.FC<FileViewerProps> = (props) => {
  const Component = Platform.OS === 'web' ? WebFileViewer : NativeFileViewer;
  return <Component {...props} />;
};
