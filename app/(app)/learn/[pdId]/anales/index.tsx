import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import { ScrollView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';

const ArchiveCard = ({ item, isDark, onPress, onPin }) => (
  <Animatable.View
    animation="fadeIn"
    duration={500}
    style={[styles.card, isDark && styles.cardDark]}
  >
    <TouchableOpacity 
      style={styles.cardContent}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={24}
          color={theme.color.primary[500]}
        />
      </View>
      
      <View style={styles.cardDetails}>
        <Text 
          numberOfLines={1} 
          style={[styles.cardTitle, isDark && styles.textDark]}
        >
          {item.name}
        </Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="folder-outline"
              size={14}
              color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
            />
            <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
              {item.courses_categories?.name}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={14}
              color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
            />
            <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
              {new Date(item.session).toLocaleDateString()}
            </Text>
          </View>

          <TouchableOpacity onPress={() => onPin(item.id)} style={styles.pinButton}>
            <MaterialCommunityIcons
              name={item.is_pinned ? "pin" : "pin-outline"}
              size={20}
              color={item.is_pinned ? theme.color.primary[500] : theme.color.gray[400]}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <MaterialCommunityIcons
        name="download-outline"
        size={24}
        color={theme.color.primary[500]}
      />
    </TouchableOpacity>
  </Animatable.View>
);

const ArchivesList = () => {
  const { pdId } = useLocalSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState([]);
  const [categories, setCategories] = useState([]);
  const [concoursName, setConcoursName] = useState('');
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  useEffect(() => {
    fetchData();
  }, [pdId]);

  const fetchData = async () => {
    try {
      // Get concourId and name from learningPath
      const { data: pathData, error } = await supabase
        .from('concours_learningpaths')
        .select('concourId, concours (name)')
        .eq('learningPathId', pdId)
        .limit(1);



    console.log('pathData', pathData);
    console.log('error', error);

      if (!pathData) throw new Error('Learning path not found');

      setConcoursName(pathData[0].concours.name);

      // Fetch archives with their categories
      const { data: archivesData, error: archivesError } = await supabase
        .from('concours_archives')
        .select(`
          *,
          courses_categories (
            id,
            name,
            description
          )
        `)
        .eq('concour_id', pathData[0].concourId);

      if (archivesError) throw archivesError;

      console.log('archivesData', archivesData);
      console.log('archivesError', archivesError);

      // Get unique categories
      const uniqueCategories = ['All', ...new Set(archivesData.map(
        archive => archive.courses_categories?.name
      ).filter(Boolean))];

      setArchives(archivesData);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (archiveId) => {
    try {
      const archive = archives.find(a => a.id === archiveId);
      const { error } = await supabase
        .from('concours_archives')
        .update({ is_pinned: !archive.is_pinned })
        .eq('id', archiveId);

      if (error) throw error;

      // Update local state
      setArchives(archives.map(a => 
        a.id === archiveId ? { ...a, is_pinned: !a.is_pinned } : a
      ));
    } catch (error) {
      console.error('Error updating pin status:', error);
    }
  };

  const filteredArchives = archives.filter(archive => {
    const matchesSearch = archive.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || 
      selectedCategory === 'All' || 
      archive.courses_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
          {concoursName}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.selectedCategoryChip,
              isDark && styles.categoryChipDark,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedCategoryText,
                isDark && styles.textDark,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
          <TextInput
            placeholder="Search archives..."
            placeholderTextColor={isDark ? theme.color.gray[400] : theme.color.gray[600]}
            style={[styles.searchInput, isDark && styles.textDark]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator 
          size="large" 
          color={theme.color.primary[500]} 
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filteredArchives}
          renderItem={({ item }) => (
            <ArchiveCard
              item={item}
              isDark={isDark}
              onPress={() => {/* Handle download */}}
              onPin={handlePin}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBoxDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1A1A1A',
  },
  categoriesScroll: {
    maxHeight: 60,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    marginRight: 8,
    height: 40,
  },
  categoryChipDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  selectedCategoryChip: {
    backgroundColor: theme.color.primary[500],
  },
  categoryText: {
    fontSize: 14,
    color: theme.color.gray[600],
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.color.gray[600],
  },
  metaTextDark: {
    color: theme.color.gray[400],
  },
  pinButton: {
    padding: 4,
  },
  textDark: {
    color: '#FFFFFF',
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ArchivesList;