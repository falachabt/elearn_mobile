import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { theme } from '@/constants/theme';

interface ProgramCardProps {
  title: string;
  description: string;
  price: number;
  features: string[];
  level: string;
  duration?: string;
  image?: string;
  courseCount: number;
  quizCount: number;
  exerciseCount: number;
  archiveCount: number;
  concoursName: string;
  schoolName: string;
  isSelected: boolean;
  isDark: boolean;
  onSelect: () => void;
  onExpand?: () => Promise<any>;
  programDetails?: {
    courses: { id: number; name: string }[];
    quizzes: { id: string; name: string }[];
    exercises: { id: string; title: string }[];
    archives: { id: string; name: string; session: string }[];
  };
}

const getDefaultImage = (title: string) => {
  const seed = encodeURIComponent(title);
  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=32A852,4CAF50`;
};

export const ProgramCard: React.FC<ProgramCardProps> = ({
                                                          title,
                                                          description,
                                                          price,
                                                          level,
                                                          duration = '6 mois',
                                                          image,
                                                          courseCount,
                                                          quizCount,
                                                          exerciseCount = 0,
                                                          archiveCount = 0,
                                                          concoursName,
                                                          schoolName,
                                                          onSelect,
                                                          isSelected,
                                                          isDark,
                                                          programDetails,
                                                          onExpand,
                                                          features
                                                        }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<{
    courses: boolean;
    quizzes: boolean;
    exercises: boolean;
    archives: boolean;
  }>({
    courses: false,
    quizzes: false,
    exercises: false,
    archives: false
  });

  // Load details when modal is opened
  useEffect(() => {
    const fetchDetails = async () => {
      if (showDetails && onExpand && !programDetails) {
        setIsLoading(true);
        try {
          await onExpand();
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();
  }, [showDetails, onExpand, programDetails]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
      <>
        <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={[
              styles.container,
              isDark && styles.containerDark
            ]}
        >
          <View style={styles.contentRow}>
            <View style={styles.imageWrapper}>
              <Image
                  source={{ uri: image || getDefaultImage(title) }}
                  style={styles.image}
                  resizeMode="cover"
              />
              <View style={[
                styles.imageOverlay,
                isDark && styles.imageOverlayDark
              ]} />
            </View>

            <View style={styles.mainContent}>
              <View style={[
                styles.levelBadge,
                isDark && styles.levelBadgeDark
              ]}>
                <MaterialCommunityIcons name="school" size={14} color={theme.color.primary[500]} />
                <Text style={styles.levelText}>{level}</Text>
              </View>

              <Text
                  numberOfLines={2}
                  style={[
                    styles.title,
                    isDark && styles.titleDark
                  ]}
              >
                {title}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                      name="book-education"
                      size={16}
                      color={isDark ? theme.color.gray[400] : '#666'}
                  />
                  <Text style={[
                    styles.statText,
                    isDark && styles.statTextDark
                  ]}>
                    {courseCount}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                      name="head-question"
                      size={16}
                      color={isDark ? theme.color.gray[400] : '#666'}
                  />
                  <Text style={[
                    styles.statText,
                    isDark && styles.statTextDark
                  ]}>
                    {quizCount}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                      name="notebook-edit"
                      size={16}
                      color={isDark ? theme.color.gray[400] : '#666'}
                  />
                  <Text style={[
                    styles.statText,
                    isDark && styles.statTextDark
                  ]}>
                    {exerciseCount}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                      name="file-document"
                      size={16}
                      color={isDark ? theme.color.gray[400] : '#666'}
                  />
                  <Text style={[
                    styles.statText,
                    isDark && styles.statTextDark
                  ]}>
                    {archiveCount}
                  </Text>
                </View>
              </View>

              <View style={styles.schoolContainer}>
                <MaterialCommunityIcons
                    name="certificate"
                    size={16}
                    color={theme.color.primary[500]}
                />
                <Text
                    numberOfLines={1}
                    style={[
                      styles.schoolText,
                      isDark && styles.schoolTextDark
                    ]}
                >
                  {concoursName} • {schoolName}
                </Text>
              </View>
            </View>
          </View>

          <View style={[
            styles.footer,
            isDark && styles.footerDark
          ]}>
            <View style={styles.priceSection}>
              <Text style={styles.priceAmount}>{price.toLocaleString()} FCFA</Text>
              <Text style={[
                styles.priceLabel,
                isDark && styles.priceLabelDark
              ]}>
                Prix total
              </Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                  style={[
                    styles.viewButton,
                    isDark && styles.viewButtonDark
                  ]}
                  onPress={() => setShowDetails(true)}
                  activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                    name="eye-outline"
                    size={20}
                    color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isSelected ? styles.selectedButton : styles.unselectedButton,
                    isDark && !isSelected && styles.unselectedButtonDark
                  ]}
                  onPress={onSelect}
                  activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                    name={isSelected ? "check" : "plus"}
                    size={20}
                    color={isSelected ? "#FFF" : theme.color.primary[500]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>

        {/* Programme Details Modal */}
        <Modal
            visible={showDetails}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDetails(false)}
        >
          <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
            <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
              <View style={styles.modalHeader}>
                <View style={{ width: '90%' }}>
                  <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                    Contenu du programme
                  </Text>
                  <Text style={[styles.modalSubtitle, isDark && styles.modalSubtitleDark]}>
                    {title}
                  </Text>
                </View>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetails(false)}
                >
                  <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Loading indicator */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                      <MaterialCommunityIcons
                          name="loading"
                          size={32}
                          color={theme.color.primary[500]}
                          style={styles.spinner}
                      />
                      <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                        Chargement des détails...
                      </Text>
                    </View>
                )}

                {!isLoading && (
                    <>
                      {/* Program Stats Summary */}
                      <View style={styles.statsSummary}>
                        <View style={[styles.statBox, isDark && styles.statBoxDark]}>
                          <MaterialCommunityIcons
                              name="book-education-outline"
                              size={24}
                              color={theme.color.primary[500]}
                          />
                          <Text style={[styles.statCount, isDark && styles.statCountDark]}>
                            {courseCount}
                          </Text>
                          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
                            Cours
                          </Text>
                        </View>

                        <View style={[styles.statBox, isDark && styles.statBoxDark]}>
                          <MaterialCommunityIcons
                              name="head-question-outline"
                              size={24}
                              color={theme.color.primary[500]}
                          />
                          <Text style={[styles.statCount, isDark && styles.statCountDark]}>
                            {quizCount}
                          </Text>
                          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
                            Quiz
                          </Text>
                        </View>

                        <View style={[styles.statBox, isDark && styles.statBoxDark]}>
                          <MaterialCommunityIcons
                              name="notebook-edit-outline"
                              size={24}
                              color={theme.color.primary[500]}
                          />
                          <Text style={[styles.statCount, isDark && styles.statCountDark]}>
                            {exerciseCount}
                          </Text>
                          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
                            Exercices
                          </Text>
                        </View>

                        <View style={[styles.statBox, isDark && styles.statBoxDark]}>
                          <MaterialCommunityIcons
                              name="file-document-outline"
                              size={24}
                              color={theme.color.primary[500]}
                          />
                          <Text style={[styles.statCount, isDark && styles.statCountDark]}>
                            {archiveCount}
                          </Text>
                          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
                            Archives
                          </Text>
                        </View>
                      </View>

                      {/* Description */}
                      <View style={styles.descriptionSection}>
                        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                          Description
                        </Text>
                        <Text style={[styles.descriptionText, isDark && styles.descriptionTextDark]}>
                          {description}
                        </Text>
                      </View>

                      {/* Course List */}
                      {programDetails?.courses && programDetails.courses.length > 0 && (
                          <View style={styles.detailSection}>
                            <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => toggleSection('courses')}
                            >
                              <View style={styles.sectionHeaderLeft}>
                                <MaterialCommunityIcons
                                    name="book-education"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                                  Cours inclus ({programDetails.courses.length})
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                  name={expandedSections.courses ? "chevron-up" : "chevron-down"}
                                  size={24}
                                  color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                              />
                            </TouchableOpacity>

                            {expandedSections.courses && (
                                <View>
                                  {programDetails.courses.map((course, index) => (
                                      <View
                                          key={`course-${course.id}`}
                                          style={[
                                            styles.detailItem,
                                            isDark && styles.detailItemDark,
                                            index === programDetails.courses.length - 1 && { borderBottomWidth: 0 }
                                          ]}
                                      >
                                        <MaterialCommunityIcons
                                            name="check-circle-outline"
                                            size={18}
                                            color={theme.color.primary[500]}
                                        />
                                        <Text style={[styles.detailText, isDark && styles.detailTextDark]}>
                                          {course.name}
                                        </Text>
                                      </View>
                                  ))}
                                </View>
                            )}
                          </View>
                      )}

                      {/* Quiz List */}
                      {programDetails?.quizzes && programDetails.quizzes.length > 0 && (
                          <View style={styles.detailSection}>
                            <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => toggleSection('quizzes')}
                            >
                              <View style={styles.sectionHeaderLeft}>
                                <MaterialCommunityIcons
                                    name="head-question"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                                  Quiz inclus ({programDetails.quizzes.length})
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                  name={expandedSections.quizzes ? "chevron-up" : "chevron-down"}
                                  size={24}
                                  color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                              />
                            </TouchableOpacity>

                            {expandedSections.quizzes && (
                                <View>
                                  {programDetails.quizzes.map((quiz, index) => (
                                      <View
                                          key={`quiz-${quiz.id}`}
                                          style={[
                                            styles.detailItem,
                                            isDark && styles.detailItemDark,
                                            index === programDetails.quizzes.length - 1 && { borderBottomWidth: 0 }
                                          ]}
                                      >
                                        <MaterialCommunityIcons
                                            name="check-circle-outline"
                                            size={18}
                                            color={theme.color.primary[500]}
                                        />
                                        <Text style={[styles.detailText, isDark && styles.detailTextDark]}>
                                          {quiz.name}
                                        </Text>
                                      </View>
                                  ))}
                                </View>
                            )}
                          </View>
                      )}

                      {/* Exercises List */}
                      {programDetails?.exercises && programDetails.exercises.length > 0 && (
                          <View style={styles.detailSection}>
                            <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => toggleSection('exercises')}
                            >
                              <View style={styles.sectionHeaderLeft}>
                                <MaterialCommunityIcons
                                    name="notebook-edit"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                                  Exercices inclus ({programDetails.exercises.length})
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                  name={expandedSections.exercises ? "chevron-up" : "chevron-down"}
                                  size={24}
                                  color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                              />
                            </TouchableOpacity>

                            {expandedSections.exercises && (
                                <View>
                                  {programDetails.exercises.map((exercise, index) => (
                                      <View
                                          key={`exercise-${exercise.id}`}
                                          style={[
                                            styles.detailItem,
                                            isDark && styles.detailItemDark,
                                            index === programDetails.exercises.length - 1 && { borderBottomWidth: 0 }
                                          ]}
                                      >
                                        <MaterialCommunityIcons
                                            name="check-circle-outline"
                                            size={18}
                                            color={theme.color.primary[500]}
                                        />
                                        <Text style={[styles.detailText, isDark && styles.detailTextDark]}>
                                          {exercise.title}
                                        </Text>
                                      </View>
                                  ))}
                                </View>
                            )}
                          </View>
                      )}

                      {/* Archives List */}
                      {programDetails?.archives && programDetails.archives.length > 0 && (
                          <View style={styles.detailSection}>
                            <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => toggleSection('archives')}
                            >
                              <View style={styles.sectionHeaderLeft}>
                                <MaterialCommunityIcons
                                    name="file-document"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                                  Archives incluses ({programDetails.archives.length})
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                  name={expandedSections.archives ? "chevron-up" : "chevron-down"}
                                  size={24}
                                  color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                              />
                            </TouchableOpacity>

                            {expandedSections.archives && (
                                <View>
                                  {programDetails.archives.map((archive, index) => (
                                      <View
                                          key={`archive-${archive.id}`}
                                          style={[
                                            styles.detailItem,
                                            isDark && styles.detailItemDark,
                                            index === programDetails.archives.length - 1 && { borderBottomWidth: 0 }
                                          ]}
                                      >
                                        <MaterialCommunityIcons
                                            name="check-circle-outline"
                                            size={18}
                                            color={theme.color.primary[500]}
                                        />
                                        <Text style={[styles.detailText, isDark && styles.detailTextDark]}>
                                          {archive.name} {archive.session && `(${archive.session})`}
                                        </Text>
                                      </View>
                                  ))}
                                </View>
                            )}
                          </View>
                      )}

                      {(!programDetails || Object.keys(programDetails).length === 0) && (
                          <View style={styles.noDetailsContainer}>
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={48}
                                color={isDark ? theme.color.gray[500] : theme.color.gray[400]}
                            />
                            <Text style={[styles.noDetailsText, isDark && styles.noDetailsTextDark]}>
                              Contenu détaillé non disponible
                            </Text>
                            <Text style={[styles.noDetailsSubText, isDark && styles.noDetailsSubTextDark]}>
                              Ce programme comprend {courseCount} cours, {quizCount} quiz, {exerciseCount} exercices et {archiveCount} archives d'examens.
                            </Text>
                          </View>
                      )}
                    </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                    style={[
                      styles.closeModalButton,
                      isDark && styles.closeModalButtonDark
                    ]}
                    onPress={() => setShowDetails(false)}
                >
                  <Text style={[styles.closeModalButtonText, isDark && styles.closeModalButtonTextDark]}>
                    Fermer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                      styles.selectModalButton,
                      isSelected ? styles.selectedModalButton : styles.unselectedModalButton,
                      isDark && !isSelected && styles.unselectedModalButtonDark
                    ]}
                    onPress={() => {
                      onSelect();
                      setShowDetails(false);
                    }}
                >
                  <Text style={[
                    styles.selectModalButtonText,
                    isSelected && styles.selectedModalButtonText
                  ]}>
                    {isSelected ? "Retirer du panier" : "Ajouter au panier"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
  );
};

const styles = StyleSheet.create({
  // Keep existing styles
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.gray[200],
    marginVertical: 8,
    padding: 12,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  imageOverlayDark: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  levelBadgeDark: {
    backgroundColor: theme.color.primary[900],
  },
  levelText: {
    color: theme.color.primary[500],
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  titleDark: {
    color: theme.color.gray[50],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  statTextDark: {
    color: theme.color.gray[400],
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  durationText: {
    fontSize: 13,
    color: '#666',
  },
  durationTextDark: {
    color: theme.color.gray[400],
  },
  schoolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolText: {
    fontSize: 13,
    color: '#4A4A4A',
    flex: 1,
  },
  schoolTextDark: {
    color: theme.color.gray[300],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerDark: {
    borderTopColor: theme.color.gray[800],
  },
  priceSection: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.primary[500],
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceLabelDark: {
    color: theme.color.gray[400],
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: theme.border.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.color.primary[50],
    borderWidth: 1,
    borderColor: theme.color.primary[200],
  },
  viewButtonDark: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: theme.color.primary[800],
  },
  selectButton: {
    width: 40,
    height: 40,
    borderRadius: theme.border.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: theme.color.primary[500],
  },
  unselectedButton: {
    borderWidth: 1,
    borderColor: theme.color.primary[500],
    backgroundColor: '#FFF',
  },
  unselectedButtonDark: {
    backgroundColor: 'transparent',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainerDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    height: '80%',
  },
  modalContentDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.gray[900],
    marginBottom: 4,
  },
  modalTitleDark: {
    color: theme.color.gray[50],
  },
  modalSubtitle: {
    fontSize: 16,
    color: theme.color.gray[600],
  },
  modalSubtitleDark: {
    color: theme.color.gray[300],
  },
  modalScroll: {
    flex: 1,
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: theme.color.gray[50],
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
  },
  statBoxDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.gray[900],
    marginTop: 4,
  },
  statCountDark: {
    color: theme.color.gray[50],
  },
  statLabel: {
    fontSize: 12,
    color: theme.color.gray[600],
    marginTop: 2,
  },
  statLabelDark: {
    color: theme.color.gray[400],
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom:  0, // Ajustez dynamiquement la marge
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.color.gray[900],
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: theme.color.gray[50],
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.gray[700],
  },
  descriptionTextDark: {
    color: theme.color.gray[300],
  },
  detailSection: {
    marginBottom: 10,
    backgroundColor: theme.color.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.gray[200],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
    gap: 12,
  },
  detailItemDark: {
    borderBottomColor: theme.color.gray[700],
  },
  detailText: {
    fontSize: 15,
    color: theme.color.gray[800],
    flex: 1,
  },
  detailTextDark: {
    color: theme.color.gray[300],
  },
  noDetailsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDetailsText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[700],
    marginTop: 16,
    marginBottom: 8,
  },
  noDetailsTextDark: {
    color: theme.color.gray[300],
  },
  noDetailsSubText: {
    fontSize: 14,
    color: theme.color.gray[600],
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  noDetailsSubTextDark: {
    color: theme.color.gray[400],
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.color.gray[200],
    paddingVertical: 16,
    gap: 12,
  },
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.gray[300],
    alignItems: 'center',
    flex: 1,
  },
  closeModalButtonDark: {
    borderColor: theme.color.gray[700],
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[700],
  },
  closeModalButtonTextDark: {
    color: theme.color.gray[300],
  },
  selectModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 2,
  },
  selectedModalButton: {
    backgroundColor: theme.color.error[500],
  },
  unselectedModalButton: {
    backgroundColor: theme.color.primary[500],
  },
  unselectedModalButtonDark: {
    backgroundColor: theme.color.primary[600],
  },
  selectModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  selectedModalButtonText: {
    color: 'white',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Add new loading styles
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.color.gray[700],
  },
  loadingTextDark: {
    color: theme.color.gray[300],
  },
  spinner: {
    transform: [{ rotate: '0deg' }],
  },
});