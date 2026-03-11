import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text: MockText } = require('react-native');

    return <MockText>{name}</MockText>;
  },
}));

jest.mock('../shared/news/NewsItem', () => ({
  __esModule: true,
  default: ({ news }: { news: { title: string } }) => {
    const { Text: MockText } = require('react-native');

    return <MockText>{news.title}</MockText>;
  },
}));

import NewsList from '../shared/news/NewsList';

import type { News } from '@/types/news.type';

const newsItems: News[] = [
  {
    id: 'news-1',
    title: 'Nouvelle 1',
    subtitle: 'Sous titre',
    description: 'Description 1',
    media_type: 'none',
    start_date: '2026-03-11T00:00:00.000Z',
    created_at: '2026-03-11T00:00:00.000Z',
    updated_at: '2026-03-11T00:00:00.000Z',
    priority: 1,
    display_order: 1,
    status: 'published',
    action_type: 'none',
    target_audience: 'all',
    is_featured: false,
    show_badge: false,
    card_style: 'default',
    view_count: 0,
    click_count: 0,
    share_count: 0,
    require_authentication: false,
    show_for_new_users_only: false,
  },
  {
    ...{
      id: 'news-2',
      title: 'Nouvelle 2',
      subtitle: 'Sous titre 2',
      description: 'Description 2',
      media_type: 'none',
      start_date: '2026-03-11T00:00:00.000Z',
      created_at: '2026-03-11T00:00:00.000Z',
      updated_at: '2026-03-11T00:00:00.000Z',
      priority: 2,
      display_order: 2,
      status: 'published',
      action_type: 'none',
      target_audience: 'all',
      is_featured: false,
      show_badge: false,
      card_style: 'default',
      view_count: 0,
      click_count: 0,
      share_count: 0,
      require_authentication: false,
      show_for_new_users_only: false,
    },
  },
];

describe('NewsList', () => {
  it('renders a list with the provided news items and refresh control', () => {
    const onRefresh = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <NewsList news={newsItems} userId="user-1" onRefresh={onRefresh} />
      );
    });

    const flatList = tree!.root.findAll(
      node => Array.isArray(node.props.data) && node.props.refreshControl
    )[0];
    expect(flatList.props.data).toHaveLength(2);
    expect(flatList.props.refreshControl).toBeDefined();

    act(() => {
      flatList.props.refreshControl.props.onRefresh();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state when no news is available', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<NewsList news={[]} userId="user-1" isLoading={false} />);
    });

    const textContent = tree!.root.findAllByType(require('react-native').Text).map(node => node.props.children).flat();
    expect(textContent).toContain('Aucune actualité');
  });
});
