#!/bin/bash

# Define green color
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Step 1: Go back one folder and then to test-network
echo -e "${GREEN}Navigating to test-network directory...${NC}"
cd ../test-network

# Step 2: Run the network.sh script to tear down the network
echo -e "${GREEN}Tearing down the network...${NC}"
./network.sh down
./orgDown.sh 4
./orgDown.sh 5
echo -e "${GREEN}Network teardown completed successfully.${NC}"
