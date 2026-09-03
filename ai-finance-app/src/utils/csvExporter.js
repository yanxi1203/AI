// CSV Exporter for Excel Compatibility (UTF-8 with BOM)

export function exportTransactionsToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    alert('目前無可匯出的帳務紀錄！');
    return;
  }

  const headers = ['日期', '類型', '項目名稱', '金額(TWD)', '分類', '情緒標籤', '備註'];
  
  const rows = transactions.map(tx => [
    `"${tx.date}"`,
    `"${tx.type === 'income' ? '收入' : '支出'}"`,
    `"${(tx.title || '').replace(/"/g, '""')}"`,
    tx.amount,
    `"${(tx.category || '').replace(/"/g, '""')}"`,
    `"${(tx.emotion || '').replace(/"/g, '""')}"`,
    `"${(tx.note || '').replace(/"/g, '""')}"`
  ]);

  // UTF-8 BOM (\uFEFF) ensures Excel opens Chinese characters properly without garbled text
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AI_財務管家帳冊帳目_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
