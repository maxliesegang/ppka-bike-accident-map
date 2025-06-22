import { AccidentProperties } from '../data/accident-properties';

/**
 * Generates HTML content for a popup based on the properties of an accident feature.
 * @param properties - The properties of the accident feature
 * @returns HTML string for the popup content
 */
export function generatePopupContent(properties: AccidentProperties): string {
  if (!properties) {
    return '<p class="popup-no-properties">No properties available for this feature.</p>';
  }

  // Build rows for the property table
  const rows = Object.entries(properties)
    .map(
      ([key, value]) =>
        `<tr><td class="popup-key">${key}</td><td class="popup-value">${
          value ?? 'N/A'
        }</td></tr>`,
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
