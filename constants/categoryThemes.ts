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

/**
 * Génère un hash numérique à partir d'une chaîne de caractères
 * Utilise une combinaison d'algorithmes pour garantir une meilleure distribution
 */
function hashString(str: string): number {
    let hash = 0;
    const normalizedStr = str.toLowerCase().trim();
    
    // Algorithme FNV-1a pour une meilleure distribution
    for (let i = 0; i < normalizedStr.length; i++) {
        hash ^= normalizedStr.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    
    return Math.abs(hash);
}

/**
 * Palette de couleurs à utiliser pour les catégories générées
 * Exclut les couleurs déjà utilisées dans CATEGORY_THEMES
 */
const GENERATED_COLOR_PALETTE = [
    { primary: '#DC2626', secondary: '#FCA5A5', cardBg: '#991B1B' }, // Rouge vif
    { primary: '#EA580C', secondary: '#FDBA74', cardBg: '#C2410C' }, // Orange foncé
    { primary: '#CA8A04', secondary: '#FDE047', cardBg: '#A16207' }, // Jaune doré
    { primary: '#16A34A', secondary: '#86EFAC', cardBg: '#15803D' }, // Vert émeraude
    { primary: '#0891B2', secondary: '#67E8F9', cardBg: '#0E7490' }, // Cyan
    { primary: '#4F46E5', secondary: '#A78BFA', cardBg: '#4338CA' }, // Indigo
    { primary: '#7C3AED', secondary: '#C4B5FD', cardBg: '#6D28D9' }, // Violet
    { primary: '#DB2777', secondary: '#F9A8D4', cardBg: '#BE185D' }, // Rose
    { primary: '#059669', secondary: '#6EE7B7', cardBg: '#047857' }, // Vert menthe
    { primary: '#0284C7', secondary: '#7DD3FC', cardBg: '#0369A1' }, // Bleu ciel
    { primary: '#7E22CE', secondary: '#D8B4FE', cardBg: '#6B21A8' }, // Pourpre
    { primary: '#BE123C', secondary: '#FDA4AF', cardBg: '#9F1239' }, // Rose foncé
    { primary: '#65A30D', secondary: '#BEF264', cardBg: '#4D7C0F' }, // Vert lime
    { primary: '#0D9488', secondary: '#5EEAD4', cardBg: '#0F766E' }, // Teal
    { primary: '#2563EB', secondary: '#93C5FD', cardBg: '#1E40AF' }, // Bleu royal
    { primary: '#7C2D12', secondary: '#FED7AA', cardBg: '#92400E' }, // Brun
    { primary: '#BE185D', secondary: '#FBCFE8', cardBg: '#9F1239' }, // Fuchsia
    { primary: '#C026D3', secondary: '#F0ABFC', cardBg: '#A21CAF' }, // Magenta
    { primary: '#0369A1', secondary: '#BAE6FD', cardBg: '#075985' }, // Bleu océan
    { primary: '#B91C1C', secondary: '#FECACA', cardBg: '#7F1D1D' }, // Rouge bordeaux
];

/**
 * Liste des icônes disponibles pour les catégories générées
 */
const GENERATED_ICONS = [
    'book',
    'book-open',
    'book-education',
    'bookshelf',
    'school',
    'notebook',
    'script',
    'file-document',
    'clipboard-text',
    'lightbulb',
    'brain',
    'thought-bubble',
];

/**
 * Génère un thème de catégorie unique et cohérent basé sur le nom de la catégorie
 * @param categoryName - Le nom de la catégorie
 * @returns Un thème de catégorie généré de manière déterministe
 */
export function generateCategoryTheme(categoryName: string): CategoryTheme {
    const hash = hashString(categoryName || 'default');
    
    // Sélectionner une couleur de la palette basée sur le hash
    const colorIndex = hash % GENERATED_COLOR_PALETTE.length;
    const colors = GENERATED_COLOR_PALETTE[colorIndex];
    
    // Sélectionner une icône basée sur le hash
    const iconIndex = hash % GENERATED_ICONS.length;
    const icon = GENERATED_ICONS[iconIndex];
    
    return {
        primary: colors.primary,
        secondary: colors.secondary,
        cardBg: colors.cardBg,
        icon: icon,
    };
}

/**
 * Obtient le thème d'une catégorie (prédéfini ou généré)
 * @param categoryName - Le nom de la catégorie
 * @returns Le thème de la catégorie
 */
export function getCategoryTheme(categoryName: string | null | undefined): CategoryTheme {
    if (!categoryName) {
        return DEFAULT_THEME;
    }
    
    // Vérifier si la catégorie a un thème prédéfini
    if (CATEGORY_THEMES[categoryName]) {
        return CATEGORY_THEMES[categoryName];
    }
    
    // Sinon, générer un thème basé sur le nom
    return generateCategoryTheme(categoryName);
}