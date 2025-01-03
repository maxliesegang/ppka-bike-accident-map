import { AccidentType, getColorForType } from '../data/color-store';
import { getRadiusForType, SeverityType } from '../data/radius-store';

interface AccidentLegendEntry {
  type: AccidentType;
  description: string;
}

interface SeverityLegendEntry {
  key: SeverityType;
  description: string;
}

export const ACCIDENT_LEGENDS: AccidentLegendEntry[] = [
  { type: 'BIKE_AND_VEHICLE', description: 'Fahrrad- und Fahrzeugunfall' },
  {
    type: 'PEDESTRIAN_AND_VEHICLE',
    description: 'Fußgänger- und Fahrzeugunfall',
  },
  { type: 'BIKE_AND_PEDESTRIAN', description: 'Fahrrad- und Fußgängerunfall' },
  { type: 'SINGLE_BIKE', description: 'Unfall nur mit Fahrrädern' },
  { type: 'BIKE_ONLY', description: 'Fahrradunfall ohne Beteiligte' },
  { type: 'DEFAULT_FILL', description: 'Unbekannter Unfalltyp' },
];

export const SEVERITY_LEGENDS: SeverityLegendEntry[] = [
  { key: 'SEVERE_INJURY', description: 'Schwerverletzungen' },
  { key: 'INJURY', description: 'Verletzungen' },
  { key: 'NO_INJURY', description: 'Keine Verletzungen' },
];

export function refreshLegend(legendElementId = 'legend'): void {
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
