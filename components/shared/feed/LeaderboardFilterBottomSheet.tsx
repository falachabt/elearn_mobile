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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { getLeaderboardGradelevels, GradelevelOption } from '@/services/feed.service';
import { getCountries, countryFlagEmoji, type CountryOption } from '@/services/countries.service';

export type LeaderboardFilters = {
  gradelevel: string | null;
  country: CountryOption | null;
};

interface LeaderboardFilterBottomSheetProps {
  visible: boolean;
  value: LeaderboardFilters;
  onApply: (filters: LeaderboardFilters) => void;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function LeaderboardFilterBottomSheet({
  visible,
  value,
  onApply,
  onClose,
}: LeaderboardFilterBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [section, setSection] = useState<'gradelevel' | 'country'>('gradelevel');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [gradelevels, setGradelevels] = useState<GradelevelOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [gradelevel, setGradelevel] = useState<string | null>(value.gradelevel);
  const [country, setCountry] = useState<CountryOption | null>(value.country);

  useEffect(() => {
    if (!visible) return;
    setGradelevel(value.gradelevel);
    setCountry(value.country);
    setSearch('');
    setLoading(true);
    Promise.all([getLeaderboardGradelevels(), getCountries()]).then(([gl, c]) => {
      setGradelevels(gl);
      setCountries(c);
      setLoading(false);
    });
  }, [visible]);

  const filteredGradelevels = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return gradelevels;
    return gradelevels.filter((g) => g.gradelevel.toLowerCase().includes(q));
  }, [search, gradelevels]);

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, countries]);

  const bg = isDark ? theme.color.dark.background.primary : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const subColor = isDark ? '#AAAAAA' : '#666666';
  const borderColor = isDark ? '#333333' : '#E5E5E5';
  const inputBg = isDark ? theme.color.dark.background.secondary : '#F5F5F5';

  const hasActiveFilters = !!gradelevel || !!country;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      avoidKeyboard={false}
      useNativeDriver
    >
      <View style={[styles.sheet, { backgroundColor: bg, height: SCREEN_HEIGHT * 0.85 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Filtrer le classement</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={subColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTabs}>
          <TouchableOpacity
            style={[styles.sectionTab, section === 'gradelevel' && styles.sectionTabActive]}
            onPress={() => setSection('gradelevel')}
          >
            <Text style={[styles.sectionTabText, section === 'gradelevel' && styles.sectionTabTextActive]}>
              Filière{gradelevel ? ` · ${gradelevel}` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, section === 'country' && styles.sectionTabActive]}
            onPress={() => setSection('country')}
          >
            <Text style={[styles.sectionTabText, section === 'country' && styles.sectionTabTextActive]}>
              Pays{country ? ` · ${country.name}` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchWrapper, { backgroundColor: inputBg, borderColor }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={subColor} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={section === 'gradelevel' ? 'Rechercher une filière...' : 'Rechercher un pays...'}
            placeholderTextColor={subColor}
            style={[styles.searchInput, { color: textColor }]}
            autoCorrect={false}
            autoCapitalize="none"
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
        ) : section === 'gradelevel' ? (
          <FlatList
            data={filteredGradelevels}
            keyExtractor={(item) => item.gradelevel}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: borderColor }]} />}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.item, !gradelevel && { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0' }]}
                onPress={() => setGradelevel(null)}
              >
                <Text style={[styles.itemLabel, { color: textColor }]}>Toutes les filières</Text>
                {!gradelevel && <MaterialCommunityIcons name="check" size={18} color={theme.color.primary[500]} />}
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = item.gradelevel === gradelevel;
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0' }]}
                  onPress={() => setGradelevel(item.gradelevel)}
                >
                  <Text style={[styles.itemLabel, { color: textColor }]}>{item.gradelevel}</Text>
                  <Text style={styles.itemCount}>{item.student_count}</Text>
                  {isSelected && <MaterialCommunityIcons name="check" size={18} color={theme.color.primary[500]} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: subColor }}>Aucune filière trouvée</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: borderColor }]} />}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.item, !country && { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0' }]}
                onPress={() => setCountry(null)}
              >
                <Text style={[styles.itemLabel, { color: textColor }]}>Tous les pays</Text>
                {!country && <MaterialCommunityIcons name="check" size={18} color={theme.color.primary[500]} />}
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === country?.id;
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0' }]}
                  onPress={() => setCountry(item)}
                >
                  <Text style={styles.flag}>{countryFlagEmoji(item.code)}</Text>
                  <Text style={[styles.itemLabel, { color: textColor, flex: 1 }]}>{item.name}</Text>
                  {isSelected && <MaterialCommunityIcons name="check" size={18} color={theme.color.primary[500]} />}
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

        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          {hasActiveFilters && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setGradelevel(null);
                setCountry(null);
              }}
            >
              <Text style={styles.resetBtnText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => onApply({ gradelevel, country })}
          >
            <Text style={styles.applyBtnText}>Voir les résultats</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700' },
  sectionTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  sectionTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  sectionTabActive: { backgroundColor: theme.color.primary[500] },
  sectionTabText: { fontSize: 13, fontWeight: '600', color: theme.color.primary[500] },
  sectionTabTextActive: { color: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  itemLabel: { fontSize: 15, fontWeight: '500' },
  itemCount: { fontSize: 13, color: '#94A3B8', marginLeft: 'auto' },
  flag: { fontSize: 22 },
  separator: { height: 1, marginLeft: 20 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  applyBtn: {
    flex: 1,
    backgroundColor: theme.color.primary[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
