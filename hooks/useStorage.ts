// useStorage.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR, { useSWRConfig } from 'swr';

interface UseStorageOptions {
    bucket: string;
    path?: string;
    publicAccess?: boolean;
}

interface StorageFile {
    name: string;
    size: number;
    type: string;
    url: string;
    path: string;
}

interface StorageError {
    message: string;
    code?: string;
}

const createStorageKey = (bucket: string, path?: string) =>
    `storage:${bucket}${path ? `:${path}` : ''}`;

export const useStorage = ({ bucket, path = '', publicAccess = false }: UseStorageOptions) => {
    const { mutate } = useSWRConfig();
    const storageKey = createStorageKey(bucket, path);

    // Fetcher function for SWR
    const fetcher = async () => {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(path);

        if (error) throw error;

        const files: StorageFile[] = await Promise.all(
            data.map(async (file) => {
                const filePath = path ? `${path}/${file.name}` : file.name;
                let fileUrl = '';

                if (publicAccess) {
                    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                    fileUrl = data.publicUrl;
                } else {
                    const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
                    fileUrl = data?.signedUrl || '';
                }

                return {
                    name: file.name,
                    size: file.metadata.size,
                    type: file.metadata.mimetype,
                    url: fileUrl,
                    path: filePath
                };
            })
        );

        return files;
    };

    const { data: files, error, isLoading } = useSWR<StorageFile[], StorageError>(
        storageKey,
        fetcher
    );

    // Upload function - Modified to handle React Native's ImagePicker result
    const uploadFile = async (fileUri: string, type? : string,  customPath?: string, ) => {
        try {
            // Extract filename from URI
            const fileName = fileUri.split('/').pop() || 'file';

            // Convert the file to a Blob using FormData
            const formData = new FormData();
            formData.append('file', {
                uri: fileUri,
                name: fileName,
                // make the file type detection dynamic
                type : type
            } as any);

            const filePath = customPath
                ? `${customPath}/${fileName}`
                : path
                    ? `${path}/${fileName}`
                    : fileName;

            const { error: uploadError, data } = await supabase.storage
                .from(bucket)
                .upload(filePath, formData.get('file') as any, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: type // Make this dynamic if needed
                });

            if (uploadError) {
                console.error('Supabase upload error:', uploadError);
                throw uploadError;
            }

            await mutate(storageKey);

            // Return the file URL
            if (publicAccess) {
                const { data } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(filePath);
                return { url : data.publicUrl, filePath, data}
            } else {
                const { data } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(filePath, 3600);
                return {url : data?.signedUrl || '', filePath,  data}
            }

        } catch (err) {
            console.error('Upload error:', err);
            throw new Error(err instanceof Error ? err.message : 'Error uploading file');
        }
    };
    // Delete function
    const deleteFile = async (fileName: string) => {
        try {
            const filePath = path ? `${path}/${fileName}` : fileName;

            const { error: deleteError } = await supabase.storage
                .from(bucket)
                .remove([filePath]);

            if (deleteError) throw deleteError;

            await mutate(storageKey);
        } catch (err) {
            console.error('Delete error:', err);
            throw new Error(err instanceof Error ? err.message : 'Error deleting file');
        }
    };

    // Download function
    const downloadFile = async (fileName: string) => {
        try {
            const filePath = path ? `${path}/${fileName}` : fileName;

            const { data, error: downloadError } = await supabase.storage
                .from(bucket)
                .download(filePath);

            if (downloadError) throw downloadError;
            return data;
        } catch (err) {
            console.error('Download error:', err);
            throw new Error(err instanceof Error ? err.message : 'Error downloading file');
        }
    };

    useEffect(() => {
        const channel = supabase
            .channel('storage-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'storage',
                    table: 'objects',
                    filter: `bucket_id=eq.${bucket}`,
                },
                () => {
                    mutate(storageKey);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bucket, storageKey, mutate]);

    return {
        files: files || [],
        isLoading,
        error,
        uploadFile,
        deleteFile,
        downloadFile
    };
};

// Pre-configured hooks
export const useSupportStorage = () => {
    return useStorage({
        bucket: 'elearn',
        path: 'support',
        publicAccess: false
    });
};