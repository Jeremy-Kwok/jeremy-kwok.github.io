// Timeline data for the /about page. Types and validation: lib/aboutSchema.ts
// and lib/aboutContent.ts (the build fails on a bad month, an unknown lane, or
// two items forced onto overlapping rows).
// Months are 'YYYY-MM'. Each segment is [start, end], both inclusive.

import type { Axis, Lane, TimelineItem } from '@/lib/aboutSchema';

/** Chart range. End should extend automatically if today passes it (see spec). */
export const AXIS: Axis = { start: '2022-01', end: '2027-03' };

export const DEFAULT_SELECTED = 'bloom';

export const LANES: Lane[] = [
  { id: 'school', name: 'School', color: '#2B5FA6' },
  { id: 'work', name: 'Work', color: '#C8641A' },
  { id: 'nonprofit', name: 'Nonprofit work', color: '#7A4BB0' },
  { id: 'research', name: 'Research', color: '#2E8571' },
  { id: 'building', name: 'Building', color: '#8A6A14' },
];

export const ITEMS: TimelineItem[] = [
  // School
  {
    id: 'sbu',
    lane: 'school',
    segments: [['2023-08', '2024-07']],
    label: 'Stony Brook University',
    title: 'Stony Brook University',
    dates: 'Fall 2023 – Summer 2024',
    description: 'Started college at Stony Brook, then transferred to Georgia Tech for fall 2024.',
  },
  {
    id: 'gt',
    lane: 'school',
    segments: [['2024-08', '2026-12']],
    milestone: true,
    label: 'Georgia Tech: B.S. Mechanical Engineering, CS minor',
    title: 'Georgia Tech',
    dates: 'Aug 2024 – Dec 2026',
    description:
      'Transferred from Stony Brook in fall 2024. B.S. in Mechanical Engineering with a CS minor and a micro- and nano-engineering concentration, graduating in December 2026.',
  },
  {
    id: 'capstone',
    lane: 'school',
    segments: [['2026-08', '2026-12']],
    label: 'Capstone',
    title: 'Senior capstone',
    dates: 'Fall 2026 – Dec 2026',
    description:
      'A training and guidance platform for preparing IVF medications. I do all of the CAD. Before we designed anything, I ran customer discovery (interviews and surveys) to find the problems people were actually running into. As the prototype develops, I keep interviewing and surveying potential customers to check that our solution still targets that problem and to find product-market fit.',
  },

  // Work
  {
    id: 'av',
    lane: 'work',
    segments: [
      ['2024-09', '2024-12'],
      ['2025-01', '2025-05'],
      ['2025-08', '2025-12'],
      ['2026-08', '2026-12'],
    ],
    label: 'GT Audiovisual Services, part-time',
    title: 'Georgia Tech Audiovisual Services',
    dates: 'Semesters on campus, since Sep 2024',
    description: 'Part-time technical assistant, about 20 hours a week, only during semesters I’m on campus.',
  },
  {
    id: 'mujin',
    lane: 'work',
    segments: [['2026-01', '2026-04']],
    label: 'Mujin',
    title: 'Mujin, product development intern',
    dates: 'Jan – Apr 2026',
    description:
      'Shipped three things in 15 weeks: StatsMonitor (controller telemetry, reliability KPIs and a weekly risk watchlist for the support team), a tool that bundles one incident’s logs and video from a single form, and a bench-plus-field validation plan for a suction cup vendor change.',
    links: [
      { text: 'Read about StatsMonitor', href: '/projects/statsmonitor/' },
      { text: 'Read about the EOAT qualification', href: '/projects/eoat-supplier-change-qualification/' },
    ],
  },
  {
    id: 'bloom',
    lane: 'work',
    segments: [['2026-06', '2026-08']],
    label: 'Bloom Energy',
    title: 'Bloom Energy, mechanical engineering intern',
    dates: 'Jun – Aug 2026',
    description:
      'Built IRIS, a five-camera station that photographs every returned fuel-cell column before teardown, checks each image for focus and lighting, and files it under the unit serial. I came up with several possible designs, presented them to my manager with a recommendation, then priced the hardware in three tiers and recommended one. From there I handled the optics, mechanical design, software and procurement.',
    links: [{ text: 'Read about IRIS', href: '/projects/iris-integrated-reliability-imaging-system/' }],
  },

  // Nonprofit work (DFG on the top row on purpose)
  {
    id: 'rfa',
    lane: 'nonprofit',
    track: 1,
    segments: [['2022-01', '2024-06']],
    label: 'RoboticsForAll',
    title: 'RoboticsForAll',
    dates: 'Jan 2022 – Jun 2024',
    description:
      'Unpaid outreach and operations work. Started on business development, then took on administrative work, bookkeeping and organizing materials.',
  },
  {
    id: 'dfgpm',
    lane: 'nonprofit',
    track: 0,
    segments: [['2023-04', '2024-03']],
    label: 'Develop for Good: EM/PM',
    title: 'Develop for Good, engineering and product manager',
    dates: 'Apr 2023 – Mar 2024',
    description:
      'Co-led a team of ten that brought Readeezy Literacy’s digital library for struggling teen and older readers to smartphones: redesigned the pages, made the reading activities work on mobile, and cut duplicate code by 28%.',
    quote: {
      text: '“…outstanding in keeping everyone on task and maintaining a positive and supportive environment.”',
      by: 'Maria Cleary, President of Readeezy Literacy, in Develop for Good’s March 2024 newsletter',
    },
    links: [
      { text: 'Read the newsletter feature', href: 'https://developforgood.substack.com/p/develop-for-good-march-2024' },
      {
        text: 'Read the case study',
        href: 'https://developforgood.notion.site/Readeezy-Literacy-bringing-a-digital-library-to-smartphones-for-struggling-readers-f294ae43c9214ea2ae6f640846cb5eb3',
      },
    ],
  },
  {
    id: 'epic',
    lane: 'nonprofit',
    track: 1,
    segments: [['2024-08', '2024-12']],
    label: 'Epic Consulting',
    title: 'Epic Consulting',
    dates: 'Fall 2024',
    description:
      'One semester with Epic Consulting during my first term at Georgia Tech. I was the lead consultant on a team of about six. Our client, Pebble Tossers, wanted more traction with a younger audience, so we updated their website’s layout, page elements and visual theme to appeal to them and to get Pebble Tossers in front of more people overall.',
  },
  {
    id: 'dfgpl',
    lane: 'nonprofit',
    track: 0,
    segments: [['2024-04', '2025-12']],
    label: 'Develop for Good: Product Lead',
    title: 'Develop for Good, product lead',
    dates: 'Apr 2024 – Dec 2025',
    description:
      'Directed 7 project teams building software for nonprofits, including two more Readeezy projects: an AI reading companion prototype and a single reading-settings toggle. Reviewed 300+ program applications and trained 100+ student managers to lead their teams.',
  },

  // Research
  {
    id: 'lab',
    lane: 'research',
    segments: [['2025-06', '2026-12']],
    label: 'Sulchek Lab, undergraduate research',
    title: 'Sulchek Lab, undergraduate research',
    dates: 'Jun 2025 – Dec 2026',
    description:
      'Built an AFM tip-cell segmentation pipeline that reaches 0.813 mean Dice on held-out data. Continuing through graduation.',
    links: [{ text: 'Read about the segmentation pipeline', href: '/projects/afm-cell-segmentation/' }],
  },

  // Building
  {
    id: 'frc',
    lane: 'building',
    segments: [['2022-01', '2023-06']],
    label: 'FRC: StuyPulse',
    title: 'FRC robotics, StuyPulse',
    dates: '2022 – Jun 2023',
    description:
      'Director of Pneumatics on Stuyvesant’s FRC team through high school graduation: designed the robot’s pneumatics subsystem, kept it leak-free through the season, and taught newer members how it worked.',
    links: [{ text: 'Read about the mechanical builds', href: '/projects/mechanical-builds/' }],
  },
  {
    id: 'enport',
    lane: 'building',
    segments: [['2026-01', '2026-10']],
    label: 'Enport',
    title: 'Enport',
    dates: 'Jan – Oct 2026',
    description: 'Founded and built a structured portfolio platform for engineering students. Wound it down in October 2026.',
    links: [{ text: 'Read about Enport', href: '/enport/' }],
  },
];
