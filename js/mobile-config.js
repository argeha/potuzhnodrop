/*
 * Native-release configuration.
 *
 * The build creates a copy of this file in dist/. The website itself ignores
 * this setting and keeps using its current origin; a Capacitor package uses
 * the canonical Worker origin because its UI is served from localhost.
 */
window.POTUZHNO_MOBILE_CONFIG = Object.freeze({
  // This is the canonical production Worker. The ordinary website ignores
  // this field, while a native Android package needs it because its UI lives
  // at https://localhost inside Capacitor.
  apiOrigin: 'https://potuzhnodrop.argeha3.workers.dev',
  appScheme: 'potuzhnodrop',
  build: 'web',
});
