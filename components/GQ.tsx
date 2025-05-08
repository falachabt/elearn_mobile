import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {CorrectionService} from "@/services/correrction.service"; // Adjust import path as needed

const BATCH_SIZE = 50; // Number of questions to process in one batch
const ASYNC_STORAGE_KEY = 'quiz_justification_progress';
const RATE_LIMIT_DELAY = 2000; // 2 seconds delay between operations to avoid rate limits

const JustificationGenerator = () => {
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [processedQuestions, setProcessedQuestions] = useState(0);
    const [currentBatch, setCurrentBatch] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        success: 0,
        error: 0,
        skipped: 0,
    });

    // Add a log entry with timestamp
    const addLog = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prevLogs => [
            { id: Date.now(), message, timestamp, type },
            ...prevLogs
        ]);
    }, []);

    // Load progress from AsyncStorage
    const loadProgress = useCallback(async () => {
        try {
            const savedProgress = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
            if (savedProgress) {
                const { processedQuestions, currentBatch, stats } = JSON.parse(savedProgress);
                setProcessedQuestions(processedQuestions);
                setCurrentBatch(currentBatch);
                setStats(stats);
                addLog(`Loaded previous progress: ${processedQuestions} questions processed`, 'info');
            }
        } catch (error) {
            addLog(`Error loading progress: ${error.message}`, 'error');
        }
    }, [addLog]);

    // Save progress to AsyncStorage
    const saveProgress = useCallback(async (processed, batch, currentStats) => {
        try {
            await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify({
                processedQuestions: processed,
                currentBatch: batch,
                stats: currentStats
            }));
        } catch (error) {
            addLog(`Error saving progress: ${error.message}`, 'error');
        }
    }, [addLog]);

    // Count total questions that need processing
    const countTotalQuestions = useCallback(async () => {
        try {
            // Count questions without justification
            const { count, error } = await supabase
                .from('quiz_questions')
                .select('id', { count: 'exact', head: true })
                .is('justificatif', null);

            if (error) throw error;

            setTotalQuestions(count || 0);
            addLog(`Found ${count} questions without justification`, 'info');
            return count;
        } catch (error) {
            addLog(`Error counting questions: ${error.message}`, 'error');
            return 0;
        }
    }, [addLog]);

    // Fetch a batch of questions from Supabase
    const fetchQuestionsBatch = useCallback(async (batchNumber) => {
        try {
            addLog(`Fetching batch #${batchNumber + 1}...`, 'info');

            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .is('justificatif', null)
                .range(batchNumber * BATCH_SIZE, (batchNumber + 1) * BATCH_SIZE - 1)
                .order('id', { ascending: true });

            if (error) throw error;

            addLog(`Fetched ${data.length} questions in batch #${batchNumber + 1}`, 'success');
            return data;
        } catch (error) {
            addLog(`Error fetching batch #${batchNumber + 1}: ${error.message}`, 'error');
            return [];
        }
    }, [addLog]);

    // Update a single question with generated justification
    const updateQuestionJustification = useCallback(async (questionId, justification) => {
        try {
            const { error } = await supabase
                .from('quiz_questions')
                .update({ justificatif: justification, last_modify_at: new Date().toISOString() })
                .eq('id', questionId);

            if (error) throw error;

            return true;
        } catch (error) {
            addLog(`Error updating question ${questionId}: ${error.message}`, 'error');
            return false;
        }
    }, [addLog]);

    // Process a single question
    const processQuestion = useCallback(async (question) => {
        try {
            addLog(`Processing question ID: ${question.id} - ${question.title?.substring(0, 30)}...`, 'info');

            // Generate justification
            const justification = await CorrectionService.generateAnswer(question);

            // Small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

            // Update question in database
            const success = await updateQuestionJustification(question.id, justification);

            if (success) {
                addLog(`Successfully updated question ID: ${question.id}`, 'success');
                return 'success';
            } else {
                addLog(`Failed to update question ID: ${question.id}`, 'error');
                return 'error';
            }
        } catch (error) {
            addLog(`Error processing question ID: ${question.id}: ${error.message}`, 'error');
            return 'error';
        }
    }, [addLog, updateQuestionJustification]);

    // Process a batch of questions
    const processBatch = useCallback(async (batchNumber) => {
        // Fetch batch of questions
        const questions = await fetchQuestionsBatch(batchNumber);

        if (questions.length === 0) {
            addLog(`No questions found in batch #${batchNumber + 1}`, 'info');
            return false; // No more questions to process
        }

        addLog(`Starting to process ${questions.length} questions in batch #${batchNumber + 1}`, 'info');

        let localStats = { ...stats };

        // Process each question in the batch
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];

            // Skip questions that already have a justification
            if (question.justificatif && question.justificatif.trim() !== '') {
                addLog(`Skipping question ID: ${question.id} - already has justification`, 'info');
                localStats.skipped++;
                continue;
            }

            const result = await processQuestion(question);

            if (result === 'success') {
                localStats.success++;
            } else {
                localStats.error++;
            }

            // Update progress
            const newProcessedCount = processedQuestions + i + 1;
            setProcessedQuestions(newProcessedCount);
            setStats(localStats);

            // Save progress every 5 questions
            if ((i + 1) % 5 === 0 || i === questions.length - 1) {
                await saveProgress(newProcessedCount, batchNumber, localStats);
            }
        }

        addLog(`Completed batch #${batchNumber + 1}`, 'success');
        return true; // Batch processed successfully
    }, [
        fetchQuestionsBatch,
        processQuestion,
        addLog,
        saveProgress,
        processedQuestions,
        stats
    ]);

    // Main process function
    const startProcessing = useCallback(async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        addLog('Starting justification generation process...', 'info');

        try {
            // Count total questions if not already set
            if (totalQuestions === 0) {
                await countTotalQuestions();
            }

            let currentBatchNumber = currentBatch;
            let hasMoreBatches = true;

            // Process batches until no more questions or an error occurs
            while (hasMoreBatches) {
                hasMoreBatches = await processBatch(currentBatchNumber);

                if (hasMoreBatches) {
                    currentBatchNumber++;
                    setCurrentBatch(currentBatchNumber);
                    await saveProgress(processedQuestions, currentBatchNumber, stats);
                }
            }

            addLog('All questions processed successfully!', 'success');
        } catch (error) {
            addLog(`Process error: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    }, [
        isProcessing,
        totalQuestions,
        currentBatch,
        countTotalQuestions,
        processBatch,
        addLog,
        saveProgress,
        processedQuestions,
        stats
    ]);

    // Reset progress
    const resetProgress = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
            setProcessedQuestions(0);
            setCurrentBatch(0);
            setStats({ success: 0, error: 0, skipped: 0 });
            setLogs([]);
            addLog('Progress reset successfully', 'info');
        } catch (error) {
            addLog(`Error resetting progress: ${error.message}`, 'error');
        }
    }, [addLog]);

    // Load saved progress on component mount
    useEffect(() => {
        loadProgress();
        countTotalQuestions();
    }, [loadProgress, countTotalQuestions]);

    // Render component
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quiz Justification Generator</Text>

            {/* Progress Section */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                    Progress: {processedQuestions} / {totalQuestions || '?'} questions
                    ({totalQuestions ? Math.round((processedQuestions / totalQuestions) * 100) : 0}%)
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${totalQuestions ? Math.min((processedQuestions / totalQuestions) * 100, 100) : 0}%` }
                        ]}
                    />
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Success:</Text>
                        <Text style={[styles.statValue, styles.successText]}>{stats.success}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Errors:</Text>
                        <Text style={[styles.statValue, styles.errorText]}>{stats.error}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Skipped:</Text>
                        <Text style={[styles.statValue, styles.infoText]}>{stats.skipped}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Current Batch:</Text>
                        <Text style={styles.statValue}>{currentBatch + 1}</Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, isProcessing && styles.disabledButton]}
                    onPress={startProcessing}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>
                            {processedQuestions > 0 ? 'Resume Processing' : 'Start Processing'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.resetButton, isProcessing && styles.disabledButton]}
                    onPress={() => {
                        Alert.alert(
                            'Reset Progress',
                            'Are you sure you want to reset all progress? This cannot be undone.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Reset', onPress: resetProgress, style: 'destructive' }
                            ]
                        );
                    }}
                    disabled={isProcessing}
                >
                    <Text style={styles.buttonText}>Reset Progress</Text>
                </TouchableOpacity>
            </View>

            {/* Logs Section */}
            <View style={styles.logsContainer}>
                <Text style={styles.logsTitle}>Processing Logs</Text>
                <ScrollView style={styles.logs}>
                    {logs.map(log => (
                        <View key={log.id} style={styles.logEntry}>
                            <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                            <Text style={[styles.logMessage, styles[`${log.type}Text`]]}>
                                {log.message}
                            </Text>
                        </View>
                    ))}
                    {logs.length === 0 && (
                        <Text style={styles.emptyLogsText}>No logs yet. Start processing to see logs here.</Text>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    progressContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    progressText: {
        fontSize: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    progressBar: {
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4caf50',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
        flex: 1,
        minWidth: '45%',
    },
    statLabel: {
        fontSize: 14,
        marginRight: 8,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#2196f3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButton: {
        backgroundColor: '#f44336',
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    logsContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        elevation: 2,
    },
    logsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    logs: {
        flex: 1,
    },
    logEntry: {
        flexDirection: 'row',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 8,
    },
    logTimestamp: {
        fontSize: 12,
        color: '#757575',
        marginRight: 8,
        minWidth: 80,
    },
    logMessage: {
        fontSize: 14,
        flex: 1,
    },
    emptyLogsText: {
        fontSize: 14,
        color: '#757575',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 16,
    },
    successText: {
        color: '#4caf50',
    },
    errorText: {
        color: '#f44336',
    },
    infoText: {
        color: '#2196f3',
    },
});

export default JustificationGenerator;