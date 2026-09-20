import { describe, expect, it } from 'vitest';

import { createPlannerStoreState, DEFAULT_PLANNER_PLAN } from '../state';
import { resolveTaxYear } from '../tax/config';

import { equityFieldDetails, equityFieldId, inputForm } from './input-adapters';

const dependencies = { resolveTaxYear, curvePointCount: 6 };

describe('inputForm equity events', () => {
  it('keeps multiple imported vest events separate with stable event-id field ids', () => {
    const state = createPlannerStoreState(
      {
        ...DEFAULT_PLANNER_PLAN,
        facts: {
          ...DEFAULT_PLANNER_PLAN.facts,
          equityIncome: [
            {
              id: 'imported/first:vest',
              amount: 123_400,
              certainty: 'actual',
              label: 'First imported vest',
              vestDate: '2026-06-15',
            },
            {
              id: 'imported-second',
              amount: 567_800,
              certainty: 'forecast',
            },
          ],
        },
      },
      dependencies,
    );

    const form = inputForm(state, 'current', {});
    const fields = form.sections[0]?.fields ?? [];
    const firstAmountId = equityFieldId('imported/first:vest', 'amount');
    const secondAmountId = equityFieldId('imported-second', 'amount');

    expect(fields.find((field) => field.id === firstAmountId)).toMatchObject({
      label: 'RSU and share income 1',
      value: '1234',
      status: 'actual',
    });
    expect(fields.find((field) => field.id === secondAmountId)).toMatchObject({
      label: 'RSU and share income 2',
      value: '5678',
      status: 'forecast',
    });
    expect(
      fields.find(
        (field) => field.id === equityFieldId('imported/first:vest', 'label'),
      )?.value,
    ).toBe('First imported vest');
    expect(
      fields.find(
        (field) =>
          field.id === equityFieldId('imported/first:vest', 'vest-date'),
      )?.value,
    ).toBe('2026-06-15');
    expect(equityFieldDetails(firstAmountId)).toEqual({
      eventId: 'imported/first:vest',
      field: 'amount',
    });
  });
});
