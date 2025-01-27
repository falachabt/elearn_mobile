// hooks/useFileDownload.ts
import { Archive } from '@/app/(app)/learn/[pdId]/anales';
import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';

interface DownloadState {
    [key: string]: {
        downloading: boolean;
        progress: number;
        localPath?: string;
    };
}

export const useFileDownload = () => {
    const [downloadState, setDownloadState] = useState<DownloadState>({});

    const checkIfFileExists = useCallback(async (file: Archive) => {
        const localPath = `${FileSystem.documentDirectory}${file.id}_${file.name}`;
        try {
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            if (fileInfo.exists) {
                setDownloadState(prev => ({
                    ...prev,
                    [file.id]: { ...prev[file.id], localPath }
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking file:', error);
            return false;
        }
    }, []);

    const downloadFile = useCallback(async (file: Archive) => {
        const localPath = `${FileSystem.documentDirectory}${file.id}_${file.name}`;
        
        setDownloadState(prev => ({
            ...prev,
            [file.id]: { downloading: true, progress: 0 }
        }));

        try {
            const downloadResumable = FileSystem.createDownloadResumable(
                file.file_url,
                localPath,
                {},
                (downloadProgress) => {
                    const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
                    setDownloadState(prev => ({
                        ...prev,
                        [file.id]: { ...prev[file.id], progress }
                    }));
                }
            );

            const downloadResult = await downloadResumable.downloadAsync();
            const uri = downloadResult?.uri;

            setDownloadState(prev => ({
                ...prev,
                [file.id]: { downloading: false, progress: 100, localPath: uri }
            }));
            return true;
        } catch (error) {
            console.error('Download error:', error);
            setDownloadState(prev => ({
                ...prev,
                [file.id]: { downloading: false, progress: 0 }
            }));
            return false;
        }
    }, []);

    return {
        downloadState,
        checkIfFileExists,
        downloadFile
    };
};