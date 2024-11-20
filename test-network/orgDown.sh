#!/bin/bash

# Usage: cleanupNetwork.sh <org_number>
ORG_NUM=$1
if [ -z "$ORG_NUM" ]; then
  echo "Usage: $0 <org_number>"
  echo "Example: $0 3"
  exit 1
fi

# Docker CLI choice (default to docker but allows for podman if needed)
CONTAINER_CLI="docker"
if command -v podman > /dev/null; then
    CONTAINER_CLI="podman"
fi
CONTAINER_CLI_COMPOSE="${CONTAINER_CLI}-compose"

# Define organization-specific compose files
ORG_NAME="org${ORG_NUM}"
COMPOSE_FILE_BASE="compose-test-net.yaml"
COMPOSE_FILE_COUCH="compose-couch.yaml"
COMPOSE_FILE_CA="compose-ca.yaml"
COMPOSE_FILE_ORG_BASE="compose-org${ORG_NUM}.yaml"
COMPOSE_FILE_ORG_COUCH="compose-couch-org${ORG_NUM}.yaml"
COMPOSE_FILE_ORG_CA="compose-ca-org${ORG_NUM}.yaml"

COMPOSE_FILES+=" -f addOrg${ORG_NUM}/compose/${COMPOSE_FILE_ORG_BASE} -f addOrg${ORG_NUM}/compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_ORG_BASE}"
COMPOSE_FILES+=" -f addOrg${ORG_NUM}/compose/${COMPOSE_FILE_ORG_COUCH} -f addOrg${ORG_NUM}/compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_ORG_COUCH}"
COMPOSE_FILES+=" -f addOrg${ORG_NUM}/compose/${COMPOSE_FILE_ORG_CA} -f addOrg${ORG_NUM}/compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_ORG_CA}"

# Stop and remove containers for the organization using Docker Compose
echo "Stopping and removing containers and volumes for $ORG_NAME..."

if [ "${CONTAINER_CLI}" == "docker" ]; then
  DOCKER_SOCK="${DOCKER_SOCK}" ${CONTAINER_CLI_COMPOSE} ${COMPOSE_FILES} down --volumes --remove-orphans
elif [ "${CONTAINER_CLI}" == "podman" ]; then
  ${CONTAINER_CLI_COMPOSE} ${COMPOSE_FILES} down --volumes
else
  echo "Error: Container CLI ${CONTAINER_CLI} not supported."
  exit 1
fi

# Additional volume cleanup for org-specific volumes if needed
${CONTAINER_CLI} volume rm -f docker_orderer.example.com docker_peer0.org1.example.com docker_peer0.org2.example.com 2>/dev/null || true
${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c "cd /data && rm -rf addOrg${ORG_NUM}/fabric-ca/org${ORG_NUM}/msp addOrg${ORG_NUM}/fabric-ca/org${ORG_NUM}/tls-cert.pem addOrg${ORG_NUM}/fabric-ca/org${ORG_NUM}/ca-cert.pem addOrg${ORG_NUM}/fabric-ca/org${ORG_NUM}/IssuerPublicKey addOrg${ORG_NUM}/fabric-ca/org${ORG_NUM}/IssuerRevocationPublicKey addOrg${ORG_NUM}/fabric-ca/org${ORG_NUM}/fabric-ca-server.db"
echo "Network cleanup completed for $ORG_NAME."