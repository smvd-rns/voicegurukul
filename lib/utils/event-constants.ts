import { getRoleDisplayName, RoleNumber } from './roles';

export const ashramOptions = [
    { id: 'Student and not decided', name: 'Student and not decided' },
    { id: 'Working and not decided', name: 'Working and not decided' },
    { id: 'Gauranga Sabha', name: 'Gauranga Sabha' },
    { id: 'Nityananda Sabha', name: 'Nityananda Sabha' },
    { id: 'Brahmachari', name: 'Brahmachari Ashram' },
    { id: 'Grihastha', name: 'Grihastha Ashram' },
    { id: 'Staying Single (Not planning to marry)', name: 'Staying Single (Not planning to marry)' }
];

export const roleOptions = Array.from({ length: 33 }, (_, i) => i + 1)
    .filter(num => (num >= 1 && num <= 17) || (num >= 20 && num <= 33))
    .map(num => ({
        id: String(num),
        name: getRoleDisplayName(num as RoleNumber)
    }));

export const campOptions = [
    { id: 'campDys', name: 'DYS' },
    { id: 'campSankalpa', name: 'Sankalpa' },
    { id: 'campSphurti', name: 'Sphurti' },
    { id: 'campUtkarsh', name: 'Utkarsh' },
    { id: 'campSrcgdWorkshop', name: 'SRCGD Workshop' },
    { id: 'campNishtha', name: 'Nishtha' },
    { id: 'campFtec', name: 'FTEC' },
    { id: 'campAshraya', name: 'Ashraya' },
    { id: 'campMtec', name: 'MTEC' },
    { id: 'campSharanagati', name: 'Sharanagati' },
    { id: 'campIdc', name: 'IDC' },
    { id: 'campBhaktiShastri', name: 'Bhakti Shastri' },
    { id: 'campPositiveThinker', name: 'Positive Thinker' },
    { id: 'campSelfManager', name: 'Self Manager' },
    { id: 'campProactiveLeader', name: 'Proactive Leader' }
];
