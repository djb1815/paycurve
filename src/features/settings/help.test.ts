import { describe, expect, it } from 'vitest';

import { defaultHelpTopics } from './help';

describe('defaultHelpTopics', () => {
  it('covers every required planning topic with static official guidance', () => {
    const topicIds = defaultHelpTopics.map((topic) => topic.id);

    expect(topicIds).toEqual(
      expect.arrayContaining([
        'adjusted-net-income',
        'target-and-threshold',
        'personal-allowance-taper',
        'salary-and-bonus-sacrifice',
        'pension-tax-relief',
        'gift-aid',
        'taxable-income-details',
        'pension-annual-allowance',
        'forecast-and-actual',
        'paye-and-cash',
      ]),
    );
    for (const topic of defaultHelpTopics) {
      expect(topic.links.length).toBeGreaterThan(0);
      for (const link of topic.links) {
        expect(link.href).toMatch(/^https:\/\/www\.gov\.uk\//);
        expect(link.href).not.toContain('?');
      }
    }
  });
});
