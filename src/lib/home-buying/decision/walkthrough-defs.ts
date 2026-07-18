// Walk-through section + item definitions with auto-assigned risk levels.
export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';
export type ItemStatus = 'good' | 'minor' | 'major' | 'unknown' | 'na' | 'needs_pro';

export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: 'Critical Risk',
  high: 'High Risk',
  moderate: 'Moderate Risk',
  low: 'Low Risk',
};
export const RISK_COLOR: Record<RiskLevel, string> = {
  critical: 'text-red-400 border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  moderate: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  low: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  good: 'Good',
  minor: 'Minor concern',
  major: 'Major concern',
  unknown: 'Unknown',
  na: 'Not applicable',
  needs_pro: 'Needs professional inspection',
};

export interface CheckItemDef {
  id: string;
  name: string;
  risk: RiskLevel;   // baseline risk if flagged as major
}

export interface WalkSection {
  id: string;
  title: string;
  items: CheckItemDef[];
  questions: string[];
  scenario?: string;
}

const mk = (name: string, risk: RiskLevel = 'moderate'): CheckItemDef => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, ''),
  name, risk,
});

export const WALK_SECTIONS: WalkSection[] = [
  {
    id: 'basement',
    title: 'Basement & Water Intrusion',
    items: [
      mk('Water stains on walls','high'), mk('Water stains on floors','high'), mk('Musty odor','high'),
      mk('Visible mold or mildew','critical'), mk('Efflorescence on masonry','moderate'),
      mk('Rust on furnace legs or stored metal','high'), mk('Fresh paint on only part of a basement wall','high'),
      mk('New drywall in isolated areas','high'), mk('Recently replaced basement flooring','high'),
      mk('Active sump pump','moderate'), mk('Backup sump pump','low'), mk('Battery backup','low'),
      mk('Floor drains','low'), mk('Floor cracks','moderate'), mk('Vertical wall cracks','moderate'),
      mk('Horizontal wall cracks','critical'), mk('Bowing or leaning walls','critical'),
      mk('Standing water outside near foundation','high'), mk('Poor yard grading','moderate'),
      mk('Downspouts ending too close to home','moderate'),
      mk('Sewer odor','high'), mk('Evidence of sewer backup','critical'),
    ],
    questions: [
      'Has the basement ever flooded during heavy rain?',
      'Has water entered through the walls, floor, windows, drains, or sewer?',
      'When was the most recent water event?',
      'How often does the sump pump run?',
      'Has the sump pump ever failed?',
      'Is there a battery or water-powered backup?',
      'Has an insurance claim been filed for water damage?',
      'Has waterproofing work been completed?',
      'Is there a transferable waterproofing warranty?',
      'Has the sewer ever backed up?',
      'Are receipts available for waterproofing or drainage repairs?',
    ],
    scenario: 'If basement has fresh paint, new flooring, or recently installed drywall without a clear reason — flag for moisture testing and further inspection.',
  },
  {
    id: 'roof',
    title: 'Roof & Exterior Drainage',
    items: [
      mk('Roof age unknown or >20 years','high'), mk('Multiple roofing layers','high'),
      mk('Missing shingles','moderate'), mk('Curling shingles','moderate'),
      mk('Soft spots','high'), mk('Sagging roofline','critical'),
      mk('Damaged flashing','moderate'), mk('Chimney damage','moderate'),
      mk('Gutters pulling away from house','moderate'), mk('Clogged/damaged gutters','moderate'),
      mk('No downspout extensions','moderate'), mk('Water pooling near foundation','high'),
      mk('Tree limbs touching roof','moderate'), mk('Moss or algae growth','low'),
      mk('Attic water stains','high'), mk('Daylight visible through attic roof','critical'),
    ],
    questions: [
      'What year was the roof installed?', 'Was the roof fully replaced or patched?',
      'Who completed the work?', 'Is there a transferable warranty?',
      'Are permits or invoices available?', 'Has the roof ever leaked?',
      'Has an insurance claim been filed?', 'How many roofing layers are present?',
      'Has the chimney or flashing been repaired?',
    ],
    scenario: 'A roof described as "newer" without a specific installation year should remain unverified.',
  },
  {
    id: 'foundation',
    title: 'Foundation & Structure',
    items: [
      mk('Horizontal foundation cracks','critical'), mk('Vertical foundation cracks','moderate'),
      mk('Stair-step brick cracks','high'), mk('Bowing walls','critical'),
      mk('Uneven or sloping floors','high'), mk('Doors that stick','moderate'),
      mk('Windows that do not open','moderate'), mk('Gaps between walls and ceilings','high'),
      mk('Sagging floor joists','high'), mk('Temporary support posts','critical'),
      mk('Freshly patched cracks','high'), mk('Water entering through foundation joints','high'),
      mk('Exterior brick separation','high'), mk('Porch pulling away from house','high'),
    ],
    questions: [
      'Has the foundation ever been inspected?', 'Were structural repairs completed?',
      'Are engineering reports available?', 'Are repair warranties transferable?',
      'Were permits obtained?', 'Have cracks grown or changed?',
      'Has the home experienced settling?', 'Are any support posts temporary?',
    ],
  },
  {
    id: 'plumbing',
    title: 'Plumbing & Sewer',
    items: [
      mk('Low water pressure','moderate'), mk('Slow drains','high'),
      mk('Leaks under sinks','moderate'), mk('Unstable toilet','moderate'),
      mk('Water stains','moderate'), mk('Galvanized pipes','high'),
      mk('Cast-iron drain lines aged','high'), mk('Polybutylene plumbing','critical'),
      mk('Main shutoff seized','moderate'), mk('Sewer odors','high'),
      mk('Basement drain backups','critical'), mk('Water heater >10 years','moderate'),
      mk('Water heater corrosion','high'), mk('Evidence of frozen pipes','high'),
      mk('Private well','moderate'), mk('Septic system','moderate'), mk('Lead service line risk','critical'),
    ],
    questions: [
      'Has the sewer line been replaced or repaired?', 'Has the sewer ever backed up?',
      'Has a sewer-camera inspection been performed?', 'What material is the main sewer line?',
      'When was the water heater installed?', 'Have there been recurring leaks?',
      'Does the property have a shared sewer line?', 'Are there lead service lines?',
      'Who is responsible for the line between the house and the street?',
    ],
    scenario: 'Multiple slow drains may indicate a main sewer problem, not an isolated fixture. Recommend a sewer scope.',
  },
  {
    id: 'electrical',
    title: 'Electrical',
    items: [
      mk('Federal Pacific panel','critical'), mk('Zinsco panel','critical'),
      mk('Fuse box','high'), mk('Double-tapped breakers','high'),
      mk('Exposed wiring','critical'), mk('Active knob-and-tube wiring','critical'),
      mk('Aluminum branch wiring','high'), mk('Ungrounded outlets','moderate'),
      mk('Missing GFCI protection','moderate'), mk('Missing AFCI protection','low'),
      mk('Flickering lights','moderate'), mk('Warm outlets','high'),
      mk('Scorched outlets','critical'), mk('Extension cords as permanent wiring','high'),
      mk('Unpermitted electrical work','high'),
    ],
    questions: [
      'When was the electrical panel installed?', 'Was the home rewired?',
      'Is knob-and-tube wiring still active?', 'Were permits obtained for electrical upgrades?',
      'Is the electrical service 100, 150, or 200 amps?',
      'Are garage, basement, kitchen, bathroom, and exterior outlets GFCI-protected?',
    ],
  },
  {
    id: 'hvac',
    title: 'Heating, Cooling & Ventilation',
    items: [
      mk('Furnace age >15 years','high'), mk('Central air age >15 years','high'),
      mk('Boiler age unknown','moderate'), mk('Uneven room temperatures','moderate'),
      mk('Unusual sounds','moderate'), mk('Rust or corrosion','moderate'),
      mk('Dirty filters','low'), mk('No service records','moderate'),
      mk('Missing chimney liner','high'), mk('No CO detectors','high'),
      mk('No bathroom exhaust fans','moderate'), mk('No kitchen ventilation','moderate'),
      mk('Poor attic ventilation','moderate'), mk('Condensation on windows','moderate'),
      mk('Portable heaters used during showing','high'),
    ],
    questions: [
      'When were the furnace and central-air system installed?',
      'When were they last serviced?', 'Are maintenance records available?',
      'Has the heat exchanger been inspected?', 'Does every room receive adequate heating and cooling?',
      'Is the system under warranty?', 'What are the average winter and summer utility bills?',
    ],
    scenario: 'If the listing advertises central air but the system is not operating during showing — mark unverified until independently tested.',
  },
  {
    id: 'windows',
    title: 'Windows, Doors & Insulation',
    items: [
      mk('Windows >20 years','moderate'), mk('Condensation between panes','moderate'),
      mk('Drafts','moderate'), mk('Rot around frames','high'),
      mk('Painted-shut windows','moderate'), mk('Broken locks','moderate'),
      mk('Exterior door damage','moderate'), mk('Missing weather stripping','low'),
      mk('Inadequate attic insulation','moderate'), mk('Inadequate wall insulation','moderate'),
      mk('No basement rim insulation','low'), mk('Ice dam history','high'),
      mk('No egress windows in finished basement rooms','critical'),
    ],
    questions: [
      'When were the windows replaced?', 'Are all windows functional?',
      'Does the finished basement have legal emergency egress?',
      'Has insulation been added?', 'Are utility bills available?',
      'Have ice dams occurred?',
    ],
  },
  {
    id: 'attic',
    title: 'Attic, Mold & Pests',
    items: [
      mk('Mold or dark staining','critical'), mk('Wet insulation','high'),
      mk('Animal droppings','moderate'), mk('Insect activity','moderate'),
      mk('Termite tubes','critical'), mk('Wood damage','high'),
      mk('Insufficient ventilation','moderate'), mk('Bathroom vents terminating in attic','high'),
      mk('Disconnected ductwork','moderate'), mk('Active roof leaks','critical'),
      mk('Vermiculite insulation','high'), mk('Signs of bats','high'),
      mk('Signs of mice','moderate'), mk('Signs of squirrels','moderate'),
      mk('Signs of raccoons','high'),
    ],
    questions: [
      'Has the home been treated for termites or pests?',
      'Is there an active pest warranty?',
      'Has mold remediation been completed?',
      'Are testing and clearance reports available?',
      'Do bathroom and kitchen vents terminate outside?',
    ],
  },
  {
    id: 'insurance',
    title: 'Insurance & Financing Risks',
    items: [
      mk('Prior insurance claims','high'), mk('Flood-zone status','high'),
      mk('Sewer-backup history','high'), mk('Roof insurability concerns','high'),
      mk('Electrical-system insurability','high'), mk('Knob-and-tube wiring','critical'),
      mk('Unpermitted additions','high'), mk('Peeling exterior paint','moderate'),
      mk('Missing handrails','moderate'), mk('Broken windows','moderate'),
      mk('Trip hazards','moderate'), mk('Detached structures poor condition','moderate'),
      mk('Pool condition concerns','high'), mk('Underground oil tank','critical'),
      mk('High property tax history','moderate'), mk('Special assessments','high'),
      mk('FHA repair concerns','high'),
    ],
    questions: [
      'Are there unresolved insurance claims?', 'Is the property insurable without major repairs?',
      'Is flood insurance required?', 'Are there special tax assessments?',
      'Has the property recently been reassessed?', 'Are additions and finished spaces permitted?',
      'Will any condition prevent FHA approval?', 'Are seller repairs required before closing?',
    ],
  },
  {
    id: 'disclosure',
    title: 'Seller Disclosure & Property History',
    items: [
      mk('Owner reluctant to answer questions','high'),
      mk('Property previously off-market','moderate'),
      mk('Prior buyers terminated contracts','high'),
      mk('Property vacant for extended period','moderate'),
      mk('Used as rental','low'),
      mk('Open permits','high'),
      mk('Code violations','high'),
      mk('Boundary/driveway/fence disputes','high'),
      mk('Easements','moderate'),
      mk('Leased equipment (solar, alarm)','moderate'),
    ],
    questions: [
      'Why is the seller moving?', 'How long has the property been owned?',
      'Why was it previously removed from the market?', 'Have prior buyers terminated contracts?',
      'Were inspection reports completed during earlier contracts?',
      'What repairs were made after previous inspections?',
      'Has the property been vacant?', 'Has the property been used as a rental?',
      'Are there open permits?', 'Are there code violations?',
      'Are there property-boundary, driveway, or fence disputes?',
      'Are there easements?', 'Is any equipment leased?',
      'What personal property is included?',
      'Are warranties, repair invoices, and service records available?',
    ],
  },
];

export const NEIGHBORHOOD_ITEMS: CheckItemDef[] = [
  mk('Heavy traffic','moderate'), mk('Street parking scarce','low'),
  mk('Speeding vehicles','moderate'), mk('Train noise','moderate'),
  mk('Highway noise','moderate'), mk('Airport noise','moderate'),
  mk('Industrial noise','high'), mk('Barking dogs','low'),
  mk('Late-night activity','moderate'), mk('Nearby vacant properties','moderate'),
  mk('Poorly maintained neighbors','moderate'), mk('Poor street lighting','moderate'),
  mk('Poor sidewalk condition','low'), mk('Poor alley condition','low'),
  mk('Flood-prone streets','high'), mk('Frequent emergency response','high'),
  mk('Nearby bars or entertainment','moderate'), mk('School pickup route','low'),
  mk('High rental concentration','moderate'), mk('Poor cellphone reception','moderate'),
  mk('Poor internet availability','moderate'),
];

export const NEIGHBORHOOD_QUESTIONS = [
  'What is the recent crime pattern in the immediate area?',
  'Are there recurring property crimes?',
  'Are there recurring vehicle break-ins?',
  'Are there violent incidents nearby?',
  'Is the street noisy in the evening or on weekends?',
  'Are there train horns at night?',
  'Are there industrial operations nearby?',
  'Are there planned developments or zoning changes?',
  'Are road projects planned?',
  'Does the street flood after heavy rain?',
  'Are there parking restrictions?',
  'Are nearby vacant lots scheduled for development?',
  'Are there neighborhood association fees or restrictions?',
];

export const INSPECTOR_QUESTIONS = [
  'What are the three most expensive concerns?',
  'Which issues are safety concerns?',
  'Which issues could affect FHA approval?',
  'What needs immediate repair?',
  'What may fail within one to three years?',
  'Is a specialist needed for the roof?',
  'Is a foundation specialist needed?',
  'Is a sewer scope needed?',
  'Is a chimney inspection needed?',
  'Is mold testing needed?',
  'Is an electrician needed?',
  'Is an HVAC specialist needed?',
  'Is there evidence of previous repairs?',
  'Are repairs cosmetic or structural?',
  'Which areas were inaccessible?',
  'What should be reinspected before closing?',
  'What maintenance should begin immediately after purchase?',
];

export const SCENARIOS = [
  { id: 'fresh_basement', title: 'Fresh Basement Renovation',
    prompts: ['Why was the basement renovated?','Was there previous water damage?','Were permits obtained?','Are before-and-after photos available?','Was mold testing completed?','Is the finished space legally in the square footage?'] },
  { id: 'air_freshener', title: 'Strong Air Freshener',
    prompts: ['Investigate: mold, mildew, pet odors, smoke, sewer gas, fuel oil, moisture, or HVAC problems.'] },
  { id: 'hidden_walls', title: 'Furniture Hiding Walls',
    prompts: ['Mark concealed areas as Unknown.','Require reinspection before removing the inspection contingency.'] },
  { id: 'flip', title: 'Recently Flipped Property',
    prompts: ['Verify permits, contractor info, electrical/plumbing/structural work, waterproofing, roof work, mechanical system age, before/after photographs.'] },
  { id: 'low_price_high_tax', title: 'Low Price / High Taxes',
    prompts: ['Scorecard calculates actual all-in payment: P&I + FHA MIP + taxes + insurance + HOA + flood + special assessments.'] },
  { id: 'seller_silent', title: 'Seller Will Not Answer',
    prompts: ['Insufficient Information. Do Not Waive Inspection or Due Diligence.'] },
];
