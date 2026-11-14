export type ModuleId = 'solar' | 'moxie' | 'shelter' | 'biodome';
export type SolHazardType = 'none' | 'dust' | 'flare' | 'cold' | 'glitch';

export interface SolCampaignChapter {
  sol: number;
  arcTitle: string;
  speaker: 'maya' | 'leo';
  speakerName: string;
  speakerRole: string;
  commNote: string;
  storyPrompt: string;
  targetModule: ModuleId | 'any';
  hazardType: SolHazardType;
  dilemmaId: string | null;
  nasaCredit: string;
}

export const CAMPAIGN_CHAPTERS: SolCampaignChapter[] = [
  {
    sol: 1,
    arcTitle: 'Touchdown & First Breath',
    speaker: 'maya',
    speakerName: 'Commander Maya',
    speakerRole: 'Jezero Base Commander',
    commNote: 'Local Habitat Intercom',
    storyPrompt:
      'Welcome to Jezero Crater! Click the glowing MOXIE Core behind the dome to turn Martian CO₂ into breathable oxygen before sunset (-12 kWh power).',
    targetModule: 'moxie',
    hazardType: 'none',
    dilemmaId: 'moxie-intake-clog',
    nasaCredit: 'NASA JPL Perseverance MOXIE Log',
  },
  {
    sol: 2,
    arcTitle: 'Dust Devil Approaching',
    speaker: 'leo',
    speakerName: 'Flight Director Leo',
    speakerRole: 'Earth Mission Control',
    commNote: '14-Min Comm Delay · Houston',
    storyPrompt:
      'MEDA sensors spotted dust coating your Solar Array Field! Click the Solar Panels to run the robotic wipers—harvesting +14 kWh power while using 3% cooling water.',
    targetModule: 'solar',
    hazardType: 'dust',
    dilemmaId: 'dust-devil-static',
    nasaCredit: 'Perseverance MEDA Dust Telemetry',
  },
  {
    sol: 3,
    arcTitle: 'Red Dust Squall',
    speaker: 'maya',
    speakerName: 'Commander Maya',
    speakerRole: 'Jezero Base Commander',
    commNote: 'Local Habitat Intercom',
    storyPrompt:
      'Dust opacity (Tau) is climbing and tonight freezes at -76°C! Clean your Solar Panels if dusty, or boost MOXIE O₂ before ending the Sol.',
    targetModule: 'solar',
    hazardType: 'dust',
    dilemmaId: 'dust-squall-wipers',
    nasaCredit: 'Perseverance MEDA Dust Telemetry (Tau Spike)',
  },
  {
    sol: 4,
    arcTitle: 'NASA DONKI Solar Flare Warning!',
    speaker: 'leo',
    speakerName: 'Flight Director Leo',
    speakerRole: 'Earth Mission Control',
    commNote: '14-Min Comm Delay · Urgent Flare Alert',
    storyPrompt:
      'A NASA DONKI Solar Flare is inbound! Click the Water-Wall Storm Shelter (center dome) to pump water into the roof shield—watch out, it drains 14 kWh & 5% water!',
    targetModule: 'shelter',
    hazardType: 'flare',
    dilemmaId: 'solar-proton-flare',
    nasaCredit: 'NASA / CCMC DONKI Solar Flare Telemetry',
  },
  {
    sol: 5,
    arcTitle: 'Solar Storm Aftershock',
    speaker: 'maya',
    speakerName: 'Commander Maya',
    speakerRole: 'Jezero Base Commander',
    commNote: 'Radiation Watch · Jezero Crater',
    storyPrompt:
      'Aurora radiation is still crackling overhead! Keep the Storm Shelter reinforced if shield thickness is below 24 cm, and check Life Support.',
    targetModule: 'shelter',
    hazardType: 'flare',
    dilemmaId: 'perseverance-core-sample',
    nasaCredit: 'Curiosity RAD Radiation Telemetry',
  },
  {
    sol: 6,
    arcTitle: 'Hydroponic Harvest & Water Crunch',
    speaker: 'maya',
    speakerName: 'Commander Maya',
    speakerRole: 'Jezero Base Commander',
    commNote: 'OSDR Greenhouse Lab',
    storyPrompt:
      'The crew is hungry and OSDR crops are ready! Click the green Hydroponic Bio-Dome on the right to water and light the plants (+8% O₂/Food, +5 Science, -10 kWh).',
    targetModule: 'biodome',
    hazardType: 'none',
    dilemmaId: 'hydroponics-led-surge',
    nasaCredit: 'NASA OSDR Space Biology Plant Data',
  },
  {
    sol: 7,
    arcTitle: 'Subsurface Ice Discovery',
    speaker: 'leo',
    speakerName: 'Flight Director Leo',
    speakerRole: 'Earth Mission Control',
    commNote: '14-Min Comm Delay · Houston',
    storyPrompt:
      'RIMFAX radar found water ice under Jezero Base! Power up MOXIE or the Hydroponic Bio-Dome to build reserves before nightfall.',
    targetModule: 'biodome',
    hazardType: 'none',
    dilemmaId: 'ice-subsurface-drill',
    nasaCredit: 'NASA Perseverance RIMFAX Radar Survey',
  },
  {
    sol: 8,
    arcTitle: '14-Minute Comm Blackout',
    speaker: 'maya',
    speakerName: 'Commander Maya',
    speakerRole: 'Jezero Base Commander',
    commNote: 'EARTH LINK INTERRUPTED · 14-Min Delay',
    storyPrompt:
      'Solar static cut Earth radio for 14 minutes! Click any module that needs boosting—watch your battery closely before ending Sol 8.',
    targetModule: 'any',
    hazardType: 'glitch',
    dilemmaId: 'water-recycler-leak',
    nasaCredit: 'NASA Deep Space Network & ECLSS Telemetry',
  },
  {
    sol: 9,
    arcTitle: 'Final Prep Before Supply Rocket',
    speaker: 'maya',
    speakerName: 'Commander Maya',
    speakerRole: 'Jezero Base Commander',
    commNote: 'T-Minus 1 Sol to Supply Landing',
    storyPrompt:
      'One night left until the automated Supply Rocket lands! Click modules to top up weak bars—remember every click spends battery kWh.',
    targetModule: 'any',
    hazardType: 'cold',
    dilemmaId: 'perseverance-core-sample',
    nasaCredit: 'NASA Mars Architecture Rendezvous Log',
  },
  {
    sol: 10,
    arcTitle: 'Supply Rocket Rendezvous!',
    speaker: 'leo',
    speakerName: 'Flight Director Leo',
    speakerRole: 'Earth Mission Control',
    commNote: 'Final Landing Window',
    storyPrompt:
      'The automated Supply Rocket is descending to Jezero Crater! Make any final 3D module adjustments, then click End Sol & Watch Night Cycle to bring it home!',
    targetModule: 'any',
    hazardType: 'none',
    dilemmaId: null,
    nasaCredit: 'NASA Mars Sample & Cargo Extraction Telemetry',
  },
];

export type DataLogCategory =
  | 'Mars Science & ISRU'
  | 'Jezero Geological Waypoints'
  | 'Historical Rover Discoveries';

export interface NasaArchiveEntry {
  id: string;
  title: string;
  category: DataLogCategory;
  telemetryTag: string;
  unlockHint: string;
  summary: string;
  nasaFact: string;
  source: string;
}

export const NASA_ARCHIVE_ENTRIES: NasaArchiveEntry[] = [
  {
    id: 'geo-delta',
    title: 'Jezero Ancient River Delta',
    category: 'Jezero Geological Waypoints',
    telemetryTag: '18.38° N · 77.58° E',
    unlockHint: 'Unlocked on touchdown at Jezero Base (Sol 1).',
    summary:
      'Over 3.5 billion years ago, a river flowed into a crater lake at Jezero, fanning out clay-rich mudstones where ancient microbial life signatures could be preserved.',
    nasaFact:
      'Perseverance landed 2 km southeast of the western fan delta front in February 2021 to core sample these ancient lakebed rocks.',
    source: 'NASA Mars 2020 Landing Site Survey',
  },
  {
    id: 'isru-moxie',
    title: 'MOXIE Solid-Oxide O₂ Conversion',
    category: 'Mars Science & ISRU',
    telemetryTag: '95.3% CO₂ -> 99.6% O₂',
    unlockHint: 'Run the MOXIE O₂ Core in 3D view (or reach Sol 2) to decrypt.',
    summary:
      'Mars air is 95% carbon dioxide and 100× thinner than Earth’s. MOXIE compresses CO₂ and heats ceramic cells to 800°C to split off pure breathable oxygen atoms.',
    nasaFact:
      'NASA’s toaster-sized MOXIE unit ran 16 times on Perseverance and generated 122 grams of oxygen—proving astronauts can make air and rocket oxidizer on Mars!',
    source: 'NASA JPL / MIT Perseverance MOXIE Log',
  },
  {
    id: 'hist-spirit-opp',
    title: 'Dust Devils & Electrostatic Solar Cleaning',
    category: 'Historical Rover Discoveries',
    telemetryTag: 'MER-A / MER-B TELEMETRY',
    unlockHint: 'Clean the 6-Panel Solar Array Field in 3D view (or reach Sol 3) to decrypt.',
    summary:
      'Iron-oxide dust carries static cling that slowly coats Martian solar cells. Luckily, passing whirlwinds called dust devils can sweep panels clean in seconds!',
    nasaFact:
      'NASA’s Opportunity rover was designed for 90 Sols, but dust-devil cleaning gusts helped keep its solar panels alive for nearly 15 years!',
    source: 'NASA Mars Exploration Rovers Archive',
  },
  {
    id: 'geo-belva',
    title: 'Belva Crater Rim & MEDA Tau Opacity',
    category: 'Jezero Geological Waypoints',
    telemetryTag: 'TAU INDEX 0.35 – 1.85',
    unlockHint: 'Reach Sol 3 Dust Squall (or clean Solar Array twice) to decrypt.',
    summary:
      'Gusts spilling over Jezero’s crater rim loft fine red dust high into the sky, raising optical depth (Tau) and dimming afternoon sunlight on solar arrays.',
    nasaFact:
      'Perseverance’s MEDA sky-camera and radiation sensors measure Tau every hour to forecast dust squalls across Belva Crater.',
    source: 'Perseverance MEDA Environmental Station',
  },
  {
    id: 'isru-rad-shield',
    title: 'Hydrogen Water-Wall Radiation Armor',
    category: 'Mars Science & ISRU',
    telemetryTag: '0.67 mSv/Sol BASELINE',
    unlockHint: 'Reinforce the Water-Wall Storm Shelter (or survive Sol 4 Flare) to decrypt.',
    summary:
      'Mars lacks a global magnetic field, exposing the surface to cosmic rays and solar flare protons. Pumping water into thick ceiling bladders absorbs incoming radiation.',
    nasaFact:
      'Hydrogen atoms in H₂O are light and dense enough to slow down high-energy solar protons without creating dangerous secondary radiation.',
    source: 'NASA Radiation Works & Curiosity RAD',
  },
  {
    id: 'hist-ingenuity',
    title: 'Ingenuity: First Powered Flight on Mars',
    category: 'Historical Rover Discoveries',
    telemetryTag: '72 FLIGHTS · 610 Pa AIR',
    unlockHint: 'Reach Sol 5 to decrypt orbital aviation telemetry.',
    summary:
      'In Jezero’s thin 610 Pa carbon-dioxide air—just 1% of Earth’s sea-level pressure—helicopter blades must spin at 2,537 RPM to lift off.',
    nasaFact:
      'Originally planned for 5 test flights, NASA’s Ingenuity helicopter completed 72 flights across Jezero Crater, scouting dunes and ridges ahead of Perseverance.',
    source: 'NASA JPL Ingenuity Flight Log',
  },
  {
    id: 'isru-hydroponics',
    title: 'OSDR Hydroponics & Closed-Loop Air',
    category: 'Mars Science & ISRU',
    telemetryTag: 'ECLSS + LED SPECTRUM',
    unlockHint: 'Water & light the Hydroponic Bio-Dome in 3D view (or reach Sol 6) to decrypt.',
    summary:
      'Dwarf wheat, lettuce, and radish crops grown under tuned magenta/white LED arrays absorb crew CO₂ breath while releasing fresh oxygen and edible calories.',
    nasaFact:
      'NASA’s Open Science Data Repository (OSDR) tracks how cosmic radiation and partial gravity alter plant root genes in space greenhouses.',
    source: 'NASA OSDR Space Biology Archive',
  },
  {
    id: 'geo-rimfax',
    title: 'RIMFAX Subsurface Ice & Sediments',
    category: 'Jezero Geological Waypoints',
    telemetryTag: '10m RADAR PENETRATION',
    unlockHint: 'Reach Sol 7 Subsurface Ice Discovery to decrypt.',
    summary:
      'Ground-penetrating radar pulses beneath Jezero Base reveal tilted ancient lakebed rock layers and trapped subsurface water-ice pockets.',
    nasaFact:
      'Perseverance’s RIMFAX instrument continuously maps underground stratigraphy up to 10 meters deep as the rover drives.',
    source: 'NASA Perseverance RIMFAX Team',
  },
  {
    id: 'hist-curiosity-gale',
    title: 'Curiosity RAD & Gale Crater Organics',
    category: 'Historical Rover Discoveries',
    telemetryTag: 'MSL-RAD · CARBON CHAINS',
    unlockHint: 'Survive Sol 8 Comm Blackout (or reinforce Shelter twice) to decrypt.',
    summary:
      'During its 252-million-km cruise and years on Mars, Curiosity’s Radiation Assessment Detector proved astronauts need storm shelters for solar proton events.',
    nasaFact:
      'Curiosity also drilled mudstone at Gale Crater and detected complex organic carbon molecules—the chemical building blocks of life.',
    source: 'NASA Mars Science Laboratory (Curiosity)',
  },
];

export interface ModuleUsageCounts {
  solar: number;
  moxie: number;
  shelter: number;
  biodome: number;
}

export function computeUnlockedLogIds(
  sol: number,
  usage: ModuleUsageCounts
): string[] {
  const unlocked = new Set<string>(['geo-delta']);
  if (usage.moxie >= 1 || sol >= 2) unlocked.add('isru-moxie');
  if (usage.solar >= 1 || sol >= 3) unlocked.add('hist-spirit-opp');
  if (usage.solar >= 2 || sol >= 3) unlocked.add('geo-belva');
  if (usage.shelter >= 1 || sol >= 5) unlocked.add('isru-rad-shield');
  if (sol >= 5) unlocked.add('hist-ingenuity');
  if (usage.biodome >= 1 || sol >= 6) unlocked.add('isru-hydroponics');
  if (sol >= 7) unlocked.add('geo-rimfax');
  if (usage.shelter >= 2 || sol >= 8) unlocked.add('hist-curiosity-gale');
  return Array.from(unlocked);
}

export interface EarthDispatchMessage {
  sol: number;
  timestamp: string;
  dsnStation: string;
  snrDb: string;
  lightDelayMin: string;
  subject: string;
  body: string;
  tacticalHint: string;
}

export const EARTH_DISPATCHES: Record<number, EarthDispatchMessage> = {
  1: {
    sol: 1,
    timestamp: 'SOL 01 · 08:12 LMST',
    dsnStation: 'DSN-70 MADRID',
    snrDb: '+15.4 dB',
    lightDelayMin: '14.0 min',
    subject: 'Welcome to Jezero Crater, Crew!',
    body: 'Flight Director Leo here in Houston. Telemetry shows nominal touchdown! Because light takes 14 minutes to cross 252 million km, you are in command on the ground. Spin up MOXIE O₂ Core before dusk and watch out for fine dust clogging its intake valve tonight.',
    tacticalHint: 'Hint: Click MOXIE O₂ Core (+14% O₂) to build an oxygen cushion before tonight’s valve clog!',
  },
  2: {
    sol: 2,
    timestamp: 'SOL 02 · 07:45 LMST',
    dsnStation: 'DSN-14 GOLDSTONE',
    snrDb: '+12.8 dB',
    lightDelayMin: '14.1 min',
    subject: 'MEDA Dust Devil Advisory',
    body: 'Houston weather radar just caught a spinning dust devil ridge moving toward your 6-panel solar farm. Run your robotic wipers now—red static dust is already cutting solar charging efficiency!',
    tacticalHint: 'Hint: Clean the Solar Array Field (+14 kWh, -22% dust) so tonight’s gust doesn’t starve your batteries.',
  },
  3: {
    sol: 3,
    timestamp: 'SOL 03 · 08:03 LMST',
    dsnStation: 'DSN-43 CANBERRA',
    snrDb: '+10.6 dB',
    lightDelayMin: '14.2 min',
    subject: 'Tau Opacity Rising — Freeze Ahead',
    body: 'Belva Crater winds are pushing Tau above 0.7 and overnight lows will drop to -76°C. Keep your solar cells spotless today because tomorrow’s regional dust squall will cut afternoon recharge sharply.',
    tacticalHint: 'Hint: Bank extra kWh before Sol 4—both the dust squall and solar flare will demand heavy power!',
  },
  4: {
    sol: 4,
    timestamp: 'SOL 04 · 06:58 LMST',
    dsnStation: 'DSN-70 MADRID',
    snrDb: '+8.2 dB',
    lightDelayMin: '14.2 min',
    subject: 'URGENT: DONKI Solar Flare Inbound!',
    body: 'Space Weather just flagged a high-energy solar proton stream headed straight for Mars! By the time you hear this 14-minute delayed burst, particles are hours away. Pump your Water-Wall Shelter to at least 22 cm thick!',
    tacticalHint: 'Hint: Click Shield Up on the Storm Shelter to reach 22+ cm water armor and bounce solar bolts!',
  },
  5: {
    sol: 5,
    timestamp: 'SOL 05 · 09:10 LMST',
    dsnStation: 'DSN-14 GOLDSTONE',
    snrDb: '+9.4 dB',
    lightDelayMin: '14.3 min',
    subject: 'Radiation Aftershock & Delta Relay',
    body: 'Proton flux is still crackling in Jezero’s upper sky. Perseverance also spotted an exposed river-delta core sample nearby—save a bit of power if Dr. Okafor wants to fire the spectrometer tonight.',
    tacticalHint: 'Hint: Keep Water-Wall >= 22 cm during Sol 5 nightfall to prevent radiation crew damage.',
  },
  6: {
    sol: 6,
    timestamp: 'SOL 06 · 08:20 LMST',
    dsnStation: 'DSN-43 CANBERRA',
    snrDb: '+14.8 dB',
    lightDelayMin: '14.3 min',
    subject: 'OSDR Greenhouse Harvest Window',
    body: 'Skies are clearing! Your hydroponic crops are ready for an LED boost. Watering the Bio-Dome refreshes both oxygen and crew nutrition while unlocking new NASA OSDR biology points.',
    tacticalHint: 'Hint: Click Water Crops on the Bio-Dome (+8% O₂/Food, +5 Science) to maximize mission score.',
  },
  7: {
    sol: 7,
    timestamp: 'SOL 07 · 07:50 LMST',
    dsnStation: 'DSN-70 MADRID',
    snrDb: '+16.1 dB',
    lightDelayMin: '14.4 min',
    subject: 'RIMFAX Subsurface Ice Confirmed',
    body: 'Great news from Houston geologists—ground radar confirmed clean water ice 3 meters below your pad! Top up Bio-Dome and O₂ reserves today so you are ready to fire the thermal drill tonight.',
    tacticalHint: 'Hint: Keep ~20+ kWh spare battery if you plan to fire the Thermal Ice Drill tonight (+14% O₂, +6% Shield).',
  },
  8: {
    sol: 8,
    timestamp: 'SOL 08 · 08:40 LMST',
    dsnStation: 'DSN-14 GOLDSTONE',
    snrDb: '+6.1 dB',
    lightDelayMin: '14.4 min',
    subject: 'SOLAR STATIC — LINK DEGRADING',
    body: 'Dust devil static is jamming our Deep Space Network dish! Expect a 14-minute blackout tonight. Check every meter now—if a water-loop gasket freezes, keep emergency heater power ready.',
    tacticalHint: 'Hint: Balance Power >= 35 kWh and Life Support >= 50% before triggering Sol 8 night cycle.',
  },
  9: {
    sol: 9,
    timestamp: 'SOL 09 · 08:05 LMST',
    dsnStation: 'DSN-43 CANBERRA',
    snrDb: '+13.5 dB',
    lightDelayMin: '14.5 min',
    subject: 'T-Minus 1 Sol to Supply Lander!',
    body: 'The automated Cargo Supply Lander is entering Mars orbit! Tonight brings a bitter -80°C freeze (-26 kWh heating draw). Clean panels and reinforce weak systems before final approach.',
    tacticalHint: 'Hint: Clean Solar Dust and keep Crew Health + O₂ comfortably above 40% for the final stretch.',
  },
  10: {
    sol: 10,
    timestamp: 'SOL 10 · 07:30 LMST',
    dsnStation: 'DSN-70 MADRID',
    snrDb: '+17.0 dB',
    lightDelayMin: '14.5 min',
    subject: 'Final Descent Window — Bring It Home!',
    body: 'Skycrane separation confirmed! One last Martian night cycle stands between your crew and fresh cargo. Make any final module boosts, then end Sol 10 to welcome the lander!',
    tacticalHint: 'Hint: Spend extra battery on Bio-Dome or MOXIE for bonus Science Grade before ending Sol 10!',
  },
};

