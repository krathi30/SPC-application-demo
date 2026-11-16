// Names shown in the UI. Can be overridden at build time (REACT_APP_* build
// args) without code changes.
const env = import.meta.env;

export const COMPANY_NAME = env.REACT_APP_COMPANY_NAME || 'THE MAGNUM ICE CREAM COMPANY';
export const COMPANY_TAGLINE = env.REACT_APP_COMPANY_TAGLINE || 'Life Tastes Better With Ice Cream';
export const BRAND_NAME = env.REACT_APP_BRAND_NAME || 'KLONDIKE'; // department / product brand
export const BRAND_SUBTEXT = env.REACT_APP_BRAND_SUBTEXT || 'DEPARTMENT';
export const PLANT_LABEL = env.REACT_APP_PLANT_LABEL || 'Plant #1352, Covington';
