import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {Pressable, StyleSheet, Text} from 'react-native';
import {MaterialCommunityIcons} from "@expo/vector-icons";

const downloadInvoice = async (paymentId: { paymentId: string }) => {
    try {
        // Replace with your API URL
        const apiUrl = `http://192.168.1.168:3000/api/invoices/generatePdf/${paymentId.paymentId}`;

        console.log('Downloading invoice from:', apiUrl);
        // Generate unique filename
        const filename = `invoice-${paymentId.paymentId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        // Download the file
        const {uri} = await FileSystem.downloadAsync(
            apiUrl,
            fileUri,

        );

        // Share the file
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Votre facture',
            });
        }
    } catch (err: any) {
        console.error('Error downloading invoice:', err);
        throw err;
    }
};


export const DownloadBill = (paymentId: { paymentId: string }) => {
    const handleDownload = async () => {
        try {
            await downloadInvoice(paymentId);
        } catch (err: any) {
            console.error('Error during downloading:', err.message);
            // Handle error (show alert, etc.)
        }
    };

    return (
        <Pressable
            style={styles.downloadButton}
            onPress={handleDownload}
        >

            <MaterialCommunityIcons
                name="file-download"
                size={24}
                color="#FFFFFF"
            />
            <Text style={styles.buttonText}>Télécharger la facture</Text>

        </Pressable>
    );
};

const styles = StyleSheet.create({
    downloadButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});