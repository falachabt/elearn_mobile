import React, { useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import ProgramCard from '../ProgramCard';
import { supabase } from '@/lib/supabase';

interface Program {
  id: string;
  price: number;
  learning_path: {
    title: string;
    description: string;
    course_count: number;
    quiz_count: number;
    status: string;
    duration: string;
    image: string;
  };
  concour: {
    name: string;
    schoolId: string;
  };
}

interface ProgramsProps {
  knowsProgram: boolean;
  selectedPrograms: any[],
  setSelectedPrograms: React.Dispatch<React.SetStateAction<string[]>>
}

const Programs: React.FC<ProgramsProps> = ({ knowsProgram, selectedPrograms, setSelectedPrograms }) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);

  useEffect(() => {
    async function fetchPrograms() {
      const { data, error } = await supabase
        .from("concours_learningpaths")
        .select("*, concour:concours(*), learning_path:learning_paths(*)");

      if (error) {
        console.error(error);
      } else {
        setPrograms(data);
      }
    }

    fetchPrograms();
  }, []);

  useEffect(() => {
    const selectedProgramDetails = programs.filter(program => selectedPrograms.includes(program.id));
    const total = selectedProgramDetails.reduce((sum, program) => sum + program.price, 0);
    setTotalPrice(total);
  }, [selectedPrograms, programs]);

  const filteredPrograms = programs.filter(program =>
    program.learning_path.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Animatable.View animation="fadeInUp" duration={800} style={styles.programsContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search programs..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.programsTitle}>
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
            image={program.learning_path.image}
            courseCount={program.learning_path.course_count}
            quizCount={program.learning_path.quiz_count}
            concoursName={program.concour.name}
            schoolName={program.concour.schoolId}
            isSelected={selectedPrograms.includes(program.id)}
            onSelect={() => setSelectedPrograms((old: string[]) => {
              if (old.includes(program.id)) {
                return old.filter(id => id != program.id);
              } else {
                return [...old, program.id];
              }
            })}
          />
        ))}
      </ScrollView>
      <View style={styles.totalPriceContainer}>
        <Text style={styles.totalPriceText}>Total :  {totalPrice} FCFA</Text>
      </View>
    </Animatable.View>
  );
};

export default Programs;

const styles = StyleSheet.create({
  programsContainer: {
    flex: 1,
    // padding: theme.spacing.medium
  },
  programsTitle: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: "700",
    marginBottom: theme.spacing.large,
    color: theme.color.text,
  },
  searchInput: {
    height: 40,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: theme.spacing.small,
    marginBottom: theme.spacing.medium,
  },
  totalPriceContainer: {
    padding: theme.spacing.medium,
    borderTopWidth: 1,
    borderColor: theme.color.border,
  },
  totalPriceText: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: "600",
    color: theme.color.text,
  },
});