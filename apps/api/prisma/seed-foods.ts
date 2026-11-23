import { FoodSource, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

type SeedFood = {
  name: string;
  category?: string;
  source: 'TACO' | 'TBCA';
  sourceCode: string;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  measures?: { label: string; grams: number }[];
};

/** Idempotent: inserts global foods (clinicId null) missing by source + sourceCode. */
export async function seedFoods(prisma: PrismaClient): Promise<{ created: number; skipped: number }> {
  const file = join(__dirname, 'data', 'foods-taco-tbca-subset.json');
  const foods = JSON.parse(readFileSync(file, 'utf-8')) as SeedFood[];

  let created = 0;
  let skipped = 0;

  for (const food of foods) {
    const source = FoodSource[food.source];
    const existing = await prisma.foodItem.findFirst({
      where: { clinicId: null, source, sourceCode: food.sourceCode },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.foodItem.create({
      data: {
        id: randomUUID(),
        clinicId: null,
        source,
        sourceCode: food.sourceCode,
        name: food.name,
        category: food.category ?? null,
        kcalPer100g: food.kcalPer100g,
        carbsPer100g: food.carbsPer100g,
        proteinPer100g: food.proteinPer100g,
        fatPer100g: food.fatPer100g,
        fiberPer100g: food.fiberPer100g ?? null,
        measures: {
          create: (food.measures ?? []).map((m) => ({
            id: randomUUID(),
            label: m.label,
            grams: m.grams,
          })),
        },
      },
    });
    created += 1;
  }

  console.log(`Alimentos: ${created} criados, ${skipped} já existiam (total no arquivo: ${foods.length}).`);
  return { created, skipped };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedFoods(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
