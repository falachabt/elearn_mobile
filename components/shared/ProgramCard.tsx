import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
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
  onSelect: () => void;
}

const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  description,
  price,
  features,
  level,
  duration = '6 mois',
  image,
  onSelect,
}) => {
  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      style={styles.container}
    >
      <View style={styles.header}>
        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        <View style={styles.badges}>
          <View style={styles.levelBadge}>
            <FontAwesome5 name="chart-line" size={12} color="#4A90E2" />
            <Text style={styles.levelText}>{level}</Text>
          </View>
          <View style={styles.durationBadge}>
            <FontAwesome5 name="clock" size={12} color="#666666" />
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.features}>
          {features.map((feature, index) => (
            <Animatable.View
              key={index}
              animation="fadeInLeft"
              delay={index * 100}
              duration={500}
              style={styles.featureItem}
            >
              <FontAwesome5 
                name="check-circle" 
                size={16} 
                color="#4CAF50"
                style={styles.featureIcon} 
              />
              <Text style={styles.featureText}>{feature}</Text>
            </Animatable.View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>{price}€</Text>
            <Text style={styles.pricePeriod}>/mois</Text>
          </View>

          <TouchableOpacity
            style={styles.selectButton}
            onPress={onSelect}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Sélectionner</Text>
            <FontAwesome5 
              name="arrow-right" 
              size={14} 
              color="#FFFFFF"
              style={styles.buttonIcon} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animatable.View>
  );
};

export default ProgramCard

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    marginBottom: 20,
    borderWidth: theme.border.width.thin,
    borderColor: '#E1E1E1',
    overflow: 'hidden',
  },
  header: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F0',
  },
  badges: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: '#E1F5FE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    color: '#4A90E2',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  durationText: {
    color: '#666666',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
    marginTop: 35
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  features: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#666666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 2,
  },
});