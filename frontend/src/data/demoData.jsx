export const DEMO_DASHBOARD_CARDS = [
  { title: 'Open Violations', value: 84, prefix: '', color: 'from-rose-50 to-rose-100', icon: '⚠️' },
  { title: 'Inspections Today', value: 26, prefix: '', color: 'from-cyan-50 to-cyan-100', icon: '🧭' },
  { title: 'AI Detections', value: 540, prefix: '', color: 'from-amber-50 to-amber-100', icon: '🤖' },
  { title: 'Avg Resolution', value: '18h 24m', prefix: '', color: 'from-lime-50 to-lime-100', icon: '⏱️' },
];

export const DEMO_VIOLATION_DISTRICT = [
  { name: 'Old City', value: 23 },
  { name: 'Al Haram', value: 17 },
  { name: 'Quba', value: 14 },
  { name: 'Jabal Uhud', value: 10 },
  { name: 'Aziziyah', value: 8 },
];

export const DEMO_COMPLIANCE_TREND = [
  { name: 'Week 1', score: 72 },
  { name: 'Week 2', score: 78 },
  { name: 'Week 3', score: 82 },
  { name: 'Week 4', score: 88 },
  { name: 'Week 5', score: 91 },
];

export const DEMO_DETECTION_CONFIDENCE = [
  { name: '>= 95%', value: 34 },
  { name: '90-95%', value: 27 },
  { name: '80-90%', value: 17 },
  { name: '< 80%', value: 22 },
];

export const DEMO_TASKS = [
  {
    id: 'T-081',
    title: 'Inspect spice market',
    status: 'Assigned',
    district: 'Al Haram',
    assignment: 'Field Inspector Ali',
    due: 'Today 11:00',
    priority: 'Urgent',
  },
  {
    id: 'T-054',
    title: 'Review AI findings for mall',
    status: 'In Progress',
    district: 'Aziziyah',
    assignment: 'Supervisor Nadia',
    due: 'Tomorrow',
    priority: 'Routine',
  },
  {
    id: 'T-120',
    title: 'Schedule plaza walkthrough',
    status: 'Planned',
    district: 'Jabal Uhud',
    assignment: 'Municipality Admin',
    due: 'Next week',
    priority: 'Scheduled',
  },
  {
    id: 'T-099',
    title: 'Validate license sync',
    status: 'Completed',
    district: 'Quba',
    assignment: 'System Operator Omar',
    due: 'Yesterday',
    priority: 'Routine',
  },
];

export const DEMO_SCHEDULE = [
  { inspector: 'Ali Kareem', shift: '08:00 - 16:00', status: 'On Duty', area: 'Al Haram' },
  { inspector: 'Fatima Zahra', shift: '10:00 - 18:00', status: 'Scheduled', area: 'Old City' },
  { inspector: 'Youssef Malik', shift: '14:00 - 22:00', status: 'On Leave', area: 'Quba' },
  { inspector: 'Sara Hadi', shift: '06:00 - 14:00', status: 'On Call', area: 'Aziziyah' },
];

export const DEMO_REPORTS = [
  { id: 'R-2026-Q2', title: 'Quarterly Violation Trends', category: 'Compliance', status: 'Ready', updated: 'May 12, 2026' },
  { id: 'R-2026-M05', title: 'Inspector Performance Scorecard', category: 'Operations', status: 'Draft', updated: 'May 14, 2026' },
  { id: 'R-2026-ZN', title: 'Zone-wise Hotspot Analysis', category: 'GIS', status: 'Ready', updated: 'May 10, 2026' },
];

export const DEMO_INTEGRATIONS = [
  { name: 'Property Registry API', status: 'Active', lastSync: '3 mins ago', description: 'Real-time property and ownership synchronization.' },
  { name: 'License Verification', status: 'Active', lastSync: '8 mins ago', description: 'Live license validation from municipal systems.' },
  { name: 'Kobo Toolbox', status: 'Scheduled', lastSync: '22 mins ago', description: 'Form submission ingestion and analytics sync.' },
  { name: 'Street View', status: 'Pending', lastSync: 'N/A', description: 'Demo Mapillary street view connection for inspection routes.' },
];

export const DEMO_BUILDINGS = [
  {
    id: 'B-01',
    name: 'Central Commercial Complex',
    floors: ['Ground', '1st Floor', '2nd Floor'],
    units: 24,
    activeViolations: 6,
    selectedFloor: 'Ground',
  },
  {
    id: 'B-02',
    name: 'Al Noor Mall',
    floors: ['Ground', '1st Floor'],
    units: 18,
    activeViolations: 3,
    selectedFloor: 'Ground',
  },
];
