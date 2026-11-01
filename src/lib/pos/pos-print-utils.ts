/**
 * POS Thermal Receipt & Cash Memo Printing Utility
 * Isolates the printable memo in a dedicated off-screen iframe so that window.print()
 * prints ONLY the thermal receipt slip (58mm/80mm), without any page background,
 * headers, scanners, modals, or toasts.
 *
 * Configured with standard 72mm printable width (standard 80mm thermal print head / 576 dots)
 * and safe horizontal padding to guarantee zero character clipping on any printer or PDF export.
 */

export function printThermalSlip(elementIdOrElement: string | HTMLElement): void {
  if (typeof window === "undefined") return;

  const element =
    typeof elementIdOrElement === "string"
      ? document.getElementById(elementIdOrElement)
      : elementIdOrElement;

  if (!element) {
    window.print();
    return;
  }

  // Check if an existing print iframe exists and clean it up
  const existingIframe = document.getElementById("pos-thermal-print-iframe");
  if (existingIframe && existingIframe.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  // Create an off-screen iframe with explicit layout dimensions (prevents zero-width clipping in WebKit/Blink)
  const iframe = document.createElement("iframe");
  iframe.id = "pos-thermal-print-iframe";
  iframe.setAttribute(
    "style",
    "position:fixed;top:-10000px;left:-10000px;width:340px;height:1200px;border:0;opacity:0;pointer-events:none;z-index:-1;"
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Write isolated thermal document with safe margins and explicit print styles
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Receipt - VIBELOCK POS</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 11px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .thermal-slip-container {
            width: 72mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 8px 12px;
            background: #ffffff;
            color: #000000;
            overflow: visible;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .font-black { font-weight: 900; }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .uppercase { text-transform: uppercase; }
          .capitalize { text-transform: capitalize; }
          .truncate {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .break-words {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .break-all {
            word-break: break-all;
          }
          .leading-tight {
            line-height: 1.25;
          }
          .shrink-0 {
            flex-shrink: 0;
          }
          .flex {
            display: flex;
          }
          .items-center {
            align-items: center;
          }
          .justify-between {
            justify-content: space-between;
          }
          .grid {
            display: grid;
          }
          .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .gap-1 { gap: 4px; }
          .gap-2 { gap: 8px; }
          
          .border-b { border-bottom: 1px dashed #333333; }
          .border-t { border-top: 1px dashed #333333; }
          .border-dashed { border-style: dashed; }
          .border-dotted { border-style: dotted; }

          .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
          .pb-0\\.5 { padding-bottom: 2px; }
          .pb-1 { padding-bottom: 4px; }
          .pb-2 { padding-bottom: 8px; }
          .pb-3 { padding-bottom: 12px; }
          .pt-0\\.5 { padding-top: 2px; }
          .pt-1 { padding-top: 4px; }
          .pt-2 { padding-top: 8px; }
          .pl-1 { padding-left: 4px; }
          .pl-2 { padding-left: 8px; }
          .pr-2 { padding-right: 8px; }

          .space-y-0\\.5 > * + * { margin-top: 2px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-1\\.5 > * + * { margin-top: 6px; }
          .space-y-2 > * + * { margin-top: 8px; }

          .text-\\[9px\\] { font-size: 9px; }
          .text-\\[10px\\] { font-size: 10px; }
          .text-\\[11px\\] { font-size: 11px; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 12px; }
          .text-base { font-size: 13px; }
          .text-lg { font-size: 15px; }

          .text-slate-400,
          .text-slate-500,
          .text-slate-600,
          .text-slate-700,
          .text-slate-900,
          .text-vl-grey {
            color: #000000 !important;
          }
          .border-slate-300,
          .border-slate-400,
          .border-slate-200,
          .border-slate-500 {
            border-color: #333333 !important;
          }
          .bg-\\[\\#faf9f5\\],
          .bg-slate-50,
          .bg-slate-100 {
            background-color: transparent !important;
          }
          .rounded-xl,
          .rounded-lg,
          .rounded-md,
          .shadow-2xs,
          .shadow-xs,
          .shadow-sm {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        </style>
      </head>
      <body>
        <div class="thermal-slip-container">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Give brief tick for DOM parsing, then trigger print dialog
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up iframe after print dialog finishes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 150);
}
