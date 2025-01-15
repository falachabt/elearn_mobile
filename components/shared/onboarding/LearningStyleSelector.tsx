import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { theme } from '@/constants/theme';

interface LearningStyleSelectorProps {
  selected: string;
  onSelect: (style: string) => void;
}

const LearningStyleSelector: React.FC<LearningStyleSelectorProps> = ({
  selected,
  onSelect,
}) => {
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
    <View style={localStyles.container}>
      <Text style={localStyles.title}>Votre Style d'Apprentissage</Text>
      <Text style={localStyles.subtitle}>
        Choisissez la méthode qui vous correspond le mieux
      </Text>

      {styles.map((style, index) => (
        <Animatable.View
          key={style.id}
          animation="fadeInUp"
          delay={index * 100}
          duration={500}
        >
          <TouchableOpacity
            style={[
              localStyles.card,
              selected === style.id && localStyles.cardSelected,
            ]}
            onPress={() => onSelect(style.id)}
            activeOpacity={0.7}
          >
            <View style={[
              localStyles.iconContainer,
              selected === style.id && localStyles.iconContainerSelected,
            ]}>
              <FontAwesome5 
                name={style.icon} 
                size={24} 
                color={selected === style.id ? theme.color.primary[800] : '#666666'} 
              />
            </View>

            <View style={localStyles.contentContainer}>
              <Text style={[
                localStyles.styleTitle,
                selected === style.id && localStyles.styleTitleSelected,
              ]}>
                {style.title}
              </Text>
              
              <Text style={localStyles.description}>
                {style.description}
              </Text>

              <View style={localStyles.keywordsContainer}>
                {style.keywords.map((keyword) => (
                  <View
                    key={keyword}
                    style={[
                      localStyles.keyword,
                      selected === style.id && localStyles.keywordSelected,
                    ]}
                  >
                    <Text style={[
                      localStyles.keywordText,
                      selected === style.id && localStyles.keywordTextSelected,
                    ]}>
                      {keyword}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {selected === style.id && (
              <View style={localStyles.selectedIndicator}>
                <FontAwesome5 name="check-circle" size={20} color={theme.color.primary[800]} />
              </View>
            )}
          </TouchableOpacity>
        </Animatable.View>
      ))}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E1E1E1',
  },
  cardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[100],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#EAF4FF',
  },
  contentContainer: {
    flex: 1,
  },
  styleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  styleTitleSelected: {
    color: theme.color.primary[700],
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  keyword: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  keywordSelected: {
    backgroundColor: theme.color.primary[800],
  },
  keywordText: {
    fontSize: 12,
    color: '#666666',
  },
  keywordTextSelected: {
    color: '#ffff',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default LearningStyleSelector;