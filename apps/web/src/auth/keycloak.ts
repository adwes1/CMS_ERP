import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: `${window.location.origin}/auth`,
  realm: 'cms-erp',
  clientId: 'cms-erp-web',
});

export async function initializeAuthentication() {
  return keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });
}

