export interface LeaderFeedback {
  id: string;
  name: string;
  designation: string;
  institution: string;
  location: string;
  driveId: string;
  driveUrl: string;
  profileUrl?: string;
  profileLabel?: string;
  quote: string;
  keyPoints?: string[];
  tag: string;
  type?: 'academic' | 'corporate';
}

export interface StudentStory {
  id: string;
  name: string;
  college: string;
  role: string;
  avatar?: string;
  driveId?: string;
  driveUrl?: string;
  linkedIn?: string;
  profileUrl?: string;
  profileLabel?: string;
  badges?: string[];
  quote: string;
  impact: string;
  year?: string;
}

export interface FormalLetter {
  id: string;
  title: string;
  institution: string;
  location: string;
  signatory: string;
  designation: string;
  refDate?: string;
  subject: string;
  driveId: string;
  driveUrl: string;
  tag: string;
  summary: string;
  keyHighlights: string[];
}

export interface AlumniProfile {
  id: string;
  name: string;
  education?: string;
  role: string;
  companyOrOrg: string;
  location?: string;
  badge?: string;
  category: 'premier-tech' | 'corporate-leaders' | 'research-public' | 'academia-health';
}

export const LEADER_FEEDBACK_DATA: LeaderFeedback[] = [
  {
    id: 'rajesh-jalnekar',
    name: 'Prof. (Dr.) Rajesh Jalnekar',
    designation: 'Director',
    institution: 'Vishwakarma Institute of Technology (VIT)',
    location: 'Pune, Maharashtra',
    driveId: '1D5DfwFwyWbKJmvKFRserfXB9C19_pMMA',
    driveUrl: 'https://drive.google.com/file/d/1D5DfwFwyWbKJmvKFRserfXB9C19_pMMA/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/rajesh-jalnekar-9a43b5ba',
    profileLabel: 'LinkedIn',
    tag: '12+ Years Partnership • VIT Pune',
    type: 'academic',
    quote:
      'I am extremely happy with the VOICE Club’s activities in Vishwakarma Institute of Technology, Pune during last 12 years. Hundreds of students have got benefited through these activities over the years. VOICE Club focuses on imparting the invaluable ancient wisdom precisely connecting it to the modern world realities. Solutions to contemporary problems related to but not limited to stress management, priority management, character built-up, mind power, Leadership and Management, finding deeper meaning in life etc. are sought by the youth today & VOICE Club gives impeccable and practical solutions to all these issues. Opportunities are also provided to college students wherein youth can practically involve themselves with responsibilities of leadership and management to practically apply these principles and imbibe in their personalities. VOICE Club’s faculty members are immensely experienced in delivering such programs to college youth and we have always got a very encouraging feedback from our students about this club.',
    keyPoints: [
      'Over 12 years of impactful campus partnership at VIT Pune',
      'Practical solutions for stress & priority management',
      'Hands-on youth leadership & character development',
    ],
  },
  {
    id: 'kanchan-choudhary',
    name: 'Prof. Kanchan Choudhary',
    designation: 'Department of Cryogenics',
    institution: 'Indian Institute of Technology (IIT)',
    location: 'Kharagpur, West Bengal',
    driveId: '17kRIQtjQqR3_Q7bCCWNDXUS2Z0Kk77ah',
    driveUrl: 'https://drive.google.com/file/d/17kRIQtjQqR3_Q7bCCWNDXUS2Z0Kk77ah/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/kanchan-chowdhury-a0817636',
    profileLabel: 'LinkedIn',
    tag: '2 Decades at IIT Kharagpur',
    type: 'academic',
    quote:
      'Western education and philosophy give a lot of emphasis on the development of body and intellect. Present-day education in schools and homes follows western thoughts and it does not include a systematic training of mind. Mind is important to understand self. It helps one to interact with the world bravely and to face the reality with confidence and poise. When an 18-year-old comes to the college hostel, he appears like a soldier sent to fight in the battle-field without imparting any training on how to use his gun and sword. Co-curricular activities in colleges are often inadequate, because they counsel with western psychology and teach Yoga. These activities fail to strike at the root of understanding about inter-relationship of body-mind-intellect-ego-soul of an individual. VOICE fills up this critical void and, at IIT Kharagpur, I was fortunate to be associated with and watch them serving the student community during the last 2 decades. I myself have learnt a great deal to develop a better vision towards life and will always remain thankful to them for this kind favor shown to me.',
    keyPoints: [
      'Systematic mind training beyond conventional education',
      'Root understanding of body, mind, intellect & soul',
      'Serving student community at IIT Kharagpur for 2 decades',
    ],
  },
  {
    id: 'sk-sarangi',
    name: 'Prof. S.K. Sarangi',
    designation: 'Director',
    institution: 'National Institute of Technology (NIT)',
    location: 'Rourkela, Odisha',
    driveId: '1HeOpeFR6vQheIRwMIg_PR1YrZ8-xMtnR',
    driveUrl: 'https://drive.google.com/file/d/1HeOpeFR6vQheIRwMIg_PR1YrZ8-xMtnR/view?usp=drive_link',
    profileUrl: 'https://www.youtube.com/watch?v=fAkMug0FO3w',
    profileLabel: 'YouTube Talk',
    tag: 'Director • NIT Rourkela',
    type: 'academic',
    quote:
      'We live in a technology driven society. Technology is not only a profession for us, it is a way of life. As technologists and scientists, we analyze every event through our lens of logic, find causes and effects, and take decisions that lead to creation of wealth. This impersonal approach to life sometimes drives us out of the path of caring for our neighbour. A life based on strong ethical values is the only answer to such a situation. I am happy to hear that the organization VOICE is indeed addressing these issues and that our students are taking active role in this work. I wish every participant success in his/her life.',
    keyPoints: [
      'Infusing strong ethical values in technology-driven education',
      'Balancing logic and wealth creation with compassion',
      'Students actively engaging in societal responsibility',
    ],
  },
  {
    id: 'gk-shivakumar',
    name: 'Dr. G. K. Shivakumar',
    designation: 'Dean Administration',
    institution: 'National Institute of Technology (NIT)',
    location: 'Surathkal, Karnataka',
    driveId: '1KtMwzjS1ROBu81corfy07A0L4BvySVmd',
    driveUrl: 'https://drive.google.com/file/d/1KtMwzjS1ROBu81corfy07A0L4BvySVmd/view?usp=drive_link',
    profileUrl: 'https://old.nitk.ac.in/people/prof-gk-shivakumar',
    profileLabel: 'NITK Profile',
    tag: 'Dean Administration • NIT Surathkal',
    type: 'academic',
    quote:
      'I am delighted to be associated with VOICE, a movement for grooming youth into principle-centered leaders. It has been doing a commendable job in bringing out the potential in students for developing virtues of motivation and self-confidence through seminars, group discussions and special counseling.',
    keyPoints: [
      'Grooming youth into principle-centered leaders',
      'Building deep motivation and self-confidence',
      'Impactful seminars, discussions and personal counseling',
    ],
  },
  {
    id: 'ganesh-ramakrishnan',
    name: 'Dr. Ganesh Ramakrishnan',
    designation: 'Ph.D, Computer Science',
    institution: 'IBM India Research Labs',
    location: 'India',
    driveId: '1NwObDpcB1TxjUV4wtIfNQ9Fwyoxiu26M',
    driveUrl: 'https://drive.google.com/file/d/1NwObDpcB1TxjUV4wtIfNQ9Fwyoxiu26M/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/ganesh-ramakrishnan-ba6164b',
    profileLabel: 'LinkedIn',
    tag: 'IBM Research & IIT Alumnus',
    type: 'academic',
    quote:
      'It is my honest view that the foundational training in character and open-minded but deep thinking that VOICE provides to students perfectly complements every individual’s and organization\'s endeavor for attaining technical competence. I have myself been immensely benefited by the Vedic teachings.',
    keyPoints: [
      'Character training perfectly complements technical competence',
      'Cultivating open-minded, deep analytical thinking',
      'Direct personal benefit from timeless Vedic teachings',
    ],
  },
  {
    id: 'pramela-zensar',
    name: 'Ms. Pramela Kalive',
    designation: 'HR Manager',
    institution: 'Zensar Technologies',
    location: 'Pune, Maharashtra',
    driveId: '1mTe324pJgn9A861UgCCiiobEb9z1Eotf',
    driveUrl: 'https://drive.google.com/file/d/1mTe324pJgn9A861UgCCiiobEb9z1Eotf/view?usp=drive_link',
    profileUrl: 'https://in.linkedin.com/in/prameelakalive',
    profileLabel: 'LinkedIn',
    tag: 'HR Manager • Zensar Technologies',
    type: 'corporate',
    quote:
      'We found the workshop very effective because the workshop not only highlighted on the common causes & symptoms of stress but the workshop also gave us good insights into what are the effective & simple techniques for managing stress.',
    keyPoints: [
      'Effective identification of root stress triggers & symptoms',
      'Actionable and simple techniques for daily stress management',
      'Immediate practical value across corporate teams',
    ],
  },
  {
    id: 'm-krishna-concentric',
    name: 'M. Krishna',
    designation: 'Managing Director',
    institution: 'Concentric Pumps India',
    location: 'India',
    driveId: '1oVCXlyUFvVAI093Dtt8n53R0gXrEmClh',
    driveUrl: 'https://drive.google.com/file/d/1oVCXlyUFvVAI093Dtt8n53R0gXrEmClh/view?usp=drive_link',
    tag: 'Managing Director • Concentric Pumps',
    type: 'corporate',
    quote:
      'The presentation was very scientific and it gave us an insight into how the Vedic knowledge is very relevant in modern times more than ever before. I recommend that all corporate people should take advantage of these seminars.',
    keyPoints: [
      'Scientific exposition of timeless Vedic wisdom',
      'High relevance for corporate executives in modern high-pressure environments',
      'Strongly recommends leadership seminars across corporate sectors',
    ],
  },
  {
    id: 'ajay-chandak-techm',
    name: 'Ajay Chandak',
    designation: 'Senior Project Manager',
    institution: 'Tech Mahindra',
    location: 'Pune, Maharashtra',
    driveId: '17qrdZs94nptKW_FCh9sCCtKEnA0CwvyI',
    driveUrl: 'https://drive.google.com/file/d/17qrdZs94nptKW_FCh9sCCtKEnA0CwvyI/view?usp=drive_link',
    profileUrl: 'https://www.facebook.com/ajay.chandak.581/',
    profileLabel: 'Facebook',
    tag: 'Sr. Project Manager • Tech Mahindra',
    type: 'corporate',
    quote:
      'I have been greatly benefited and I feel more empowered to deal with crisis situations in a stress free manner.',
    keyPoints: [
      'Inner empowerment to navigate crisis situations with calm clarity',
      'Direct stress reduction under high project delivery pressure',
      'Substantial personal and managerial transformation',
    ],
  },
];

export const INITIAL_STUDENT_STORIES: StudentStory[] = [
  {
    id: 'rahul-kumar-sevakula',
    name: 'Rahul Kumar Sevakula',
    college: 'NIT Warangal (B.Tech) • IIT Kanpur (PhD) • Harvard University',
    role: 'Jr. Faculty at Harvard Medical School & Massachusetts General Hospital',
    driveId: '1uOTcnAf0uxs3tkcLrVYeIRd-NrPkOi36',
    driveUrl: 'https://drive.google.com/file/d/1uOTcnAf0uxs3tkcLrVYeIRd-NrPkOi36/view?usp=drive_link',
    profileUrl: 'https://loop.frontiersin.org/people/2194890/overview',
    profileLabel: 'Research Loop',
    badges: ['Harvard Medical School', 'IIT Kanpur PhD', 'NITW 5th Rank (8.56 CGPA)'],
    quote:
      'I had been strongly associated with VOICE from my first year at NIT Warangal. By nature, I have an independent mentality and hence accept things only after I am convinced. So my acceptance of the teachings was inspired by their purity and the intellectual calling it gave.\n\nThe non-sectarian teachings at VOICE based on Bhagavad Gita, Gandhi, Tolstoy, etc. answered all my questions to full satisfaction. We learnt in VOICE that “We should try our best and leave the rest to God”. This teaching was a great relief and reduced the stress I had during exams.\n\nMy rank at the end of first year was 12th; I passed out of NIT Warangal in 2009 with 5th rank out of 76 students with CGPA of 8.56/10.0, awarded merit scholarship from NITW in 3rd and 4th year.',
    impact: 'Rose to 5th rank at NITW (8.56 CGPA), completed IIT Kanpur PhD, Postdoc at Harvard, and now Jr. Faculty at Harvard Medical School.',
  },
  {
    id: 'amarendra-edpuganti',
    name: 'Amarendra Edpuganti',
    college: 'NIT Warangal (B.Tech 8.65) • IIT Kanpur (M.Tech 9.24) • PhD Singapore',
    role: 'PhD Scholar, Singapore University • Ex-Software Engineer, Adobe Systems',
    driveId: '1LnNGU3F7d17EKTglx7xDHA5jj06Ps4pd',
    driveUrl: 'https://drive.google.com/file/d/1LnNGU3F7d17EKTglx7xDHA5jj06Ps4pd/view?usp=drive_link',
    badges: ['GATE AIR-26 (EE)', 'IIT Kanpur 9.24 CGPA', 'Ex-Adobe Systems (2.5 yrs)'],
    quote:
      'I had a lot of difficulty in my studies during 3rd semester of B.Tech at NITK especially because of some bad habits I got introduced to by seniors. I was not able to focus on my studies as I lost my concentration.\n\nFortunately, I got to know about seminars offered by VOICE through my roommate and many of my problems got solved in the first seminar itself. Then I started regularly doing meditation (chanting Hare Krishna Mantra) and attending seminars. Slowly I came out of the mental tussle and managed 3rd semester with SGPA of 8.3 and in the next semester I got SGPA of 9.14 (3rd position in class).\n\nWhen I was preparing for GATE, I had just 2.5 months and surprisingly did not feel any stress or anxiety—achieving AIR 26 in GATE 2010. Seminars offered by VOICE should be made an official part of curriculum in all colleges as they make individuals handle difficult situations and overcome self-destructive habits.',
    impact: 'Overcame toxic habits, secured 9.14 SGPA, achieved GATE AIR-26 in 2.5 months, worked 2.5 years at Adobe Systems, and now pursuing PhD in Singapore.',
  },
  {
    id: 'sairaj-deshmukh',
    name: 'Sairaj Deshmukh',
    college: 'NMIET, Pune',
    role: 'Senior QA Engineer at Advik Hi-Tech',
    driveId: '12FOi1FSPyAcmY7yICA9G_Siruvlt1FI8',
    driveUrl: 'https://drive.google.com/file/d/12FOi1FSPyAcmY7yICA9G_Siruvlt1FI8/view?usp=drive_link',
    linkedIn: 'https://www.linkedin.com/pub/dir/Sairaj/Deshmukh',
    badges: ['Senior QA Engineer', 'Advik Hi-Tech', 'NMIET Pune Alumnus'],
    quote:
      'Along with shaping my studies and my career, VOICE has a very crucial part in shaping my life and building character. During my college days, the seniors here guided me and helped me in my studies. I remember how we used to have group discussions and stage programs which helped a lot in boosting confidence & fetching a job in campus placements.\n\nI would have never visited different parts of India by myself to explore Vedic culture, trekking, and having lots of fun on the go. It was all possible because of the loving and caring nature of a huge friend circle, which pushes each other to live a life of ethics and values. The people with whom we associate shape our life.',
    impact: 'Built lasting confidence through stage programs, secured campus placement, and established life of ethics and character.',
  },
  {
    id: 'arupjyoti',
    name: 'Arupjyoti',
    college: 'University of Melbourne, Australia',
    role: 'Master of Management Scholar',
    driveId: '13GQyjTVS93n7U7BiZtUvjDAvZ0zDfgsX',
    driveUrl: 'https://drive.google.com/file/d/13GQyjTVS93n7U7BiZtUvjDAvZ0zDfgsX/view?usp=drive_link',
    badges: ['Univ of Melbourne', 'Master of Management', 'Change Maker'],
    quote:
      'VOICE has helped me identify my potential, and I realized that ultimate satisfaction is experienced with a grateful heart, which shelters around selfless service attitude. VOICE training taught me to embrace the world with a positive outlook and permeated within me to be a change maker.\n\nI owe a lot of what I am today to VOICE and my mentors. Here the foundation of management and leadership permeated in my life, and I decided to be a change-maker to impact the lives of people.',
    impact: 'Cultivated selfless service attitude and leadership vision, now pursuing Master of Management at Univ of Melbourne.',
  },
  {
    id: 'srikar-vadlamani',
    name: 'Srikar Vadlamani',
    college: 'University of Houston, Texas, USA',
    role: 'Manufacturing Engineer at Terumo Medical Corporation, Maryland, USA',
    driveId: '1mRsR2iF6eRXW5K1Om5Qi-ZdvKcshEn4Z',
    driveUrl: 'https://drive.google.com/file/d/1mRsR2iF6eRXW5K1Om5Qi-ZdvKcshEn4Z/view?usp=drive_link',
    linkedIn: 'https://www.linkedin.com/in/srikar-vadlamani-a1a003163',
    badges: ['Terumo Medical USA', 'Univ of Houston', 'Manufacturing Engineer'],
    quote:
      'VOICE training taught me what true happiness in life means. It has helped me to be more focused and clear about the short term and long term goals I set in life. I learnt about the true values one must cultivate and live by, so many of my confusions were resolved.\n\nVOICE training has helped me with becoming more patient, tolerant and in developing the right attitude towards life. Overall it helped me with becoming a better person.',
    impact: 'Gained goal clarity, patience, and values, now thriving as Manufacturing Engineer at Terumo Medical Corporation in Maryland, USA.',
  },
  {
    id: 'naman-kashyap',
    name: 'Naman Kashyap',
    college: 'Engineering Alumnus',
    role: 'Test Engineer at Johnson Controls',
    driveId: '1CQvKylBaiNrfsL6aLDrsL77PFgS9OPEr',
    driveUrl: 'https://drive.google.com/file/d/1CQvKylBaiNrfsL6aLDrsL77PFgS9OPEr/view?usp=drive_link',
    linkedIn: 'https://in.linkedin.com/in/naman-kashyap-18b33ab9',
    badges: ['Johnson Controls', 'Test Engineer', 'Servant Leadership'],
    quote:
      'I am gradually moving ahead towards leadership roles in my corporate career. Leader’s VOICE Lamp series and seminars taught me that becoming a servant leader is the secret of being successful and stress-free at the same time.\n\nThe age-old sutras presented in a nutshell are very easy to understand, simple to apply and yield amazingly powerful results.',
    impact: 'Applied timeless servant leadership principles for rapid, stress-free corporate career progression.',
  },
  {
    id: 'kiran-shekarappa',
    name: 'Kiran Shekarappa',
    college: 'Engineering & Technology Alumnus',
    role: 'Lead Engineer at Competency Technology & Labs, John Deere',
    badges: ['John Deere Labs', 'Lead Engineer', 'Mantra Meditation'],
    quote:
      'I found the seminars by Leaders VOICE to be very intriguing and practical. It’s interesting how our profound ancient knowledge is applicable for a working professional like me.\n\nThe Mantra Meditation practice has significantly improved my ability to focus and connect with people around me in a much deeper sense. It is probably the best investment of time I have made in my life.',
    impact: 'Enhanced focus and deep empathy through daily mantra meditation, excelling as Lead Engineer at John Deere.',
  },
];

export const FORMAL_LETTERS_DATA: FormalLetter[] = [
  {
    id: 'nitt-endorsement',
    title: 'NIT Tiruchirappalli Official Recommendation Letter',
    institution: 'National Institute of Technology, Tiruchirappalli (NITT)',
    location: 'Tamil Nadu - 620 015, India',
    signatory: 'Dr. S. Sundarrajan',
    designation: 'Director, NIT Tiruchirappalli',
    refDate: 'REF: NITT/DO/2013 • Date: 10.05.2013',
    subject:
      'Need for principle centered leadership training to universities through Youth Empowerment Solutions program – Conducted by DHRUVA Club',
    driveId: '1eBU7iS_ZHOg34XNQr-Rye4aXJfzKJpE4',
    driveUrl: 'https://drive.google.com/file/d/1eBU7iS_ZHOg34XNQr-Rye4aXJfzKJpE4/view?usp=drive_link',
    tag: 'Director Endorsement • NIT Trichy',
    summary:
      'In today\'s modern world there is a great need for expediting overall development of individuals transforming them into Principle Centered Leaders of society. For this reason the club focuses on character with competence to bring out the latent potentiality in an individual in a remarkable way... I\'d really recommend you also to try it once for your students.',
    keyHighlights: [
      'Keeping students away from bad habits, stress & addiction',
      'Inspiring youth to maintain character, poise and discipline',
      'Fostering responsible, committed and spiritually grounded leaders',
      'Providing skills training in multimedia, GDs & placement interviews',
    ],
  },
  {
    id: 'sinhgad-letter',
    title: 'Sinhgad College of Engineering Official Letter of Gratitude',
    institution: 'Sinhgad Technical Education Society’s Sinhgad College of Engineering (SCOE)',
    location: 'Vadgaon (Bk), Off Sinhgad Road, Pune - 411 041',
    signatory: 'Dr. V. K. Chowdhary & Yash Bagde',
    designation: 'FE - HOD & Student Co-coordinator (Student Welfare Club)',
    refDate: 'Sinhgad Student Council’s Student Welfare Club',
    subject:
      'Grateful for your assistance in conducting value education programs in Sinhgad Institute college',
    driveId: '1_sQZ37N9RqiPQmLB4p_TOveFWo_qgVTP',
    driveUrl: 'https://drive.google.com/file/d/1_sQZ37N9RqiPQmLB4p_TOveFWo_qgVTP/view?usp=drive_link',
    tag: 'HOD & Council Letter • Sinhgad COE Pune',
    summary:
      'The Student Welfare Club (SWC) is very thankful to VOICE for conducting and providing faculties for various leadership programs and value based training to students of our college. Your club is doing a noble task of creating principle centered leaders and most of your training programs are conducted free of cost for welfare of students.',
    keyHighlights: [
      'Workshops teaching technical skills like Python, Machine Learning etc.',
      'Special pedagogical & wellness seminars for engineering faculties',
      'Accomplished speakers bridging corporate leadership and spirituality',
      'FE Induction seminars on Leadership, Smart Work & Stress Management',
    ],
  },
];

export const ALUMNI_NETWORK_DATA: AlumniProfile[] = [
  // Premier Tech & Institutes (IITs / NITs / IIMs)
  {
    id: 'gokul-ramesh',
    name: 'Gokul Ramesh',
    education: 'IIT Madras',
    badge: 'GATE AIR-1',
    role: 'Associate, BFS',
    companyOrOrg: 'Cognizant Technology Solutions',
    category: 'premier-tech',
  },
  {
    id: 'shibasish-prusty',
    name: 'Shibasish Prusty',
    education: 'NIT Rourkela',
    badge: 'ISRO Scientist',
    role: 'Scientist',
    companyOrOrg: 'ISRO (Space Applications Centre)',
    location: 'Ahmedabad',
    category: 'research-public',
  },
  {
    id: 'sudhir-saini',
    name: 'Sudhir Saini',
    education: 'IIT Kharagpur (Electrical) • MS from Carnegie Mellon',
    badge: 'Carnegie Mellon MS',
    role: 'Engineer / Tech Professional',
    companyOrOrg: 'Top Tech MNC',
    location: 'United States',
    category: 'premier-tech',
  },
  {
    id: 'vishal-pandey',
    name: 'Vishal Pandey',
    education: 'IIT Kharagpur (Agriculture)',
    role: 'Engineering Professional',
    companyOrOrg: 'John Deere',
    category: 'premier-tech',
  },
  {
    id: 'chandresh',
    name: 'Chandresh',
    education: 'IIT Kanpur',
    role: 'Software Engineer',
    companyOrOrg: 'Infosys',
    category: 'premier-tech',
  },
  {
    id: 'arjun-ramachandra',
    name: 'Arjun K Ramachandra',
    education: 'IIT Kharagpur (Mathematics)',
    badge: 'PhD Scholar',
    role: 'Professor',
    companyOrOrg: 'VIT Pune (Pursuing PhD)',
    location: 'Pune',
    category: 'academia-health',
  },
  {
    id: 's-praveen',
    name: 'S Praveen',
    education: 'IIT Kharagpur (B.Tech & M.Tech)',
    badge: 'IIT PhD Scholar',
    role: 'Doctoral Researcher',
    companyOrOrg: 'IIT Kharagpur',
    category: 'academia-health',
  },
  {
    id: 'vipul-agarwal',
    name: 'Vipul Agarwal',
    education: 'IIT Kharagpur (Electrical) • IIM Calcutta MBA',
    badge: 'IIM Calcutta',
    role: 'Management Scholar / Professional',
    companyOrOrg: 'IIM Calcutta',
    category: 'premier-tech',
  },
  {
    id: 'manish-nitw',
    name: 'Manish',
    education: 'NIT Warangal (NITW)',
    badge: 'MS in USA',
    role: 'Graduate Researcher (MS)',
    companyOrOrg: 'US University',
    location: 'United States',
    category: 'premier-tech',
  },
  {
    id: 'vipul-sutrave',
    name: 'Vipul Sutrave',
    role: 'Technology Specialist',
    companyOrOrg: 'US Tech Enterprise',
    location: 'United States',
    category: 'corporate-leaders',
  },
  {
    id: 'anoop-grewal',
    name: 'Anoop Grewal',
    education: 'IIT Kharagpur (B.Tech)',
    role: 'Technology Professional',
    companyOrOrg: 'Technology Industry',
    category: 'premier-tech',
  },
  {
    id: 'bhaskar-garg',
    name: 'Bhaskar Garg',
    education: 'IIM Alumnus',
    badge: 'IIM Alumnus',
    role: 'Project Manager',
    companyOrOrg: 'Infosys',
    category: 'corporate-leaders',
  },
  {
    id: 'gaurav-agrawal',
    name: 'Gaurav Agrawal',
    education: 'IIM Alumnus',
    badge: 'Infosys Germany',
    role: 'Consultant',
    companyOrOrg: 'Infosys',
    location: 'Germany',
    category: 'corporate-leaders',
  },
  {
    id: 'rajkrushna-sahoo',
    name: 'Rajkrushna Sahoo',
    education: 'NIT Rourkela',
    role: 'Engineer',
    companyOrOrg: 'Nokia',
    location: 'Chennai',
    category: 'premier-tech',
  },
  {
    id: 'chetak-pradhan',
    name: 'Chetak Pradhan',
    education: 'NIT Rourkela',
    role: 'Software Engineer',
    companyOrOrg: 'ITC Infotech',
    location: 'Bangalore',
    category: 'premier-tech',
  },
  {
    id: 'sabak-gardia',
    name: 'Sabak Gardia',
    education: 'NIT Rourkela',
    role: 'Engineer',
    companyOrOrg: 'Med Agency',
    location: 'Mumbai',
    category: 'premier-tech',
  },
  {
    id: 'akash-akula',
    name: 'Akash Akula',
    education: 'NIT Rourkela',
    role: 'Engineer',
    companyOrOrg: 'Larsen & Toubro (L&T Limited)',
    location: 'Udaipur',
    category: 'premier-tech',
  },
  {
    id: 'jagdish',
    name: 'Jagdish',
    education: 'NIT Rourkela',
    badge: 'ONGC Senior Manager',
    role: 'Senior Manager',
    companyOrOrg: 'ONGC',
    location: 'Balasore',
    category: 'research-public',
  },
  {
    id: 'rohit-suyal',
    name: 'Rohit Suyal',
    education: 'NIT Rourkela',
    badge: 'Indian Railways',
    role: 'Senior Engineer',
    companyOrOrg: 'Indian Railways',
    location: 'Chittaranjan',
    category: 'research-public',
  },
  {
    id: 'soumya-behera',
    name: 'Soumya Ranjan Behera',
    education: 'NIT Rourkela',
    badge: 'Tata Steel Senior Manager',
    role: 'Senior Manager',
    companyOrOrg: 'Tata Steel',
    location: 'Keonjhar',
    category: 'research-public',
  },
  {
    id: 'g-manish',
    name: 'G. Manish',
    education: 'NIT Rourkela',
    role: 'Engineer',
    companyOrOrg: 'DXC Technology',
    location: 'Bangalore',
    category: 'premier-tech',
  },

  // Corporate & Industry Leaders
  {
    id: 'anant-vaknalli',
    name: 'Anant Vaknalli',
    education: 'B.E.',
    badge: 'Deputy GM',
    role: 'Deputy General Manager',
    companyOrOrg: 'Gabriel India Pvt. Ltd.',
    category: 'corporate-leaders',
  },
  {
    id: 'sandip-kamat',
    name: 'Sandip Kamat',
    badge: 'IBM Senior Delivery Manager',
    role: 'Senior Delivery Manager',
    companyOrOrg: 'IBM',
    category: 'corporate-leaders',
  },
  {
    id: 'chandru',
    name: 'Chandru',
    badge: 'Senior Tech Lead',
    role: 'Senior Tech Lead',
    companyOrOrg: 'Tech Mahindra',
    category: 'corporate-leaders',
  },
  {
    id: 'devraj-dangwal',
    name: 'Devraj Dangwal',
    role: 'Project Manager',
    companyOrOrg: 'Infosys',
    category: 'corporate-leaders',
  },
  {
    id: 'ram-mohan-gupta',
    name: 'Ram Mohan Gupta',
    role: 'Project Manager',
    companyOrOrg: 'Infosys',
    category: 'corporate-leaders',
  },
  {
    id: 'abhijit-toley',
    name: 'Abhijit Toley',
    role: 'Team Leader',
    companyOrOrg: 'Symantec',
    category: 'corporate-leaders',
  },
  {
    id: 'sreekanth',
    name: 'Sreekanth',
    role: 'HR Manager',
    companyOrOrg: 'Forbes Marshall',
    category: 'corporate-leaders',
  },
  {
    id: 'deepak-sharma',
    name: 'Deepak Sharma',
    role: 'Senior Software Engineer',
    companyOrOrg: 'Cognizant',
    category: 'corporate-leaders',
  },
  {
    id: 'nm-mudaliyar',
    name: 'N. M. Mudaliyar',
    role: 'System Analyst',
    companyOrOrg: 'S1 Services',
    category: 'corporate-leaders',
  },
  {
    id: 'uday-soundankar',
    name: 'Uday Soundankar',
    role: 'Project Manager',
    companyOrOrg: 'L&T Infotech (LTIMindtree)',
    category: 'corporate-leaders',
  },
  {
    id: 'jitendra-pardesi',
    name: 'Jitendra Singh Pardesi',
    role: 'Software Engineer',
    companyOrOrg: 'Infosys',
    category: 'corporate-leaders',
  },
  {
    id: 'anil-timbe',
    name: 'Anil Timbe',
    role: 'Team Leader',
    companyOrOrg: 'Geometric (HCL)',
    category: 'corporate-leaders',
  },
  {
    id: 'akshay-yewale',
    name: 'Akshay Yewale',
    role: 'Demand Planner',
    companyOrOrg: 'Armacell India Pvt. Ltd.',
    location: 'Pune',
    category: 'corporate-leaders',
  },
  {
    id: 'jayneel-trivedi',
    name: 'Jayneel Trivedi',
    education: 'B.Arch',
    role: 'Architectural Consultant',
    companyOrOrg: 'Independent Practice',
    location: 'Pune',
    category: 'corporate-leaders',
  },

  // Healthcare, Academia & Directorships
  {
    id: 'prashant-dhotre',
    name: 'Dr. Prashant Dhotre',
    education: 'M.D. Anesthesia',
    badge: 'Medical Specialist',
    role: 'Consultant / Anesthesiologist',
    companyOrOrg: 'Sassoon General Hospital',
    location: 'Pune',
    category: 'academia-health',
  },
  {
    id: 'dnyanesh-naole',
    name: 'Prof. Dnyanesh Naole',
    badge: 'College Professor',
    role: 'Professor',
    companyOrOrg: 'Sinhgad College of Engineering (SCOE)',
    location: 'Pune',
    category: 'academia-health',
  },
  {
    id: 'jayesh-bhangdiya',
    name: 'Jayesh Bhangdiya',
    education: 'B.E. Computer Engineering',
    role: 'Lecturer',
    companyOrOrg: 'Dhole Patil College of Engineering (DPCOE)',
    location: 'Pune',
    category: 'academia-health',
  },
  {
    id: 'abhijeet-sit',
    name: 'Abhijeet',
    education: 'SIT Pune Alumnus',
    role: 'Engineering Graduate',
    companyOrOrg: 'Technology Industry',
    location: 'Pune',
    category: 'premier-tech',
  },
  {
    id: 'amit-purohit',
    name: 'Amit Purohit',
    badge: 'Academy Director',
    role: 'Director',
    companyOrOrg: 'Dhruva Academy',
    location: 'Narayangaon',
    category: 'academia-health',
  },
  {
    id: 'balraju-karri',
    name: 'Balraju Karri',
    badge: 'Academy Director',
    role: 'Director',
    companyOrOrg: 'Shri Sandipani Academy',
    location: 'Ahmednagar',
    category: 'academia-health',
  },
];
