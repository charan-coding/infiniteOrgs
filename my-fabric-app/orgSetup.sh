#!/bin/bash

# Define purple color
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Step 1: Go back one folder and then to test-network
echo -e "${PURPLE}Navigating to test-network directory...${NC}"
cd ../test-network

cd addOrg5

chmod +x ./addOrg5.sh
./addOrg5.sh up -c mychannel -ca -s couchdb

cd ..

# Step 4: Deploy for org5
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org5MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org5.example.com/peers/peer0.org5.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org5.example.com/users/Admin@org5.example.com/msp
export CORE_PEER_ADDRESS=localhost:15051

echo -e "${PURPLE}Install chaincode on Peers of Org5${NC}"
peer lifecycle chaincode install asctp.tar.gz



export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep -oP '(?<=Package ID: ).*?(?=,)' | tr -d '\n')
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --channelID mychannel --name asctp --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1
peer lifecycle chaincode querycommitted --channelID mychannel --name asctp


# # Step 4: Navigate back to my-fabric-app
# echo -e "${PURPLE}Navigating back to my-fabric-app directory...${NC}"
# cd ../my-fabric-app

# # Step 4: Run enrollAdmin.js
# echo -e "${PURPLE}Running enrollAdmin.js...${NC}"
# node enrollAdmin.js

# # Step 5: Run registerUser.js
# echo -e "${PURPLE}Running registerUser.js...${NC}"
# node registerUser.js

# # Step 6: Run enrollAdmin_org2.js
# echo -e "${PURPLE}Running enrollAdmin_org2.js...${NC}"
# node enrollAdmin_org2.js

# # Step 7: Run registerUser_org2.js
# echo -e "${PURPLE}Running registerUser_org2.js...${NC}"
# node registerUser_org2.js

# # Step 8: Run main.js
# echo -e "${PURPLE}Running main.js...${NC}"
# node main.js

echo -e "${PURPLE}All steps completed successfully.${NC}"
