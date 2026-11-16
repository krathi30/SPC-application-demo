// Names shown in the UI. Defaults are the fictional demo company; a real site
// can override them at build time (REACT_APP_* build args) without code changes.
const env = import.meta.env;

export const COMPANY_NAME = env.REACT_APP_COMPANY_NAME || 'THE NORTHWIND CREAMERY COMPANY';
export const COMPANY_TAGLINE = env.REACT_APP_COMPANY_TAGLINE || 'Every Scoop, In Control';
export const BRAND_NAME = env.REACT_APP_BRAND_NAME || 'AURORA'; // department / product brand
export const BRAND_SUBTEXT = env.REACT_APP_BRAND_SUBTEXT || 'DEPARTMENT';
export const PLANT_LABEL = env.REACT_APP_PLANT_LABEL || 'Plant #0417, Fairview';
