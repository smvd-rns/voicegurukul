export interface DailySloka {
  reference: string;
  sanskrit: string;
  translation: string;
  reflection: string;
}

export const DAILY_SLOKAS: DailySloka[] = [
  {
    reference: "Bhagavad Gita 9.22",
    sanskrit: "ananyāś cintayanto māṁ ye janāḥ paryupāsate | teṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham ||",
    translation: "To those who always worship Me with exclusive devotion, meditating on My transcendental form, to them I carry what they lack, and I preserve what they have.",
    reflection: "When we surrender our worries to Krishna and perform our duties with devotion, the Lord personally protects and guides our spiritual journey."
  },
  {
    reference: "Bhagavad Gita 9.26",
    sanskrit: "patraṁ puṣpaṁ phalaṁ toyaṁ yo me bhaktyā prayacchati | tad ahaṁ bhakty-upahṛtam aśnāmi prayatātmanaḥ ||",
    translation: "If one offers Me with love and devotion a leaf, a flower, a fruit or water, I will accept it.",
    reflection: "Krishna does not look at the opulence of our offering; He accepts the sincerity and pure love of the heart."
  },
  {
    reference: "Bhagavad Gita 18.65",
    sanskrit: "man-manā bhava mad-bhakto mad-yājī māṁ namaskuru | mām evaiṣyasi satyaṁ te pratijāne priyo 'si me ||",
    translation: "Always think of Me, become My devotee, worship Me and offer your homage unto Me. Thus you will come to Me without fail. I promise you this because you are My very dear friend.",
    reflection: "Keeping Krishna in our thoughts throughout daily activities — working, studying, and chanting — transforms ordinary work into spiritual yoga."
  },
  {
    reference: "Bhagavad Gita 18.66",
    sanskrit: "sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja | ahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ ||",
    translation: "Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reactions. Do not fear.",
    reflection: "Surrender is not defeat; it is the ultimate shelter under the loving lotus feet of the Supreme Lord."
  },
  {
    reference: "Bhagavad Gita 2.47",
    sanskrit: "karmaṇy evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi ||",
    translation: "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty.",
    reflection: "Do your utmost best today with dedication, offering every outcome to Lord Krishna without anxiety over the results."
  },
  {
    reference: "Bhagavad Gita 2.14",
    sanskrit: "mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ | āgamāpāyino 'nityās tāṁs titikṣasva bhārata ||",
    translation: "O son of Kuntī, the nonpermanent appearance of happiness and distress, and their disappearance in due course, are like the appearance and disappearance of winter and summer seasons. One must learn to tolerate them without being disturbed.",
    reflection: "Life brings both sunshine and storms. A steady devotee remains peaceful by fixing the mind on the eternal Holy Name."
  },
  {
    reference: "Bhagavad Gita 10.8",
    sanskrit: "ahaṁ sarvasya prabhavo mattaḥ sarvaṁ pravartate | iti matvā bhajante māṁ budhā bhāva-samanvitāḥ ||",
    translation: "I am the source of all spiritual and material worlds. Everything emanates from Me. The wise who perfectly know this engage in My devotional service and worship Me with all their hearts.",
    reflection: "Recognizing that every breath, talent, and opportunity comes from Krishna fills the heart with profound gratitude."
  },
  {
    reference: "Bhagavad Gita 6.47",
    sanskrit: "yoginām api sarveṣāṁ mad-gatenāntar-ātmanā | śraddhāvān bhajate yo māṁ sa me yuktatamo mataḥ ||",
    translation: "And of all yogīs, the one with great faith who always abides in Me, thinks of Me within himself, and renders transcendental loving service to Me — he is the most intimately united with Me in yoga and is the highest of all.",
    reflection: "Bhakti yoga is the peak of all spiritual practices because it directly connects our loving heart with the Supreme Lord."
  },
  {
    reference: "Bhagavad Gita 4.9",
    sanskrit: "janma karma ca me divyam evaṁ yo vetti tattvataḥ | tyaktvā dehaṁ punar janma naiti mām eti so 'rjuna ||",
    translation: "One who knows the transcendental nature of My appearance and activities does not, upon leaving the body, take his birth again in this material world, but attains My eternal abode, O Arjuna.",
    reflection: "Hearing and remembering Krishna's divine lilas frees our consciousness from material entanglements."
  },
  {
    reference: "Bhagavad Gita 12.15",
    sanskrit: "yasmān nodvijate loko lokān nodvijate ca yaḥ | harṣāmarṣa-bhayodvegair mukto yaḥ sa ca me priyaḥ ||",
    translation: "He by whom no one is put into difficulty and who is not disturbed by anyone, who is liberated from jubilation, anger, fear and anxiety, is very dear to Me.",
    reflection: "A true devotee spreads peace and never becomes a cause of distress to others."
  }
];

export function getDailySloka(date: Date = new Date()): DailySloka {
  // Use day of year to deterministically cycle through verses
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - startOfYear.getTime()) + ((startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = Math.abs(dayOfYear) % DAILY_SLOKAS.length;
  return DAILY_SLOKAS[index];
}

