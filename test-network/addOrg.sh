#!/bin/bash


ORG_NUM=$1
PEER_PORT=$2
CA_PORT=$3
COUCH_DB_PORT=$4

if [ -z "$ORG_NUM" ] || [ -z "$PEER_PORT" ] || [ -z "$CA_PORT" ] || [ -z "$COUCH_DB_PORT" ]; then
  echo "Usage: $0 <org_number> <peer_port> <ca_port> <couch_db_port>"
  echo "Example: $0 4 12051 12054 10984"
  exit 1
fi


ORG_NAME="org${ORG_NUM}"
ORG_NAME_CAPITALIZED="Org${ORG_NUM}"
ORG_NAME_UPPERCASE="ORG${ORG_NUM}"
COUCH_DB_NAME="couchdb$((ORG_NUM + 1))"


BASE_FOLDER="reference"
TARGET_FOLDER="add${ORG_NAME_CAPITALIZED}"

cp -r "$BASE_FOLDER" "$TARGET_FOLDER"

# Renaming each folder or file that has 'org3' in its name
mv "$TARGET_FOLDER/compose/compose-ca-org3.yaml" "$TARGET_FOLDER/compose/compose-ca-${ORG_NAME}.yaml"
mv "$TARGET_FOLDER/compose/compose-couch-org3.yaml" "$TARGET_FOLDER/compose/compose-couch-${ORG_NAME}.yaml"
mv "$TARGET_FOLDER/compose/compose-org3.yaml" "$TARGET_FOLDER/compose/compose-${ORG_NAME}.yaml"

mv "$TARGET_FOLDER/compose/docker/docker-compose-ca-org3.yaml" "$TARGET_FOLDER/compose/docker/docker-compose-ca-${ORG_NAME}.yaml"
mv "$TARGET_FOLDER/compose/docker/docker-compose-couch-org3.yaml" "$TARGET_FOLDER/compose/docker/docker-compose-couch-${ORG_NAME}.yaml"
mv "$TARGET_FOLDER/compose/docker/docker-compose-org3.yaml" "$TARGET_FOLDER/compose/docker/docker-compose-${ORG_NAME}.yaml"

mv "$TARGET_FOLDER/compose/podman/podman-compose-ca-org3.yaml" "$TARGET_FOLDER/compose/podman/podman-compose-ca-${ORG_NAME}.yaml"
mv "$TARGET_FOLDER/compose/podman/podman-compose-couch-org3.yaml" "$TARGET_FOLDER/compose/podman/podman-compose-couch-${ORG_NAME}.yaml"
mv "$TARGET_FOLDER/compose/podman/podman-compose-org3.yaml" "$TARGET_FOLDER/compose/podman/podman-compose-${ORG_NAME}.yaml"

mv "$TARGET_FOLDER/fabric-ca/org3" "$TARGET_FOLDER/fabric-ca/${ORG_NAME}"
mv "$TARGET_FOLDER/addOrg3.sh" "$TARGET_FOLDER/add${ORG_NAME_CAPITALIZED}.sh"
mv "$TARGET_FOLDER/org3-crypto.yaml" "$TARGET_FOLDER/${ORG_NAME}-crypto.yaml"


find "$TARGET_FOLDER" -type f -exec sed -i \
  -e "s/org3/$ORG_NAME/g" \
  -e "s/Org3/$ORG_NAME_CAPITALIZED/g" \
  -e "s/ORG3/$ORG_NAME_UPPERCASE/g" \
  -e "s/11051/$PEER_PORT/g" \
  -e "s/11054/$CA_PORT/g" \
  -e "s/9984/$COUCH_DB_PORT/g" \
  -e "s/couchdb4/$COUCH_DB_NAME/g" {} +

echo "Folder $TARGET_FOLDER created and configured for $ORG_NAME with ports:"
echo "  Peer Port: $PEER_PORT"
echo "  CA Port: $CA_PORT"
echo "  CouchDB Port: $COUCH_DB_PORT"
echo "  CouchDB Name: $COUCH_DB_NAME"

# Define the path
PEER_CA_PATH="\${TEST_NETWORK_HOME}/organizations/peerOrganizations/${ORG_NAME}.example.com/tlsca/tlsca.${ORG_NAME}.example.com-cert.pem"
PEER_MSP_PATH="\${TEST_NETWORK_HOME}/organizations/peerOrganizations/${ORG_NAME}.example.com/users/Admin@${ORG_NAME}.example.com/msp"

# Define the output file path
OUTPUT_FILE="scripts/envVar_${ORG_NAME}.conf"

# Create the organization-specific environment configuration file
cat <<EOL > $OUTPUT_FILE
# Environment variables for ${ORG_NAME}

CORE_PEER_LOCALMSPID="${ORG_NAME_CAPITALIZED}MSP"
CORE_PEER_TLS_ROOTCERT_FILE="${PEER_CA_PATH}"
CORE_PEER_MSPCONFIGPATH="${PEER_MSP_PATH}"
CORE_PEER_ADDRESS="localhost:${PEER_PORT}"
EOL

# Provide feedback to the user
echo "Generated environment variables file for ${ORG_NAME}: ${OUTPUT_FILE}"