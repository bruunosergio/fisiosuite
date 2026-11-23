import {
  calcBmi,
  harrisBenedictBmr,
  mifflinBmr,
  scaleNutrients,
  sumMealTotals,
} from './nutrition.use-case.impl';

describe('nutrition calculations', () => {
  it('Mifflin-St Jeor', () => {
    expect(mifflinBmr('FEMALE', 60, 165, 30)).toBeCloseTo(10 * 60 + 6.25 * 165 - 5 * 30 - 161, 5);
    expect(mifflinBmr('MALE', 80, 180, 30)).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5, 5);
  });

  it('Harris-Benedict', () => {
    expect(harrisBenedictBmr('FEMALE', 60, 165, 30)).toBeCloseTo(
      655.1 + 9.563 * 60 + 1.85 * 165 - 4.676 * 30,
      5,
    );
    expect(harrisBenedictBmr('MALE', 80, 180, 30)).toBeCloseTo(
      66.5 + 13.75 * 80 + 5.003 * 180 - 6.75 * 30,
      5,
    );
  });

  it('IMC = peso / altura(m)^2', () => {
    expect(calcBmi(70, 175)).toBe(22.86);
  });

  it('escala nutrientes por 100g e soma os totais', () => {
    const rice = {
      kcalPer100g: 130,
      carbsPer100g: 28,
      proteinPer100g: 2.7,
      fatPer100g: 0.3,
      fiberPer100g: null,
    };
    const snap = scaleNutrients(rice, 150);
    expect(snap).toEqual({ kcal: 195, carbs: 42, protein: 4.05, fat: 0.45, fiber: 0 });
    const totals = sumMealTotals([
      { items: [{ nutrientsSnapshot: snap } as never, { nutrientsSnapshot: snap } as never] },
    ]);
    expect(totals.kcal).toBe(390);
  });
});
