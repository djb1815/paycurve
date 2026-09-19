/** Download an explicitly user-requested local plan export without transmission. */
export function downloadPlanExport(json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'paycurve-plan.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
