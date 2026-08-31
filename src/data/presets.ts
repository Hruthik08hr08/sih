import { PresetLocation } from "../types";

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: "lakshadweep",
    name: "Lakshadweep Reefs",
    lat: 10.57,
    lon: 72.64,
    region: "Arabian Sea",
    ecosystemType: "Atoll Coral Reefs",
    description: "Vulnerable tropical atolls subject to monsoon temperature shifts and thermal bleaching events.",
  },
  {
    id: "sundarbans",
    name: "Sundarbans Coastal",
    lat: 21.94,
    lon: 88.94,
    region: "Bay of Bengal",
    ecosystemType: "Mangrove Estuary",
    description: "World's largest mangrove delta experiencing tidal salinity fluctuations and sediment flux.",
  },
  {
    id: "gulf-of-mannar",
    name: "Gulf of Mannar",
    lat: 8.98,
    lon: 78.18,
    region: "Indian Ocean",
    ecosystemType: "Biosphere Reserve Reefs",
    description: "Biodiverse marine national park with 117 coral species and endangered Dugong habitats.",
  },
  {
    id: "great-barrier-reef",
    name: "Great Barrier Reef",
    lat: -18.28,
    lon: 147.70,
    region: "Coral Sea",
    ecosystemType: "Barrier Reef Complex",
    description: "Extensive marine ecosystem under rigorous satellite bleaching and acidification monitoring.",
  },
  {
    id: "coral-triangle",
    name: "Coral Triangle (Raja Ampat)",
    lat: -0.23,
    lon: 130.52,
    region: "Indo-Pacific",
    ecosystemType: "Global Marine Epicenter",
    description: "Highest marine biodiversity on Earth with over 75% of all known coral species.",
  }
];
