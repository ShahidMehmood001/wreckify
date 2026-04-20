interface ReportData {
  scan: any;
  vehicle: any;
  detectedParts: any[];
  costEstimate: any;
  generatedAt: string;
  type: 'standard' | 'insurance';
}

export function generateReportHtml(data: ReportData): string {
  const { scan, vehicle, detectedParts, costEstimate, generatedAt, type } = data;

  const partsRows = detectedParts
    .map(
      (p) => `
      <tr>
        <td>${p.partName.replace(/_/g, ' ')}</td>
        <td><span class="badge badge-${p.severity.toLowerCase()}">${p.severity}</span></td>
        <td>${(p.confidenceScore * 100).toFixed(1)}%</td>
        <td>${p.description || '—'}</td>
      </tr>`,
    )
    .join('');

  const lineItemRows = costEstimate?.lineItems
    ? (costEstimate.lineItems as any[])
        .map(
          (item) => `
      <tr>
        <td>${item.part.replace(/_/g, ' ')}</td>
        <td>PKR ${Number(item.parts_min).toLocaleString()} – ${Number(item.parts_max).toLocaleString()}</td>
        <td>PKR ${Number(item.labor_min).toLocaleString()} – ${Number(item.labor_max).toLocaleString()}</td>
      </tr>`,
        )
        .join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #ef4444; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 800; color: #ef4444; letter-spacing: -1px; }
    .logo span { color: #1a1a1a; }
    .report-meta { text-align: right; color: #666; font-size: 12px; }
    .report-type { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ef4444; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-item { display: flex; gap: 8px; }
    .info-label { font-weight: 600; color: #555; min-width: 120px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #666; }
    td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-minor { background: #dcfce7; color: #166534; }
    .badge-moderate { background: #fef9c3; color: #854d0e; }
    .badge-severe { background: #fee2e2; color: #991b1b; }
    .total-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-weight: 700; font-size: 16px; }
    .total-value { font-size: 20px; font-weight: 800; color: #ef4444; }
    .narrative { background: #f9fafb; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 0 8px 8px 0; line-height: 1.6; color: #444; }
    .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; text-align: center; color: #999; font-size: 11px; }
    ${type === 'insurance' ? '.insurance-banner { background: #1e3a5f; color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; }' : ''}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Wreck<span>ify</span></div>
    <div class="report-meta">
      <div class="report-type">${type === 'insurance' ? 'Insurance Damage Report' : 'Vehicle Damage Report'}</div>
      <div>Scan ID: ${scan.id}</div>
      <div>Generated: ${generatedAt}</div>
    </div>
  </div>

  ${type === 'insurance' ? '<div class="insurance-banner">OFFICIAL INSURANCE CLAIM DOCUMENTATION — Wreckify Certified</div>' : ''}

  ${vehicle ? `
  <div class="section">
    <div class="section-title">Vehicle Information</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Make:</span> ${vehicle.make}</div>
      <div class="info-item"><span class="info-label">Model:</span> ${vehicle.model}</div>
      <div class="info-item"><span class="info-label">Year:</span> ${vehicle.year}</div>
      ${vehicle.color ? `<div class="info-item"><span class="info-label">Color:</span> ${vehicle.color}</div>` : ''}
      ${vehicle.registrationNo ? `<div class="info-item"><span class="info-label">Registration:</span> ${vehicle.registrationNo}</div>` : ''}
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Detected Damage</div>
    <table>
      <thead><tr><th>Part</th><th>Severity</th><th>Confidence</th><th>Description</th></tr></thead>
      <tbody>${partsRows || '<tr><td colspan="4" style="text-align:center;color:#999;">No parts detected</td></tr>'}</tbody>
    </table>
  </div>

  ${costEstimate ? `
  <div class="section">
    <div class="section-title">Cost Estimate (PKR)</div>
    <table>
      <thead><tr><th>Part</th><th>Parts Cost</th><th>Labour Cost</th></tr></thead>
      <tbody>${lineItemRows}</tbody>
    </table>
    <br/>
    <div class="total-box">
      <span class="total-label">Estimated Total</span>
      <span class="total-value">PKR ${Number(costEstimate.totalMin).toLocaleString()} – ${Number(costEstimate.totalMax).toLocaleString()}</span>
    </div>
  </div>

  ${costEstimate.narrative ? `
  <div class="section">
    <div class="section-title">AI Assessment</div>
    <div class="narrative">${costEstimate.narrative}</div>
  </div>` : ''}` : ''}

  <div class="footer">
    This report was generated by Wreckify — AI-powered vehicle damage detection &amp; repair cost estimation.<br/>
    Prices are estimates based on current market data and may vary. Report ID: ${scan.id}
  </div>
</body>
</html>`;
}
