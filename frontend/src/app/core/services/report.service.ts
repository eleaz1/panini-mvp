import { Injectable } from '@angular/core';
import { Album, AlbumStats, StickerStatus } from './album.service';

interface StickerCell {
  number: number;
  display: string;
}

interface SectionGroup {
  name: string;
  cells: StickerCell[];
}

@Injectable({ providedIn: 'root' })
export class ReportService {

  downloadCompleteReport(
    album: Album,
    stats: AlbumStats,
    sections: SectionGroup[],
    stickerMap: Map<number, StickerStatus>,
  ): void {
    const date = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const sectionsHtml = sections.map(sec => {
      const cells = sec.cells.map(cell => {
        const status = stickerMap.get(cell.number) ?? 'missing';
        return `<span class="cell ${status}">${cell.display}</span>`;
      }).join('');

      const have = sec.cells.filter(c => (stickerMap.get(c.number) ?? 'missing') === 'have').length;
      const dup  = sec.cells.filter(c => (stickerMap.get(c.number) ?? 'missing') === 'duplicate').length;
      return `
        <div class="section">
          <div class="section-title">
            ${sec.name}
            <span class="section-badge">${have}/${sec.cells.length} tengo${dup ? ' · ' + dup + ' rep.' : ''}</span>
          </div>
          <div class="cells">${cells}</div>
        </div>`;
    }).join('');

    const html = this.wrapHtml({
      title: `${album.name} — Reporte completo`,
      subtitle: `Generado el ${date}`,
      stats,
      legend: true,
      body: sectionsHtml,
      filename: 'reporte-completo',
    });

    this.printWindow(html);
  }

  downloadMissingReport(
    album: Album,
    stats: AlbumStats,
    sections: SectionGroup[],
    stickerMap: Map<number, StickerStatus>,
  ): void {
    const date = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const sectionsHtml = sections.map(sec => {
      const missing = sec.cells.filter(c => (stickerMap.get(c.number) ?? 'missing') === 'missing');
      if (missing.length === 0) return '';
      const cells = missing.map(cell =>
        `<span class="cell missing">${cell.display}</span>`
      ).join('');
      return `
        <div class="section">
          <div class="section-title">
            ${sec.name}
            <span class="section-badge">${missing.length} faltan</span>
          </div>
          <div class="cells">${cells}</div>
        </div>`;
    }).filter(Boolean).join('');

    const html = this.wrapHtml({
      title: `${album.name} — Láminas que me faltan`,
      subtitle: `Comparte esta lista · ${date}`,
      stats,
      legend: false,
      body: sectionsHtml || '<p style="color:#90a4ae;text-align:center;padding:40px">¡Álbum completo! No faltan láminas.</p>',
      filename: 'laminas-faltantes',
    });

    this.printWindow(html);
  }

  private wrapHtml(opts: {
    title: string;
    subtitle: string;
    stats: AlbumStats;
    legend: boolean;
    body: string;
    filename: string;
  }): string {
    const legend = opts.legend ? `
      <div class="legend">
        <span class="cell have">Tengo</span>
        <span class="cell duplicate">Repetida</span>
        <span class="cell missing">Falta</span>
      </div>` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${opts.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #1a237e;
      padding: 20px 24px;
      font-size: 11px;
    }
    .header {
      border-bottom: 3px solid #1a237e;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 18px;
      font-weight: 800;
      color: #1a237e;
      line-height: 1.2;
    }
    .subtitle {
      font-size: 11px;
      color: #90a4ae;
      margin-top: 2px;
    }
    .stats-row {
      display: flex;
      gap: 0;
      margin: 10px 0;
      border: 1.5px solid #e8edf2;
      border-radius: 8px;
      overflow: hidden;
    }
    .stat {
      flex: 1;
      text-align: center;
      padding: 8px 4px;
      border-right: 1px solid #e8edf2;
    }
    .stat:last-child { border-right: none; }
    .stat-num { font-size: 20px; font-weight: 800; display: block; }
    .stat-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #90a4ae; letter-spacing: .06em; }
    .stat.have .stat-num   { color: #2e7d32; }
    .stat.miss .stat-num   { color: #546e7a; }
    .stat.dup  .stat-num   { color: #e65100; }
    .stat.pct  .stat-num   { color: #1565c0; }
    .legend {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
      align-items: center;
    }
    .legend::before {
      content: 'Leyenda:';
      font-weight: 700;
      color: #546e7a;
      margin-right: 4px;
    }
    .section {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #1a237e;
      border-bottom: 1.5px solid #e8edf2;
      padding-bottom: 4px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-badge {
      font-size: 9px;
      font-weight: 500;
      color: #90a4ae;
      text-transform: none;
      letter-spacing: 0;
    }
    .cells {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .cell {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 6px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      border: 1.5px solid;
      white-space: nowrap;
    }
    .cell.have    { background: #e8f5e9; border-color: #66bb6a; color: #2e7d32; }
    .cell.missing { background: #f5f5f5; border-color: #cfd8dc; color: #78909c; }
    .cell.duplicate { background: #fff3e0; border-color: #ffa726; color: #e65100; }
    @media print {
      body { padding: 10px 14px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${opts.title}</h1>
    <div class="subtitle">${opts.subtitle}</div>
  </div>
  <div class="stats-row">
    <div class="stat have"><span class="stat-num">${opts.stats.have}</span><span class="stat-lbl">Tengo</span></div>
    <div class="stat miss"><span class="stat-num">${opts.stats.missing}</span><span class="stat-lbl">Faltan</span></div>
    <div class="stat dup"><span class="stat-num">${opts.stats.duplicate}</span><span class="stat-lbl">Repetidas</span></div>
    <div class="stat pct"><span class="stat-num">${opts.stats.completion_pct.toFixed(1)}%</span><span class="stat-lbl">Completo</span></div>
  </div>
  ${legend}
  ${opts.body}
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;
  }

  private printWindow(html: string): void {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }
}
