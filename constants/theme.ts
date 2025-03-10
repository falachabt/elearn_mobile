// constant/theme/index.ts


export const theme = {
  color: {
    primary: {
      50: '#f1f9f7',
      100: '#dcf1ec',
      200: '#b8e4d8',
      300: '#8fd2c1',
      400: '#6ebba5',
      // 500: '#57cc02', // Original primary color
      // 500: '#4CAF50',
      500: '#059669',
      600: '#04775a',
      700: '#035c46',
      800: '#024a38',
      900: '#01382a'
    },
    dark: {
      background: {
        primary: '#0F172A',    // Dark blue background
        secondary: '#1E293B',  // Slightly lighter blue
        tertiary: '#334155',   // Even lighter blue for cards
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E2E8F0',
        tertiary: '#94A3B8',
      },
      border: '#334155',
    },
    light: {
      background: {
        primary: '#FFFFFF',
        secondary: '#F9FAFB',
        tertiary: '#F3F4F6',
      },
      text: {
        primary: '#111827',
        secondary: '#374151',
        tertiary: '#6B7280',
      },
      border: '#E5E7EB',
    },
    gray: {
      50: '#f9f9f9',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    // error, warning, success, danger colors
    error: '#ff4d4f',
    success: '#52c41a',
    warning: '#faad14', 
    danger: '#ff4d4f',
    background: '#f5f5f5',
    text: '#333',
    link: '#1677ff',
    linkHover: '#125bb5',
    border: '#ddd',
    icon: '#333',
  },
  border: {
    radius: {
      small: 6,
      medium: 10,
      large: 25,
    },
    width: {
      thin: 1,
      medium: 2,
      thick: 3,
    },
  },
  icon: {
    size: {
      small: 16,
      medium: 24,
      large: 32,
    },
    color: '#333',
  },
  typography: {
    fontSize: {
      small: 12,
      medium: 16,
      large: 20,
      xlarge: 24,
    },
    fontWeight: {
      light: '200',
      regular: '400',
      bold: "700",
    },
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
    xlarge: 32,
  },
  link: {
    textDecoration: 'underline',
    hover: {
      textDecoration: 'none',
      color: '#125bb5',
    },
  },
  button: {
    primary: {
      backgroundColor: '#1677ff',
      color: '#fff',
      borderRadius: 25,
      padding: 16,
    },
    secondary: {
      backgroundColor: '#fff',
      color: '#1677ff',
      borderRadius: 25,
      padding: 16,
      borderWidth: 1,
      borderColor: '#1677ff',
    },
  },
};
