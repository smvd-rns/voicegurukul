import { extendedStateCities } from './india-cities-extended';

export const indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const stateCities: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur',
    'Eluru', 'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali', 'Chittoor', 'Hindupur', 'Proddatur', 'Bhimavaram',
    'Madanapalle', 'Guntakal', 'Dharmavaram', 'Gudivada', 'Srikakulam', 'Narasaraopet', 'Rajampet', 'Tadpatri', 'Kadiri', 'Chilakaluripet',
    'Ponnur', 'Vuyyuru', 'Tanuku', 'Bapatla', 'Markapur', 'Palakollu', 'Amalapuram', 'Bhimunipatnam', 'Bobili', 'Chirala',
    'Repalle', 'Nidadavole', 'Jaggaiahpet', 'Peddapuram', 'Pithapuram', 'Samalkot', 'Tuni', 'Amadalavalasa', 'Bobbili', 'Palasa',
    'Sattenapalle', 'Vinukonda', 'Narasapur', 'Nuzvid', 'Bheemunipatnam', 'Yemmiganur', 'Kandukur', 'Addanki', 'Chodavaram', 'Pamarru'
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Bomdila', 'Ziro', 'Tezu', 'Along'
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Sivasagar',
    'Goalpara', 'Barpeta', 'Mangaldoi', 'North Lakhimpur', 'Karimganj', 'Hailakandi', 'Diphu', 'Kokrajhar', 'Bongaigaon', 'Dhubri',
    'Goalpara', 'Barpeta', 'Mangaldoi', 'North Lakhimpur', 'Karimganj', 'Hailakandi', 'Diphu', 'Kokrajhar', 'Bongaigaon', 'Dhubri',
    'Goalpara', 'Barpeta', 'Mangaldoi', 'North Lakhimpur', 'Karimganj', 'Hailakandi', 'Diphu', 'Kokrajhar', 'Bongaigaon', 'Dhubri',
    'Goalpara', 'Barpeta', 'Mangaldoi', 'North Lakhimpur', 'Karimganj', 'Hailakandi', 'Diphu', 'Kokrajhar', 'Bongaigaon', 'Dhubri'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Arrah', 'Begusarai', 'Katihar', 'Munger',
    'Bihar Sharif', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Bettiah', 'Motihari', 'Siwan', 'Chhapra', 'Samastipur',
    'Madhubani', 'Sitamarhi', 'Jehanabad', 'Aurangabad', 'Nawada', 'Jamalpur', 'Kishanganj', 'Forbesganj', 'Araria', 'Supaul',
    'Madhepura', 'Saharsa', 'Darbhanga', 'Sitamarhi', 'Sheohar', 'Muzaffarpur', 'Vaishali', 'Hajipur', 'Chhapra', 'Siwan',
    'Gopalganj', 'East Champaran', 'West Champaran', 'Sheohar', 'Sitamarhi', 'Madhubani', 'Supaul', 'Araria', 'Kishanganj', 'Purnia',
    'Katihar', 'Madhepura', 'Saharsa', 'Darbhanga', 'Samastipur', 'Begusarai', 'Khagaria', 'Munger', 'Lakhisarai', 'Sheikhpura'
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajpur', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Durg', 'Bhatapara',
    'Bilaspur', 'Korba', 'Raigarh', 'Jagdalpur', 'Dhamtari', 'Mahasamund', 'Kanker', 'Narayanpur', 'Bastar', 'Kondagaon',
    'Bijapur', 'Dantewada', 'Sukma', 'Balrampur', 'Gariaband', 'Balod', 'Bemetara', 'Baloda Bazar', 'Gariaband', 'Dhamtari',
    'Kanker', 'Kondagaon', 'Narayanpur', 'Bijapur', 'Dantewada', 'Sukma', 'Balrampur', 'Koriya', 'Surajpur', 'Balrampur',
    'Jashpur', 'Raigarh', 'Korba', 'Janjgir-Champa', 'Mungeli', 'Kabirdham', 'Bilaspur', 'Korba', 'Raigarh', 'Jagdalpur'
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Mormugao', 'Bicholim', 'Curchorem'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Gandhidham', 'Anand',
    'Nadiad', 'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar', 'Palanpur', 'Valsad', 'Vapi', 'Navsari',
    'Veraval', 'Morbi', 'Mahesana', 'Patan', 'Godhra', 'Botad', 'Dahod', 'Kalol', 'Himatnagar', 'Sidhpur',
    'Dholka', 'Mangrol', 'Viramgam', 'Modasa', 'Palanpur', 'Dhoraji', 'Gondal', 'Jetpur', 'Wadhwan', 'Halvad',
    'Bardoli', 'Vyara', 'Navsari', 'Bilimora', 'Udhna', 'Sachin', 'Chikhli', 'Bulsar', 'Pardi', 'Umbergaon',
    'Valsad', 'Dharampur', 'Kaprada', 'Dang', 'Ahwa', 'Songadh', 'Mahuva', 'Talaja', 'Gariadhar', 'Palitana'
  ],
  'Haryana': [
    'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula',
    'Rewari', 'Palwal', 'Bhiwani', 'Sirsa', 'Jind', 'Kaithal', 'Fatehabad', 'Kurukshetra', 'Yamunanagar', 'Panchkula',
    'Karnal', 'Panipat', 'Sonipat', 'Rohtak', 'Jhajjar', 'Gurgaon', 'Faridabad', 'Palwal', 'Nuh', 'Mewat',
    'Rewari', 'Mahendragarh', 'Bhiwani', 'Charkhi Dadri', 'Hisar', 'Fatehabad', 'Sirsa', 'Jind', 'Kaithal', 'Kurukshetra',
    'Yamunanagar', 'Ambala', 'Panchkula', 'Karnal', 'Panipat', 'Sonipat', 'Rohtak', 'Jhajjar', 'Gurgaon', 'Faridabad'
  ],
  'Himachal Pradesh': [
    'Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Bilaspur', 'Kullu', 'Chamba', 'Palampur', 'Nahan', 'Hamirpur',
    'Kangra', 'Una', 'Bilaspur', 'Hamirpur', 'Mandi', 'Kullu', 'Lahaul and Spiti', 'Kinnaur', 'Shimla', 'Sirmaur',
    'Solan', 'Chamba', 'Kangra', 'Una', 'Bilaspur', 'Hamirpur', 'Mandi', 'Kullu', 'Lahaul and Spiti', 'Kinnaur',
    'Shimla', 'Sirmaur', 'Solan', 'Chamba', 'Kangra', 'Una', 'Bilaspur', 'Hamirpur', 'Mandi', 'Kullu',
    'Lahaul and Spiti', 'Kinnaur', 'Shimla', 'Sirmaur', 'Solan', 'Chamba', 'Kangra', 'Una', 'Bilaspur', 'Hamirpur'
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Adityapur', 'Phusro', 'Ramgarh',
    'Chaibasa', 'Dumka', 'Gumla', 'Hazaribagh', 'Jamshedpur', 'Jharia', 'Lohardaga', 'Madhupur', 'Pakur', 'Ramgarh',
    'Sahibganj', 'Simdega', 'Tenu Dam-cum-Kathhara', 'Chakradharpur', 'Chirkunda', 'Medininagar', 'Giridih', 'Koderma', 'Latehar', 'Lohardaga',
    'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum', 'East Singhbhum', 'Garhwa',
    'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh'
  ],
  'Karnataka': [
    'Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davangere', 'Shimoga', 'Tumkur', 'Raichur',
    'Kolar', 'Mandya', 'Udupi', 'Chikkamagaluru', 'Karwar', 'Ranebennur', 'Robertsonpet', 'Hassan', 'Bhadravati', 'Hospet',
    'Gadag', 'Bidar', 'Chitradurga', 'Bagalkot', 'Bijapur', 'Bellary', 'Chamrajnagar', 'Chikkaballapur', 'Chitradurga', 'Dakshina Kannada',
    'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysore',
    'Raichur', 'Ramanagara', 'Shimoga', 'Tumkur', 'Udupi', 'Vijayapura', 'Yadgir', 'Kalaburagi', 'Ballari', 'Vijayanagara',
    'Bagalkot', 'Belagavi', 'Bidar', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad'
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Kannur', 'Kottayam', 'Palakkad', 'Malappuram',
    'Thalassery', 'Kasaragod', 'Koyilandy', 'Kanhangad', 'Neyyattinkara', 'Kayamkulam', 'Kattappana', 'Thodupuzha', 'Changanassery', 'Muvattupuzha',
    'Perinthalmanna', 'Manjeri', 'Ponnani', 'Tirur', 'Kunnamkulam', 'Guruvayur', 'Shoranur', 'Ottapalam', 'Palakkad', 'Mannarkkad',
    'Nilambur', 'Perumbavoor', 'Aluva', 'North Paravur', 'Kochi', 'Ernakulam', 'Mattancherry', 'Fort Kochi', 'Vypin', 'Edappally',
    'Kalamassery', 'Thrikkakara', 'Kakkanad', 'Angamaly', 'Kalady', 'Perumbavoor', 'Muvattupuzha', 'Kothamangalam', 'Thodupuzha', 'Idukki',
    'Kattappana', 'Nedumkandam', 'Kumily', 'Thekkady', 'Munnar', 'Devikulam', 'Adimali', 'Pala', 'Vaikom', 'Ettumanoor'
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Ratlam', 'Satna', 'Burhanpur', 'Murwara',
    'Rewa', 'Katni', 'Singrauli', 'Dewas', 'Mandsaur', 'Neemuch', 'Pithampur', 'Obaidullaganj', 'Raghogarh', 'Vidisha',
    'Guna', 'Ashoknagar', 'Shivpuri', 'Datia', 'Gwalior', 'Morena', 'Bhind', 'Sheopur', 'Karauli', 'Sawai Madhopur',
    'Shahdol', 'Anuppur', 'Umaria', 'Panna', 'Chhatarpur', 'Tikamgarh', 'Damoh', 'Sagar', 'Narsinghpur', 'Hoshangabad',
    'Harda', 'Betul', 'Multai', 'Amla', 'Khandwa', 'Burhanpur', 'Khargone', 'Barwani', 'Dhar', 'Jhabua',
    'Alirajpur', 'Indore', 'Dewas', 'Ujjain', 'Ratlam', 'Mandsaur', 'Neemuch', 'Shajapur', 'Agar', 'Rajgarh'
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Nanded', 'Kolhapur',
    'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Bhusawal',
    'Panvel', 'Satara', 'Beed', 'Yavatmal', 'Kamptee', 'Gondia', 'Barshi', 'Achalpur', 'Osmanabad', 'Nandurbar',
    'Wardha', 'Udgir', 'Aurangabad', 'Malegaon', 'Pandharpur', 'Shrirampur', 'Parli', 'Pusad', 'Pimpri-Chinchwad', 'Bhiwandi',
    'Ulhasnagar', 'Kalyan', 'Dombivli', 'Vasai', 'Virar', 'Mira-Bhayandar', 'Navi Mumbai', 'Badlapur', 'Ambernath', 'Panvel',
    'Khopoli', 'Karjat', 'Matheran', 'Alibaug', 'Pen', 'Roha', 'Murud', 'Shrivardhan', 'Dapoli', 'Ratnagiri',
    'Chiplun', 'Khed', 'Mahad', 'Poladpur', 'Mangaon', 'Roha', 'Alibag', 'Murud', 'Shrivardhan', 'Dapoli',
    'Ghulewadi', 'Sangamner', 'Shrigonda', 'Rahuri', 'Kopargaon', 'Shevgaon', 'Parner', 'Newasa', 'Akole'
  ],
  'Manipur': [
    'Imphal', 'Thoubal', 'Kakching', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Senapati', 'Tamenglong'
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Baghmara', 'Williamnagar', 'Resubelpara', 'Nongstoin'
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip', 'Lawngtlai', 'Mamit'
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Mon', 'Phek', 'Zunheboto'
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Baleshwar', 'Bhadrak', 'Baripada', 'Jharsuguda',
    'Balangir', 'Bargarh', 'Boudh', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda',
    'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
    'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh', 'Angul', 'Bhadrak', 'Balasore', 'Bargarh',
    'Boudh', 'Cuttack', 'Debagarh', 'Dhenkanal', 'Ganjam', 'Gajapati', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
    'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada'
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot', 'Hoshiarpur', 'Mohali', 'Batala', 'Moga',
    'Abohar', 'Fazilka', 'Firozpur', 'Muktsar', 'Faridkot', 'Barnala', 'Sangrur', 'Malerkotla', 'Nabha', 'Rajpura',
    'Khanna', 'Samrala', 'Doraha', 'Payal', 'Raikot', 'Jagraon', 'Moga', 'Bagha Purana', 'Nihal Singh Wala', 'Bathinda',
    'Rampura Phul', 'Mansa', 'Sardulgarh', 'Budhlada', 'Malout', 'Giddarbaha', 'Fazilka', 'Abohar', 'Firozpur', 'Zira',
    'Guru Har Sahai', 'Jalalabad', 'Fazilka', 'Abohar', 'Firozpur', 'Muktsar', 'Faridkot', 'Kotkapura', 'Bathinda', 'Rampura Phul'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar',
    'Ganganagar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu',
    'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur',
    'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar',
    'Tonk', 'Udaipur', 'Beawar', 'Bhiwadi', 'Chomu', 'Dausa', 'Fatehpur', 'Gangapur', 'Hindaun', 'Jhunjhunu',
    'Karauli', 'Kuchaman', 'Ladnun', 'Makrana', 'Nimbahera', 'Pilani', 'Rajgarh', 'Ramgarh', 'Sardarshahar', 'Shahpura'
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Mangan', 'Gyalshing', 'Singtam', 'Rangpo', 'Jorethang', 'Ravangla'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul',
    'Tiruppur', 'Tanjore', 'Kanchipuram', 'Nagercoil', 'Kumbakonam', 'Cuddalore', 'Karaikudi', 'Neyveli', 'Rajapalayam', 'Hosur',
    'Tiruvannamalai', 'Pollachi', 'Sivakasi', 'Pudukkottai', 'Vaniyambadi', 'Tiruchengode', 'Gobichettipalayam', 'Dharapuram', 'Udumalaipettai', 'Theni',
    'Virudhunagar', 'Srivilliputhur', 'Sankarankovil', 'Tenkasi', 'Sivaganga', 'Ramanathapuram', 'Paramakudi', 'Aruppukkottai', 'Rajapalayam', 'Sattur',
    'Sivakasi', 'Virudhunagar', 'Aruppukottai', 'Kovilpatti', 'Kayalpattinam', 'Tirunelveli', 'Nagercoil', 'Kanyakumari', 'Kuzhithurai', 'Colachel',
    'Nagercoil', 'Kanyakumari', 'Padmanabhapuram', 'Kuzhithurai', 'Colachel', 'Nagercoil', 'Kanyakumari', 'Kuzhithurai', 'Colachel', 'Nagercoil'
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet',
    'Secunderabad', 'Guntur', 'Nalgonda', 'Mahabubnagar', 'Suryapet', 'Miryalaguda', 'Jagtial', 'Nirmal', 'Kamareddy', 'Sangareddy',
    'Medak', 'Zaheerabad', 'Siddipet', 'Gajwel', 'Narayanpet', 'Wanaparthy', 'Gadwal', 'Alampur', 'Kollapur', 'Achampet',
    'Nagarkurnool', 'Kalwakurthy', 'Amangal', 'Shadnagar', 'Kothur', 'Shamshabad', 'Rajendranagar', 'Serilingampally', 'Qutubullapur', 'Malkajgiri',
    'Uppal', 'Lal Bahadur Nagar', 'Hayathnagar', 'Ibrahimpatnam', 'Vikarabad', 'Tandur', 'Pargi', 'Chevella', 'Shamirpet', 'Ghatkesar',
    'Medchal', 'Dundigal', 'Bachupally', 'Kompally', 'Balanagar', 'Kukatpally', 'Miyapur', 'Hitech City', 'Gachibowli', 'Kondapur'
  ],
  'Tripura': [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Pratapgarh', 'Kailasahar', 'Belonia', 'Khowai', 'Ambassa'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur',
    'Ghaziabad', 'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Fatehpur',
    'Budaun', 'Unnao', 'Mau', 'Jaunpur', 'Mirzapur', 'Raebareli', 'Orai', 'Sitapur', 'Lakhimpur', 'Hardoi',
    'Banda', 'Pilibhit', 'Etawah', 'Kannauj', 'Bijnor', 'Bulandshahr', 'Hapur', 'Amroha', 'Sambhal', 'Shamli',
    'Azamgarh', 'Bahraich', 'Gonda', 'Deoria', 'Basti', 'Sultanpur', 'Barabanki', 'Mainpuri', 'Etah', 'Kasganj',
    'Auraiya', 'Kaushambi', 'Pratapgarh', 'Ambedkar Nagar', 'Balrampur', 'Shravasti', 'Siddharthnagar', 'Maharajganj', 'Kushinagar', 'Ballia',
    'Chandauli', 'Sonbhadra', 'Bhadohi', 'Sant Kabir Nagar', 'Mahoba', 'Hamirpur', 'Jalaun', 'Lalitpur', 'Agra', 'Firozabad',
    'Mainpuri', 'Mathura', 'Aligarh', 'Hathras', 'Etah', 'Kasganj', 'Badaun', 'Bareilly', 'Pilibhit', 'Shahjahanpur'
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Pithoragarh', 'Ramnagar', 'Manglaur'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur',
    'Krishnanagar', 'Berhampore', 'Ranaghat', 'Haldia', 'Santipur', 'Dankuni', 'Bidhannagar', 'Raiganj', 'Haldibari', 'Jalpaiguri',
    'Balurghat', 'Bankura', 'Bardhaman', 'Basirhat', 'Bhatpara', 'Chakdaha', 'Cooch Behar', 'Darjeeling', 'Diamond Harbour', 'Dum Dum',
    'English Bazar', 'Haldia', 'Howrah', 'Jalpaiguri', 'Kalyani', 'Kamarhati', 'Kanchrapara', 'Kharagpur', 'Kolkata', 'Krishnanagar',
    'Malda', 'Midnapore', 'Nabadwip', 'Palashi', 'Panihati', 'Purulia', 'Raiganj', 'Rampurhat', 'Ranaghat', 'Santipur',
    'Serampore', 'Siliguri', 'Suri', 'Tamluk', 'Titagarh', 'Uluberia', 'Uttarpara', 'Barasat', 'Barrackpore', 'Budge Budge'
  ],
  'Andaman and Nicobar Islands': [
    'Port Blair', 'Diglipur', 'Mayabunder', 'Rangat', 'Car Nicobar'
  ],
  'Chandigarh': [
    'Chandigarh'
  ],
  'Dadra and Nagar Haveli and Daman and Diu': [
    'Daman', 'Diu', 'Silvassa'
  ],
  'Delhi': [
    'New Delhi', 'Delhi'
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Rajouri'
  ],
  'Ladakh': [
    'Leh', 'Kargil'
  ],
  'Lakshadweep': [
    'Kavaratti', 'Agatti', 'Amini', 'Andrott'
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Mahe', 'Yanam'
  ],
};

// Merge extended cities with base cities for comprehensive coverage
Object.keys(extendedStateCities).forEach(state => {
  if (stateCities[state]) {
    // Merge and deduplicate
    const baseCities = stateCities[state];
    const extendedCities = extendedStateCities[state];
    stateCities[state] = [...new Set([...baseCities, ...extendedCities])].sort();
  } else {
    stateCities[state] = extendedStateCities[state];
  }
});
