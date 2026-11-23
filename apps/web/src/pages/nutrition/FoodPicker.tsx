import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Input, Spinner } from '../../components/ui';
import { searchFoods } from '../../lib/queries';
import type { FoodItem } from '../../lib/types';
import { fmt, sourceTone } from './utils';

export default function FoodPicker({
  onSelect,
  placeholder = 'Buscar alimento (TACO/TBCA)...',
  autoFocus,
}: {
  onSelect: (food: FoodItem) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  const query = useQuery({
    queryKey: ['nutrition', 'foods', debounced],
    queryFn: () => searchFoods(debounced, 12),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  return (
    <div className="relative">
      <Input
        value={text}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && debounced.length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full min-w-[22rem] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {query.isLoading ? (
            <div className="flex justify-center p-3">
              <Spinner />
            </div>
          ) : !query.data?.length ? (
            <p className="p-3 text-sm text-slate-400">Nenhum alimento encontrado.</p>
          ) : (
            query.data.map((food) => (
              <button
                type="button"
                key={food.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(food);
                  setText('');
                  setDebounced('');
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-800">{food.name}</span>
                  <span className="block text-xs text-slate-400">
                    {fmt(food.kcalPer100g, 0)} kcal · C {fmt(food.carbsPer100g)} · P {fmt(food.proteinPer100g)} · G{' '}
                    {fmt(food.fatPer100g)} (100 g)
                  </span>
                </span>
                <Badge tone={sourceTone(food.source)}>{food.source}</Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
