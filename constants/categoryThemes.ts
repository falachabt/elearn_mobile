// Category themes for course cards

// Define the theme structure
export interface CategoryTheme {
    primary: string;
    secondary: string;
    cardBg: string;
    icon: string;
}

// Categories color themes
export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
    'Anglais': {
        primary: '#1E3A8A',
        secondary: '#3B82F6',
        cardBg: '#1D4ED8',
        icon: 'book-alphabet'
    },
    'Mathématiques': {
        primary: '#3B82F6',
        secondary: '#93C5FD',
        cardBg: '#1E40AF',
        icon: 'function'
    },
    'Biologie': {
        primary: '#10B981',
        secondary: '#6EE7B7',
        cardBg: '#059669',
        icon: 'dna'
    },
    'Chimie': {
        primary: '#8B5CF6',
        secondary: '#C4B5FD',
        cardBg: '#5B21B6',
        icon: 'flask'
    },
    'Physique': {
        primary: '#EC4899',
        secondary: '#F9A8D4',
        cardBg: '#BE185D',
        icon: 'atom'
    },
    'Informatique': {
        primary: '#6366F1',
        secondary: '#A5B4FC',
        cardBg: '#4338CA',
        icon: 'code-tags'
    },
    'Histoire': {
        primary: '#F59E0B',
        secondary: '#FCD34D',
        cardBg: '#D97706',
        icon: 'book-open-page-variant'
    },
    'Géographie': {
        primary: '#14B8A6',
        secondary: '#5EEAD4',
        cardBg: '#0F766E',
        icon: 'earth'
    }
};

// Default theme for categories not in the list
export const DEFAULT_THEME: CategoryTheme = {
    primary: '#6B7280',
    secondary: '#E5E7EB',
    cardBg: '#4B5563',
    icon: 'book-education'
};