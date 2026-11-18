export interface PatientDemographics {
  patientId: string;
  fullName: string;
  sex: 'Masculino' | 'Femenino';
  birthDate: string;
  ageYears: number;
}

const MALE_NAMES = [
  'Antonio',
  'Manuel',
  'José Luis',
  'Francisco Javier',
  'David',
  'Carlos Alberto',
  'Miguel Ángel',
  'Alejandro',
  'Pedro',
  'Rafael',
  'Sergio',
  'Fernando',
];

const FEMALE_NAMES = [
  'María Carmen',
  'Lucía',
  'Ana Isabel',
  'Laura',
  'Marta',
  'Sofía',
  'Paula',
  'Elena',
  'Cristina',
  'Patricia',
  'Beatriz',
  'Nuria',
];

const SURNAMES = [
  'García',
  'Rodríguez',
  'González',
  'Fernández',
  'López',
  'Martínez',
  'Sánchez',
  'Pérez',
  'Gómez',
  'Martín',
  'Jiménez',
  'Ruiz',
  'Hernández',
  'Díaz',
  'Moreno',
  'Álvarez',
  'Romero',
  'Navarro',
  'Torres',
  'Domínguez',
];

export function generateRandomPatientDemographics(patientId: string): PatientDemographics {
  const isFemale = Math.random() < 0.5;
  const firstNames = isFemale ? FEMALE_NAMES : MALE_NAMES;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const surname1 = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  let surname2 = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  if (surname2 === surname1) {
    surname2 = SURNAMES[(SURNAMES.indexOf(surname1) + 3) % SURNAMES.length];
  }

  const ageYears = Math.floor(18 + Math.random() * 70);
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - ageYears;
  const birthMonth = Math.floor(1 + Math.random() * 12);
  const birthDay = Math.floor(1 + Math.random() * 28);

  const dd = String(birthDay).padStart(2, '0');
  const mm = String(birthMonth).padStart(2, '0');

  return {
    patientId: patientId.trim().toUpperCase(),
    fullName: `${firstName} ${surname1} ${surname2}`,
    sex: isFemale ? 'Femenino' : 'Masculino',
    birthDate: `${dd}/${mm}/${birthYear}`,
    ageYears,
  };
}
