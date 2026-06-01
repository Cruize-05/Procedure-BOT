#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Procedure } from '../shared/schema.js';

export const procedures = [
  {
    procedure_code: 'NATIONAL_ID',
    name: {
      en: 'National Identity Card',
      fr: "Carte Nationale d'Identité",
    },
    target_office: {
      en: 'District Office (Préfecture / Sous-Préfecture)',
      fr: 'Préfecture / Sous-Préfecture',
    },
    official_cost_cfa: 2500,
    estimated_timeline: {
      en: '2 to 4 weeks',
      fr: '2 à 4 semaines',
    },
    required_documents: {
      en: [
        'Birth certificate (original)',
        'Two recent passport-size photos',
        'Proof of address',
        'Previous ID card (for renewal)',
      ],
      fr: [
        'Acte de naissance (original)',
        "Deux photos d'identité récentes",
        'Justificatif de domicile',
        'Ancienne CNI (pour renouvellement)',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Obtain an application form from the nearest District Office (Préfecture) or Sous-Préfecture.' },
        { step_number: 2, instruction: 'Complete the form and attach all required documents.' },
        { step_number: 3, instruction: 'Submit the dossier to the officer at the civil status window.' },
        { step_number: 4, instruction: 'Attend fingerprinting and photograph session at the scheduled date.' },
        { step_number: 5, instruction: 'Collect the card once notified (typically 2–4 weeks).' },
      ],
      fr: [
        { step_number: 1, instruction: 'Obtenir un formulaire de demande auprès de la Préfecture ou Sous-Préfecture la plus proche.' },
        { step_number: 2, instruction: 'Remplir le formulaire et joindre tous les documents requis.' },
        { step_number: 3, instruction: "Déposer le dossier au guichet de l'état civil." },
        { step_number: 4, instruction: "Se présenter pour la prise d'empreintes et de photo à la date convenue." },
        { step_number: 5, instruction: 'Retirer la carte dès notification (généralement 2 à 4 semaines).' },
      ],
    },
  },
  {
    procedure_code: 'BIRTH_CERT',
    name: {
      en: 'Birth Certificate',
      fr: 'Acte de Naissance',
    },
    target_office: {
      en: 'Mairie (Town Hall)',
      fr: 'Mairie',
    },
    official_cost_cfa: 0,
    estimated_timeline: {
      en: 'Same day to 48 hours',
      fr: 'Le jour même à 48 heures',
    },
    required_documents: {
      en: [
        'Hospital delivery certificate or witness declaration',
        "Parents' identity documents",
        'Marriage certificate (if applicable)',
      ],
      fr: [
        'Certificat de naissance de la maternité ou déclaration de témoins',
        "Pièces d'identité des parents",
        'Acte de mariage (si applicable)',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Visit the Mairie (Town Hall) of the birth location.' },
        { step_number: 2, instruction: 'Complete the birth declaration form within 90 days of birth.' },
        { step_number: 3, instruction: 'Submit the completed form with supporting documents.' },
        { step_number: 4, instruction: 'Receive the birth certificate on the same day or within 48 hours.' },
      ],
      fr: [
        { step_number: 1, instruction: 'Se rendre à la Mairie du lieu de naissance.' },
        { step_number: 2, instruction: 'Remplir la déclaration de naissance dans les 90 jours suivant la naissance.' },
        { step_number: 3, instruction: 'Déposer le formulaire complété avec les pièces justificatives.' },
        { step_number: 4, instruction: "Recevoir l'acte de naissance le jour même ou sous 48 heures." },
      ],
    },
  },
  {
    procedure_code: 'BUSINESS_REG',
    name: {
      en: 'Business Registration',
      fr: "Enregistrement d'Entreprise",
    },
    target_office: {
      en: 'CFCE (Centre de Formalités de Création des Entreprises)',
      fr: 'CFCE (Centre de Formalités de Création des Entreprises)',
    },
    official_cost_cfa: 36000,
    estimated_timeline: {
      en: '3 to 7 business days (CFCE one-stop shop)',
      fr: '3 à 7 jours ouvrables (guichet unique CFCE)',
    },
    required_documents: {
      en: [
        'Notarised company statutes',
        'Identity documents of all shareholders',
        'Proof of registered address',
        'Capital deposit certificate from bank',
      ],
      fr: [
        'Statuts de société notariés',
        'Pièces d\'identité de tous les actionnaires',
        'Justificatif de siège social',
        'Certificat de dépôt de capital',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Prepare a business plan and choose a company name (check availability at CFCE).' },
        { step_number: 2, instruction: 'Notarize the company statutes (for SARL/SA).' },
        { step_number: 3, instruction: "Register with the Centre de Formalités de Création des Entreprises (CFCE)." },
        { step_number: 4, instruction: 'Obtain the Registre de Commerce et du Crédit Mobilier (RCCM) number.' },
        { step_number: 5, instruction: 'Register with the tax authority (DGI) for a tax identification number.' },
        { step_number: 6, instruction: 'Open a corporate bank account.' },
      ],
      fr: [
        { step_number: 1, instruction: "Préparer un plan d'affaires et choisir un nom d'entreprise (vérifier la disponibilité au CFCE)." },
        { step_number: 2, instruction: 'Faire notarier les statuts de la société (pour SARL/SA).' },
        { step_number: 3, instruction: "S'inscrire au Centre de Formalités de Création des Entreprises (CFCE)." },
        { step_number: 4, instruction: 'Obtenir le numéro du Registre de Commerce et du Crédit Mobilier (RCCM).' },
        { step_number: 5, instruction: "S'inscrire auprès de la Direction Générale des Impôts (DGI) pour un numéro d'identification fiscale." },
        { step_number: 6, instruction: 'Ouvrir un compte bancaire professionnel.' },
      ],
    },
  },
  {
    procedure_code: 'MARRIAGE_CERT',
    name: {
      en: 'Marriage Certificate',
      fr: 'Acte de Mariage',
    },
    target_office: {
      en: 'Mairie (Town Hall)',
      fr: 'Mairie',
    },
    official_cost_cfa: 5000,
    estimated_timeline: {
      en: 'Minimum 10-day notice period',
      fr: 'Délai minimum de 10 jours de publication des bans',
    },
    required_documents: {
      en: [
        'Birth certificates of both parties',
        'National identity cards',
        'Medical certificates (pre-marital health check)',
        "Witnesses' identity documents (2 per party)",
      ],
      fr: [
        'Actes de naissance des deux parties',
        "Cartes nationales d'identité",
        'Certificats médicaux (bilan prénuptial)',
        'Pièces d\'identité des témoins (2 par partie)',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Announce the intended marriage at the Mairie at least 10 days before the ceremony.' },
        { step_number: 2, instruction: 'Submit the required documents for both parties.' },
        { step_number: 3, instruction: "Attend the civil ceremony before the Registrar (Officier d'État Civil)." },
        { step_number: 4, instruction: 'Receive the marriage certificate after the ceremony.' },
      ],
      fr: [
        { step_number: 1, instruction: 'Publier les bans de mariage à la Mairie au moins 10 jours avant la cérémonie.' },
        { step_number: 2, instruction: 'Déposer les pièces requises pour les deux parties.' },
        { step_number: 3, instruction: "Assister à la cérémonie civile devant l'Officier d'État Civil." },
        { step_number: 4, instruction: "Recevoir l'acte de mariage après la cérémonie." },
      ],
    },
  },
  {
    procedure_code: 'PASSPORT',
    name: {
      en: 'Passport',
      fr: 'Passeport',
    },
    target_office: {
      en: 'DGSN (Direction Générale de la Sûreté Nationale)',
      fr: 'DGSN (Direction Générale de la Sûreté Nationale)',
    },
    official_cost_cfa: 50000,
    estimated_timeline: {
      en: '4 to 8 weeks',
      fr: '4 à 8 semaines',
    },
    required_documents: {
      en: [
        'Birth certificate',
        'National identity card',
        'Payment receipt',
        'Two passport-size photos',
        'Previous passport (for renewal)',
      ],
      fr: [
        'Acte de naissance',
        "Carte nationale d'identité",
        'Reçu de paiement',
        "Deux photos d'identité",
        'Ancien passeport (pour renouvellement)',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Complete the online pre-registration form on the DGSN portal (if available in your region).' },
        { step_number: 2, instruction: 'Pay the passport fee at an authorized bank or mobile money agent.' },
        { step_number: 3, instruction: 'Visit the DGSN office with all documents.' },
        { step_number: 4, instruction: 'Submit biometric data (fingerprints and photo).' },
        { step_number: 5, instruction: 'Collect the passport when notified (4–8 weeks).' },
      ],
      fr: [
        { step_number: 1, instruction: 'Remplir le formulaire de pré-inscription en ligne sur le portail de la DGSN (si disponible dans votre région).' },
        { step_number: 2, instruction: 'Payer les frais de passeport dans une banque agréée ou chez un agent mobile money.' },
        { step_number: 3, instruction: 'Se rendre au bureau de la DGSN avec tous les documents.' },
        { step_number: 4, instruction: 'Soumettre les données biométriques (empreintes digitales et photo).' },
        { step_number: 5, instruction: 'Retirer le passeport lors de la notification (4 à 8 semaines).' },
      ],
    },
  },
  {
    procedure_code: 'DRIVERS_LICENSE',
    name: {
      en: "Driver's License",
      fr: 'Permis de Conduire',
    },
    target_office: {
      en: 'Ministère des Transports (MINT)',
      fr: 'Ministère des Transports (MINT)',
    },
    official_cost_cfa: 15000,
    estimated_timeline: {
      en: '2 to 6 weeks after passing tests',
      fr: 'après la réussite des examens',
    },
    required_documents: {
      en: [
        'National identity card',
        'Medical fitness certificate',
        'School completion certificate',
        'Two passport-size photos',
        'Payment receipt',
      ],
      fr: [
        "Carte nationale d'identité",
        "Certificat médical d'aptitude",
        'Attestation de fin de formation',
        "Deux photos d'identité",
        'Reçu de paiement',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Enrol in a registered driving school and complete the required training hours.' },
        { step_number: 2, instruction: 'Pass the written theory examination at the MINT (Ministère des Transports).' },
        { step_number: 3, instruction: 'Pass the practical driving test.' },
        { step_number: 4, instruction: 'Submit the application dossier to MINT.' },
        { step_number: 5, instruction: 'Collect the licence (typically 2–6 weeks after passing).' },
      ],
      fr: [
        { step_number: 1, instruction: "S'inscrire dans une auto-école agréée et effectuer les heures de formation requises." },
        { step_number: 2, instruction: 'Réussir l\'examen théorique au Ministère des Transports (MINT).' },
        { step_number: 3, instruction: 'Réussir l\'examen pratique de conduite.' },
        { step_number: 4, instruction: 'Déposer le dossier de demande au MINT.' },
        { step_number: 5, instruction: 'Retirer le permis (généralement 2 à 6 semaines après la réussite).' },
      ],
    },
  },
  {
    procedure_code: 'LAND_TITLE',
    name: {
      en: 'Land Title',
      fr: 'Titre Foncier',
    },
    target_office: {
      en: 'Délégation Départementale des Domaines / Conservation Foncière',
      fr: 'Délégation Départementale des Domaines / Conservation Foncière',
    },
    official_cost_cfa: 0,
    estimated_timeline: {
      en: '3 to 12 months (depending on disputes and workload)',
      fr: '3 à 12 mois (selon litiges et charge de travail)',
    },
    required_documents: {
      en: [
        'Proof of occupation or purchase agreement',
        'Identity document',
        'Survey plan (plan cadastral)',
        'Tax clearance certificate',
      ],
      fr: [
        "Preuve d'occupation ou acte de vente",
        "Pièce d'identité",
        'Plan cadastral',
        'Attestation de conformité fiscale',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'File a request at the Divisional Delegation of Lands (Délégation Départementale des Domaines).' },
        { step_number: 2, instruction: 'A land commission (commission consultative) inspects the parcel.' },
        { step_number: 3, instruction: 'Pay assessed registration fees.' },
        { step_number: 4, instruction: 'The title is inscribed in the Land Registry (Conservation Foncière).' },
        { step_number: 5, instruction: 'Receive the title document.' },
      ],
      fr: [
        { step_number: 1, instruction: 'Déposer une demande à la Délégation Départementale des Domaines.' },
        { step_number: 2, instruction: 'Une commission consultative inspecte la parcelle.' },
        { step_number: 3, instruction: "Payer les frais d'enregistrement évalués." },
        { step_number: 4, instruction: 'Le titre est inscrit à la Conservation Foncière.' },
        { step_number: 5, instruction: 'Recevoir le document de titre.' },
      ],
    },
  },
  {
    procedure_code: 'CRIMINAL_RECORD',
    name: {
      en: 'Criminal Record Extract (Casier Judiciaire)',
      fr: 'Extrait de Casier Judiciaire',
    },
    target_office: {
      en: 'Tribunal de Première Instance (Court of First Instance)',
      fr: 'Tribunal de Première Instance',
    },
    official_cost_cfa: 500,
    estimated_timeline: {
      en: 'Same day to 48 hours',
      fr: 'Le jour même à 48 heures',
    },
    required_documents: {
      en: [
        'National identity card or birth certificate',
        'Recent passport-size photo',
      ],
      fr: [
        "Carte nationale d'identité ou acte de naissance",
        "Photo d'identité récente",
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Visit the Registry of the Court of First Instance (Tribunal de Première Instance) in your place of birth or residence.' },
        { step_number: 2, instruction: 'Complete the request form.' },
        { step_number: 3, instruction: 'Submit identity documents and pay the fee.' },
        { step_number: 4, instruction: 'Collect the extract (same day or within 48 hours).' },
      ],
      fr: [
        { step_number: 1, instruction: 'Se rendre au greffe du Tribunal de Première Instance de votre lieu de naissance ou de résidence.' },
        { step_number: 2, instruction: 'Remplir le formulaire de demande.' },
        { step_number: 3, instruction: "Déposer les pièces d'identité et payer les frais." },
        { step_number: 4, instruction: "Retirer l'extrait (le jour même ou dans les 48 heures)." },
      ],
    },
  },
  {
    procedure_code: 'DEATH_CERT',
    name: {
      en: 'Death Certificate',
      fr: 'Acte de Décès',
    },
    target_office: {
      en: 'Mairie (Town Hall)',
      fr: 'Mairie',
    },
    official_cost_cfa: 0,
    estimated_timeline: {
      en: 'Same day',
      fr: 'Le jour même',
    },
    required_documents: {
      en: [
        'Medical death certificate (signed by a doctor)',
        'Identity document of the deceased',
        "Declarant's identity document",
      ],
      fr: [
        'Certificat médical de décès (signé par un médecin)',
        "Pièce d'identité du défunt",
        'Pièce d\'identité du déclarant',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Declare the death at the Mairie of the place of death within 30 days.' },
        { step_number: 2, instruction: 'Submit the medical death certificate and identity documents.' },
        { step_number: 3, instruction: 'The Registrar issues the death certificate.' },
      ],
      fr: [
        { step_number: 1, instruction: 'Déclarer le décès à la Mairie du lieu de décès dans les 30 jours.' },
        { step_number: 2, instruction: "Déposer le certificat médical de décès et les pièces d'identité." },
        { step_number: 3, instruction: "L'officier d'état civil délivre l'acte de décès." },
      ],
    },
  },
  {
    procedure_code: 'SCHOOL_CERT_AUTH',
    name: {
      en: 'School Certificate Authentication',
      fr: 'Authentification de Diplômes Scolaires',
    },
    target_office: {
      en: 'MINESEC (secondary) / MINESUP (higher education)',
      fr: 'MINESEC (secondaire) / MINESUP (enseignement supérieur)',
    },
    official_cost_cfa: 1000,
    estimated_timeline: {
      en: '1 to 5 business days',
      fr: '1 à 5 jours ouvrables',
    },
    required_documents: {
      en: [
        'Original certificate(s)',
        'Photocopies of all certificates',
        'National identity card',
        'Payment receipt',
      ],
      fr: [
        'Diplôme(s) original(aux)',
        'Photocopies de tous les diplômes',
        "Carte nationale d'identité",
        'Reçu de paiement',
      ],
    },
    steps: {
      en: [
        { step_number: 1, instruction: 'Submit original certificates and copies to the appropriate ministry authentication desk.' },
        { step_number: 2, instruction: 'Pay the authentication fee.' },
        { step_number: 3, instruction: 'Certificates are verified against official records.' },
        { step_number: 4, instruction: 'Collect authenticated documents (1–5 business days).' },
      ],
      fr: [
        { step_number: 1, instruction: "Déposer les diplômes originaux et copies au guichet d'authentification du ministère concerné." },
        { step_number: 2, instruction: "Payer les frais d'authentification." },
        { step_number: 3, instruction: 'Les diplômes sont vérifiés dans les registres officiels.' },
        { step_number: 4, instruction: 'Retirer les documents authentifiés (1 à 5 jours ouvrables).' },
      ],
    },
  },
];

export async function seedDatabase() {
  let inserted = 0;
  let updated = 0;

  for (const proc of procedures) {
    const before = await Procedure.findOne({ procedure_code: proc.procedure_code }).lean();
    await Procedure.findOneAndUpdate(
      { procedure_code: proc.procedure_code },
      proc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (before) {
      updated++;
    } else {
      inserted++;
    }
  }

  return { inserted, updated };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await import('dotenv/config').catch(() => {});

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Create a .env file from .env.example first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.');

  const { inserted, updated } = await seedDatabase();
  for (const proc of procedures) {
    console.log(`  ✔ ${proc.procedure_code}`);
  }
  console.log(`\nSeed complete — ${inserted} inserted, ${updated} updated.`);
  await mongoose.disconnect();
}
