import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export interface PaymentPageRef {
  validateAndPay: () => Promise<boolean>;
}

interface Program {
  id: string;
  price: number;
  learning_path: {
    title: string;
  };
  concour: {
    name: string;
    school: {
      name: string;
    };
  };
}

interface PaymentPageProps {
  selectedProgramIds: string[];
  onPaymentSubmit: (phoneNumber: string) => Promise<void>;
}

const PaymentPage = forwardRef<PaymentPageRef, PaymentPageProps>(({ selectedProgramIds, onPaymentSubmit }, ref) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [network, setNetwork] = useState<'mtn' | 'orange' | null>(null);

  useImperativeHandle(ref, () => ({
    validateAndPay: async () => {
      if (!validatePhoneNumber(phoneNumber)) {
        setError('Veuillez entrer un numéro Orange ou MTN valide');
        return false;
      }
      
      try {
        setIsLoading(true);
        setError('');
        await onPaymentSubmit(phoneNumber);
        return true;
      } catch (err) {
        setError('Le paiement a échoué. Veuillez réessayer.');
        return false;
      } finally {
        setIsLoading(false);
      }
    }
  }));

  useEffect(() => {
    const fetchPrograms = async () => {
      const { data, error } = await supabase
        .from("concours_learningpaths")
        .select("id, price, learning_path:learning_paths(title), concour:concours(name, school:schools(name))")
        .in('id', selectedProgramIds);

      if (data) {
        setPrograms(data);
      }
    };

    fetchPrograms();
  }, [selectedProgramIds]);

  const validatePhoneNumber = (number: string) => {
    if (number.length !== 9) return false;
    if (!number.startsWith('6')) return false;

    const prefix = number.substring(1, 3);
    const prefixNum = parseInt(prefix);

    // MTN ranges: 50-54, 70-79, 80-84
    if ((prefixNum >= 50 && prefixNum <= 54) ||
        (prefixNum >= 70 && prefixNum <= 79) ||
        (prefixNum >= 80 && prefixNum <= 84)) {
      return true;
    }

    // Orange ranges: 55-59, 90-99, 85-89
    if ((prefixNum >= 55 && prefixNum <= 59) ||
        (prefixNum >= 90 && prefixNum <= 99) ||
        (prefixNum >= 85 && prefixNum <= 89)) {
      return true;
    }

    return false;
  };

  const determineNetwork = (number: string) => {
    if (number.length < 3) return null;
    if (!number.startsWith('6')) return null;

    const prefix = number.substring(1, 3);
    const prefixNum = parseInt(prefix);

    if ((prefixNum >= 50 && prefixNum <= 54) ||
        (prefixNum >= 70 && prefixNum <= 79) ||
        (prefixNum >= 80 && prefixNum <= 84)) {
      return 'mtn';
    }

    if ((prefixNum >= 55 && prefixNum <= 59) ||
        (prefixNum >= 90 && prefixNum <= 99) ||
        (prefixNum >= 85 && prefixNum <= 89)) {
      return 'orange';
    }

    return null;
  };

  const handlePhoneChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    if (numericOnly.length <= 9) {
      setPhoneNumber(numericOnly);
      setNetwork(determineNetwork(numericOnly));
    }
  };

  const calculateTotal = () => {
    return programs.reduce((total, item) => total + item.price, 0);
  };

  const handleRetry = () => {
    setIsLoading(false);
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Numéro Mobile Money</Text>
        <View style={styles.phoneInputContainer}>
          <View style={styles.networkIndicator}>
            {network === 'mtn' ? (
              <Image 
                source={require('@/assets/images/mtn-logo.png')} 
                style={styles.networkIcon} 
                resizeMode="contain"
              />
            ) : network === 'orange' ? (
              <Image 
                source={require('@/assets/images/orange-logo.png')} 
                style={styles.networkIcon} 
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderIcon} />
            )}
          </View>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            placeholder="6XXXXXXXX"
            keyboardType="phone-pad"
            maxLength={9}
            editable={!isLoading}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Récapitulatif</Text>
        {programs.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.learning_path?.title}</Text>
              <View style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.concour.name}</Text>
                </View>
                <View style={[styles.tag, styles.schoolTag]}>
                  <Text style={styles.tagText}>{item.concour.school.name}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.itemPrice}>
              {item.price.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        ))}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>{calculateTotal().toLocaleString('fr-FR')} FCFA</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.color.primary[500]} />
          <Text style={styles.loadingText}>
            En attente de confirmation du paiement...
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: theme.spacing.medium,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIndicator: {
    width: 48,
    height: 48,
    backgroundColor: theme.color.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.small,
  },
  networkIcon: {
    width: 32,
    height: 32,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    backgroundColor: theme.color.gray[300],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: "700",
    marginBottom: theme.spacing.medium,
    color: theme.color.text,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
  },
  itemInfo: {
    flex: 1,
    marginRight: theme.spacing.medium,
  },
  itemName: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
    marginBottom: theme.spacing.small,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: theme.color.primary[50],
    paddingHorizontal: theme.spacing.small,
    paddingVertical: 4,
  },
  schoolTag: {
    backgroundColor: theme.color.gray[100],
  },
  tagText: {
    fontSize: theme.typography.fontSize.small,
    color: theme.color.primary[700],
  },
  itemPrice: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.gray[700],
    fontWeight: "600",
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: theme.border.width.thin,
    borderTopColor: theme.color.border,
    marginTop: theme.spacing.medium,
    paddingTop: theme.spacing.medium,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.medium,
    fontWeight: "700",
    color: theme.color.text,
  },
  totalAmount: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: "700",
    color: theme.color.primary[500],
  },
  label: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
    marginBottom: theme.spacing.small,
  },
  input: {
    flex: 1,
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.border,
    padding: theme.spacing.medium,
    fontSize: theme.typography.fontSize.medium,
  },
  errorText: {
    color: theme.color.error,
    fontSize: theme.typography.fontSize.small,
    marginTop: theme.spacing.small,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing.medium,
  },
  loadingText: {
    marginTop: theme.spacing.medium,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
  },
  retryButton: {
    marginTop: theme.spacing.medium,
    padding: theme.spacing.small,
  },
  retryButtonText: {
    color: theme.color.link,
    fontSize: theme.typography.fontSize.medium,
  }
});

export default React.memo(PaymentPage);