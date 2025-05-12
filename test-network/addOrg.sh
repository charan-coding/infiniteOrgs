#!/bin/bash


ORG_NUM=$1
PEER_PORT=$2
CA_PORT=$3
COUCH_DB_PORT=$4

if [ -z "$ORG_NUM" ] || [ -z "$PEER_PORT" ] || [ -z "$CA_PORT" ] || [ -z "$COUCH_DB_PORT" ]; then
  echo "Usage: $0 <org_number> <peer_port> <ca_port> <couch_db_port>"
  echo "Example: $0 4 13051 13054 11984"
  exit 1
fi


ORG_NAME="org${ORG_NUM}"
EQUALNUMBER="ORG=${ORG_NUM}"
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
  -e "s/ORG=3/$EQUALNUMBER/g" \
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


##############################
# PART 4: Update only Endorsement rules in peer orgs (Org<number>) across configtx.yaml files
##############################

CONFIGTX_ROOT="/home/charan/Desktop/Fourth_Replicate/infinite_org/test-network"
NEW_MSP="'${ORG_NAME_CAPITALIZED}MSP.peer'"

update_endorsement_rule_strict() {
  local file="$1"
  local msp="$2"

  awk -v newmsp="$msp" '
    BEGIN {
      in_org = 0
      in_endorsement = 0
    }
    {
      # Start of a peer Org block like - &Org1, - &Org25
      if ($0 ~ /^[[:space:]]*-[[:space:]]*&Org[0-9]+[[:space:]]*$/) {
        in_org = 1
        in_endorsement = 0
      }
      # End of Org block if another anchor starts
      else if (in_org && $0 ~ /^[[:space:]]*-[[:space:]]*&/) {
        in_org = 0
        in_endorsement = 0
      }

      # Inside Org block, detect Endorsement section
      if (in_org && $0 ~ /^[[:space:]]*Endorsement:[[:space:]]*$/) {
        in_endorsement = 1
      }
      # Exit Endorsement section if next non-indented or unrelated section appears
      else if (in_endorsement && $0 !~ /^[[:space:]]+/) {
        in_endorsement = 0
      }

      # Modify only Endorsement.Rule line if MSP not already present
      if (in_org && in_endorsement && $0 ~ /^[[:space:]]*Rule:[[:space:]]*"OR\(.*\)"/ && $0 !~ newmsp) {
        sub(/\)"/, "," newmsp ")\"")
      }

      print
    }
  ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

echo "Scanning configtx.yaml files to patch only peer orgs with numbered names..."

find "$CONFIGTX_ROOT" -type f -name configtx.yaml | while read -r configtx; do
  echo "Updating: $configtx"
  update_endorsement_rule_strict "$configtx" "$NEW_MSP"
done

# Optional: handle main configtx.yaml directly
MAIN_CONFIGTX="${CONFIGTX_ROOT}/configtx/configtx.yaml"
if [ -f "$MAIN_CONFIGTX" ]; then
  echo "Updating main configtx.yaml: $MAIN_CONFIGTX"
  update_endorsement_rule_strict "$MAIN_CONFIGTX" "$NEW_MSP"
fi

echo "All peer org Endorsement rules updated with ${NEW_MSP}."
