import React, { useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet, TextInput, View, useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import {ProgramCard} from '../ProgramCard';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/hooks/useCart';

interface Program {
  id: number;
  price: number;
  learning_path: {
    title: string;
    description: string;
    course_count: number;
    quiz_count: number;
    status: string;
    duration: string;
    image: {
        src: string;
    };
  };
  concour: {
    name: string;
    schoolId: string;
  };
}

interface ProgramsProps {
  knowsProgram: boolean;
  selectedPrograms: any[],
  setSelectedPrograms: React.Dispatch<React.SetStateAction<number[]>>
}

const Programs: React.FC<ProgramsProps> = ({ knowsProgram, selectedPrograms, setSelectedPrograms }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [programs, setPrograms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const { addToCart, removeFromCart } = useCart();

  useEffect(() => {
    async function fetchPrograms() {
      const { data, error } = await supabase
        .from("concours_learningpaths")
        .select("*, concour:concours(*), learning_path:learning_paths(id, title, description, course_count, quiz_count, status, duration, image)");

      if (error) {
        console.error(error);
      } else {
        setPrograms(data);
      }
    }

    fetchPrograms();
  }, []);

  useEffect(() => {
    const selectedProgramDetails = programs?.filter(program => selectedPrograms?.includes(program?.id));
    const total = selectedProgramDetails?.reduce((sum, program) => sum + program?.price, 0);
    setTotalPrice(total);
  }, [selectedPrograms, programs]);

  const handleProgramSelect = async (program: Program) => {
    try {
      if (selectedPrograms?.includes(program?.id)) {
        setSelectedPrograms(prev => prev.filter(id => id !== program?.id));
        await removeFromCart(program?.id);
      } else {
        setSelectedPrograms(prev => [...prev, program?.id]);
        await addToCart(program?.id, program?.price);
      }
    } catch (error) {
      console.error('Error managing cart:', error);
    }
  };

  const filteredPrograms = programs?.filter(program =>
    program?.learning_path.title?.toLowerCase()?.includes(searchQuery?.toLowerCase())
  );

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800} 
      style={[
        styles.programsContainer,
        isDark && styles.programsContainerDark
      ]}
    >
      <TextInput
        style={[
          styles.searchInput,
          isDark && styles.searchInputDark
        ]}
        placeholder="Rechercher des programmes..."
        placeholderTextColor={isDark ? theme.color.gray[400] : theme.color.gray[500]}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[
          styles.programsTitle,
          isDark && styles.programsTitleDark
        ]}>
          {knowsProgram ? "Choisissez votre programme" : "Programmes recommandés pour vous"}
        </Text>
        {filteredPrograms.map((program: Program, index: number) => (
          <ProgramCard
            key={index}
            title={program.learning_path.title}
            description={program.learning_path.description}
            price={program.price}
            features={[
              `Cours: ${program.learning_path.course_count}`,
              `Quiz: ${program.learning_path.quiz_count}`,
              `Concours: ${program.concour.name}`,
              `École: ${program.concour.schoolId}`,
            ]}
            level={program.learning_path.status}
            duration={program.learning_path.duration}
            image={program.learning_path.image?.src}
            courseCount={program.learning_path.course_count}
            quizCount={program.learning_path.quiz_count}
            concoursName={program.concour.name}
            schoolName={program.concour.schoolId}
            isSelected={selectedPrograms?.includes(program.id)}
            onSelect={() => handleProgramSelect(program)}
            isDark={isDark}
          />
        ))}
      </ScrollView>
      <View style={[
        styles.totalPriceContainer,
        isDark && styles.totalPriceContainerDark
      ]}>
        <Text style={[
          styles.totalPriceText,
          isDark && styles.totalPriceTextDark
        ]}>
          Total : {totalPrice} FCFA
        </Text>
      </View>
    </Animatable.View>
  );
};

export default Programs;

const styles = StyleSheet.create({
  programsContainer: {
    flex: 1,
    // backgroundColor: theme.color.background,
  },
  programsContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  programsTitle: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: "700",
    marginBottom: theme.spacing.large,
    color: theme.color.text,
  },
  programsTitleDark: {
    color: theme.color.gray[50],
  },
  searchInput: {
    height: 40,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: theme.spacing.small,
    marginBottom: theme.spacing.medium,
    backgroundColor: theme.color.gray[50],
    color: theme.color.text,
  },
  searchInputDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
    color: theme.color.gray[50],
  },
  totalPriceContainer: {
    padding: theme.spacing.medium,
    borderTopWidth: 1,
    borderColor: theme.color.border,
  },
  totalPriceContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  totalPriceText: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: "600",
    color: theme.color.text,
  },
  totalPriceTextDark: {
    color: theme.color.gray[50],
  },
});