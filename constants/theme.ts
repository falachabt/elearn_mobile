// constant/theme/index.ts


export const theme = {
  color: {
    primary: {
      50: '#f0fce9',
      100: '#dcf9cd',
      200: '#b8f29d',
      300: '#8fe666',
      400: '#6ed638',
      // 500: '#57cc02', // Original primary color
      500: '#4CAF50',
      600: '#45a502',
      700: '#377f02',
      800: '#2c6502',
      900: '#234f02'
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
      small: 5,
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
