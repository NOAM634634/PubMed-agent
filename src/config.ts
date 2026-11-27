import dotenv from 'dotenv';

dotenv.config();

export const config = {
  ncbiApiKey: process.env.NCBI_API_KEY || '',
  contactEmail: process.env.CONTACT_EMAIL || '',
};
