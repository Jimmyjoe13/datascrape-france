import { CompanyData, EmailStatus, SearchParams, Sector } from '../types';
import { 
  MOCK_FIRST_NAMES, 
  MOCK_LAST_NAMES, 
  SECTOR_MAP, 
  STREETS_BY_CITY,
  PHONE_PREFIXES,
  SECTOR_ROLES
} from '../constants';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeString = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
};

const generateSIREN = (): string => {
  // Generate a valid-looking 9 digit SIREN (starts with 3, 4, 5, 7, 8 usually)
  const firstDigit = [3, 4, 5, 7, 8][Math.floor(Math.random() * 5)];
  let siren = firstDigit.toString();
  for (let i = 0; i < 8; i++) siren += Math.floor(Math.random() * 10);
  
  // Format as XXX XXX XXX
  return `${siren.slice(0,3)} ${siren.slice(3,6)} ${siren.slice(6,9)}`;
};

const generatePhoneNumber = (city: string): string => {
  const prefix = PHONE_PREFIXES[city] || "01";
  const isMobile = Math.random() > 0.8;
  const finalPrefix = isMobile ? (Math.random() > 0.5 ? "06" : "07") : prefix;
  
  let number = finalPrefix;
  for (let i = 0; i < 4; i++) {
    number += " " + Math.floor(Math.random() * 100).toString().padStart(2, '0');
  }
  return number;
};

const generateCompany = (params: SearchParams, index: number, totalRequest: number): CompanyData => {
  const sectorNames = SECTOR_MAP[params.sector] || SECTOR_MAP['Autre'];
  
  // Use modulo to cycle through names if requested > available, but add variation
  const baseNameIndex = index % sectorNames.length;
  let name = sectorNames[baseNameIndex];
  
  // If we loop over the names, append a location or number to make it unique
  if (index >= sectorNames.length) {
    if (Math.random() > 0.5) {
        name = `${name} ${params.location}`;
    } else {
        name = `${name} & Co`;
    }
  }

  // Generate Website
  const cleanName = normalizeString(name);
  const domain = `${cleanName}.fr`; // Most French businesses use .fr
  const website = `https://www.${domain}`;

  // Person
  const firstName = MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)];
  const lastName = MOCK_LAST_NAMES[Math.floor(Math.random() * MOCK_LAST_NAMES.length)];
  
  // Role
  const roles = SECTOR_ROLES[params.sector] || SECTOR_ROLES['Autre'];
  const role = roles[Math.floor(Math.random() * roles.length)];

  // Address
  const streets = STREETS_BY_CITY[params.location] || STREETS_BY_CITY["Paris"];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const address = `${Math.floor(Math.random() * 150) + 1} ${street}, ${params.location}`;

  // Email Generation Logic
  const emails = [];
  let emailStatus = EmailStatus.UNKNOWN;
  let qualityScore = Math.floor(Math.random() * 30) + 50; // Base score 50-80

  // 90% chance to find an email
  if (Math.random() < 0.9) {
    let emailAddr = "";
    const emailTypeRand = Math.random();
    
    // Sector specific email patterns
    if (params.sector === Sector.LEGAL) {
        // Lawyers often use firstname.lastname or cabinet
        if (emailTypeRand > 0.4) emailAddr = `${normalizeString(firstName)}.${normalizeString(lastName)}@${domain}`;
        else emailAddr = `cabinet@${domain}`;
    } else if (params.sector === Sector.HOTELS || params.sector === Sector.RESTAURANTS) {
        // Hotels/Restos often use reservation or contact
        if (emailTypeRand > 0.5) emailAddr = `reservation@${domain}`;
        else if (emailTypeRand > 0.2) emailAddr = `contact@${domain}`;
        else emailAddr = `direction@${domain}`;
    } else if (params.sector === Sector.CRAFTS) {
        // Craftsmen often use standard contact or gmail/orange (simulated here as domain for professional look, or maybe generic)
        if (Math.random() > 0.8) {
             // Simulate small biz using ISP email
             emailAddr = `${cleanName}@orange.fr`; 
        } else {
             emailAddr = `contact@${domain}`;
        }
    } else {
        // Standard Tech/Corporate patterns
        if (emailTypeRand > 0.6) emailAddr = `${normalizeString(firstName)}.${normalizeString(lastName)}@${domain}`;
        else if (emailTypeRand > 0.3) emailAddr = `${normalizeString(firstName)}@${domain}`;
        else emailAddr = `hello@${domain}`;
    }

    // Determine Status & Quality
    // Simulating that "contact@" is often generic (lower score usually, but valid)
    // "firstname.lastname" is high value
    const isGeneric = ['contact', 'info', 'hello', 'reservation', 'cabinet', 'direction'].some(p => emailAddr.startsWith(p));
    
    // Random validity simulation
    const randStatus = Math.random();
    if (randStatus > 0.15) {
        emailStatus = EmailStatus.VALID;
        qualityScore += isGeneric ? 10 : 20; // Personal emails are worth more
    } else if (randStatus > 0.05) {
        emailStatus = EmailStatus.RISKY;
        qualityScore -= 10;
    } else {
        emailStatus = EmailStatus.INVALID;
        qualityScore = 0;
    }

    emails.push({
      address: emailAddr,
      source: Math.random() > 0.4 ? 'Site Web' : (Math.random() > 0.5 ? 'LinkedIn' : 'Pappers'),
      type: isGeneric ? 'Generic' : 'Personal',
      confidence: emailStatus === EmailStatus.VALID ? (isGeneric ? 90 : 98) : 60
    } as any);
  } else {
      // No email found
      qualityScore -= 40;
  }

  // Adjust Score based on completeness
  const siren = Math.random() > 0.1 ? generateSIREN() : undefined;
  if (siren) qualityScore += 10;
  
  const hasPhone = Math.random() > 0.05;
  if (hasPhone) qualityScore += 10;

  return {
    id: `CPY-${Date.now()}-${index}`,
    name: name,
    siren: siren,
    sector: params.sector,
    address: address,
    city: params.location,
    website: website,
    emails: emails,
    phone: hasPhone ? generatePhoneNumber(params.location) : undefined,
    contactName: `${firstName} ${lastName}`,
    contactRole: role,
    socials: {
      linkedin: Math.random() > 0.4 ? `linkedin.com/company/${cleanName}` : undefined,
      facebook: (params.sector === Sector.RESTAURANTS || params.sector === Sector.RETAIL) && Math.random() > 0.3 ? `facebook.com/${cleanName}` : undefined,
      instagram: (params.sector === Sector.RESTAURANTS || params.sector === Sector.DESIGN || params.sector === Sector.RETAIL) && Math.random() > 0.3 ? `instagram.com/${cleanName}` : undefined,
    },
    collectedAt: new Date().toISOString(),
    qualityScore: Math.min(100, Math.max(0, qualityScore)),
    emailStatus: emailStatus
  };
};

export const simulateScraping = async (
  params: SearchParams, 
  onProgress: (progress: number, log: string) => void
): Promise<CompanyData[]> => {
  const results: CompanyData[] = [];
  const steps = 6; 
  const batchSize = Math.ceil(params.maxResults / steps);

  onProgress(5, `Initialisation du moteur de recherche pour ${params.sector} à ${params.location}...`);
  await sleep(600);

  onProgress(15, `Connexion aux bases de données (Pappers, LinkedIn, Google Maps)...`);
  await sleep(800);

  for (let i = 0; i < steps; i++) {
    const currentCount = Math.min(params.maxResults, i * batchSize);
    if (currentCount >= params.maxResults) break;
    
    const progressPercent = 20 + Math.floor((i / steps) * 60);
    const sources = ['Google Maps', 'Site Web', 'Pappers', 'LinkedIn'];
    const currentSource = sources[i % sources.length];
    
    onProgress(progressPercent, `Extraction en cours depuis ${currentSource}... (${currentCount}/${params.maxResults})`);
    
    // Create batch
    const count = Math.min(batchSize, params.maxResults - results.length);
    for (let j = 0; j < count; j++) {
      results.push(generateCompany(params, results.length, params.maxResults));
    }
    
    // Random sleep to simulate variable processing time
    await sleep(400 + Math.random() * 400); 
  }

  onProgress(90, "Vérification DNS et test SMTP des emails...");
  await sleep(800);
  
  onProgress(95, "Déduplication et enrichissement des données...");
  await sleep(600);

  onProgress(100, "Export finalisé.");
  return results;
};
