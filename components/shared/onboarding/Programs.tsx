import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import ProgramCard from '../ProgramCard';
import { supabase } from '@/lib/supabase';

interface ProgramsProps {
  knowsProgram: boolean;
}

const Programs: React.FC<ProgramsProps> = ({ knowsProgram }) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
        {filteredPrograms.map((program, index) => (
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
            onSelect={() => console.log(`Selected ${program.learning_path.title}`)}
          />
        ))}
      </ScrollView>
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
});