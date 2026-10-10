// components/shared/feed/__tests__/PollBlock.test.tsx
// Rendu du sondage : date de révélation, mise en évidence de la bonne réponse,
// explication, et masquage des résultats avant le vote.
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { PollBlock } from '../PollBlock';

/** Tous les textes rendus, concaténés, pour des assertions lisibles. */
const textsOf = (tree: renderer.ReactTestRenderer): string => {
  const out: string[] = [];
  const walk = (node: renderer.ReactTestInstance | string) => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    (node.children ?? []).forEach(walk);
  };
  tree.root.children.forEach(walk);
  return out.filter(Boolean).join(' | ');
};

const render = async (ui: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    // Le type des éléments JSX de @types/react 19 n'est pas celui qu'attend
    // react-test-renderer 19 : on passe l'élément tel quel à l'exécution.
    tree = renderer.create(ui as never);
  });
  return tree;
};

const baseOptions = [
  { id: 'o1', label: 'Paris', votes_count: 0, is_mine: false, is_correct: null },
  { id: 'o2', label: 'Lyon', votes_count: 0, is_mine: false, is_correct: null },
];

const REVEAL_FUTURE = '2099-10-12T12:00:00.000Z';
const REVEAL_PAST = '2020-10-12T12:00:00.000Z';

describe('PollBlock', () => {
  it('affiche la date de révélation et masque les résultats avant le vote', async () => {
    const tree = await render(
      <PollBlock
        options={baseOptions}
        totalVotes={0}
        votedOptionId={null}
        onVote={jest.fn()}
        revealAt={REVEAL_FUTURE}
      />
    );

    const texts = textsOf(tree);
    expect(texts).toContain('Correction révélée le');
    expect(texts).toContain('Vote pour voir les résultats');
    expect(texts).not.toContain('Bonne réponse');
    expect(texts).not.toContain('%');
    expect(texts).not.toContain('La correction vient');
    await act(async () => tree.unmount());
  });

  it('met en évidence la bonne réponse et l\'explication après la révélation', async () => {
    const tree = await render(
      <PollBlock
        options={[
          { id: 'o1', label: 'Paris', votes_count: 3, is_mine: false, is_correct: false },
          { id: 'o2', label: 'Lyon', votes_count: 7, is_mine: true, is_correct: true },
        ]}
        totalVotes={10}
        votedOptionId="o2"
        onVote={jest.fn()}
        revealAt={REVEAL_PAST}
        revealed
        resultsVisible
        explanation="Lyon est la bonne réponse."
      />
    );

    const texts = textsOf(tree);

    expect(texts).toContain("La correction vient d'être révélée");
    expect(texts).toContain('Bonne réponse');
    // Les pourcentages sont rendus en deux nœuds texte (« 30 » puis « % »)
    expect(texts).toContain('Paris | 30 | %');
    expect(texts).toContain('70 | %');
    expect(texts).toContain('10 votes');
    expect(texts).toContain('Lyon est la bonne réponse.');
    expect(texts).toContain('Révélée le');
    await act(async () => tree.unmount());
  });

  it('reconnaît la révélation à l\'horloge si le serveur ne l\'a pas encore dit', async () => {
    const tree = await render(
      <PollBlock
        options={[
          { id: 'o1', label: 'Paris', votes_count: 1, is_mine: false, is_correct: false },
          { id: 'o2', label: 'Lyon', votes_count: 4, is_mine: false, is_correct: true },
        ]}
        totalVotes={5}
        votedOptionId={null}
        onVote={jest.fn()}
        revealAt={REVEAL_PAST}
        resultsVisible={false}
      />
    );

    const texts = textsOf(tree);
    expect(texts).toContain("La correction vient d'être révélée");
    expect(texts).toContain('Bonne réponse');
    expect(texts).toContain('Seuls ceux qui ont voté voient les résultats');
    expect(texts).toContain('La bonne réponse est mise en évidence ci-dessus.');
    await act(async () => tree.unmount());
  });

  it('ne parle pas de correction pour un sondage sans date de révélation', async () => {
    const tree = await render(
      <PollBlock
        options={baseOptions}
        totalVotes={0}
        votedOptionId={null}
        onVote={jest.fn()}
      />
    );

    const texts = textsOf(tree);
    expect(texts).not.toContain('Correction');
    expect(texts).not.toContain('Révélée');
    expect(texts).toContain('Vote pour voir les résultats');
    await act(async () => tree.unmount());
  });
});
