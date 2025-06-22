import { getColorForType } from '../data/color-store';
import { getRadiusForType } from '../data/radius-store';
import {
  LEGEND_ELEMENT_ID,
  ACCIDENT_LEGENDS,
  SEVERITY_LEGENDS,
} from '../constants';

export function refreshLegend(legendElementId = LEGEND_ELEMENT_ID): void {
  const legendContainer = document.getElementById(legendElementId);

  if (!legendContainer) {
    console.warn('Legend container not found!');
    return;
  }

  legendContainer.innerHTML = `
    ${ACCIDENT_LEGENDS.map(({ type, description }) =>
      createLegendItem(getColorForType(type), description),
    ).join('')}

    <hr />

    ${SEVERITY_LEGENDS.map(({ key, description }) =>
      createSeverityLegendItem(getRadiusForType(key), description),
    ).join('')}
  `;
}

function createLegendItem(color: string, description: string): string {
  return `
    <div class="legend-item">
      <div class="legend-color" style="background-color: ${color};"></div>
      <span class="legend-text">${description}</span>
    </div>
  `;
}

function createSeverityLegendItem(radius: number, description: string): string {
  const sizeStyle = `width: ${radius}px; height: ${radius}px; background-color: #000;`;
  return `
    <div class="legend-item legend-severity">
      <div class="legend-color" style="${sizeStyle}"></div>
      <span class="legend-text">${description}</span>
    </div>
  `;
}
