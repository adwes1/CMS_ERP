#!/bin/sh
set -eu

KCADM=/opt/keycloak/bin/kcadm.sh
SERVER=http://keycloak:8080/auth
REALM=cms-erp

"$KCADM" config credentials \
  --server "$SERVER" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

"$KCADM" update users/profile -r "$REALM" -f /config/user-profile.json
"$KCADM" update "realms/$REALM" -s loginTheme=cms-erp-terminal

api_client_uuid=$("$KCADM" get clients -r "$REALM" -q clientId=cms-erp-api --fields id --format csv --noquotes)
if [ -z "$api_client_uuid" ]; then
  api_client_uuid=$("$KCADM" create clients -r "$REALM" -i \
    -s clientId=cms-erp-api \
    -s name='CMS ERP API Service' \
    -s enabled=true \
    -s publicClient=false \
    -s serviceAccountsEnabled=true \
    -s standardFlowEnabled=false \
    -s directAccessGrantsEnabled=false \
    -s protocol=openid-connect \
    -s "secret=$KEYCLOAK_API_CLIENT_SECRET")
else
  "$KCADM" update "clients/$api_client_uuid" -r "$REALM" \
    -s enabled=true \
    -s serviceAccountsEnabled=true \
    -s "secret=$KEYCLOAK_API_CLIENT_SECRET"
fi

"$KCADM" add-roles -r "$REALM" \
  --uusername service-account-cms-erp-api \
  --cclientid realm-management \
  --rolename manage-users \
  --rolename query-users \
  --rolename view-users \
  --rolename view-realm

admin_user_id=$("$KCADM" get users -r "$REALM" -q username=admin --fields id --format csv --noquotes)
if [ -z "$admin_user_id" ]; then
  admin_user_id=$("$KCADM" create users -r "$REALM" -i \
    -s username=admin \
    -s firstName=System \
    -s lastName=Administrator \
    -s enabled=true)
fi

"$KCADM" set-password -r "$REALM" --userid "$admin_user_id" --new-password admin
"$KCADM" add-roles -r "$REALM" --uid "$admin_user_id" --rolename cms-erp-user --rolename cms-erp-admin

demo_user_id=$("$KCADM" get users -r "$REALM" -q username=demo --fields id --format csv --noquotes)
if [ -n "$demo_user_id" ]; then
  "$KCADM" delete "users/$demo_user_id" -r "$REALM"
fi

echo "Keycloak-Benutzerverwaltung ist konfiguriert."
