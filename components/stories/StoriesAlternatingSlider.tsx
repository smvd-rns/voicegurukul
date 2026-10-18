'use client';

import { useState, useEffect, useRef } from 'react';
import DriveImage from '@/components/activities/DriveImage';
import {
  ChevronLeft,
  ChevronRight,
  Quote,
  Star,
  ExternalLink,
  CheckCircle2,
  Award,
  GraduationCap,
  Building2,
  Briefcase,
  X,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export interface AlternatingStoryItem {
  id: string;
  type: 'faculty' | 'student' | 'corporate';
  name: string;
  role: string;
  institutionOrCollege: string;
  location?: string;
  driveId?: string;
  driveUrl?: string;
  profileUrl?: string;
  profileLabel?: string;
  linkedIn?: string;
  tag: string;
  outcome: string; // One-line outcome
  excerpt: string; // 40-to-60 words
  fullQuote: string; // Full quote (multi-paragraph)
  keyPoints?: string[];
  badges?: string[];
}

export const ALTERNATING_STORIES_DATA: AlternatingStoryItem[] = [
  // 1. Faculty: Prof. Rajesh Jalnekar (VIT Pune)
  {
    id: 'rajesh-jalnekar',
    type: 'faculty',
    name: 'Prof. (Dr.) Rajesh Jalnekar',
    role: 'Director',
    institutionOrCollege: 'Vishwakarma Institute of Technology (VIT)',
    location: 'Pune, Maharashtra',
    driveId: '1D5DfwFwyWbKJmvKFRserfXB9C19_pMMA',
    driveUrl: 'https://drive.google.com/file/d/1D5DfwFwyWbKJmvKFRserfXB9C19_pMMA/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/rajesh-jalnekar-9a43b5ba',
    profileLabel: 'LinkedIn Profile',
    tag: '12+ Years Campus Partnership',
    outcome: 'Equipped hundreds of students with stress management, character building, and hands-on leadership responsibilities.',
    excerpt:
      'I am extremely happy with VOICE Club’s activities in VIT Pune over 12 years. VOICE imparts invaluable ancient wisdom connecting it precisely to modern realities. Solutions to stress management, priority management, character building, and mind power are sought by youth today, and VOICE gives impeccable, practical solutions.',
    fullQuote:
      'I am extremely happy with the VOICE Club’s activities in Vishwakarma Institute of Technology, Pune during last 12 years. Hundreds of students have got benefited through these activities over the years. VOICE Club focuses on imparting the invaluable ancient wisdom precisely connecting it to the modern world realities.\n\nSolutions to contemporary problems related to but not limited to stress management, priority management, character built-up, mind power, Leadership and Management, finding deeper meaning in life etc. are sought by the youth today & VOICE Club gives impeccable and practical solutions to all these issues.\n\nOpportunities are also provided to college students wherein youth can practically involve themselves with responsibilities of leadership and management to practically apply these principles and imbibe in their personalities. VOICE Club’s faculty members are immensely experienced in delivering such programs to college youth and we have always got a very encouraging feedback from our students about this club.',
    keyPoints: [
      'Over 12 years of impactful campus partnership at VIT Pune',
      'Practical solutions for stress & priority management',
      'Hands-on youth leadership & character development',
    ],
  },

  // 2. Student: Rahul Kumar Sevakula (Harvard Medical School / NITW)
  {
    id: 'rahul-kumar-sevakula',
    type: 'student',
    name: 'Dr. Rahul Kumar Sevakula',
    role: 'Jr. Faculty at Harvard Medical School & MGH',
    institutionOrCollege: 'NIT Warangal (B.Tech) • IIT Kanpur (PhD) • Harvard University',
    driveId: '1uOTcnAf0uxs3tkcLrVYeIRd-NrPkOi36',
    driveUrl: 'https://drive.google.com/file/d/1uOTcnAf0uxs3tkcLrVYeIRd-NrPkOi36/view?usp=drive_link',
    profileUrl: 'https://loop.frontiersin.org/people/2194890/overview',
    profileLabel: 'Research Loop Profile',
    tag: 'Harvard Medical School • IIT Kanpur',
    outcome: 'Rose from 12th to 5th rank at NITW (8.56 CGPA), completed IIT Kanpur PhD, Postdoc & Jr. Faculty at Harvard.',
    excerpt:
      'The non-sectarian teachings at VOICE based on Bhagavad Gita answered all my questions to full intellectual satisfaction. We learnt that “We should try our best and leave the rest to God.” This reduced my exam stress immensely, helping me rise to 5th rank at NITW and complete my PhD at IIT Kanpur.',
    fullQuote:
      'I had been strongly associated with VOICE from my first year at NIT Warangal. By nature, I have an independent mentality and hence accept things only after I am convinced. So my acceptance of the teachings was inspired by their purity and the intellectual calling it gave.\n\nThe non-sectarian teachings at VOICE based on Bhagavad Gita, Gandhi, Tolstoy, etc. answered all my questions to full satisfaction. We learnt in VOICE that “We should try our best and leave the rest to God”. This teaching was a great relief and reduced the stress I had during exams.\n\nMy rank at the end of first year was 12th; I passed out of NIT Warangal in 2009 with 5th rank out of 76 students with CGPA of 8.56/10.0, awarded merit scholarship from NITW in 3rd and 4th year.',
    badges: ['Harvard Medical School', 'IIT Kanpur PhD', 'NITW 5th Rank (8.56 CGPA)'],
  },

  // 3. Faculty: Prof. Kanchan Choudhary (IIT Kharagpur)
  {
    id: 'kanchan-choudhary',
    type: 'faculty',
    name: 'Prof. Kanchan Choudhary',
    role: 'Professor, Dept of Cryogenics',
    institutionOrCollege: 'Indian Institute of Technology (IIT), Kharagpur',
    location: 'West Bengal',
    driveId: '17kRIQtjQqR3_Q7bCCWNDXUS2Z0Kk77ah',
    driveUrl: 'https://drive.google.com/file/d/17kRIQtjQqR3_Q7bCCWNDXUS2Z0Kk77ah/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/kanchan-chowdhury-a0817636',
    profileLabel: 'LinkedIn Profile',
    tag: '2 Decades Mentorship • IIT Kharagpur',
    outcome: 'Observed two decades of systematic mind and character training transforming student life at IIT Kharagpur.',
    excerpt:
      'Western education emphasizes body and intellect, but lacks systematic training of the mind. When an 18-year-old enters college hostel, he appears like a soldier sent to battle without weapons training. VOICE fills this critical void, and at IIT Kharagpur, I watched them serve the student community with distinction for two decades.',
    fullQuote:
      'Western education and philosophy give a lot of emphasis on the development of body and intellect. Present-day education in schools and homes follows western thoughts and it does not include a systematic training of mind. Mind is important to understand self. It helps one to interact with the world bravely and to face the reality with confidence and poise.\n\nWhen an 18-year-old comes to the college hostel, he appears like a soldier sent to fight in the battle-field without imparting any training on how to use his gun and sword. Co-curricular activities in colleges are often inadequate, because they counsel with western psychology and teach Yoga. These activities fail to strike at the root of understanding about inter-relationship of body-mind-intellect-ego-soul of an individual.\n\nVOICE fills up this critical void and, at IIT Kharagpur, I was fortunate to be associated with and watch them serving the student community during the last 2 decades. I myself have learnt a great deal to develop a better vision towards life and will always remain thankful to them for this kind favor shown to me.',
    keyPoints: [
      'Systematic mind training beyond conventional education',
      'Root understanding of body, mind, intellect & soul',
      'Serving student community at IIT Kharagpur for 2 decades',
    ],
  },

  // 4. Student: Amarendra Edpuganti (GATE AIR-26 / IIT Kanpur / Adobe)
  {
    id: 'amarendra-edpuganti',
    type: 'student',
    name: 'Amarendra Edpuganti',
    role: 'PhD Scholar, Singapore Univ • Ex-Adobe Systems',
    institutionOrCollege: 'NIT Warangal (B.Tech 8.65) • IIT Kanpur (M.Tech 9.24)',
    driveId: '1LnNGU3F7d17EKTglx7xDHA5jj06Ps4pd',
    driveUrl: 'https://drive.google.com/file/d/1LnNGU3F7d17EKTglx7xDHA5jj06Ps4pd/view?usp=drive_link',
    tag: 'GATE AIR-26 • IIT Kanpur M.Tech',
    outcome: 'Overcame toxic habits, secured 9.14 SGPA, achieved GATE AIR-26 in 2.5 months, now at PhD Singapore.',
    excerpt:
      'I had difficulties in studies due to bad habits introduced by seniors. Attending VOICE seminars and practicing daily meditation brought me out of mental turmoil. I achieved SGPA 9.14 and GATE AIR-26 with zero exam anxiety. VOICE should be an official curriculum part in all colleges to help youth overcome self-destructive habits.',
    fullQuote:
      'I had a lot of difficulty in my studies during 3rd semester of B.Tech at NITK especially because of some bad habits I got introduced to by seniors. I was not able to focus on my studies as I lost my concentration.\n\nFortunately, I got to know about seminars offered by VOICE through my roommate and many of my problems got solved in the first seminar itself. Then I started regularly doing meditation (chanting Hare Krishna Mantra) and attending seminars. Slowly I came out of the mental tussle and managed 3rd semester with SGPA of 8.3 and in the next semester I got SGPA of 9.14 (3rd position in class).\n\nWhen I was preparing for GATE, I had just 2.5 months and surprisingly did not feel any stress or anxiety—achieving AIR 26 in GATE 2010. Seminars offered by VOICE should be made an official part of curriculum in all colleges as they make individuals handle difficult situations and overcome self-destructive habits.',
    badges: ['GATE AIR-26 (EE)', 'IIT Kanpur 9.24 CGPA', 'Ex-Adobe Systems (2.5 yrs)'],
  },

  // 5. Faculty: Prof. S.K. Sarangi (Director, NIT Rourkela)
  {
    id: 'sk-sarangi',
    type: 'faculty',
    name: 'Prof. S.K. Sarangi',
    role: 'Director',
    institutionOrCollege: 'National Institute of Technology (NIT)',
    location: 'Rourkela, Odisha',
    driveId: '1HeOpeFR6vQheIRwMIg_PR1YrZ8-xMtnR',
    driveUrl: 'https://drive.google.com/file/d/1HeOpeFR6vQheIRwMIg_PR1YrZ8-xMtnR/view?usp=drive_link',
    profileUrl: 'https://www.youtube.com/watch?v=fAkMug0FO3w',
    profileLabel: 'YouTube Convocation Address',
    tag: 'Director Endorsement • NIT Rourkela',
    outcome: 'Infusing strong ethical values and societal compassion alongside technology-driven education.',
    excerpt:
      'We live in a technology driven society where we analyze every event through logic and create wealth. This impersonal approach sometimes drives us away from caring for our neighbours. A life based on strong ethical values is the answer, and VOICE is directly addressing these vital issues among our students.',
    fullQuote:
      'We live in a technology driven society. Technology is not only a profession for us, it is a way of life. As technologists and scientists, we analyze every event through our lens of logic, find causes and effects, and take decisions that lead to creation of wealth.\n\nThis impersonal approach to life sometimes drives us out of the path of caring for our neighbour. A life based on strong ethical values is the only answer to such a situation. I am happy to hear that the organization VOICE is indeed addressing these issues and that our students are taking active role in this work. I wish every participant success in his/her life.',
    keyPoints: [
      'Infusing strong ethical values in technology-driven education',
      'Balancing logic and wealth creation with compassion',
      'Students actively engaging in societal responsibility',
    ],
  },

  // 6. Student: Sairaj Deshmukh (Advik Hi-Tech / NMIET)
  {
    id: 'sairaj-deshmukh',
    type: 'student',
    name: 'Sairaj Deshmukh',
    role: 'Senior QA Engineer at Advik Hi-Tech',
    institutionOrCollege: 'NMIET, Pune',
    driveId: '12FOi1FSPyAcmY7yICA9G_Siruvlt1FI8',
    driveUrl: 'https://drive.google.com/file/d/12FOi1FSPyAcmY7yICA9G_Siruvlt1FI8/view?usp=drive_link',
    linkedIn: 'https://www.linkedin.com/pub/dir/Sairaj/Deshmukh',
    tag: 'Senior QA Engineer • Advik Hi-Tech',
    outcome: 'Overcame stage fear through GDs and Vedic tours, secured campus placement, and established life of ethics.',
    excerpt:
      'Along with shaping my studies and career, VOICE had a crucial role in building my character. Group discussions and stage programs boosted my confidence for campus placements. The loving, caring association of mentors and peers continually pushed us to live a life of high ethics, values, and mutual support.',
    fullQuote:
      'Along with shaping my studies and my career, VOICE has a very crucial part in shaping my life and building character. During my college days, the seniors here guided me and helped me in my studies. I remember how we used to have group discussions and stage programs which helped a lot in boosting confidence & fetching a job in campus placements.\n\nI would have never visited different parts of India by myself to explore Vedic culture, trekking, and having lots of fun on the go. It was all possible because of the loving and caring nature of a huge friend circle, which pushes each other to live a life of ethics and values. The people with whom we associate shape our life.',
    badges: ['Senior QA Engineer', 'Advik Hi-Tech', 'NMIET Pune Alumnus'],
  },

  // 7. Faculty: Dr. G. K. Shivakumar (Dean, NIT Surathkal)
  {
    id: 'gk-shivakumar',
    type: 'faculty',
    name: 'Dr. G. K. Shivakumar',
    role: 'Dean Administration',
    institutionOrCollege: 'National Institute of Technology (NIT)',
    location: 'Surathkal, Karnataka',
    driveId: '1KtMwzjS1ROBu81corfy07A0L4BvySVmd',
    driveUrl: 'https://drive.google.com/file/d/1KtMwzjS1ROBu81corfy07A0L4BvySVmd/view?usp=drive_link',
    profileUrl: 'https://old.nitk.ac.in/people/prof-gk-shivakumar',
    profileLabel: 'NITK Official Faculty Profile',
    tag: 'Dean Administration • NIT Surathkal',
    outcome: 'Commendable mentorship bringing out latent student motivation and self-confidence.',
    excerpt:
      'I am delighted to be associated with VOICE, a movement for grooming youth into principle-centered leaders. It has been doing a commendable job in bringing out the potential in students for developing virtues of motivation and self-confidence through seminars, group discussions and personal counseling.',
    fullQuote:
      'I am delighted to be associated with VOICE, a movement for grooming youth into principle-centered leaders. It has been doing a commendable job in bringing out the potential in students for developing virtues of motivation and self-confidence through seminars, group discussions and special counseling.',
    keyPoints: [
      'Grooming youth into principle-centered leaders',
      'Building deep motivation and self-confidence',
      'Impactful seminars, discussions and personal counseling',
    ],
  },

  // 8. Student: Arupjyoti (Univ of Melbourne)
  {
    id: 'arupjyoti',
    type: 'student',
    name: 'Arupjyoti',
    role: 'Master of Management Scholar',
    institutionOrCollege: 'University of Melbourne, Australia',
    driveId: '13GQyjTVS93n7U7BiZtUvjDAvZ0zDfgsX',
    driveUrl: 'https://drive.google.com/file/d/13GQyjTVS93n7U7BiZtUvjDAvZ0zDfgsX/view?usp=drive_link',
    tag: 'Master of Management • Univ of Melbourne',
    outcome: 'Discovered purpose through selfless service and management foundation, now scholar at Univ of Melbourne.',
    excerpt:
      'VOICE helped me identify my potential and realize that ultimate satisfaction is experienced with a grateful heart centered on selfless service. VOICE training taught me to embrace the world with a positive outlook. The foundations of management and leadership permeated my life, inspiring me to impact others.',
    fullQuote:
      'VOICE has helped me identify my potential, and I realized that ultimate satisfaction is experienced with a grateful heart, which shelters around selfless service attitude. VOICE training taught me to embrace the world with a positive outlook and permeated within me to be a change maker.\n\nI owe a lot of what I am today to VOICE and my mentors. Here the foundation of management and leadership permeated in my life, and I decided to be a change-maker to impact the lives of people.',
    badges: ['Univ of Melbourne', 'Master of Management', 'Change Maker'],
  },

  // 9. Faculty / Research: Dr. Ganesh Ramakrishnan (IBM Research / IIT Alumnus)
  {
    id: 'ganesh-ramakrishnan',
    type: 'faculty',
    name: 'Dr. Ganesh Ramakrishnan',
    role: 'Ph.D, Computer Science • IBM India Research Labs',
    institutionOrCollege: 'IBM Research • IIT Alumnus',
    driveId: '1NwObDpcB1TxjUV4wtIfNQ9Fwyoxiu26M',
    driveUrl: 'https://drive.google.com/file/d/1NwObDpcB1TxjUV4wtIfNQ9Fwyoxiu26M/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/ganesh-ramakrishnan-ba6164b',
    profileLabel: 'LinkedIn Profile',
    tag: 'IBM Research & IIT Alumnus',
    outcome: 'Character training that perfectly complements technical competence in research and engineering.',
    excerpt:
      'It is my honest view that the foundational training in character and open-minded, deep thinking that VOICE provides to students perfectly complements every individual’s and organization’s endeavor for attaining technical competence. I have myself been immensely benefited by these timeless Vedic teachings in my career.',
    fullQuote:
      'It is my honest view that the foundational training in character and open-minded but deep thinking that VOICE provides to students perfectly complements every individual’s and organization\'s endeavor for attaining technical competence. I have myself been immensely benefited by the Vedic teachings.',
    keyPoints: [
      'Character training perfectly complements technical competence',
      'Cultivating open-minded, deep analytical thinking',
      'Direct personal benefit from timeless Vedic teachings',
    ],
  },

  // 10. Student: Srikar Vadlamani (Terumo Medical USA)
  {
    id: 'srikar-vadlamani',
    type: 'student',
    name: 'Srikar Vadlamani',
    role: 'Manufacturing Engineer at Terumo Medical Corporation',
    institutionOrCollege: 'University of Houston, Texas, USA',
    driveId: '1mRsR2iF6eRXW5K1Om5Qi-ZdvKcshEn4Z',
    driveUrl: 'https://drive.google.com/file/d/1mRsR2iF6eRXW5K1Om5Qi-ZdvKcshEn4Z/view?usp=drive_link',
    linkedIn: 'https://www.linkedin.com/in/srikar-vadlamani-a1a003163',
    tag: 'Terumo Medical USA • Univ of Houston',
    outcome: 'Gained goal clarity, patience, and values, now thriving as Manufacturing Engineer in Maryland, USA.',
    excerpt:
      'VOICE training taught me what true happiness in life means. It helped me become more focused and clear about the short-term and long-term goals I set. I learned the true values one must cultivate, resolving many confusions and developing patience, tolerance, and the right life attitude.',
    fullQuote:
      'VOICE training taught me what true happiness in life means. It has helped me to be more focused and clear about the short term and long term goals I set in life. I learnt about the true values one must cultivate and live by, so many of my confusions were resolved.\n\nVOICE training has helped me with becoming more patient, tolerant and in developing the right attitude towards life. Overall it helped me with becoming a better person.',
    badges: ['Terumo Medical USA', 'Univ of Houston', 'Manufacturing Engineer'],
  },

  // 11. Corporate: Ms. Pramela Kalive (Zensar Technologies)
  {
    id: 'pramela-zensar',
    type: 'corporate',
    name: 'Ms. Pramela Kalive',
    role: 'HR Manager',
    institutionOrCollege: 'Zensar Technologies, Pune',
    driveId: '1mTe324pJgn9A861UgCCiiobEb9z1Eotf',
    driveUrl: 'https://drive.google.com/file/d/1mTe324pJgn9A861UgCCiiobEb9z1Eotf/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/prameelakalive',
    profileLabel: 'LinkedIn Profile',
    tag: 'HR Manager • Zensar Technologies',
    outcome: 'Delivering actionable, effective stress management techniques across corporate engineering teams.',
    excerpt:
      'We found the workshop very effective because it not only highlighted the common causes and symptoms of stress, but also gave our corporate employees actionable, simple techniques for managing workplace stress daily. The feedback across our teams has been exceptionally positive and encouraging.',
    fullQuote:
      'We found the workshop very effective because the workshop not only highlighted on the common causes & symptoms of stress but the workshop also gave us good insights into what are the effective & simple techniques for managing stress.',
    keyPoints: [
      'Effective identification of root stress triggers & symptoms',
      'Actionable and simple techniques for daily stress management',
      'Immediate practical value across corporate teams',
    ],
  },

  // 12. Student: Naman Kashyap (Johnson Controls)
  {
    id: 'naman-kashyap',
    type: 'student',
    name: 'Naman Kashyap',
    role: 'Test Engineer at Johnson Controls',
    institutionOrCollege: 'Engineering Alumnus',
    driveId: '1CQvKylBaiNrfsL6aLDrsL77PFgS9OPEr',
    driveUrl: 'https://drive.google.com/file/d/1CQvKylBaiNrfsL6aLDrsL77PFgS9OPEr/view?usp=drive_link',
    linkedIn: 'https://in.linkedin.com/in/naman-kashyap-18b33ab9',
    tag: 'Johnson Controls • Test Engineer',
    outcome: 'Applied timeless servant leadership principles for rapid, stress-free corporate career progression.',
    excerpt:
      'I am gradually moving ahead towards leadership roles in my corporate career. Leader’s VOICE series taught me that becoming a servant leader is the secret of being successful and stress-free. The age-old sutras presented in a nutshell are simple to apply and yield powerful results.',
    fullQuote:
      'I am gradually moving ahead towards leadership roles in my corporate career. Leader’s VOICE Lamp series and seminars taught me that becoming a servant leader is the secret of being successful and stress-free at the same time.\n\nThe age-old sutras presented in a nutshell are very easy to understand, simple to apply and yield amazingly powerful results.',
    badges: ['Johnson Controls', 'Test Engineer', 'Servant Leadership'],
  },

  // 13. Corporate: M. Krishna (Managing Director, Concentric Pumps)
  {
    id: 'm-krishna-concentric',
    type: 'corporate',
    name: 'M. Krishna',
    role: 'Managing Director',
    institutionOrCollege: 'Concentric Pumps India',
    driveId: '1oVCXlyUFvVAI093Dtt8n53R0gXrEmClh',
    driveUrl: 'https://drive.google.com/file/d/1oVCXlyUFvVAI093Dtt8n53R0gXrEmClh/view?usp=drive_link',
    tag: 'Managing Director • Concentric Pumps',
    outcome: 'Scientific presentation of Vedic wisdom essential for executive leadership in modern industry.',
    excerpt:
      'The presentation was very scientific and it gave us a profound insight into how Vedic knowledge is relevant in modern times more than ever before. I strongly recommend that corporate leaders and professionals take advantage of these character and leadership seminars for holistic growth.',
    fullQuote:
      'The presentation was very scientific and it gave us an insight into how the Vedic knowledge is very relevant in modern times more than ever before. I recommend that all corporate people should take advantage of these seminars.',
    keyPoints: [
      'Scientific exposition of timeless Vedic wisdom',
      'High relevance for corporate executives in modern environments',
      'Recommends leadership seminars across corporate sectors',
    ],
  },

  // 14. Student: Kiran Shekarappa (John Deere)
  {
    id: 'kiran-shekarappa',
    type: 'student',
    name: 'Kiran Shekarappa',
    role: 'Lead Engineer at Competency Technology & Labs',
    institutionOrCollege: 'John Deere • Engineering Alumnus',
    tag: 'Lead Engineer • John Deere Labs',
    outcome: 'Enhanced focus and deep empathy through daily mantra meditation, excelling at John Deere.',
    excerpt:
      'I found the seminars by Leaders VOICE to be intriguing and practical. It’s interesting how profound ancient knowledge is directly applicable for working professionals like me. Daily Mantra Meditation significantly improved my ability to focus and connect with colleagues with genuine empathy and clarity.',
    fullQuote:
      'I found the seminars by Leaders VOICE to be very intriguing and practical. It’s interesting how our profound ancient knowledge is applicable for a working professional like me.\n\nThe Mantra Meditation practice has significantly improved my ability to focus and connect with people around me in a much deeper sense. It is probably the best investment of time I have made in my life.',
    badges: ['John Deere Labs', 'Lead Engineer', 'Mantra Meditation'],
  },
];

export default function StoriesAlternatingSlider() {
  const [filterMode, setFilterMode] = useState<'all' | 'faculty' | 'student'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStory, setSelectedStory] = useState<AlternatingStoryItem | null>(null);

  const displayedStories = ALTERNATING_STORIES_DATA.filter((item) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'faculty') return item.type === 'faculty' || item.type === 'corporate';
    if (filterMode === 'student') return item.type === 'student';
    return true;
  });

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filterMode]);

  const maxIndex = displayedStories.length - 1;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedStory) return; // Let modal handle esc
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxIndex, selectedStory]);

  // Touch swipe support for mobile
  const touchStartXRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartXRef.current = null;
  };

  // On desktop, we show 2 cards side-by-side if possible:
  // Card 1: displayedStories[currentIndex]
  // Card 2: displayedStories[(currentIndex + 1) % displayedStories.length]
  const story1 = displayedStories[currentIndex];
  const story2 = displayedStories[(currentIndex + 1) % displayedStories.length];

  const renderCard = (story: AlternatingStoryItem, isSecondOnDesktop = false) => {
    const isFaculty = story.type === 'faculty';
    const isCorporate = story.type === 'corporate';
    const isStudent = story.type === 'student';

    return (
      <div
        key={story.id}
        className={`bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border transition-all duration-300 flex flex-col justify-between h-full shadow-[0_12px_36px_rgba(15,23,42,0.06)] hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden group ${
          isStudent
            ? 'border-purple-200/90 hover:border-purple-400'
            : isCorporate
            ? 'border-sky-200/90 hover:border-sky-400'
            : 'border-indigo-200/90 hover:border-indigo-400'
        } ${isSecondOnDesktop ? 'hidden lg:flex' : 'flex'}`}
      >
        {/* Top Accent Gradient Bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity ${
            isStudent
              ? 'from-purple-500 via-pink-500 to-indigo-500'
              : isCorporate
              ? 'from-sky-500 via-teal-500 to-indigo-500'
              : 'from-indigo-600 via-sky-500 to-purple-600'
          }`}
        />

        <div className="space-y-5">
          {/* Header: Prominent Photo with Exact Uniform Crop Placed Alongside Name, Role & Outcome */}
          <div className="flex items-start gap-4 sm:gap-5">
            {/* 1. Large, Prominent Face Photo with Identical Crop Across All Cards */}
            <div
              className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-2xl overflow-hidden border-2 shadow-md shrink-0 aspect-square bg-slate-100 ${
                isStudent
                  ? 'border-purple-200 ring-2 ring-purple-100/80'
                  : 'border-indigo-200 ring-2 ring-indigo-100/80'
              }`}
            >
              {story.driveId ? (
                <DriveImage
                  driveId={story.driveId}
                  alt={story.name}
                  size={400}
                  className="w-full h-full object-cover object-top"
                  showZoomIcon={false}
                />
              ) : (
                <div
                  className={`w-full h-full flex flex-col items-center justify-center font-black text-lg sm:text-xl font-display ${
                    isStudent
                      ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-800'
                      : 'bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-800'
                  }`}
                >
                  <span>
                    {story.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Beside Photo: Name, Role, College & Tag */}
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                    isStudent
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : isCorporate
                      ? 'bg-sky-100 text-sky-900 border border-sky-200'
                      : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                  }`}
                >
                  {isStudent ? (
                    <>
                      <GraduationCap className="w-3 h-3 text-purple-700" />
                      <span>Student Journey</span>
                    </>
                  ) : isCorporate ? (
                    <>
                      <Building2 className="w-3 h-3 text-sky-700" />
                      <span>Corporate Leader</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-3 h-3 text-indigo-700" />
                      <span>Faculty &amp; Dean</span>
                    </>
                  )}
                </span>

                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate max-w-[170px] sm:max-w-none">
                  {story.tag}
                </span>
              </div>

              <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 font-display leading-tight truncate">
                {story.name}
              </h3>

              <p className="text-xs sm:text-[13px] font-semibold text-indigo-950 leading-snug line-clamp-1">
                {story.role}
              </p>

              <p className="text-[11px] sm:text-xs text-slate-500 leading-tight truncate">
                {story.institutionOrCollege}
                {story.location ? `, ${story.location}` : ''}
              </p>
            </div>
          </div>

          {/* 3. One-Line Outcome Banner */}
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border text-xs leading-snug flex items-start gap-2 shadow-2xs ${
              isStudent
                ? 'bg-purple-50/70 border-purple-200/90 text-purple-950'
                : 'bg-indigo-50/70 border-indigo-200/90 text-indigo-950'
            }`}
          >
            <Sparkles
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isStudent ? 'text-purple-600' : 'text-indigo-600'
              }`}
            />
            <p className="font-semibold text-[11.5px] sm:text-xs leading-snug">
              <strong>Outcome:</strong> {story.outcome}
            </p>
          </div>

          {/* 4. 40-to-60 Word Excerpt */}
          <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-100 shadow-inner space-y-2">
            <Quote
              className={`w-5 h-5 shrink-0 ${
                isStudent ? 'text-purple-300' : 'text-indigo-300'
              }`}
            />
            <p className="text-slate-800 italic text-xs sm:text-[13.5px] leading-relaxed font-normal">
              &ldquo;{story.excerpt}&rdquo;
            </p>
          </div>
        </div>

        {/* 5. Card Footer: "Read Full Story" Button & Verified Links */}
        <div className="pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedStory(story)}
            className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer group/link ${
              isStudent
                ? 'text-purple-700 hover:text-purple-900'
                : 'text-indigo-700 hover:text-indigo-900'
            }`}
          >
            <span>Read full story</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center gap-2">
            {story.profileUrl && (
              <a
                href={story.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                title={`View ${story.profileLabel || 'Profile'}`}
              >
                <span>{story.profileLabel || 'Profile'}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
            {story.linkedIn && (
              <a
                href={story.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-bold transition-colors flex items-center gap-1"
                title="LinkedIn Profile"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Filter Chips & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        {/* Filter Chips: Alternating (All) vs Faculty vs Students */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/90 shadow-xs max-w-full overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Alternating Faculty &amp; Students ({ALTERNATING_STORIES_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('faculty')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'faculty'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏛️ Faculty &amp; Deans (7)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('student')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'student'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎓 Students (7)
          </button>
        </div>

        {/* Manual Slider Arrow Controls (No Auto-Advance!) */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-mono font-bold text-slate-500">
            {currentIndex + 1} of {displayedStories.length}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous story"
              className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next story"
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Slider Cards Viewport (Touch Swipe Enabled) */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {story1 && renderCard(story1, false)}
        {story2 && renderCard(story2, true)}
      </div>

      {/* Dot Pagination Track */}
      <div className="flex items-center justify-center gap-1.5 pt-2">
        {displayedStories.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to story ${idx + 1}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              idx === currentIndex
                ? 'w-7 h-2.5 bg-indigo-600'
                : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      {/* =========================================================================
          READ FULL STORY MODAL DIALOG
          Opens when clicking "Read full story" to show full unabridged quote,
          multiple paragraphs, milestones & takeaways without leaving page.
         ========================================================================= */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          {/* Backdrop Click to Close */}
          <div className="absolute inset-0" onClick={() => setSelectedStory(null)} />

          <div className="relative z-10 max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedStory.type === 'student' ? 'bg-purple-600' : 'bg-indigo-600'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {selectedStory.type === 'student'
                    ? 'Verified Student Transformation'
                    : 'Official Leadership Endorsement'}
                </span>
              </div>
              <button
                onClick={() => setSelectedStory(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* Person Credential Header */}
              <div className="flex items-center gap-4 sm:gap-5 pb-5 border-b border-slate-100">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-md shrink-0 aspect-square bg-slate-100">
                  {selectedStory.driveId ? (
                    <DriveImage
                      driveId={selectedStory.driveId}
                      alt={selectedStory.name}
                      size={400}
                      className="w-full h-full object-cover object-top"
                      showZoomIcon={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-xl bg-indigo-100 text-indigo-800">
                      {selectedStory.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 font-display">
                    {selectedStory.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-indigo-900">
                    {selectedStory.role}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedStory.institutionOrCollege}
                    {selectedStory.location ? `, ${selectedStory.location}` : ''}
                  </p>
                </div>
              </div>

              {/* Outcome Highlight Box */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed font-medium space-y-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block">
                  KEY TRANSFORMATION / OUTCOME
                </span>
                <p>{selectedStory.outcome}</p>
              </div>

              {/* Full Unabridged Quote */}
              <div className="space-y-3">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
                  COMPLETE VERIFIED STATEMENT
                </span>
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-800 italic text-sm sm:text-base leading-relaxed space-y-3.5">
                  <Quote className="w-6 h-6 text-indigo-300" />
                  {selectedStory.fullQuote.split('\n\n').map((para, pIdx) => (
                    <p key={pIdx}>&ldquo;{para}&rdquo;</p>
                  ))}
                </div>
              </div>

              {/* Key Points or Badges */}
              {selectedStory.keyPoints && selectedStory.keyPoints.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-600 block">
                    CORE TAKEAWAYS
                  </span>
                  <div className="space-y-1.5">
                    {selectedStory.keyPoints.map((pt, ptIdx) => (
                      <div key={ptIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedStory.badges && selectedStory.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedStory.badges.map((b, bIdx) => (
                    <span
                      key={bIdx}
                      className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Verified VOICE Gurukul Impact Story
              </span>

              <div className="flex items-center gap-2">
                {selectedStory.driveUrl && (
                  <a
                    href={selectedStory.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Original Document</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}
                {selectedStory.profileUrl && (
                  <a
                    href={selectedStory.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>{selectedStory.profileLabel || 'Verified Profile'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
