#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# This script is designed to be run by addOrgX.sh as the
# second step of adding an Org to a Channel. It joins the orgX peers to the channel.

CHANNEL_NAME="$1"
DELAY="$2"
TIMEOUT="$3"
VERBOSE="$4"
ORG_NUM="$5"  # New parameter for organization number

: ${CHANNEL_NAME:="mychannel"}
: ${DELAY:="3"}
: ${TIMEOUT:="10"}
: ${VERBOSE:="false"}
: ${ORG_NUM:="3"}  # Default to org3 if not provided
COUNTER=1
MAX_RETRY=5

# Import environment variables
export TEST_NETWORK_HOME="${PWD}/.."
. ${TEST_NETWORK_HOME}/scripts/envVar.sh

# joinChannel ORG
joinChannel() {
  ORG=$1
  setGlobals $ORG
  local rc=1
  local COUNTER=1
  ## Retry loop for joining channel
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    set -x
    peer channel join -b $BLOCKFILE >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  verifyResult $res "After $MAX_RETRY attempts, peer0.org${ORG} has failed to join channel '$CHANNEL_NAME' "
}

setAnchorPeer() {
  ORG=$1
  ${TEST_NETWORK_HOME}/scripts/setAnchorPeer.sh $ORG $CHANNEL_NAME
}

# Set globals for the specified organization number
setGlobals ${ORG_NUM}
BLOCKFILE="${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}.block"

echo "Fetching channel config block from orderer..."
set -x
peer channel fetch 0 $BLOCKFILE -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME --tls --cafile "$ORDERER_CA" >&log.txt
res=$?
{ set +x; } 2>/dev/null
cat log.txt
verifyResult $res "Fetching config block from orderer has failed"

infoln "Joining org${ORG_NUM} peer to the channel..."
joinChannel ${ORG_NUM}

infoln "Setting anchor peer for org${ORG_NUM}..."
setAnchorPeer ${ORG_NUM}

successln "Channel '$CHANNEL_NAME' joined"
successln "Org${ORG_NUM} peer successfully added to network"
