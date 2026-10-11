export interface ActivityPhoto {
  driveId: string;
  title: string;
  caption?: string;
}

export interface ActivitySectionItem {
  id: string;
  navLabel: string;
  title: string;
  category: string;
  badge: string;
  summary: string;
  description: string;
  keyTopics?: string[];
  photos: ActivityPhoto[];
  stats?: { label: string; val: string }[];
}

export const ACTIVITIES_DATA: ActivitySectionItem[] = [
  {
    id: 'value-based-seminars',
    navLabel: 'Value Based Seminars',
    title: 'Value Based Seminars',
    category: 'Character & Mind Mastery',
    badge: 'Flagship Youth Modules',
    summary: 'Empowering engineering & university scholars across IITs, NITs, and top institutes with vital life-skills.',
    description:
      'Conducted over two decades in 100+ prestigious colleges across India. Our interactive modules address root behavioral challenges—transforming stress into calm clarity, lethargy into proactive discipline, and negative tendencies into purposeful living.',
    keyTopics: [
      'Drug Abuse & Vice Prevention',
      'The Science & Power of Habits',
      'Anger & Emotional Management',
      'Time Management & Focus Mastery',
      'Will Power to Excel in Academics',
      'Secrets of Success & Mind Over Matter'
    ],
    photos: [
      {
        driveId: '1LsL3AN27Q5yjUtF1_XY9gVf9EMS0rKL1',
        title: 'Value Based Seminar Session',
        caption: 'Senior mentors delivering an interactive value-based lecture to packed college auditoriums.'
      },
      {
        driveId: '17TcbOxB7YCXnRm8RAFZGi9186x4brfkU',
        title: 'Interactive Student Engagement',
        caption: 'Students actively participating in self-reflection and character-building exercises.'
      },
      {
        driveId: '1NitXVfxYMI7xb9ZiVGOmKcOunDpG-E-q',
        title: 'Campus Leadership Gathering',
        caption: 'Youth leaders coming together for holistic values and academic excellence.'
      }
    ]
  },
  {
    id: 'software-training',
    navLabel: 'Software Training',
    title: 'Software Training Workshop',
    category: 'Tech & Career Empowerment',
    badge: 'Industry Readiness',
    summary: 'Hands-on technical bootcamps, programming masterclasses, and software industry mentoring.',
    description:
      'Bridging university curriculum with top-tier technology industry demands. Seasoned engineers and alumni from multinational tech firms conduct hands-on coding workshops, architectural deep dives, and resume reviews—equipping students with real-world competence.',
    keyTopics: [
      'Full-Stack Architecture & Modern Frameworks',
      'Algorithms & Problem-Solving Strategies',
      'System Design & Database Optimization',
      'Mock Technical Interviews & Resume Polishing',
      'Tech Ethics & Values in Silicon Valley / IT Hubs'
    ],
    photos: [
      {
        driveId: '1XbJqMkYb5s-kSg3pJ-RHEXl82X43OT1R',
        title: 'Hands-on Software Workshop',
        caption: 'Students practicing live programming and building projects with mentor supervision.'
      },
      {
        driveId: '1bXEsOlKiVBKVlgbsUgpBwDsTXzNB57Iz',
        title: 'Engineering Lab Bootcamp',
        caption: 'Interactive technical lab session breaking down complex concepts into practical skills.'
      },
      {
        driveId: '1XHU8h6WaX3zRiBzOQErVXFddlx025P_y',
        title: 'Collaborative Problem Solving',
        caption: 'Team sprint solving algorithmic and engineering system challenges together.'
      },
      {
        driveId: '1O0cLR6c6KHP4ufe2DAachj1JXqcbopmT',
        title: 'Tech Mentorship Circle',
        caption: 'Industry tech leads sharing career roadmaps, guidance, and project evaluations.'
      }
    ]
  },
  {
    id: 'teachers-program',
    navLabel: 'Teachers Program',
    title: 'Teachers Program & Faculty Empowerment',
    category: 'Educator Enrichment',
    badge: 'Pedagogy & Mental Wellness',
    summary: 'Equipping professors, educators, and mentors with emotional resilience and transformative teaching tools.',
    description:
      'Educators shape the nation. Our specialized faculty development seminars provide holistic tools for stress relief, empathetic student counseling, classroom engagement, and timeless Vedic teacher-student (Guru-Shishya) dynamics.',
    keyTopics: [
      'Faculty Emotional Resilience & Burnout Prevention',
      'Empathetic Student Counseling & Mentorship',
      'Classroom Value Inculcation Methods',
      'Work-Life Balance & Calm Mind Practices',
      'Reviving Timeless Indian Mentorship Traditions'
    ],
    photos: [
      {
        driveId: '1U7GvN6qDpD2OudHFw8tKgr5UmoNSQN0L',
        title: 'Faculty Empowerment Convention',
        caption: 'College professors gathering for dynamic pedagogical and wellness sessions.'
      },
      {
        driveId: '1AgFmS_QOD4RM-Dz-WOC9SOmi4Lkfr2x7',
        title: 'Educator Interactive Dialogue',
        caption: 'Professors discussing modern student challenges and values integration.'
      },
      {
        driveId: '1tAzG8mn3HiwxXK9rM6740GY1OhXGiOJc',
        title: 'Faculty Appreciation & Honours',
        caption: 'Honouring teachers who inspire character, ethics, and clarity in their students.'
      },
      {
        driveId: '19och-n7aQTwvt80XR9yWy_oIfCejCDZ0',
        title: 'Mentorship Workshop for Educators',
        caption: 'Practical counseling techniques for mentoring Gen-Z students.'
      }
    ]
  },
  {
    id: 'festivals',
    navLabel: 'Festivals',
    title: 'Cultural Festivals & Youth Conventions',
    category: 'Vibrant Celebrations',
    badge: 'Joy & Spiritual Ecstasy',
    summary: 'Massive college youth festivals, traditional pageantry, musical celebrations, and national conventions.',
    description:
      'Celebrations that awaken the soul. From campus Janmashtami and Ratha Yatra processions to annual youth conventions, our festivals blend joyous music, cultural drama, delicious vegetarian feasts, and pure positive camaraderie.',
    keyTopics: [
      'National & Regional Youth Conventions (Prerna / Utkarsh)',
      'Campus Heritage Ratha Yatra & Festival of Joy',
      'Janmashtami Cultural Celebrations',
      'Grand Sattvic Prasadam Feasts',
      'Soulful Kirtan Mela & Thematic Stage Dramas'
    ],
    photos: [
      {
        driveId: '1yoyB3wLOpCaIOrsoFoxzAHwSWXSjOKq0',
        title: 'Grand Youth Festival Gathering',
        caption: 'Thousands of students celebrating together with joyful spirit and higher purpose.'
      },
      {
        driveId: '1nGtV5xnOdlZ8VMe0VR7Uitnb1bmlU1RZ',
        title: 'Vibrant Cultural Celebrations',
        caption: 'Rich traditional music and stage performance at our annual youth meet.'
      },
      {
        driveId: '1jnVSKNC8gpe3A6OEeWPQRTKvDLUiKMlX',
        title: 'Campus Festival of Joy',
        caption: 'Students experiencing pure bliss, harmony, and togetherness.'
      },
      {
        driveId: '18Xx6CfTweD1Kih7Hkxnc3p6AFSibdJi-',
        title: 'Spiritual Ecstasy & Feast',
        caption: 'Uniting university youth in cultural pride and deep spiritual friendship.'
      }
    ]
  },
  {
    id: 'music-and-art',
    navLabel: 'Music & Art',
    title: 'Music and Art Heritage Workshops',
    category: 'Aesthetic & Cultural Expression',
    badge: 'Elevating the Senses',
    summary: 'Classical Indian music, Mridanga & Harmonium training, spiritual arts, and drama.',
    description:
      'Channeling youthful creative passions into transcendent art. Students learn traditional rhythmic percussion (Mridanga, Kartals), harmonium melodies, Vedic fine arts, and devotional theater that calm anxiety and refine the intellect.',
    keyTopics: [
      'Mridanga Rhythms & Percussion Masterclasses',
      'Harmonium & Classical Vocal Ragas',
      'Sacred Art, Mandala & Visual Storytelling',
      'Theatrical Drama & Cultural Performances',
      'Sound Therapy & Meditative Kirtan'
    ],
    photos: [
      {
        driveId: '1Q8Bw7EbueVkYfjZPac77SkxxGbHO5RqK',
        title: 'Mridanga & Kirtan Training',
        caption: 'Youth practicing traditional Indian percussion and rhythmic mantras.'
      },
      {
        driveId: '18w9qW36bAErMYzaPM0fnjEOy31x5axS2',
        title: 'Soulful Musical Evening',
        caption: 'Acoustic spiritual melodies bringing deep inner calm and mental focus.'
      },
      {
        driveId: '1SFzePPIp1bkjzQsjeipPDU_mABd7WL-0',
        title: 'Sacred Arts & Creative Expression',
        caption: 'Expressing devotion, beauty, and philosophical depth through visual arts.'
      },
      {
        driveId: '1aRuAQpBjzuSTGK5KhQ6zQfGiA8xYrqob',
        title: 'Cultural Stage Drama',
        caption: 'Students staging dramatic adaptations of timeless wisdom tales.'
      }
    ]
  },
  {
    id: 'public-presentation',
    navLabel: 'Public Presentation & GD',
    title: 'Public Presentation & Group Discussion',
    category: 'Leadership & Eloquence',
    badge: 'Articulate Confidence',
    summary: 'Weekly oratorical symposiums, debating forums, extempore speaking, and collaborative problem-solving.',
    description:
      'Building confident, articulate, and principled leaders. Youth participate in weekly presentation circles where they present scientific, ethical, and philosophical topics, defend ideas with clarity, and engage in constructive group dialogue.',
    keyTopics: [
      'Stage Presence & Public Speaking Mastery',
      'Constructive Group Discussion (GD) Strategies',
      'Art of Thoughtful Debating & Persuasion',
      'Logical Argumentation & Overcoming Stage Fear',
      'Ethical Communication in High-Stakes Environments'
    ],
    photos: [
      {
        driveId: '1mIySA0Jv-UXcf_vEZul6jhGM9iHBUhY1',
        title: 'Public Speaking Workshop',
        caption: 'Student taking the podium to articulate ideas before a live audience.'
      },
      {
        driveId: '1394mnOQSMJvFpiE7BzXYuu7jv0Zj6QQu',
        title: 'Group Discussion & Brainstorming',
        caption: 'Interactive circle tackling real-world moral and societal questions.'
      },
      {
        driveId: '1EW5MqV6cwiu2DKU7Y-vqSor2QH51srzz',
        title: 'Presentation & Feedback Round',
        caption: 'Peers and mentors offering constructive feedback on delivery and depth.'
      },
      {
        driveId: '1TMHDlq4WvXhI69IbSucIN2xrEV25DJ5B',
        title: 'Debate & Oratorical Excellence',
        caption: 'Nurturing future thought leaders with fearless yet respectful speech.'
      }
    ]
  }
];

export const CORPORATE_DATA = {
  headline: 'Corporate Activities & Executive Well-Being',
  description:
    'Bringing sanity, values, and mindfulness to the high-pressure corporate ecosystem. Senior mentors conduct tailored retreats, wellness keynotes, and emotional intelligence modules for leading global enterprises.',
  counters: [
    { label: 'Individuals Touched', val: '10,000+', icon: 'Users' },
    { label: 'Sessions Conducted', val: '500+', icon: 'Presentation' },
    { label: 'Companies Benefitted', val: '50+', icon: 'Building2' }
  ],
  mainPhoto: {
    driveId: '1hKiWojzwVOUiAhdP33WdoDBq3mfY4f7u',
    title: 'Corporate Leadership & Mindfulness Session',
    caption: 'Executive wellness keynote conducted for senior corporate managers.'
  },
  logos: [
    '1rWM6CKg6L2DtcZl-xmyy3EE23EKwjYvH',
    '1gJBVLMktiB1Eoct2-Pv734h2bhduf8eM',
    '1lDYn2iJWF6gDvRPc0o6HGFWJbR7R2k4X',
    '1-OvhTDtL1yPZD7L7TlGKt4UoUy7hNICy',
    '1HnXDQRbo3DdKPBZ3KCtD6rDRYkXQOkbA',
    '13n0YdtWYi3eNmoEUh4353cwLJIznHEGh',
    '1YAnFsc4Bhgk_Gy3UGqfm4iDGqL2bsIkW',
    '1xVU5Lnd3P3ZaU8bvJmiN1boUujdDeMuR',
    '1xnT_1g46Up9OVuHii2Hvk2ny3eCjjFwd',
    '1f2Crr0DupiOQPjXgflthmVTI2sVogCuO',
    '1_-PPVnwBUqhyJx1KsCqLW1d5xguon0Ox',
    '1d0z2FelA5p_BtPMnYDQ_5OR_E6HM_HuR'
  ]
};

export const DE_ADDICTION_DATA = {
  quote:
    'Drug addiction in India has become a burning issue which plagues the modern youth today. No wonder our Honorable Prime Minister, Shri Narendra Modi Ji called drug addiction to be a “National pain” in his famous “Mann Ki Baat” address on 14th Dec 2014. Below we present some facts which make it evident that this “pain” indeed demands urgent attention.',
  statCallout:
    'The last decade alone has seen more than 25,000 suicides due to drug abuse (Ministry of Social Justice & Empowerment, NCRB National Crime Records Bureau).',
  chartTitle: 'Drug addiction or abuse related suicides in some Indian states',
  chartSubtitle: 'Per million population (Data: Ministry of Social Justice & Empowerment / NCRB)',
  referenceUrl: 'https://www.researchgate.net/figure/Suicides-in-Some-of-Indian-States-Due-to-Drug-Abuse-Source-Ministry-of-Social-Justice_fig2_338232597',
  statesData: [
    { state: 'Kerala', rate: 14.2 },
    { state: 'Maharashtra', rate: 12.2 },
    { state: 'Tamil Nadu', rate: 7.7 },
    { state: 'Tripura', rate: 5.2 },
    { state: 'Mizoram', rate: 4.6 },
    { state: 'Madhya Pradesh', rate: 4.2 },
    { state: 'Delhi', rate: 2.0 },
    { state: 'Andhra Pradesh', rate: 2.0 },
    { state: 'Punjab', rate: 1.4 },
    { state: 'Jammu & Kashmir', rate: 0.1 }
  ],
  photos: [
    {
      driveId: '1BWVkVMX96aEGzrjsxoSKJ28vzzuoLfug',
      title: 'Youth De-Addiction Awareness Rally',
      caption: 'Educating college youth through high-energy awareness rallies and posters.'
    },
    {
      driveId: '1ij_9JtMW57QgV7OTHu9gUgp4JPItQzPk',
      title: 'De-Addiction & Habit Mastery Workshop',
      caption: 'Interactive workshop on breaking dopamine loops and negative peer influence.'
    },
    {
      driveId: '1TOAfGSdPXlnMu5bByQwYhnSTo9ZcpT_Z',
      title: 'Campus Awareness Campaign',
      caption: 'Empowering students to take a pledge for clean, sober, purpose-driven living.'
    },
    {
      driveId: '1LuQa1S9C4U_7ZsrvCoUCPPJ2b1RnuWOJ',
      title: 'Counseling & Support Circle',
      caption: 'Providing confidential, loving mentorship and guidance to recover mental health.'
    },
    {
      driveId: '14LCbvFsBmpO6qeLWiUfnQc4LYIvHHBQy',
      title: 'Transformational De-Addiction Seminar',
      caption: 'Inspiring youth towards higher taste and spiritual grounding.'
    }
  ]
};
