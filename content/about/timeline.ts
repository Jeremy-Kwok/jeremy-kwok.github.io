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
    label: 'Georgia Tech: B.S. ME, CS minor',
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
    title: 'Senior capstone: MedLock',
    dates: 'Aug – Dec 2026',
    description:
      'MedLock, a tabletop station that walks IVF patients through preparing an injection at home, then images the syringe to check the volume and air before they inject. I do all of the CAD. I started customer discovery before we had defined the problem, interviewing clinicians and researchers, and I wrote our clinic and patient surveys. I keep at it as the prototype develops, to check we’re still solving the problem people actually have.',
    links: [{ text: 'Read about MedLock', href: '/projects/medlock/' }],
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
      'Wrote the plan to qualify a replacement vacuum cup on a 63-cup depalletizing gripper: bench tests on a force/vacuum jig with KEYENCE pressure sensing, then an A/B field comparison I led at a 24/7 customer distribution center. The field phase caught a durability failure the bench missed, and the pre-set criteria called a no-swap before any fleet rollout. I also built StatsMonitor, a fleet reliability pipeline covering 13 controllers at 6 customer sites, whose daily KPI report and ranked watchlist the service team uses to decide which units get attention first.',
    links: [
      { text: 'Read about the vacuum cup validation', href: '/projects/eoat-supplier-change-qualification/' },
      { text: 'Read about StatsMonitor', href: '/projects/statsmonitor/' },
    ],
  },
  {
    id: 'bloom',
    lane: 'work',
    segments: [['2026-06', '2026-08']],
    label: 'Bloom Energy',
    title: 'Bloom Energy, repair & overhaul / engineering intern',
    dates: 'Jun – Aug 2026',
    description:
      'Designed and built IRIS, Bloom’s first machine vision inspection station for returned fuel cell columns. Its five cameras are meant to capture burns and field damage before teardown, with each image checked for focus and exposure and filed under the unit serial. I came up with several possible designs, presented them to my manager with a recommendation, and priced the hardware in three tiers. From there I owned the optics, mechanical design, capture software, procurement and testing, and handed the station off to operations eight weeks after starting.',
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
      'Managed two project teams for Readeezy Literacy. Both times I started as engineering manager, and when the product manager dropped out I took on that role too. The winter 2024 team brought Readeezy’s digital library for struggling teen and older readers to smartphones: we redesigned the pages, made the reading activities work on mobile, and cut duplicate code by 28%. I also co-built one of the activities, Character Match, with one of our engineers: if I was going to ask the team to build something, I wanted to show I’d do it too.',
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
      'Directed 7 more project teams building software for nonprofits (9 in all, counting the two I managed), including two more Readeezy projects: an AI reading companion prototype and a single reading-settings toggle. Assessed 600+ program applications and trained 150+ student managers in product management.',
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
      'Now: I own the damage analysis for a 397-indentation atomic force microscopy (AFM) dataset, 102 T cells over four days after thaw. I built the imaging pipeline that follows each indented cell frame by frame; finding the cantilever per session lifted detection of the indented cell on the hardest day from 62% to 96% of frames. The analysis uses the load the instrument actually delivered, not the commanded setpoint. Before that, in fall 2025, I built a pipeline that finds and outlines the indented cell; on frames it never trained on, its outlines match hand tracing at 0.813 mean Dice (1 is a perfect match).',
    links: [{ text: 'Read about the research', href: '/projects/afm-research/' }],
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
      'Director of Pneumatics on Stuyvesant’s FIRST Robotics Competition (FRC) team through high school graduation: designed and maintained the pneumatic systems on two robots, Excelsior and Jim. I was also second in command on the swerve drivetrain: some of the CAD, building some of the swerve modules and the one-piece bumpers, fabrication, and teaching rookies to build the rest.',
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
