/**
 * Generates HTML content for a popup based on arbitrary feature properties.
 */
export function generatePopupContent(
  properties: Record<string, unknown> | null | undefined,
): string {
  if (!properties) {
    return '<p class="popup-no-properties">No properties available for this feature.</p>';
  }

  // Escape values to avoid injecting untrusted markup from dataset fields.
  const rows = Object.entries(properties)
    .map(
      ([key, value]) =>
        `<tr><td class="popup-key">${escapeHtml(key)}</td><td class="popup-value">${escapeHtml(formatValue(value))}</td></tr>`,
    )
    .join('');

  return `
    <div class="popup-container">
      <h3 class="popup-header">Feature Properties</h3>
      <table class="popup-table">
        <thead>
          <tr class="popup-table-header">
            <th class="popup-table-key">Key</th>
            <th class="popup-table-value">Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
