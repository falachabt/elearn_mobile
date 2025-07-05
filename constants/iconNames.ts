import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Type that extracts the exact type accepted by the 'name' property of MaterialCommunityIcons
export type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Constant object with typed icon names
export const IconNames: Record<string, MaterialIconName> = {
    BELL_OUTLINE: 'bell-outline',
    CALENDAR_CLOCK: 'calendar-clock',
    CLOCK_TIME_FOUR_OUTLINE: 'clock-time-four-outline',
    TEST_TUBE: 'test-tube',
    EMAIL_OUTLINE: 'email-outline',
    VOLUME_HIGH: 'volume-high',
    VIBRATE: 'vibrate',
    THEME_LIGHT_DARK: 'theme-light-dark',
    DATA_MATRIX: 'data-matrix',
    WIFI: 'wifi',
    TRASH_CAN_OUTLINE: 'trash-can-outline',
    ACCOUNT_OUTLINE: 'account-outline',
    LOGOUT: 'logout',
    INFORMATION_OUTLINE: 'information-outline',
    SHIELD_CHECK_OUTLINE: 'shield-check-outline',
    CONTENT_SAVE_OUTLINE: 'content-save-outline',
    CLOSE: 'close',
    CLOCK_OUTLINE: 'clock-outline',
    VIEW_GRID: 'view-grid',
    CHEVRON_RIGHT: 'chevron-right',
    DEVICES: 'devices'
} as const;