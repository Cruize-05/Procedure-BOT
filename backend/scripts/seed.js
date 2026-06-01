#!/usr/bin/env node
/**
 * Seed script — populates MongoDB Atlas with the 10 core Cameroonian procedures.
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import { Procedure } from '../shared/schema.js';
import 'dotenv/config';

const procedures = [
  {
    procedure_code: 'NATIONAL_ID',
    en: {
      title: 'National Identity Card',
      description: 'The Cameroonian national identity card is a mandatory document for all citizens aged 18 and above.',
      steps: [
        { order: 1, description: 'Obtain an application form from the nearest District Office (Préfecture) or Sous-Préfecture.' },
        { order: 2, description: 'Complete the form and attach all required documents.' },
        { order: 3, description: 'Submit the dossier to the officer at the civil status window.' },
        { order: 4, description: 'Attend fingerprinting and photograph session at the scheduled date.' },
        { order: 5, description: 'Collect the card once notified (typically 2–4 weeks).' },
      ],
      required_documents: ['Birth certificate (original)', 'Two recent passport-size photos', 'Proof of address', 'Previous ID card (for renewal)'],
      fees: 'CFA 2,500 (new) / CFA 1,500 (renewal)',
      estimated_duration: '2 to 4 weeks',
      issuing_authority: 'District Office (Préfecture / Sous-Préfecture)',
      notes: 'Processing times may vary by region.',
    },
    fr: {
      title: 'Carte Nationale d\'Identité',
      description: 'La carte nationale d\'identité camerounaise est un document obligatoire pour tout citoyen âgé de 18 ans et plus.',
      steps: [
        { order: 1, description: 'Obtenir un formulaire de demande auprès de la Préfecture ou Sous-Préfecture la plus proche.' },
        { order: 2, description: 'Remplir le formulaire et joindre tous les documents requis.' },
        { order: 3, description: 'Déposer le dossier au guichet de l\'état civil.' },
        { order: 4, description: 'Se présenter pour la prise d\'empreintes et de photo à la date convenue.' },
        { order: 5, description: 'Retirer la carte dès notification (généralement 2 à 4 semaines).' },
      ],
      required_documents: ['Acte de naissance (original)', 'Deux photos d\'identité récentes', 'Justificatif de domicile', 'Ancienne CNI (pour renouvellement)'],
      fees: 'CFA 2 500 (nouvelle) / CFA 1 500 (renouvellement)',
      estimated_duration: '2 à 4 semaines',
      issuing_authority: 'Préfecture / Sous-Préfecture',
      notes: 'Les délais peuvent varier selon la région.',
    },
    tags: ['identity', 'mandatory'],
  },
  {
    procedure_code: 'BIRTH_CERT',
    en: {
      title: 'Birth Certificate',
      description: 'Official document registering a birth in the Cameroonian civil registry.',
      steps: [
        { order: 1, description: 'Visit the Mairie (Town Hall) of the birth location.' },
        { order: 2, description: 'Complete the birth declaration form within 90 days of birth.' },
        { order: 3, description: 'Submit the completed form with supporting documents.' },
        { order: 4, description: 'Receive the birth certificate on the same day or within 48 hours.' },
      ],
      required_documents: ['Hospital delivery certificate or witness declaration', 'Parents\' identity documents', 'Marriage certificate (if applicable)'],
      fees: 'Free (first issuance)',
      estimated_duration: 'Same day to 48 hours',
      issuing_authority: 'Mairie (Town Hall)',
      notes: 'Late declarations (after 90 days) require a court judgment.',
    },
    fr: {
      title: 'Acte de Naissance',
      description: 'Document officiel enregistrant une naissance dans le registre civil camerounais.',
      steps: [
        { order: 1, description: 'Se rendre à la Mairie du lieu de naissance.' },
        { order: 2, description: 'Remplir la déclaration de naissance dans les 90 jours suivant la naissance.' },
        { order: 3, description: 'Déposer le formulaire complété avec les pièces justificatives.' },
        { order: 4, description: 'Recevoir l\'acte de naissance le jour même ou sous 48 heures.' },
      ],
      required_documents: ['Certificat de naissance de la maternité ou déclaration de témoins', 'Pièces d\'identité des parents', 'Acte de mariage (si applicable)'],
      fees: 'Gratuit (première délivrance)',
      estimated_duration: 'Le jour même à 48 heures',
      issuing_authority: 'Mairie',
      notes: 'Les déclarations tardives (après 90 jours) nécessitent un jugement supplétif.',
    },
    tags: ['civil-status', 'birth'],
  },
  {
    procedure_code: 'BUSINESS_REG',
    en: {
      title: 'Business Registration',
      description: 'Register a new business entity (SARL, SA, or sole proprietorship) in Cameroon.',
      steps: [
        { order: 1, description: 'Prepare a business plan and choose a company name (check availability at CFCE).' },
        { order: 2, description: 'Notarize the company statutes (for SARL/SA).' },
        { order: 3, description: 'Register with the Centre de Formalités de Création des Entreprises (CFCE).' },
        { order: 4, description: 'Obtain the Registre de Commerce et du Crédit Mobilier (RCCM) number.' },
        { order: 5, description: 'Register with the tax authority (DGI) for a tax identification number.' },
        { order: 6, description: 'Open a corporate bank account.' },
      ],
      required_documents: ['Notarised company statutes', 'Identity documents of all shareholders', 'Proof of registered address', 'Capital deposit certificate from bank'],
      fees: 'CFA 36,000–CFA 100,000 depending on company type',
      estimated_duration: '3 to 7 business days (CFCE one-stop shop)',
      issuing_authority: 'CFCE (Centre de Formalités de Création des Entreprises)',
      notes: 'The CFCE one-stop shop streamlines multiple registrations into a single visit.',
    },
    fr: {
      title: 'Enregistrement d\'Entreprise',
      description: 'Enregistrer une nouvelle entité commerciale (SARL, SA ou entreprise individuelle) au Cameroun.',
      steps: [
        { order: 1, description: 'Préparer un plan d\'affaires et choisir un nom d\'entreprise (vérifier la disponibilité au CFCE).' },
        { order: 2, description: 'Faire notarier les statuts de la société (pour SARL/SA).' },
        { order: 3, description: 'S\'inscrire au Centre de Formalités de Création des Entreprises (CFCE).' },
        { order: 4, description: 'Obtenir le numéro du Registre de Commerce et du Crédit Mobilier (RCCM).' },
        { order: 5, description: 'S\'inscrire auprès de la Direction Générale des Impôts (DGI) pour un numéro d\'identification fiscale.' },
        { order: 6, description: 'Ouvrir un compte bancaire professionnel.' },
      ],
      required_documents: ['Statuts de société notariés', 'Pièces d\'identité de tous les actionnaires', 'Justificatif de siège social', 'Certificat de dépôt de capital'],
      fees: 'CFA 36 000–CFA 100 000 selon le type de société',
      estimated_duration: '3 à 7 jours ouvrables (guichet unique CFCE)',
      issuing_authority: 'CFCE (Centre de Formalités de Création des Entreprises)',
      notes: 'Le guichet unique CFCE regroupe plusieurs formalités en une seule visite.',
    },
    tags: ['business', 'registration'],
  },
  {
    procedure_code: 'MARRIAGE_CERT',
    en: {
      title: 'Marriage Certificate',
      description: 'Official civil marriage registration in Cameroon.',
      steps: [
        { order: 1, description: 'Announce the intended marriage at the Mairie at least 10 days before the ceremony.' },
        { order: 2, description: 'Submit the required documents for both parties.' },
        { order: 3, description: 'Attend the civil ceremony before the Registrar (Officier d\'État Civil).' },
        { order: 4, description: 'Receive the marriage certificate after the ceremony.' },
      ],
      required_documents: ['Birth certificates of both parties', 'National identity cards', 'Medical certificates (pre-marital health check)', 'Witnesses\' identity documents (2 per party)'],
      fees: 'CFA 5,000–CFA 15,000',
      estimated_duration: 'Minimum 10-day notice period',
      issuing_authority: 'Mairie (Town Hall)',
      notes: 'Religious ceremonies do not replace civil registration.',
    },
    fr: {
      title: 'Acte de Mariage',
      description: 'Enregistrement officiel du mariage civil au Cameroun.',
      steps: [
        { order: 1, description: 'Publier les bans de mariage à la Mairie au moins 10 jours avant la cérémonie.' },
        { order: 2, description: 'Déposer les pièces requises pour les deux parties.' },
        { order: 3, description: 'Assister à la cérémonie civile devant l\'Officier d\'État Civil.' },
        { order: 4, description: 'Recevoir l\'acte de mariage après la cérémonie.' },
      ],
      required_documents: ['Actes de naissance des deux parties', 'Cartes nationales d\'identité', 'Certificats médicaux (bilan prénuptial)', 'Pièces d\'identité des témoins (2 par partie)'],
      fees: 'CFA 5 000–CFA 15 000',
      estimated_duration: 'Délai minimum de 10 jours de publication des bans',
      issuing_authority: 'Mairie',
      notes: 'Les cérémonies religieuses ne remplacent pas l\'enregistrement civil.',
    },
    tags: ['civil-status', 'marriage'],
  },
  {
    procedure_code: 'PASSPORT',
    en: {
      title: 'Passport',
      description: 'Cameroonian biometric passport for international travel.',
      steps: [
        { order: 1, description: 'Complete the online pre-registration form on the DGSN portal (if available in your region).' },
        { order: 2, description: 'Pay the passport fee at an authorized bank or mobile money agent.' },
        { order: 3, description: 'Visit the DGSN (Direction Générale de la Sûreté Nationale) office with all documents.' },
        { order: 4, description: 'Submit biometric data (fingerprints and photo).' },
        { order: 5, description: 'Collect the passport when notified (4–8 weeks).' },
      ],
      required_documents: ['Birth certificate', 'National identity card', 'Payment receipt', 'Two passport-size photos', 'Previous passport (for renewal)'],
      fees: 'CFA 50,000 (5-year) / CFA 75,000 (10-year)',
      estimated_duration: '4 to 8 weeks',
      issuing_authority: 'DGSN (Direction Générale de la Sûreté Nationale)',
      notes: 'Urgent processing may be available at higher cost.',
    },
    fr: {
      title: 'Passeport',
      description: 'Passeport biométrique camerounais pour les voyages internationaux.',
      steps: [
        { order: 1, description: 'Remplir le formulaire de pré-inscription en ligne sur le portail de la DGSN (si disponible dans votre région).' },
        { order: 2, description: 'Payer les frais de passeport dans une banque agréée ou chez un agent mobile money.' },
        { order: 3, description: 'Se rendre au bureau de la DGSN avec tous les documents.' },
        { order: 4, description: 'Soumettre les données biométriques (empreintes digitales et photo).' },
        { order: 5, description: 'Retirer le passeport lors de la notification (4 à 8 semaines).' },
      ],
      required_documents: ['Acte de naissance', 'Carte nationale d\'identité', 'Reçu de paiement', 'Deux photos d\'identité', 'Ancien passeport (pour renouvellement)'],
      fees: 'CFA 50 000 (5 ans) / CFA 75 000 (10 ans)',
      estimated_duration: '4 à 8 semaines',
      issuing_authority: 'DGSN (Direction Générale de la Sûreté Nationale)',
      notes: 'Un traitement urgent peut être disponible à un coût supérieur.',
    },
    tags: ['travel', 'identity'],
  },
  {
    procedure_code: 'DRIVERS_LICENSE',
    en: {
      title: 'Driver\'s License',
      description: 'Cameroonian driving licence for operating motor vehicles.',
      steps: [
        { order: 1, description: 'Enrol in a registered driving school and complete the required training hours.' },
        { order: 2, description: 'Pass the written theory examination at the MINT (Ministère des Transports).' },
        { order: 3, description: 'Pass the practical driving test.' },
        { order: 4, description: 'Submit the application dossier to MINT.' },
        { order: 5, description: 'Collect the licence (typically 2–6 weeks after passing).' },
      ],
      required_documents: ['National identity card', 'Medical fitness certificate', 'School completion certificate', 'Two passport-size photos', 'Payment receipt'],
      fees: 'CFA 15,000–CFA 25,000 (government fees, excluding driving school fees)',
      estimated_duration: '2 to 6 weeks after passing tests',
      issuing_authority: 'Ministère des Transports (MINT)',
      notes: 'Driving school fees vary widely; budget CFA 80,000–CFA 200,000 separately.',
    },
    fr: {
      title: 'Permis de Conduire',
      description: 'Permis de conduire camerounais pour l\'utilisation de véhicules à moteur.',
      steps: [
        { order: 1, description: 'S\'inscrire dans une auto-école agréée et effectuer les heures de formation requises.' },
        { order: 2, description: 'Réussir l\'examen théorique au Ministère des Transports (MINT).' },
        { order: 3, description: 'Réussir l\'examen pratique de conduite.' },
        { order: 4, description: 'Déposer le dossier de demande au MINT.' },
        { order: 5, description: 'Retirer le permis (généralement 2 à 6 semaines après la réussite).' },
      ],
      required_documents: ['Carte nationale d\'identité', 'Certificat médical d\'aptitude', 'Attestation de fin de formation', 'Deux photos d\'identité', 'Reçu de paiement'],
      fees: 'CFA 15 000–CFA 25 000 (frais gouvernementaux, hors frais d\'auto-école)',
      estimated_duration: '2 à 6 semaines après la réussite des examens',
      issuing_authority: 'Ministère des Transports (MINT)',
      notes: 'Les frais d\'auto-école varient considérablement ; prévoir CFA 80 000–CFA 200 000 séparément.',
    },
    tags: ['transport', 'license'],
  },
  {
    procedure_code: 'LAND_TITLE',
    en: {
      title: 'Land Title',
      description: 'Obtaining a titre foncier (land certificate) for a parcel of land in Cameroon.',
      steps: [
        { order: 1, description: 'File a request at the Divisional Delegation of Lands (Délégation Départementale des Domaines).' },
        { order: 2, description: 'A land commission (commission consultative) inspects the parcel.' },
        { order: 3, description: 'Pay assessed registration fees.' },
        { order: 4, description: 'The title is inscribed in the Land Registry (Conservation Foncière).' },
        { order: 5, description: 'Receive the title document.' },
      ],
      required_documents: ['Proof of occupation or purchase agreement', 'Identity document', 'Survey plan (plan cadastral)', 'Tax clearance certificate'],
      fees: 'Variable — assessed as a percentage of land value',
      estimated_duration: '3 to 12 months (depending on disputes and workload)',
      issuing_authority: 'Délégation Départementale des Domaines / Conservation Foncière',
      notes: 'Engaging a licensed land surveyor is strongly recommended.',
    },
    fr: {
      title: 'Titre Foncier',
      description: 'Obtention d\'un titre foncier pour une parcelle de terrain au Cameroun.',
      steps: [
        { order: 1, description: 'Déposer une demande à la Délégation Départementale des Domaines.' },
        { order: 2, description: 'Une commission consultative inspecte la parcelle.' },
        { order: 3, description: 'Payer les frais d\'enregistrement évalués.' },
        { order: 4, description: 'Le titre est inscrit à la Conservation Foncière.' },
        { order: 5, description: 'Recevoir le document de titre.' },
      ],
      required_documents: ['Preuve d\'occupation ou acte de vente', 'Pièce d\'identité', 'Plan cadastral', 'Attestation de conformité fiscale'],
      fees: 'Variable — calculé en pourcentage de la valeur du terrain',
      estimated_duration: '3 à 12 mois (selon litiges et charge de travail)',
      issuing_authority: 'Délégation Départementale des Domaines / Conservation Foncière',
      notes: 'Il est fortement recommandé de faire appel à un géomètre agréé.',
    },
    tags: ['property', 'land'],
  },
  {
    procedure_code: 'CRIMINAL_RECORD',
    en: {
      title: 'Criminal Record Extract (Casier Judiciaire)',
      description: 'Official document certifying an individual\'s judicial record status in Cameroon.',
      steps: [
        { order: 1, description: 'Visit the Registry of the Court of First Instance (Tribunal de Première Instance) in your place of birth or residence.' },
        { order: 2, description: 'Complete the request form.' },
        { order: 3, description: 'Submit identity documents and pay the fee.' },
        { order: 4, description: 'Collect the extract (same day or within 48 hours).' },
      ],
      required_documents: ['National identity card or birth certificate', 'Recent passport-size photo'],
      fees: 'CFA 500–CFA 1,500',
      estimated_duration: 'Same day to 48 hours',
      issuing_authority: 'Tribunal de Première Instance (Court of First Instance)',
      notes: 'The extract is typically valid for 3 months.',
    },
    fr: {
      title: 'Extrait de Casier Judiciaire',
      description: 'Document officiel certifiant le statut du casier judiciaire d\'une personne au Cameroun.',
      steps: [
        { order: 1, description: 'Se rendre au greffe du Tribunal de Première Instance de votre lieu de naissance ou de résidence.' },
        { order: 2, description: 'Remplir le formulaire de demande.' },
        { order: 3, description: 'Déposer les pièces d\'identité et payer les frais.' },
        { order: 4, description: 'Retirer l\'extrait (le jour même ou dans les 48 heures).' },
      ],
      required_documents: ['Carte nationale d\'identité ou acte de naissance', 'Photo d\'identité récente'],
      fees: 'CFA 500–CFA 1 500',
      estimated_duration: 'Le jour même à 48 heures',
      issuing_authority: 'Tribunal de Première Instance',
      notes: 'L\'extrait est généralement valable 3 mois.',
    },
    tags: ['justice', 'legal'],
  },
  {
    procedure_code: 'DEATH_CERT',
    en: {
      title: 'Death Certificate',
      description: 'Official registration of a death in the Cameroonian civil registry.',
      steps: [
        { order: 1, description: 'Declare the death at the Mairie of the place of death within 30 days.' },
        { order: 2, description: 'Submit the medical death certificate and identity documents.' },
        { order: 3, description: 'The Registrar issues the death certificate.' },
      ],
      required_documents: ['Medical death certificate (signed by a doctor)', 'Identity document of the deceased', 'Declarant\'s identity document'],
      fees: 'Free',
      estimated_duration: 'Same day',
      issuing_authority: 'Mairie (Town Hall)',
      notes: 'Subsequent certified copies incur a small fee.',
    },
    fr: {
      title: 'Acte de Décès',
      description: 'Enregistrement officiel d\'un décès dans le registre civil camerounais.',
      steps: [
        { order: 1, description: 'Déclarer le décès à la Mairie du lieu de décès dans les 30 jours.' },
        { order: 2, description: 'Déposer le certificat médical de décès et les pièces d\'identité.' },
        { order: 3, description: 'L\'officier d\'état civil délivre l\'acte de décès.' },
      ],
      required_documents: ['Certificat médical de décès (signé par un médecin)', 'Pièce d\'identité du défunt', 'Pièce d\'identité du déclarant'],
      fees: 'Gratuit',
      estimated_duration: 'Le jour même',
      issuing_authority: 'Mairie',
      notes: 'Les copies certifiées ultérieures sont payantes.',
    },
    tags: ['civil-status', 'death'],
  },
  {
    procedure_code: 'SCHOOL_CERT_AUTH',
    en: {
      title: 'School Certificate Authentication',
      description: 'Official authentication of Cameroonian academic certificates by the Ministry of Secondary Education (MINESEC) or Ministry of Higher Education (MINESUP).',
      steps: [
        { order: 1, description: 'Submit original certificates and copies to the appropriate ministry authentication desk.' },
        { order: 2, description: 'Pay the authentication fee.' },
        { order: 3, description: 'Certificates are verified against official records.' },
        { order: 4, description: 'Collect authenticated documents (1–5 business days).' },
      ],
      required_documents: ['Original certificate(s)', 'Photocopies of all certificates', 'National identity card', 'Payment receipt'],
      fees: 'CFA 1,000–CFA 5,000 per certificate',
      estimated_duration: '1 to 5 business days',
      issuing_authority: 'MINESEC (secondary) / MINESUP (higher education)',
      notes: 'For use abroad, further apostille or consular legalisation may be required.',
    },
    fr: {
      title: 'Authentification de Diplômes Scolaires',
      description: 'Authentification officielle des diplômes scolaires camerounais par le MINESEC ou le MINESUP.',
      steps: [
        { order: 1, description: 'Déposer les diplômes originaux et copies au guichet d\'authentification du ministère concerné.' },
        { order: 2, description: 'Payer les frais d\'authentification.' },
        { order: 3, description: 'Les diplômes sont vérifiés dans les registres officiels.' },
        { order: 4, description: 'Retirer les documents authentifiés (1 à 5 jours ouvrables).' },
      ],
      required_documents: ['Diplôme(s) original(aux)', 'Photocopies de tous les diplômes', 'Carte nationale d\'identité', 'Reçu de paiement'],
      fees: 'CFA 1 000–CFA 5 000 par diplôme',
      estimated_duration: '1 à 5 jours ouvrables',
      issuing_authority: 'MINESEC (secondaire) / MINESUP (enseignement supérieur)',
      notes: 'Pour un usage à l\'étranger, une apostille ou une légalisation consulaire supplémentaire peut être nécessaire.',
    },
    tags: ['education', 'authentication'],
  },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Create a .env file from .env.example first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.');

  let inserted = 0;
  let updated = 0;

  for (const proc of procedures) {
    const result = await Procedure.findOneAndUpdate(
      { procedure_code: proc.procedure_code },
      proc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt?.getTime() === result.updatedAt?.getTime()) {
      inserted++;
    } else {
      updated++;
    }
    console.log(`  ✔ ${proc.procedure_code}`);
  }

  console.log(`\nSeed complete — ${inserted} inserted, ${updated} updated.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
