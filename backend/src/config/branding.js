// Site name printed on reports, exports and setup banners. The default is the
// fictional demo company; a real site sets PLANT_LABEL in its private .env.
const PLANT_LABEL = process.env.PLANT_LABEL || 'Plant #0417, Fairview';

module.exports = { PLANT_LABEL };
