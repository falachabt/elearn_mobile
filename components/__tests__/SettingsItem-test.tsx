import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { SettingsItem } from '../settings/SettingsItem';

import { HapticType } from '@/hooks/useHaptics';

const mockTrigger = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text: MockText } = require('react-native');

    return <MockText>{name}</MockText>;
  },
}));

jest.mock('@/hooks/useHaptics', () => ({
  HapticType: {
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    SELECTION: 'selection',
  },
  useHaptics: () => ({
    trigger: mockTrigger,
  }),
}));

describe('SettingsItem', () => {
  beforeEach(() => {
    mockTrigger.mockClear();
  });

  it('renders a switch when onToggle is provided', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <SettingsItem
          icon="bell-outline"
          title="Notifications"
          subtitle="Active ou desactive les notifications"
          value
          onToggle={jest.fn()}
          isDark={false}
        />
      );
    });

    const switchNode = tree!.root.findAll(
      node => typeof node.props.onValueChange === 'function' && typeof node.props.value === 'boolean'
    )[0];

    expect(switchNode.props.value).toBe(true);
  });

  it('triggers haptics and the press callback when pressed', () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <SettingsItem
          icon="account-outline"
          title="Mon profil"
          subtitle="Modifie tes informations"
          onPress={onPress}
          isDark={false}
        />
      );
    });

    act(() => {
      const pressable = tree!.root.findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.onValueChange === undefined &&
          node.props.icon === undefined &&
          node.props.title === undefined
      )[0];

      pressable.props.onPress();
    });

    expect(mockTrigger).toHaveBeenCalledWith(HapticType.LIGHT);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
