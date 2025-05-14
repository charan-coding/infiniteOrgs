#!/bin/bash

# ========== Input Validation ==========
if [ -z "$1" ]; then
  echo "Usage: ./orgSetup.sh <orgNumber>"
  exit 1
fi

ORG=$1
ORG_CAPITALIZED="Org${ORG}"
ORG_LOWER="org${ORG}"

# ========== Color Definitions ==========
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ========== Set Base Paths ==========
BASE_DIR=$(dirname "$(readlink -f "$0")")
TEST_NETWORK_DIR="${BASE_DIR}/../test-network"
ADD_ORG_DIR="${TEST_NETWORK_DIR}/addOrg${ORG}"
ENV_FILE="${TEST_NETWORK_DIR}/scripts/envVar_org${ORG}.conf"

# ========== Extract Peer Port ==========
if [ ! -f "$ENV_FILE" ]; then
  echo "Cannot find env file: $ENV_FILE"
  exit 1
fi

PORT=$(grep -E 'CORE_PEER_ADDRESS="?localhost:[0-9]+"' "$ENV_FILE" | sed -E 's/.*localhost:([0-9]+).*/\1/')


if [ -z "$PORT" ]; then
  echo "Could not extract CORE_PEER_ADDRESS from $ENV_FILE"
  exit 1
fi

# ========== Step 1: Navigate and Launch Org ==========
echo -e "${PURPLE}Navigating to test-network/addOrg${ORG} and starting org...${NC}"
cd "$ADD_ORG_DIR" || exit 1

chmod +x ./addOrg${ORG}.sh
./addOrg${ORG}.sh up -c mychannel -ca -s couchdb

cd "$TEST_NETWORK_DIR" || exit 1

# ========== Step 2: Set Peer Environment ==========
echo -e "${PURPLE}Setting environment for ${ORG_CAPITALIZED} with peer port $PORT...${NC}"
export PATH=${TEST_NETWORK_DIR}/../bin:$PATH
export FABRIC_CFG_PATH=${TEST_NETWORK_DIR}/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=${ORG_CAPITALIZED}MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${TEST_NETWORK_DIR}/organizations/peerOrganizations/${ORG_LOWER}.example.com/peers/peer0.${ORG_LOWER}.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${TEST_NETWORK_DIR}/organizations/peerOrganizations/${ORG_LOWER}.example.com/users/Admin@${ORG_LOWER}.example.com/msp
export CORE_PEER_ADDRESS=localhost:${PORT}

# ========== Step 3: Install and Approve Chaincode ==========
echo -e "${PURPLE}Installing chaincode on peer0.${ORG_LOWER}.example.com...${NC}"
peer lifecycle chaincode install hyper.tar.gz

export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep -oP '(?<=Package ID: ).*?(?=,)' | tr -d '\n')

echo -e "${PURPLE}Approving chaincode for ${ORG_CAPITALIZED}...${NC}"
peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "${TEST_NETWORK_DIR}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel --name hyper --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1

peer lifecycle chaincode querycommitted --channelID mychannel --name hyper

# ========== Step 4: Navigate Back ==========
echo -e "${PURPLE}Returning to my-fabric-app directory...${NC}"
cd "$BASE_DIR" || exit 1

echo -e "${PURPLE}All steps completed successfully for ${ORG_CAPITALIZED}.${NC}"
