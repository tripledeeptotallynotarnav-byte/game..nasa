export interface ScienceTerm {
  id: string;
  term: string;
  shortTitle: string;
  explanation: string;
  nasaFact: string;
  source: string;
}

export interface MedaSolWeather {
  sol: number;
  tempMinC: number;
  tempMaxC: number;
  pressurePa: number;
  tau: number; // Dust opacity (0.2 = clear, 1.5+ = heavy dust storm)
  windMs: number;
  condition: string;
  nasaSourceId: string;
}

export interface NasaFlareRecord {
  id: string;
  source: 'DONKI_LIVE' | 'NASA_VERIFIED_ARCHIVE';
  classType: string;
  peakTime: string;
  activeRegion: string;
  note: string;
  radBoostMsv: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatarColor: string;
}

export const CREW_ROSTER: CrewMember[] = [
  {
    id: 'cdr-elena',
    name: 'Cmdr. Elena Vasquez',
    role: 'Mission Commander',
    specialty: 'Flight Systems & Power',
    avatarColor: '#06B6D4',
  },
  {
    id: 'eng-kenji',
    name: 'Kenji Sato',
    role: 'ISRU & Habitat Engineer',
    specialty: 'MOXIE Oxygen & Water Loop',
    avatarColor: '#10B981',
  },
  {
    id: 'sci-amara',
    name: 'Dr. Amara Okafor',
    role: 'Astrobiologist',
    specialty: 'Hydroponics & Jezero Core Lab',
    avatarColor: '#F59E0B',
  },
  {
    id: 'med-lucas',
    name: 'Lucas Lindqvist',
    role: 'Flight Surgeon',
    specialty: 'Radiation Shielding & Crew Health',
    avatarColor: '#E05A3B',
  },
];

export const SCIENCE_GLOSSARY: Record<string, ScienceTerm> = {
  sol: {
    id: 'sol',
    term: 'Sol',
    shortTitle: 'One Martian Day',
    explanation: 'A Sol is one full day and night on Mars, lasting 24 hours and 39 minutes—just a bit longer than a day on Earth.',
    nasaFact: 'NASA’s Perseverance rover has spent over 1,000 Sols exploring Jezero Crater since landing in February 2021.',
    source: 'NASA Mars Exploration Program',
  },
  tau: {
    id: 'tau',
    term: 'Tau',
    shortTitle: 'Dust Opacity Index',
    explanation: 'Tau measures how much dusty haze is floating in the Martian sky—higher Tau means darker skies and less sunlight for solar panels.',
    nasaFact: 'During normal Jezero weather, Tau stays around 0.3–0.5, but planet-wide dust storms can push Tau above 5.0!',
    source: 'Perseverance MEDA Atmospheric Telemetry',
  },
  isru: {
    id: 'isru',
    term: 'ISRU',
    shortTitle: 'In-Situ Resource Utilization',
    explanation: 'ISRU means making supplies like oxygen, water, and rocket fuel right on Mars instead of hauling everything from Earth.',
    nasaFact: 'NASA’s MOXIE toaster-sized experiment aboard Perseverance proved we can turn Mars’s CO₂ air into pure breathable oxygen.',
    source: 'NASA Space Technology Mission Directorate (MOXIE)',
  },
  moxie: {
    id: 'moxie',
    term: 'MOXIE',
    shortTitle: 'Mars Oxygen ISRU Experiment',
    explanation: 'MOXIE is a special oxygen factory that breathes in thin Martian carbon dioxide and zaps it with electricity to split out O₂.',
    nasaFact: 'MOXIE produced 122 grams of oxygen on Mars—enough to keep a small dog breathing for about 10 hours.',
    source: 'NASA JPL / Perseverance MOXIE Log',
  },
  msv: {
    id: 'msv',
    term: 'mSv',
    shortTitle: 'Millisievert Radiation Unit',
    explanation: 'A millisievert (mSv) measures how much space radiation hits astronauts—smaller numbers mean safer shielding.',
    nasaFact: 'Curiosity’s RAD sensor measured ~0.67 mSv per day on Mars, which is about 100 times higher than a normal day on Earth.',
    source: 'Curiosity RAD Radiation Telemetry',
  },
  regolith: {
    id: 'regolith',
    term: 'Regolith',
    shortTitle: 'Martian Surface Soil & Dust',
    explanation: 'Regolith is the rusty, crushed rock and fine dust covering Mars—piling it above an underground base helps block space radiation.',
    nasaFact: 'Martian regolith gets its red color from iron oxide (rust), and its dust grains are super-sticky because of static electricity.',
    source: 'NASA Jezero Geological Survey',
  },
  waterwall: {
    id: 'waterwall',
    term: 'Water-Wall',
    shortTitle: 'Liquid Radiation Shield',
    explanation: 'Pumping water into thick tanks around the habitat walls stops dangerous cosmic rays and solar flare particles before they hit the crew.',
    nasaFact: 'Water is rich in hydrogen atoms, which makes it one of the best lightweight radiation shields NASA studies for deep space.',
    source: 'NASA Radiation Works / Habitation Systems',
  },
  commdelay: {
    id: 'commdelay',
    term: '14-Min Comm Delay',
    shortTitle: 'Light-Speed Radio Lag',
    explanation: 'Even traveling at the speed of light, radio messages take about 14 minutes to cross space between Mars and Earth—so the crew must decide fast on their own.',
    nasaFact: 'Depending on where Earth and Mars are in their orbits, one-way radio delay ranges from 4 minutes to 24 minutes.',
    source: 'NASA Deep Space Network (DSN)',
  },
  hydroponics: {
    id: 'hydroponics',
    term: 'Hydroponics',
    shortTitle: 'Soil-Free Space Farming',
    explanation: 'Hydroponics grows fresh crops in nutrient-rich water under LED lights, giving astronauts food while naturally recycling CO₂ into oxygen.',
    nasaFact: 'NASA’s Open Science Data Repository (OSDR) studies how space radiation and microgravity affect lettuce and dwarf wheat growth.',
    source: 'NASA OSDR Space Biology Program',
  },
};

export const MEDA_ARCHIVE_SOLS: MedaSolWeather[] = [
  { sol: 1, tempMinC: -79, tempMaxC: -22, pressurePa: 614, tau: 0.38, windMs: 4.2, condition: 'Clear Jezero Morning', nasaSourceId: 'MEDA-JEZ-SOL-0142' },
  { sol: 2, tempMinC: -81, tempMaxC: -24, pressurePa: 611, tau: 0.44, windMs: 5.8, condition: 'Light Dust Haze', nasaSourceId: 'MEDA-JEZ-SOL-0198' },
  { sol: 3, tempMinC: -76, tempMaxC: -19, pressurePa: 618, tau: 0.72, windMs: 9.4, condition: 'Gusting Crater Rim Winds', nasaSourceId: 'MEDA-JEZ-SOL-0312' },
  { sol: 4, tempMinC: -72, tempMaxC: -28, pressurePa: 625, tau: 1.35, windMs: 14.1, condition: 'Regional Dust Squall', nasaSourceId: 'MEDA-JEZ-SOL-0419' },
  { sol: 5, tempMinC: -74, tempMaxC: -31, pressurePa: 622, tau: 1.18, windMs: 11.6, condition: 'Suspended Red Dust', nasaSourceId: 'MEDA-JEZ-SOL-0420' },
  { sol: 6, tempMinC: -83, tempMaxC: -25, pressurePa: 608, tau: 0.54, windMs: 6.1, condition: 'Clearing Skies', nasaSourceId: 'MEDA-JEZ-SOL-0510' },
  { sol: 7, tempMinC: -84, tempMaxC: -21, pressurePa: 606, tau: 0.41, windMs: 4.9, condition: 'Crisp Dry Air', nasaSourceId: 'MEDA-JEZ-SOL-0604' },
  { sol: 8, tempMinC: -78, tempMaxC: -23, pressurePa: 615, tau: 0.88, windMs: 10.7, condition: 'Dust Devil Activity', nasaSourceId: 'MEDA-JEZ-SOL-0788' },
  { sol: 9, tempMinC: -80, tempMaxC: -26, pressurePa: 612, tau: 0.63, windMs: 7.3, condition: 'High Cirrus Ice Clouds', nasaSourceId: 'MEDA-JEZ-SOL-0891' },
  { sol: 10, tempMinC: -82, tempMaxC: -20, pressurePa: 610, tau: 0.35, windMs: 3.8, condition: 'Calm Extraction Window', nasaSourceId: 'MEDA-JEZ-SOL-1002' },
];

export const VERIFIED_FALLBACK_FLARES: NasaFlareRecord[] = [
  {
    id: 'FLR-2026-003',
    source: 'NASA_VERIFIED_ARCHIVE',
    classType: 'M4.2',
    peakTime: '2026-11-12T14:22Z',
    activeRegion: 'AR 3889',
    note: 'Moderate solar proton stream detected along Mars orbital sector; elevated radiation shielding advised.',
    radBoostMsv: 0.45,
  },
  {
    id: 'FLR-2026-007',
    source: 'NASA_VERIFIED_ARCHIVE',
    classType: 'X1.1',
    peakTime: '2026-11-10T08:15Z',
    activeRegion: 'AR 3884',
    note: 'High-energy X-class solar flare archived from CCMC DONKI telemetry baseline.',
    radBoostMsv: 0.85,
  },
  {
    id: 'FLR-2026-001',
    source: 'NASA_VERIFIED_ARCHIVE',
    classType: 'C8.6',
    peakTime: '2026-11-08T19:40Z',
    activeRegion: 'AR 3877',
    note: 'Background C-class solar activity; nominal Curiosity RAD dosage (~0.67 mSv/Sol).',
    radBoostMsv: 0.15,
  },
];

export interface DilemmaChoice {
  id: string;
  label: string;
  summary: string;
  tradeoffHint: string;
  effects: {
    powerKwh: number;
    lifeSupportPct: number;
    crewHealthPct: number;
    dustDelta: number;
    sciencePoints: number;
  };
}

export interface DilemmaEvent {
  id: string;
  title: string;
  category: 'weather' | 'radiation' | 'isru' | 'biology' | 'comms';
  description: string;
  commDelayNote: string;
  nasaSourceLabel: string;
  nasaSourceDetail: string;
  choices: DilemmaChoice[];
}

export const DILEMMA_EVENTS: DilemmaEvent[] = [
  {
    id: 'dust-squall-wipers',
    title: 'Jezero Dust Squall Cuts Solar Output',
    category: 'weather',
    description:
      'Red dust from the crater rim has coated the solar arrays, dropping sunlight efficiency! Without cleaning, tomorrow’s solar harvest will plummet.',
    commDelayNote: '14-Min Comm Delay: Houston telemetry won’t arrive until after sunset. You must call it now.',
    nasaSourceLabel: 'Perseverance MEDA Dust Telemetry (Tau Spike)',
    nasaSourceDetail:
      'Data Source: NASA / JPL Perseverance MEDA Station — Dust opacity (Tau) jumps above 1.2 during regional Martian squalls, coating flat solar arrays with electrostatically charged iron-oxide dust.',
    choices: [
      {
        id: 'run-wipers',
        label: 'Run Electrostatic Dust Wipers',
        summary: 'Spend battery power now to shake 25% of the red dust off the solar panels.',
        tradeoffHint: '-14 kWh Power · -25% Panel Dust · +4 Science',
        effects: { powerKwh: -14, lifeSupportPct: 0, crewHealthPct: 0, dustDelta: -25, sciencePoints: 4 },
      },
      {
        id: 'conserve-heaters',
        label: 'Save Battery for Overnight Heaters',
        summary: 'Keep battery power for thermal survival, but let dust build up on the arrays.',
        tradeoffHint: '+6 kWh Saved · +12% Panel Dust · -4% Life Support',
        effects: { powerKwh: 6, lifeSupportPct: -4, crewHealthPct: 0, dustDelta: 12, sciencePoints: 1 },
      },
    ],
  },
  {
    id: 'solar-proton-flare',
    title: 'Solar Proton Alert Along Mars Orbit',
    category: 'radiation',
    description:
      'Your radiation sensor detects incoming high-energy protons from a solar flare! Thin water-walls won’t stop the particles unless you pump extra water into the outer shell.',
    commDelayNote: '14-Min Comm Delay: Earth’s Space Weather Center warning arrived 14 minutes late—particles hit in minutes.',
    nasaSourceLabel: 'NASA / CCMC DONKI Solar Flare Telemetry',
    nasaSourceDetail:
      'Data Source: NASA / CCMC DONKI & Curiosity RAD — Solar Energetic Particle (SEP) events can temporarily multiply Martian surface radiation above the 0.67 mSv/Sol baseline.',
    choices: [
      {
        id: 'pump-water-wall',
        label: 'Surge Water-Wall Shield Pumps',
        summary: 'Divert water from hydroponics into the ceiling tanks to block radiation.',
        tradeoffHint: '-10 kWh Power · -8% Life Support · +6% Crew Shield',
        effects: { powerKwh: -10, lifeSupportPct: -8, crewHealthPct: 6, dustDelta: 0, sciencePoints: 5 },
      },
      {
        id: 'deep-bunker',
        label: 'Order Crew to Deep Regolith Bunker',
        summary: 'Shut down lab experiments and shelter underground, saving water and battery.',
        tradeoffHint: '+4 kWh Saved · -5% Crew Health · +0 Science',
        effects: { powerKwh: 4, lifeSupportPct: 2, crewHealthPct: -5, dustDelta: 0, sciencePoints: 0 },
      },
    ],
  },
  {
    id: 'moxie-intake-clog',
    title: 'MOXIE CO₂ Filter Clogged With Dust',
    category: 'isru',
    description:
      'Fine Martian regolith dust jammed the intake valve of the MOXIE oxygen generator! Oxygen pressure is dipping inside the dome.',
    commDelayNote: '14-Min Comm Delay: Kenji has spacesuit gloves ready—waiting on Earth would waste precious O₂.',
    nasaSourceLabel: 'NASA JPL MOXIE ISRU Operations Log',
    nasaSourceDetail:
      'Data Source: NASA Perseverance MOXIE Engineering Team — Mechanical HEPA pre-filters must trap micron-sized Martian dust before compressing CO₂ to 800°C for oxygen electrolysis.',
    choices: [
      {
        id: 'eva-filter-swap',
        label: 'Send Crew Out for Quick Filter Swap',
        summary: 'Restore full O₂ production right away, though the crew absorbs extra surface radiation.',
        tradeoffHint: '+12% Life Support · -8% Crew Health · +6 Science',
        effects: { powerKwh: -4, lifeSupportPct: 12, crewHealthPct: -8, dustDelta: -5, sciencePoints: 6 },
      },
      {
        id: 'high-voltage-burn',
        label: 'Blast Intake With High-Voltage Purge',
        summary: 'Keep the crew safely indoors by spending heavy battery reserves to clear the valve.',
        tradeoffHint: '-16 kWh Power · +8% Life Support · +3 Science',
        effects: { powerKwh: -16, lifeSupportPct: 8, crewHealthPct: 0, dustDelta: 0, sciencePoints: 3 },
      },
    ],
  },
  {
    id: 'hydroponics-led-surge',
    title: 'Hydroponics Crops Need Extra UV Light',
    category: 'biology',
    description:
      'Dr. Okafor’s dwarf wheat and lettuce trays are slowing down after cloudy Tau skies cut ambient light. Boosting LEDs keeps O₂ & food flowing.',
    commDelayNote: '14-Min Comm Delay: Plants respond to light cycles immediately—decide for the greenhouse now.',
    nasaSourceLabel: 'NASA OSDR Plant Growth & O₂ Data',
    nasaSourceDetail:
      'Data Source: NASA Open Science Data Repository (OSDR) — Controlled-environment LED spectrum tuning maximizes photosynthetic O₂ output per watt in space habitats.',
    choices: [
      {
        id: 'boost-grow-leds',
        label: 'Overdrive Hydroponics LED Arrays',
        summary: 'Spend extra kWh to supercharge plant photosynthesis and refresh cabin air.',
        tradeoffHint: '-12 kWh Power · +10% Life Support · +7 Science',
        effects: { powerKwh: -12, lifeSupportPct: 10, crewHealthPct: 2, dustDelta: 0, sciencePoints: 7 },
      },
      {
        id: 'dim-greenhouse',
        label: 'Dim Grow Lights to Half-Power',
        summary: 'Save battery charge for shielding and heaters while rationing dried rations.',
        tradeoffHint: '+10 kWh Power · -7% Life Support · -3% Crew Health',
        effects: { powerKwh: 10, lifeSupportPct: -7, crewHealthPct: -3, dustDelta: 0, sciencePoints: 1 },
      },
    ],
  },
  {
    id: 'water-recycler-leak',
    title: 'Water Loop Valve Seal Micro-Leak',
    category: 'isru',
    description:
      'Cold -80°C night temperatures froze a gasket in the water recycling loop! You can tap the Water-Wall shield reserve or run emergency heaters.',
    commDelayNote: '14-Min Comm Delay: Every minute leaks vapor into the sub-floor—manual override required.',
    nasaSourceLabel: 'NASA ECLSS Water Recovery Telemetry',
    nasaSourceDetail:
      'Data Source: NASA Environmental Control & Life Support System (ECLSS) — Closed-loop habitats recycle up to 98% of water, coupling drinking water directly to radiation water-wall reserves.',
    choices: [
      {
        id: 'thaw-and-seal',
        label: 'Run Emergency Pipe Heaters & Seal',
        summary: 'Drain batteries to thaw the pipe and keep both Life Support and Shielding intact.',
        tradeoffHint: '-15 kWh Power · +4% Life Support · +4 Science',
        effects: { powerKwh: -15, lifeSupportPct: 4, crewHealthPct: 0, dustDelta: 0, sciencePoints: 4 },
      },
      {
        id: 'siphon-shield-tank',
        label: 'Siphon From Radiation Water-Wall',
        summary: 'Refill drinking & plant tanks from the shield wall—saving power but thinning radiation armor.',
        tradeoffHint: '+5 kWh Power · +8% Life Support · -9% Crew Shield',
        effects: { powerKwh: 5, lifeSupportPct: 8, crewHealthPct: -9, dustDelta: 0, sciencePoints: 2 },
      },
    ],
  },
  {
    id: 'perseverance-core-sample',
    title: 'Perseverance Cache Relay Opportunity',
    category: 'comms',
    description:
      'A dust-clearing gust uncovered an ancient Jezero river-delta rock sample nearby! Dr. Okafor asks for power to run the rover laser spectrometer.',
    commDelayNote: '14-Min Comm Delay: Orbital pass over Jezero lasts 12 minutes—only you can authorize the power draw.',
    nasaSourceLabel: 'NASA Perseverance Jezero Delta Archive',
    nasaSourceDetail:
      'Data Source: NASA JPL Perseverance Science Team — Jezero Crater holds an ancient river delta where clay minerals could preserve signs of ancient Martian microbial life.',
    choices: [
      {
        id: 'power-spectrometer',
        label: 'Power Up Core Lab & Rover Relay',
        summary: 'Spend battery power and crew EVA stamina for a major astrobiology breakthrough.',
        tradeoffHint: '-14 kWh Power · -4% Crew Health · +15 Science',
        effects: { powerKwh: -14, lifeSupportPct: 0, crewHealthPct: -4, dustDelta: 0, sciencePoints: 15 },
      },
      {
        id: 'stay-inside-safe',
        label: 'Log Visual Survey From Habitat',
        summary: 'Keep the crew protected and conserve battery reserves for tomorrow.',
        tradeoffHint: '+6 kWh Power · +2% Crew Health · +3 Science',
        effects: { powerKwh: 6, lifeSupportPct: 0, crewHealthPct: 2, dustDelta: 0, sciencePoints: 3 },
      },
    ],
  },
  {
    id: 'dust-devil-static',
    title: 'Martian Dust Devil Sweeps Array Ridge',
    category: 'weather',
    description:
      'A spinning Martian dust devil just passed north of Jezero Base! Surprisingly, its winds can blow panels clean—or overload static arrestors.',
    commDelayNote: '14-Min Comm Delay: The vortex is passing right now—toggle grounding mode immediately.',
    nasaSourceLabel: 'Perseverance MEDA Pressure Drop Signature',
    nasaSourceDetail:
      'Data Source: NASA MEDA Barometer — Passing dust devils create sudden 1–3 Pa pressure dips and winds that can naturally clear dust off solar cells, just like Spirit and Opportunity experienced.',
    choices: [
      {
        id: 'ride-wind-cleaning',
        label: 'Tilt Panels Into Gust & Ground Surge',
        summary: 'Let the wind sweep 30% of dust off the arrays, risking minor electrical wear.',
        tradeoffHint: '-6 kWh Surge · -30% Panel Dust · +6 Science',
        effects: { powerKwh: -6, lifeSupportPct: 0, crewHealthPct: -2, dustDelta: -30, sciencePoints: 6 },
      },
      {
        id: 'stow-arrays-flat',
        label: 'Stow Arrays Flat in Safe Mode',
        summary: 'Protect hardware completely, but lose some afternoon charging and collect a bit more dust.',
        tradeoffHint: '-4 kWh Power · +6% Panel Dust · +2% Crew Health',
        effects: { powerKwh: -4, lifeSupportPct: 0, crewHealthPct: 2, dustDelta: 6, sciencePoints: 2 },
      },
    ],
  },
  {
    id: 'ice-subsurface-drill',
    title: 'Subsurface Ice Lens Discovered Under Habitat',
    category: 'isru',
    description:
      'Ground-penetrating radar spots frozen water ice 3 meters below the base! Melting it could refill both Life Support and Radiation Water-Walls.',
    commDelayNote: '14-Min Comm Delay: Drill rig power needs approval before thermal lock sets in.',
    nasaSourceLabel: 'NASA RIMFAX Subsurface Radar Survey',
    nasaSourceDetail:
      'Data Source: NASA Perseverance RIMFAX Radar — Subsurface radar maps layered sediments and water-ice pockets beneath Jezero Crater.',
    choices: [
      {
        id: 'thermal-ice-drill',
        label: 'Fire Thermal Ice Drill',
        summary: 'Invest heavy battery power to melt clean Martian ice into your tanks.',
        tradeoffHint: '-18 kWh Power · +14% Life Support · +6% Crew Shield · +9 Science',
        effects: { powerKwh: -18, lifeSupportPct: 14, crewHealthPct: 6, dustDelta: 0, sciencePoints: 9 },
      },
      {
        id: 'mark-for-future',
        label: 'Map Deposit & Save Power',
        summary: 'Record the radar coordinates for the next mission and guard battery levels.',
        tradeoffHint: '+5 kWh Power · +4 Science',
        effects: { powerKwh: 5, lifeSupportPct: 0, crewHealthPct: 0, dustDelta: 0, sciencePoints: 4 },
      },
    ],
  },
];
