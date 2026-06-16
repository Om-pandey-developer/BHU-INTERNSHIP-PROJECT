import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawDepartments = [
  "Accounting",
  "Adult Continuing Education & Extension",
  "Agricultural Economics",
  "Agricultural Engineering",
  "Agricultural Extension and Communication",
  "Agronomy",
  "Anatomy",
  "Ancient Indian History, Culture & Archaeology",
  "Animal Husbandry and Dairying",
  "Applied Arts",
  "Applied Chemistry",
  "Applied Mathematics",
  "Applied Physics",
  "Arabic",
  "Architecture, Planning and Design",
  "Astrology (Jyotish)",
  "Audiology and Speech Language Pathology",
  "Ayurveda (Dravyaguna)",
  "Ayurveda (Kayachikitsa)",
  "Ayurveda (Kaumarbhritya)",
  "Ayurveda (Prasuti Tantra)",
  "Ayurveda (Rasa Shastra)",
  "Ayurveda (Samhita & Sanskrit)",
  "Ayurveda (Shalakya Tantra)",
  "Ayurveda (Shalya Tantra)",
  "Ayurveda (Vikriti Vigyan)",
  "Bengali",
  "Biochemistry",
  "Biophysics",
  "Botany",
  "Business Management",
  "Cardiac Anesthesiology",
  "Cardiology",
  "Cardiothoracic Surgery",
  "Center for Biomedical Engineering",
  "Center for Genetic Disorders",
  "Center for Interdisciplinary Mathematical Sciences",
  "Center for Women’s Studies",
  "Chemical Engineering",
  "Chemistry",
  "Civil Engineering",
  "Clinical Psychology",
  "Commerce",
  "Community Medicine",
  "Computer Science",
  "Computer Science & Engineering",
  "Conservative Dentistry",
  "Dairy Science & Food Technology",
  "Dance (Kathak/Bharatnatyam)",
  "Dermatology",
  "Dharmagama",
  "Dharamshastra",
  "Economics",
  "Education",
  "Electrical Engineering",
  "Electronics Engineering",
  "Endocrinology & Metabolism",
  "English",
  "Entomology and Agricultural Zoology",
  "Environmental Science",
  "Farm Engineering",
  "Forensic Medicine",
  "Gastroenterology",
  "Genetics and Plant Breeding",
  "Geography",
  "Geology",
  "Geophysics",
  "Geriatric Medicine",
  "Gujarati",
  "Hematology",
  "Hindi",
  "History",
  "Horticulture",
  "Hospital Administration",
  "Human Molecular Genetics",
  "Indian Languages",
  "Instrumental Music (Sitar, Violin, Tabla, Flute)",
  "Journalism and Mass Communication",
  "Law",
  "Library and Information Science",
  "Linguistics",
  "Malaviya Center for Ethics and Human Values",
  "Marathi",
  "Materials Science & Technology",
  "Mathematics",
  "Mechanical Engineering",
  "Medical Genetics",
  "Medicine",
  "Metallurgical Engineering",
  "Microbiology",
  "Mining Engineering",
  "Molecular and Human Genetics",
  "Musicology",
  "Nephrology",
  "Neurology",
  "Neuro Surgery",
  "Nuclear Medicine",
  "Nursing",
  "Obstetrics & Gynaecology",
  "Ophthalmology",
  "Oral and Maxillofacial Surgery",
  "Oral Medicine and Radiology",
  "Orthodontics",
  "Orthopaedics",
  "Otolaryngology (ENT)",
  "Paediatrics",
  "Paediatric Surgery",
  "Pain Management",
  "Pali & Buddhist Studies",
  "Painting",
  "Pathology",
  "Periodontics",
  "Persian",
  "Pharmaceutical Engineering & Technology",
  "Pharmacology",
  "Philosophy",
  "Physical Education",
  "Physics",
  "Physiology",
  "Plant Pathology",
  "Plant Physiology",
  "Plastic Arts",
  "Plastic Surgery",
  "Political Science",
  "Pottery and Ceramics",
  "Prosthodontics",
  "Psychiatric Social Work",
  "Psychiatry",
  "Psychology",
  "Pulmonary Medicine",
  "Radiodiagnosis",
  "Radiotherapy",
  "Sanskrit",
  "Social Work",
  "Sociology",
  "Soil Science and Agricultural Chemistry",
  "Statistics",
  "Surgical Oncology",
  "Tamil",
  "Telugu",
  "Textile Design",
  "Thoracic Surgery",
  "Transfusion Medicine",
  "Urology",
  "Urdu",
  "Ved",
  "Visual Arts",
  "Vocal Music",
  "Vyakaran",
  "Yoga Sadhana Kendra",
  "Zoology"
];

async function main() {
  // Ensure unique constraints on codes
  const usedCodes = new Set<string>();

  const departments = rawDepartments.map(name => {
    // Keep 'dept-cs' for Computer Science to preserve test user bindings
    const id = name === "Computer Science" ? "dept-cs" : `dept-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    let baseCode = name === "Computer Science" ? "COMP_SCI" : name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30);
    // Remove trailing underscores
    baseCode = baseCode.replace(/_+$/, '');
    
    // Ensure code is unique in the seed array
    let code = baseCode;
    let counter = 1;
    while (usedCodes.has(code)) {
      code = `${baseCode}_${counter}`;
      counter++;
    }
    usedCodes.add(code);

    return { id, code, name };
  });

  console.log('🌱 Seeding departments...');

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code }, // upserting by code is safer because 'id's might be generated differently now compared to older seeds
      update: { name: dept.name, id: dept.id },
      create: dept,
    });
    console.log(`  ✔ ${dept.name} (${dept.code})`);
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
