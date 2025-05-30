

# INFINITE_ORG – HyperAccess Smart Contract Management Framework

**INFINITE_ORG** is a modular, scalable blockchain system built on Hyperledger Fabric to manage digital contracts between organizations. Designed under the **HyperAccess** initiative, it provides a flexible framework for contract creation, version-controlled module updates, comment tracking, and multi-party cryptographic signatures.

---

## Key Features

- **Dynamic Org Expansion**: Easily register and configure new organizations via scripts or APIs
- **Modular Contract Architecture**: Contracts are composed of individually versioned modules
- **Role-based Signature Validation**: Contracts can require specific users or entire MSPs to sign
- **Comment System**: Collaborators can leave comments on the latest version of any module
- **REST API Support**: Express backend exposes all features via clean HTTP endpoints
- **Rich Query Integration**: Search and filter contract data using custom CouchDB queries

---

## Prerequisites

1. [Node.js](https://nodejs.org/) and `npm`
2. [Docker](https://www.docker.com/) and Docker Compose
3. Hyperledger Fabric binaries and images
   - Install using [Fabric Docs](https://hyperledger-fabric.readthedocs.io/en/latest/install.html)

---

## Project Structure

INFINITE_ORG/
├── hyperaccess/
│ └── chaincode-javascript/
│ └── hyper.js # Main chaincode for contract logic

├── my-fabric-app/
│ ├── src/routes/ # Express API route handlers
│ │ ├── createAnyEmptyContract.js
│ │ ├── addAnyModule.js
│ │ ├── editAnyModule.js
│ │ ├── addAnyComment.js
│ │ ├── signAnyContract.js
│ │ ├── getAnyContract.js
│ │ └── getAnyLatestContract.js
│ ├── main.js # Express app entry point
│ ├── enrollAdmin.js # Admin identity setup
│ ├── registerAny.js # Dynamic user registration
│ ├── orgSetup.sh # Org identity setup and connection config
│ ├── setup.sh # Full network setup
│ ├── teardown.sh # Network teardown (Org1–Org7 supported)

├── test-network/
│ ├── addOrg3/, addOrg4/, etc. # Org-specific extension folders
│ └── organizations/ # Fabric MSP and TLS data

├── scripts/
│ └── addOrg-scripts/ # Helper scripts: joinChannel.sh, configUpdate.sh, etc.

├── postman/
│ └── HYPER.json # Postman collection (to be added)


---

## Getting Started

### Step 1: Start the Network

cd my-fabric-app
./setup.sh

This sets up:

    Fabric network (channel creation, CA, CouchDB, etc.)

    Chaincode deployment (hyper.js)

    Admin identity enrollment

    Express server launch

## Step 2: Register and Enroll Org Users

    Use the API (POST /api/registerUser) or run:

node registerAny.js

## Step 3: Interact via API

Start sending requests via Postman or curl to:

    Create contracts

    Add or edit modules

    Sign or comment

    Query modules or latest version

## Step 4: Teardown (Dev Only)

./teardown.sh

Note: teardown.sh supports Org1 through Org7. Extend it manually to cover more orgs.
Smart Contract Logic (hyper.js)

    createEmptyContract: Initializes contract with metadata, creator identity, and required signers

    addModulesToContract: Adds modules (each starts with version V0)

    editModuleContent: Adds new version to a module and resets signatures

    addCommentToModule: Adds a comment on the latest module version

    signContract: Supports specific user ID or organization-wide signing rules

    getExistingModules: Returns all module versions of a contract

    queryByID, uniquePur: Enables indexed queries using CouchDB selectors

# Available API Routes

Each API corresponds to a chaincode interaction:
Route	Functionality
POST /api/createAnyEmptyContract	Create a new contract
POST /api/addAnyModule	Add modules to a contract
POST /api/editAnyModule	Edit a module (new version)
POST /api/addAnyComment	Comment on the latest module
POST /api/signAnyContract	Add a valid signature
POST /api/getAnyContract	Fetch full contract
POST /api/getAnyLatestContract	Get most recent contract data
POST /api/registerUser	Register user and identity
POST /api/addOrg	Add a new organization
POST /api/setupOrg	Initialize org identities and config

Each route expects userIdentity with credentials and optional parameters such as contractId, moduleName, or comment.
Adding New Organizations

Use either the orgSetup.sh script or API to register and configure additional organizations.

You can also customize:

    scripts/addOrg-scripts/ for CLI-based automation
