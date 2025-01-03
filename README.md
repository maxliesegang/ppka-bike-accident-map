# PPKA Bike Accident Map

This repository showcases an interactive map application built using **TypeScript**, **Leaflet**, and **GeoPackage**, visualizing bike and pedestrian traffic accident data for the Karlsruhe area from 2018 to 2023.

## Features

- **Interactive Map Visualization**: Dynamically displays accident data with layers and markers based on accident types and severities (e.g., bike-vehicle accidents, severe injuries).
- **Custom Legends**: Provides a detailed legend to interpret accident types and severity indicators.
- **Layer Control**: Toggle between accident types or severity-based visualizations.
- **GeoPackage Support**: Loads local GeoPackage data (`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`) for efficient geospatial operations.
- **Responsive Design**: Map and legend are styled for usability and clarity.

## Live Demo

The application is deployed on GitHub Pages. You can interact with the live map demo here:

[Live Demo](https://maxliesegang.github.io/ppka-bike-accident-map)

## Installation

Ensure you have the following prerequisites installed:

- **Node.js** (≥ 16.x)
- **npm** (≥ 7.x)

### 1. Clone the Repository

```bash
git clone https://github.com/maxliesegang/ppka-bike-accident-map.git
cd ppka-bike-accident-map
```

### 2. Install Dependencies

Run the following command to install required dependencies:

```bash
npm install
```

### 3. Run the Development Server

Start the project in development mode:

```bash
npm run start
```

The app will be accessible at: [http://localhost:4000/](http://localhost:4000/).

### 4. Build for Production

To create a production-ready build:

```bash
npm run build
```

The bundled files will be available in the `dist` directory.

## Project Structure

- **`src/`**: Source folder containing TypeScript, CSS, and utility files.
  - **`data/`**: Stores accident properties and configuration for colors and radii used in markers.
  - **`map/`**: Contains map initialization, utilities, layer controls, and GeoPackage loading logic.
  - **`styles.css`**: CSS file for styling the map and legend.
  - **`index.ts`**: Entry point for initializing the application.
- **`webpack.config.js`**: Webpack configuration for bundling and serving the application.
- **`constants.ts`**: Defines key map configurations such as initial view, zoom level, and tile layer URL.
- **`unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg`**: Contains the geospatial accident data (not included in this README; ensure it's placed in the root directory).

## Key Technologies Used

- **TypeScript**: Ensures type safety and structured code.
- **Leaflet**: Lightweight JavaScript library for interactive maps.
- **GeoPackage**: Used for handling local geospatial data files efficiently.
- **Webpack**: Bundles the project for development and production.
- **ESLint & Prettier**: Enforces coding standards and automatic formatting.

## How the Application Works

### 1. Map Initialization

The map is initialized with **Leaflet** using configurations in `constants.ts`. Tile layers are added to render a base map.

### 2. Loading GeoPackage Data

Accident data stored in the GeoPackage file is loaded and processed. Accident features are styled based on accident type (`color-store.ts`) and severity (`radius-store.ts`), enabling clear visualization.

### 3. Layer Control

Interactive controls allow users to toggle specific accident types or severities on the map (`layer-control-utils.ts`).

### 4. Legend

The legend dynamically updates to reflect the accident types and severity levels with clear descriptions (`map-legend-utils.ts`).

## Development Tools

- **Linting**: Run `npm run lint` to lint the codebase.
- **Prettier**: Run `npm run format` to format the codebase.
