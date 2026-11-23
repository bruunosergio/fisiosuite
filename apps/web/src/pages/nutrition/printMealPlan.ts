import type { MealPlanDetail } from '../../lib/types';
import { decodeSubNotes, fmt } from './utils';

const MODE_LABEL = {
  QUANTITATIVE: 'Quantitativo',
  EQUIVALENTS: 'Equivalentes',
  QUALITATIVE: 'Qualitativo',
} as const;

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PrintContext = {
  patientName: string;
  professionalName: string;
  council?: string;
  clinicName?: string;
};

/** Opens a print-friendly window (user saves as PDF through the browser print dialog). */
export function printMealPlan(plan: MealPlanDetail, ctx: PrintContext): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;

  const totals = plan.calculatedTotals;
  const showNumbers = plan.mode !== 'QUALITATIVE';

  const meals = plan.meals
    .map((meal) => {
      const mealKcal = meal.items.reduce((s, i) => s + i.nutrientsSnapshot.kcal, 0);
      const rows = meal.items
        .map((item) => {
          const subs = item.substitutions.length
            ? `<div class="subs"><strong>Substituições:</strong><ul>${item.substitutions
                .map((s) => {
                  const d = decodeSubNotes(s.notes);
                  return `<li>${esc(d.name)} — ${esc(fmt(s.quantity, 2))} ${esc(s.measureLabel)}${
                    s.grams ? ` (${esc(fmt(s.grams, 0))} g)` : ''
                  }${d.notes ? ` <em>· ${esc(d.notes)}</em>` : ''}</li>`;
                })
                .join('')}</ul></div>`
            : '';
          return `<tr>
            <td>${esc(item.customLabel ?? 'Alimento')}${subs}</td>
            <td class="num">${esc(fmt(item.quantity, 2))} ${esc(item.measureLabel)}${
              item.grams ? `<br/><small>${esc(fmt(item.grams, 0))} g</small>` : ''
            }</td>
            ${showNumbers ? `<td class="num">${esc(fmt(item.nutrientsSnapshot.kcal, 0))}</td>` : ''}
          </tr>`;
        })
        .join('');
      return `<section class="meal">
        <h3>${esc(meal.scheduledTime ? `${meal.scheduledTime} — ` : '')}${esc(meal.name)}${
          showNumbers ? `<span class="kcal">${esc(fmt(mealKcal, 0))} kcal</span>` : ''
        }</h3>
        ${meal.notes ? `<p class="notes">${esc(meal.notes)}</p>` : ''}
        <table>
          <thead><tr><th>Alimento</th><th class="num">Quantidade</th>${showNumbers ? '<th class="num">kcal</th>' : ''}</tr></thead>
          <tbody>${rows || '<tr><td colspan="3"><em>Sem itens</em></td></tr>'}</tbody>
        </table>
      </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(plan.title)} — ${esc(ctx.patientName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; font-size: 13px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { display: flex; gap: 10px; align-items: center; }
  .logo { width: 38px; height: 38px; border-radius: 8px; background: #0d9488; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .brand h1 { font-size: 18px; margin: 0; }
  .brand p { margin: 2px 0 0; color: #64748b; font-size: 12px; }
  .meta { text-align: right; color: #475569; font-size: 12px; line-height: 1.5; }
  h2 { font-size: 20px; margin: 0 0 4px; }
  .objective { color: #475569; margin: 0 0 14px; }
  .summary { display: flex; gap: 12px; margin: 12px 0 20px; flex-wrap: wrap; }
  .summary div { background: #f1f5f9; border-radius: 8px; padding: 8px 12px; min-width: 90px; }
  .summary small { display: block; color: #64748b; font-size: 11px; }
  .summary strong { font-size: 15px; }
  .meal { margin-bottom: 16px; page-break-inside: avoid; }
  .meal h3 { font-size: 14px; margin: 0 0 6px; background: #ccfbf1; color: #115e59; padding: 6px 10px; border-radius: 6px; display: flex; justify-content: space-between; }
  .meal .kcal { font-weight: 500; font-size: 12px; }
  .notes { margin: 0 0 6px; color: #475569; font-style: italic; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 4px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .subs { margin-top: 4px; font-size: 12px; color: #475569; }
  .subs ul { margin: 2px 0 0; padding-left: 18px; }
  .general { margin-top: 18px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; white-space: pre-wrap; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; display: flex; justify-content: space-between; }
  .sign { margin-top: 40px; text-align: center; }
  .sign div { display: inline-block; border-top: 1px solid #0f172a; padding-top: 4px; min-width: 260px; }
  @media print { body { padding: 0; } .noprint { display: none; } @page { margin: 14mm; } }
  .noprint { margin-bottom: 14px; }
  .noprint button { padding: 8px 14px; border-radius: 6px; border: 1px solid #0d9488; background: #0d9488; color: #fff; cursor: pointer; }
</style>
</head>
<body>
  <div class="noprint"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
  <header>
    <div class="brand">
      <div class="logo">FS</div>
      <div>
        <h1>${esc(ctx.clinicName ?? 'FisioSuite Nutrição')}</h1>
        <p>Plano alimentar</p>
      </div>
    </div>
    <div class="meta">
      <div><strong>Paciente:</strong> ${esc(ctx.patientName)}</div>
      <div><strong>Data:</strong> ${esc(new Date(plan.createdAt).toLocaleDateString('pt-BR'))}</div>
      <div><strong>Modo:</strong> ${esc(MODE_LABEL[plan.mode] ?? plan.mode)}</div>
    </div>
  </header>

  <h2>${esc(plan.title)}</h2>
  ${plan.objective ? `<p class="objective">${esc(plan.objective)}</p>` : ''}

  ${
    showNumbers && totals
      ? `<div class="summary">
          <div><small>Energia</small><strong>${esc(fmt(totals.kcal, 0))} kcal</strong></div>
          <div><small>Carboidratos</small><strong>${esc(fmt(totals.carbs, 0))} g</strong></div>
          <div><small>Proteínas</small><strong>${esc(fmt(totals.protein, 0))} g</strong></div>
          <div><small>Gorduras</small><strong>${esc(fmt(totals.fat, 0))} g</strong></div>
          <div><small>Fibras</small><strong>${esc(fmt(totals.fiber, 0))} g</strong></div>
          ${plan.targetKcal ? `<div><small>Meta</small><strong>${esc(fmt(plan.targetKcal, 0))} kcal</strong></div>` : ''}
        </div>`
      : ''
  }

  ${meals}

  ${plan.generalNotes ? `<div class="general"><strong>Orientações gerais</strong><br/>${esc(plan.generalNotes)}</div>` : ''}

  <div class="sign"><div>${esc(ctx.professionalName)}${ctx.council ? `<br/>${esc(ctx.council)}` : ''}</div></div>

  <footer>
    <span>Gerado por FisioSuite — módulo Nutrição</span>
    <span>${esc(new Date().toLocaleString('pt-BR'))}</span>
  </footer>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
