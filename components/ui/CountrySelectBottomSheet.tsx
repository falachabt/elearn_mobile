import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useColorScheme,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { getCountries, countryFlagEmoji, type CountryOption } from '@/services/countries.service';

interface CountrySelectBottomSheetProps {
  visible: boolean;
  selected?: CountryOption | null;
  onSelect: (country: CountryOption) => void;
  onClose?: () => void;
  /** false = ne peut pas être fermé sans choisir (backdrop/back/swipe désactivés, pas de bouton close) */
  dismissable?: boolean;
  title?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function CountrySelectBottomSheet({
  visible,
  selected,
  onSelect,
  onClose,
  dismissable = true,
  title = 'Choisis ton pays',
}: CountrySelectBottomSheetProps) {
  const [search, setSearch] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }
    setLoading(true);
    getCountries().then((data) => {
      setCountries(data);
      setLoading(false);
    });
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, countries]);

  const handleSelect = (country: CountryOption) => {
    onSelect(country);
    setSearch('');
  };

  const bg = isDark ? theme.color.dark.background.primary : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const subColor = isDark ? '#AAAAAA' : '#666666';
  const borderColor = isDark ? '#333333' : '#E5E5E5';
  const inputBg = isDark ? theme.color.dark.background.secondary : '#F5F5F5';

  const closeHandler = dismissable ? onClose : undefined;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={closeHandler}
      onBackButtonPress={closeHandler}
      style={styles.modal}
      backdropOpacity={0.5}
      propagateSwipe
      swipeDirection={dismissable ? 'down' : undefined}
      onSwipeComplete={closeHandler}
      avoidKeyboard={false}
      useNativeDriver
    >
      <View style={[styles.sheet, { backgroundColor: bg, height: SCREEN_HEIGHT * 0.85 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {dismissable && onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color={subColor} />
            </TouchableOpacity>
          )}
        </View>

        {!dismissable && (
          <Text style={[styles.helper, { color: subColor }]}>
            Choisis ton pays pour continuer.
          </Text>
        )}

        <View style={[styles.searchWrapper, { backgroundColor: inputBg, borderColor }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={subColor} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un pays..."
            placeholderTextColor={subColor}
            style={[styles.searchInput, { color: textColor }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={subColor} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.color.primary[500]} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: borderColor }]} />}
            renderItem={({ item }) => {
              const isSelected = item.id === selected?.id;
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0' }]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{countryFlagEmoji(item.code)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.countryName, { color: textColor }]}>{item.name}</Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={18} color={theme.color.primary[500]} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: subColor }}>Aucun pays trouvé</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  helper: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  flag: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginLeft: 58,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
});
