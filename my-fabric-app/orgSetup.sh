#!/bin/bash

# Define purple color
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Step 1: Go back one folder and then to test-network
echo -e "${PURPLE}Navigating to test-network directory...${NC}"
cd ../test-network

cd addOrg6

chmod +x ./addOrg6.sh
./addOrg6.sh up -c mychannel -ca -s couchdb

cd ..

# Step 4: Deploy for org6
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org6MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org6.example.com/peers/peer0.org6.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org6.example.com/users/Admin@org6.example.com/msp
export CORE_PEER_ADDRESS=localhost:17051

echo -e "${PURPLE}Install chaincode on Peers of Org6${NC}"
peer lifecycle chaincode install hyper.tar.gz



export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep -oP '(?<=Package ID: ).*?(?=,)' | tr -d '\n')
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --channelID mychannel --name hyper --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1
peer lifecycle chaincode querycommitted --channelID mychannel --name hyper


# # Step 4: Navigate back to my-fabric-app
echo -e "${PURPLE}Navigating back to my-fabric-app directory...${NC}"
cd ../my-fabric-app

# echo -e "${PURPLE}Running enrollAdmin_org6.js...${NC}"
# node enrollAdmin_org6.js

# # Step 11: Run registerUser_org6.js
# echo -e "${PURPLE}Running registerUser_org6.js...${NC}"
# node registerUser_org6.js

echo -e "${PURPLE}All steps completed successfully.${NC}"
