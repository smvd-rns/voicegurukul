export interface VaishnavaEvent {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'ekadashi' | 'festival' | 'appearance' | 'disappearance';
  fasting?: string; // e.g. "Fasting from grains & beans", "Fasting till noon", "Fasting till sunset"
  significance: string;
  description: string;
}

// Curated Vaishnava Calendar Events (Ekadashis & Major Festivals)
export const VAISHNAVA_EVENTS: VaishnavaEvent[] = [
  // 2026 Ekadashis & Festivals
  {
    date: '2026-11-06',
    name: 'Rama Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Kartik Krishna Ekadashi',
    description: 'Rama Ekadashi falls during the holy month of Damodara (Kartik). Observance delivers the practitioner from the greatest distresses and bestows spiritual liberation.'
  },
  {
    date: '2026-11-08',
    name: 'Diwali & Sri Sri Radha-Damodara Puja',
    type: 'festival',
    significance: 'Deepavali Festival of Lights & Damodara Lila',
    description: 'Celebrates Lord Krishna being bound with love by Mother Yashoda in Gokula, and Lord Ramachandra returning to Ayodhya.'
  },
  {
    date: '2026-11-09',
    name: 'Govardhana Puja & Go-puja',
    type: 'festival',
    significance: 'Annakuta Festival & Worship of Giriraja',
    description: 'Devotees offer a hill of opulent prasadam to Giriraja Govardhana, honoring the pastime where Lord Krishna lifted the hill on His little finger for seven days.'
  },
  {
    date: '2026-11-10',
    name: "Sri Vasudeva Ghosh Disappearance",
    type: "disappearance",
    significance: "Associate of Lord Sri Chaitanya Mahaprabhu",
    description: "Vasudeva Ghosh was an intimate associate of Sri Chaitanya Mahaprabhu known for his ecstatic devotional songs celebrating the pastimes of Gaura-Nitai."
  },
  {
    date: '2026-11-15',
    name: "Gopashtami & Sri Srinivasa Acharya Disappearance",
    type: "festival",
    significance: "Lord Krishna becomes a full-fledged cowherd boy",
    description: "On this day, Nanda Maharaja gave Krishna charge of the cows instead of calves. Also marks the disappearance of Sri Srinivasa Acharya, Sri Gadadhara Dasa, and Sri Dhananjaya Pandita."
  },
  {
    date: '2026-11-13',
    name: 'Srila Prabhupada Disappearance Day',
    type: 'disappearance',
    fasting: 'Fast till noon',
    significance: 'Disappearance Day of ISKCON Founder-Acarya',
    description: 'Remembering and offering heartfelt gratitude to His Divine Grace A.C. Bhaktivedanta Swami Prabhupada who carried the Holy Name across the world.'
  },
  {
    date: '2026-11-20',
    name: 'Utthana (Devotthana) Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Lord Vishnu awakens from His mystic slumber; Bhisma Panchaka begins',
    description: 'The auspicious day when the Lord awakens from His mystic sleep. Marks the end of the four-month Chaturmasya period and begins the 5 days of Bhisma Panchaka.'
  },
  {
    date: '2026-11-21',
    name: "Srila Gaura Kishora Dasa Babaji Disappearance",
    type: "disappearance",
    fasting: "Fast till noon",
    significance: "Spiritual master of Srila Bhaktisiddhanta Sarasvati Thakura",
    description: "The epitome of renunciation and detachment in the Gaudiya disciplic succession, Srila Gaura Kishora Dasa Babaji Maharaja embodied pure unalloyed love for Sri Sri Radha-Krishna."
  },
  {
    date: '2026-11-24',
    name: "Sri Krishna Rasayatra & Bhisma Panchaka Ends",
    type: "festival",
    fasting: undefined,
    significance: "Sharad Rasa Dance of Sri Sri Radha-Krishna & Tulasi Vivaha",
    description: "Marks the divine Rasa dance in Vrindavan during the full moon of Kartik, the conclusion of the auspicious Bhisma Panchaka, and the disappearance of Sri Bhugarbha Goswami and Sri Kashisvara Pandita."
  },
  {
    date: '2026-12-05',
    name: 'Utpanna Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'The appearance day of Ekadashi Devi from Lord Vishnu',
    description: 'Ekadashi Devi appeared from the body of Lord Vishnu to defeat the demon Mura. The Lord granted her the boon that anyone who fasts on her day is relieved of all karmic reactions.'
  },
  {
    date: '2026-12-20',
    name: 'Mokshada Ekadashi & Gita Jayanti',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'The Day Lord Krishna spoke the Bhagavad Gita to Arjuna',
    description: 'On this sacred day 5,000 years ago, Lord Sri Krishna imparted the timeless wisdom of Bhagavad Gita to Arjuna at Kurukshetra.'
  },
  {
    date: '2026-12-17',
    name: "Sri Madhvacharya Appearance",
    type: "appearance",
    significance: "Principal Acarya of the Brahma-Madhva Sampradaya",
    description: "Sripada Madhvacharya established the Dvaita philosophy proving the eternal individuality and distinction between the Supreme Lord Vishnu and the minute jiva souls."
  },
  {
    date: '2026-12-27',
    name: "Srila Bhaktisiddhanta Sarasvati Thakura Disappearance",
    type: "disappearance",
    fasting: "Fast till noon",
    significance: "Spiritual master of Srila Prabhupada & Founder of the Gaudiya Matha",
    description: "The lion guru who vigorously preached pure Krishna consciousness against pseudo-devotees and instructed Srila Prabhupada to preach in the English language worldwide."
  },
  {
    date: '2027-01-04',
    name: 'Saphala Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Pausha Krishna Ekadashi',
    description: 'Saphala means successful. Observance of this sacred day removes karmic obstacles and guarantees success in all devotional endeavors.'
  },
  {
    date: '2027-01-18',
    name: 'Putrada Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Pausha Shukla Ekadashi',
    description: 'Putrada Ekadashi fulfills the righteous desires of devotees and purifies the consciousness of material desires.'
  },
  {
    date: '2027-02-02',
    name: 'Sat-tila Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Magha Krishna Ekadashi',
    description: 'Observance involves six ways of using sesame seeds (tila) in service to the Lord. Relieves living entities of material suffering.'
  },
  {
    date: '2027-02-17',
    name: 'Bhaimi (Jaya) Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Magha Shukla Ekadashi — Fast till noon for Varahadeva appearance',
    description: 'Also celebrated as the appearance day of Lord Varaha. Observance elevates the soul from ghostly conditions directly to the spiritual realm.'
  },
  {
    date: '2027-03-04',
    name: 'Vijaya Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Phalguna Krishna Ekadashi — Lord Ramachandra observed before crossing to Lanka',
    description: 'Lord Ramachandra observed this Ekadashi with His vanara army before constructing the bridge to Lanka to attain victory over Ravana.'
  },
  {
    date: '2027-03-19',
    name: 'Amalaki Ekadashi',
    type: 'ekadashi',
    fasting: 'Fast from grains and beans',
    significance: 'Phalguna Shukla Ekadashi — Sacred Amalaki Tree worship',
    description: 'Associated with the worship of the Amalaki tree which sprouted from Lord Vishnu. Bestows freedom from all previous offenses.'
  },
  {
    date: '2027-03-22',
    name: 'Sri Gaura Purnima',
    type: 'festival',
    fasting: 'Fast till moonrise, then feast on anukalpa (non-grains)',
    significance: 'Divine Appearance Day of Sri Chaitanya Mahaprabhu',
    description: 'The Golden Avatar appeared in Navadvipa Mayapur to inaugurate the Yuga-dharma of Harinama Sankirtana, spreading pure love of God freely to all.'
  },
  {
    date: '2027-04-16',
    name: 'Sri Rama Navami',
    type: 'festival',
    fasting: 'Fast till sunset',
    significance: 'Appearance Day of Lord Sri Ramachandra',
    description: 'Celebrating the descent of Lord Ramachandra, the epitome of righteousness, honor, and loving protection of His devotees in Ayodhya.'
  },
  {
    date: '2027-05-20',
    name: 'Sri Nrisimha Caturdasi',
    type: 'festival',
    fasting: 'Fast till dusk (sunset)',
    significance: 'Appearance Day of Lord Nrisimhadeva',
    description: 'The half-man, half-lion incarnation descended from the pillar to protect His pure child-devotee Prahlada and slay the demoniac Hiranyakashipu.'
  },
  {
    date: '2027-06-15',
    name: 'Pandava Nirjala Ekadashi',
    type: 'ekadashi',
    fasting: 'Complete fast without even drinking water (Nirjala)',
    significance: 'Bhimasena Ekadashi — Bestows the merit of all 24 Ekadashis',
    description: 'Observed by Bhima. By fasting completely without food and water on this single day, one attains the combined devotional merit of all Ekadashis of the entire year.'
  },
  {
    date: '2027-08-25',
    name: 'Sri Krishna Janmashtami',
    type: 'festival',
    fasting: 'Fast till midnight',
    significance: 'Divine Appearance of the Supreme Personality of Godhead',
    description: 'The supreme festival celebrating Lord Sri Krishna appearing in Mathura in the prison of Kamsa, bringing transcendental bliss to all worlds.'
  },
  {
    date: '2027-08-26',
    name: 'Srila Prabhupada Appearance Day (Nandotsava)',
    type: 'appearance',
    fasting: 'Fast till noon',
    significance: 'Appearance Day of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada',
    description: 'Devotees offer Vyasa-puja homages, kirtans, and grand bhoga offerings to honor our beloved spiritual master and founder-acarya.'
  },
  {
    date: '2027-09-08',
    name: 'Sri Radhashtami',
    type: 'festival',
    fasting: 'Fast till noon',
    significance: 'Appearance Day of Srimati Radharani',
    description: 'The divine appearance of Srimati Radharani in Raval. She is the internal pleasure potency (hladini-shakti) of Lord Sri Krishna and the personification of pure devotional service.'
  }
];

export interface NextEkadashiInfo {
  event: VaishnavaEvent;
  daysRemaining: number;
  label: string;
}

export function getNextEkadashi(referenceDate: Date = new Date()): NextEkadashiInfo | null {
  const refStr = referenceDate.toISOString().split('T')[0];
  const refTime = new Date(refStr).getTime();

  // Find all future ekadashis including today
  const futureEkadashis = VAISHNAVA_EVENTS.filter(e => {
    if (e.type !== 'ekadashi') return false;
    return e.date >= refStr;
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (futureEkadashis.length === 0) return null;

  const next = futureEkadashis[0];
  const nextTime = new Date(next.date).getTime();
  const diffDays = Math.round((nextTime - refTime) / (1000 * 60 * 60 * 24));

  let label = `in ${diffDays} days`;
  if (diffDays === 0) {
    label = 'Today!';
  } else if (diffDays === 1) {
    label = 'Tomorrow!';
  }

  return {
    event: next,
    daysRemaining: diffDays,
    label
  };
}

export function getTodaysVaishnavaEvent(referenceDate: Date = new Date()): VaishnavaEvent | null {
  const refStr = referenceDate.toISOString().split('T')[0];
  return VAISHNAVA_EVENTS.find(e => e.date === refStr) || null;
}

export function getUpcomingVaishnavaEvents(count = 4, referenceDate: Date = new Date()): VaishnavaEvent[] {
  const refStr = referenceDate.toISOString().split('T')[0];
  return VAISHNAVA_EVENTS
    .filter(e => e.date >= refStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}
