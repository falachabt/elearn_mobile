import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { theme } from '@/constants/theme';

interface LearningStyleSelectorProps {
  selected: string;
  onSelect: (style: string) => void;
}

const LearningStyleSelector: React.FC<LearningStyleSelectorProps> = ({
  selected = '', // Default value for null safety
  onSelect,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const styles = [
    {
      id: 'visual',
      title: 'Apprentissage Visuel',
      description: 'Vous apprenez mieux avec des schémas, des vidéos et des supports visuels',
      icon: 'eye',
      keywords: ['Schémas', 'Vidéos', 'Mind-mapping'],
    },
    {
      id: 'auditory',
      title: 'Apprentissage Auditif',
      description: 'Vous préférez écouter des cours et participer à des discussions',
      icon: 'headphones',
      keywords: ['Audio', 'Discussion', 'Débats'],
    },
    {
      id: 'kinesthetic',
      title: 'Apprentissage Pratique',
      description: 'Vous apprenez en pratiquant et en expérimentant par vous-même',
      icon: 'hands',
      keywords: ['Exercices', 'Pratique', 'Expérimentation'],
    },
  ];

  return (
    <View style={[
      localStyles.container,
      isDark && localStyles.containerDark
    ]}>
      <Text style={[
        localStyles.title,
        isDark && localStyles.titleDark
      ]}>
        Votre Style d'Apprentissage
      </Text>
      <Text style={[
        localStyles.subtitle,
        isDark && localStyles.subtitleDark
      ]}>
        Choisissez la méthode qui vous correspond le mieux
      </Text>

      {styles.map((style, index) => {
        const isSelected = selected === style.id;
        
        return (
          <Animatable.View
            key={style.id}
            animation="fadeInUp"
            delay={index * 100}
            duration={500}
          >
            <TouchableOpacity
              style={[
                localStyles.card,
                isDark && localStyles.cardDark,
                isSelected && (isDark ? localStyles.cardSelectedDark : localStyles.cardSelected),
              ]}
              onPress={() => onSelect(style.id)}
              activeOpacity={0.7}
            >
              <View style={[
                localStyles.iconContainer,
                isDark && localStyles.iconContainerDark,
                isSelected && (isDark ? localStyles.iconContainerSelectedDark : localStyles.iconContainerSelected),
              ]}>
                <FontAwesome5 
                  name={style.icon} 
                  size={24} 
                  color={isSelected 
                    ? isDark ? theme.color.primary[400] : theme.color.primary[800]
                    : isDark ? theme.color.gray[400] : '#666666'} 
                />
              </View>

              <View style={localStyles.contentContainer}>
                <Text style={[
                  localStyles.styleTitle,
                  isDark && localStyles.styleTitleDark,
                  isSelected && (isDark ? localStyles.styleTitleSelectedDark : localStyles.styleTitleSelected),
                ]}>
                  {style.title}
                </Text>
                
                <Text style={[
                  localStyles.description,
                  isDark && localStyles.descriptionDark
                ]}>
                  {style.description}
                </Text>

                <View style={localStyles.keywordsContainer}>
                  {style.keywords.map((keyword) => (
                    <View
                      key={keyword}
                      style={[
                        localStyles.keyword,
                        isDark && localStyles.keywordDark,
                        isSelected && (isDark ? localStyles.keywordSelectedDark : localStyles.keywordSelected),
                      ]}
                    >
                      <Text style={[
                        localStyles.keywordText,
                        isDark && localStyles.keywordTextDark,
                        isSelected && (isDark ? localStyles.keywordTextSelectedDark : localStyles.keywordTextSelected),
                      ]}>
                        {keyword}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {isSelected && (
                <View style={localStyles.selectedIndicator}>
                  <FontAwesome5 
                    name="check-circle" 
                    size={20} 
                    color={isDark ? theme.color.primary[400] : theme.color.primary[800]} 
                  />
                </View>
              )}
            </TouchableOpacity>
          </Animatable.View>
        );
      })}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  title: {
    fontFamily : theme.typography.fontFamily,
fontSize: 20,
    fontWeight: '700',
    color: theme.color.gray[900],
    marginBottom: 8,
  },
  titleDark: {
    color: theme.color.gray[50],
  },
  subtitle: {
    fontFamily : theme.typography.fontFamily,
fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 20,
  },
  subtitleDark: {
    color: theme.color.gray[400],
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.color.gray[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.color.gray[200],
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
  },
  cardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[100],
  },
  cardSelectedDark: {
    borderColor: theme.color.primary[400],
    backgroundColor: theme.color.primary[900],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.color.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  iconContainerSelected: {
    backgroundColor: theme.color.primary[50],
  },
  iconContainerSelectedDark: {
    backgroundColor: theme.color.primary[800],
  },
  contentContainer: {
    flex: 1,
  },
  styleTitle: {
    fontFamily : theme.typography.fontFamily,
fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[900],
    marginBottom: 4,
  },
  styleTitleDark: {
    color: theme.color.gray[50],
  },
  styleTitleSelected: {
    color: theme.color.primary[700],
  },
  styleTitleSelectedDark: {
    color: theme.color.primary[100],
  },
  description: {
    fontFamily : theme.typography.fontFamily,
fontSize: 14,
    color: theme.color.gray[600],
    lineHeight: 20,
    marginBottom: 12,
  },
  descriptionDark: {
    color: theme.color.gray[400],
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  keyword: {
    backgroundColor: theme.color.gray[50],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  keywordDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  keywordSelected: {
    backgroundColor: theme.color.primary[800],
  },
  keywordSelectedDark: {
    backgroundColor: theme.color.primary[700],
  },
  keywordText: {
    fontFamily : theme.typography.fontFamily,
fontSize: 12,
    color: theme.color.gray[600],
  },
  keywordTextDark: {
    color: theme.color.gray[400],
  },
  keywordTextSelected: {
    color: theme.color.gray[50],
  },
  keywordTextSelectedDark: {
    color: theme.color.gray[50],
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default LearningStyleSelector;