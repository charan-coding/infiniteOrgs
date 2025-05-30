/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hyperledger Fabric Smart Contract for modular contract lifecycle management.
 * Features include:
 * - Contract creation
 * - Modular versioning
 * - Signature-based approval
 * - Commenting system
 * - Rich querying
 */


'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const { create } = require('domain');
class HYPER extends Contract {

    async initLedger(ctx){
        await ctx.stub.putState("test","hello world");
        return "success";
    }

    async writeData(ctx, key, value){
        await ctx.stub.putState(key,value);
        return value;
    }

    async readData(ctx, key){
        var response = await ctx.stub.getState(key);
        return response.toString();
    }    

    /**
 * Creates a new empty contract with metadata and creator info.
 * @param {Context} ctx - The transaction context
 * @param {string} key - Unique contract identifier
 * @param {string} data - Initial JSON string with metadata (excluding system fields)
 * @returns {Promise<string>} The full contract JSON string
 */


    async createEmptyContract(ctx, key, data) {

        const existing = await ctx.stub.getState(key);
        if (existing && existing.length > 0) {
            throw new Error(`The contract with key ${key} already exists`);
        }

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19) + 'Z';

        const creatorOrg = ctx.clientIdentity.getMSPID();
        const creatorUserId = ctx.clientIdentity.getID();

        const value = JSON.parse(data);
        value.created_at = formattedDate;
        value.status = "EMPTY";
        value.creatorOrg = creatorOrg;  
        value.creatorUserId = creatorUserId;  
        value.modules={};
        value.signatures = [];

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(value)));

        return JSON.stringify(value);
    }
/**
 * Adds new modules to an existing contract. Only the creator can add modules.
 * @param {Context} ctx - The transaction context
 * @param {string} contractId - Contract ID
 * @param {string} modules - JSON string or object with modules to add
 * @returns {Promise<string>} Status and added module names
 */

   async addModulesToContract(ctx, contractId, modules) {
    const contractAsBytes = await ctx.stub.getState(contractId);
    if (!contractAsBytes || contractAsBytes.length === 0) {
        throw new Error(`The contract with ID ${contractId} does not exist`);
    }

    const contract = JSON.parse(contractAsBytes.toString());

    // Ensure only the creator can add modules
    const callerOrg = ctx.clientIdentity.getMSPID();
    const callerUserId = ctx.clientIdentity.getID();
    if (contract.creatorOrg !== callerOrg || contract.creatorUserId !== callerUserId) {
        throw new Error(`Only the creator of contract ${contractId} can add modules`);
    }

    // Parse input modules JSON
    let newModules;
    try {
        newModules = typeof modules === 'string' ? JSON.parse(modules) : modules;
    } catch (error) {
        throw new Error(`Invalid modules JSON format: ${error.message}`);
    }

    if (!contract.modules) {
        contract.modules = {};
    }

    const addedBy = ctx.clientIdentity.getID();
    const org = ctx.clientIdentity.getMSPID();

    for (const [moduleName, moduleContent] of Object.entries(newModules)) {
        contract.modules[moduleName] = {
            V0: {
                moduleContent,
                addedBy,
                org
            }
        };
    }

    await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(contract)));

    return JSON.stringify({ status: 'success', contractId, addedModules: Object.keys(newModules) });
}


    /**
 * Edits an existing module by appending a new version. Only the creator org can edit.
 * Resets signatures and sets status to "DRAFT".
 * @param {Context} ctx - The transaction context
 * @param {string} contractId - Contract ID
 * @param {string} moduleName - Name of module to edit
 * @param {string} newContent - New content to add as next version
 * @returns {Promise<string>} Status and version info
 */

   async editModuleContent(ctx, contractId, moduleName, newContent) {
    const contractAsBytes = await ctx.stub.getState(contractId);
    if (!contractAsBytes || contractAsBytes.length === 0) {
        throw new Error(`The contract with ID ${contractId} does not exist`);
    }

    const contract = JSON.parse(contractAsBytes.toString());

    if (!contract.modules || !contract.modules[moduleName]) {
        throw new Error(`Module ${moduleName} does not exist in contract ${contractId}`);
    }

    const callerOrg = ctx.clientIdentity.getMSPID();
    if (contract.creatorOrg !== callerOrg) {
        throw new Error(`Only users from the creator organization (${contract.creatorOrg}) can edit this module`);
    }

    const editorID = ctx.clientIdentity.getID();
    const editorMSP = ctx.clientIdentity.getMSPID();
    const moduleVersions = contract.modules[moduleName];

    // Determine latest version number
    const versionNumbers = Object.keys(moduleVersions)
        .filter(k => /^V\d+$/.test(k))
        .map(v => parseInt(v.slice(1)))
        .sort((a, b) => b - a);

    const newVersion = versionNumbers.length > 0 ? versionNumbers[0] + 1 : 0;
    const newVersionKey = `V${newVersion}`;

    // Add new version
    moduleVersions[newVersionKey] = {
        moduleContent: newContent,
        addedBy: editorID,
        org: editorMSP
    };

    contract.modules[moduleName] = moduleVersions;

    // Reset signatures and contract status
    contract.signatures = [];
    contract.status = "DRAFT"; // Optional: reset status to signify modification

    await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(contract)));

    return JSON.stringify({
        status: 'success',
        contractId,
        module: moduleName,
        newVersion: newVersionKey,
        signaturesReset: true
    });
}

/**
 * Adds a comment to the latest version of a module.
 * @param {Context} ctx - The transaction context
 * @param {string} contractId - Contract ID
 * @param {string} moduleName - Name of the module
 * @param {string} comment - The comment text
 * @returns {Promise<string>} Status and affected version info
 */


async addCommentToModule(ctx, contractId, moduleName, comment) {
    const contractAsBytes = await ctx.stub.getState(contractId);
    if (!contractAsBytes || contractAsBytes.length === 0) {
        throw new Error(`The contract with ID ${contractId} does not exist`);
    }

    const contract = JSON.parse(contractAsBytes.toString());

    if (!contract || !contract.modules || !contract.modules[moduleName]) {
        throw new Error(`Module ${moduleName} does not exist in contract ${contractId}`);
    }

    const commenterID = ctx.clientIdentity.getAttributeValue('hf.EnrollmentID');
    const commenterMSP = ctx.clientIdentity.getMSPID();
    const author = {
        AddedBy: commenterID,
        Org: commenterMSP
    };

    const moduleVersions = contract.modules[moduleName];

    // Get latest version (e.g., highest V#)
    const versionKeys = Object.keys(moduleVersions)
        .filter(k => /^V\d+$/.test(k))
        .map(v => ({ key: v, num: parseInt(v.slice(1)) }))
        .sort((a, b) => b.num - a.num);

    if (versionKeys.length === 0) {
        throw new Error(`No versioned content found for module ${moduleName}`);
    }

    const latestVersionKey = versionKeys[0].key;
    const latestVersion = moduleVersions[latestVersionKey];

    if (!latestVersion.comments) {
        latestVersion.comments = [];
    }

    latestVersion.comments.push({
        comment,
        ...author
    });

    // Save back to the contract
    moduleVersions[latestVersionKey] = latestVersion;
    contract.modules[moduleName] = moduleVersions;

    await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(contract)));

    return JSON.stringify({
        status: 'success',
        contractId,
        module: moduleName,
        version: latestVersionKey
    });
}

/**
 * Returns all modules and their versions in the specified contract.
 * @param {Context} ctx - The transaction context
 * @param {string} contractId - Contract ID
 * @returns {Promise<string>} JSON string of modules
 */



    async getExistingModules(ctx, contractId) {
        const contractAsBytes = await ctx.stub.getState(contractId);
        if (!contractAsBytes || contractAsBytes.length === 0) {
            throw new Error(`The contract with ID ${contractId} does not exist`);
        }

        const contract = JSON.parse(contractAsBytes.toString());
        return JSON.stringify(contract.modules);
    }


    /**
 * Signs a contract based on whether the signer is an authorized org or specific user.
 * Prevents duplicate and conflicting signatures.
 * Marks contract as "SIGNED" if all required entities have signed.
 * @param {Context} ctx - The transaction context
 * @param {string} key - Contract ID
 * @returns {Promise<string>} The updated contract JSON
 */

async signContract(ctx, key) {
    const contractAsBytes = await ctx.stub.getState(key);
    if (!contractAsBytes || contractAsBytes.length === 0) {
        throw new Error(`The contract with key ${key} does not exist`);
    }

    const contract = JSON.parse(contractAsBytes.toString());
    const signerID = ctx.clientIdentity.getAttributeValue('hf.EnrollmentID');
    const signerMSP = ctx.clientIdentity.getMSPID();

    const required = contract.requiredSignersMSP;
    const previousSignatures = contract.signatures || [];
    // Filter Based on MSP tag
    const specificUsers = required.filter(entry => !entry.endsWith("MSP"));
    const requiredMSPs = required.filter(entry => entry.endsWith("MSP"));

    const isSpecificUser = specificUsers.includes(signerID);
    const isOrgRequired = requiredMSPs.includes(signerMSP);

    if (!isSpecificUser && !isOrgRequired) {
        throw new Error(`Signer ${signerID} from ${signerMSP} is not authorized to sign this contract`);
    }

    const hasAlreadySignedID = previousSignatures.some(sig => sig.id === signerID);
    if (hasAlreadySignedID) {
        throw new Error(`User ${signerID} has already signed this contract`);
    }

    const orgAlreadySignedByOthers = previousSignatures.some(sig =>
        sig.msp === signerMSP && sig.id !== signerID && !specificUsers.includes(sig.id)
    );

    const specificUserAlreadySigned = previousSignatures.some(sig => specificUsers.includes(sig.id));

    // Decision logic
    if (isSpecificUser) {
        // Specific user can sign even if someone else from their org already signed
        // BUT the other user cannot sign after Sepcific user already did
    } else if (isOrgRequired) {
        // Only allow someone from org to sign if:
        // - nobody from org has signed yet
        // - and the specific user from that org hasn't signed
        if (orgAlreadySignedByOthers || specificUserAlreadySigned) {
            throw new Error(`A user from ${signerMSP} has already signed (or the specific user has signed)`);
        }
    }

    // Add signature
    contract.signatures.push({ id: signerID, msp: signerMSP });

    // Check if signing is complete
    const signedEntities = new Set();
    for (const sig of contract.signatures) {
        if (specificUsers.includes(sig.id)) {
            signedEntities.add(sig.id);
            signedEntities.add(sig.msp); // Covers org too if specific user signed
        } else if (requiredMSPs.includes(sig.msp)) {
            signedEntities.add(sig.msp);
        }
    }

    if (required.every(req => signedEntities.has(req))) {
        contract.status = "SIGNED";
    }

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(contract)));
    return JSON.stringify(contract);
}



    

    async queryByID(ctx, ID){
       let queryString ={}
       queryString.selector={"_id":ID}
       let iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString))
       let result = await this.getIteratorData(iterator)
       return result
    }    

    async uniquePur(ctx, produce_id,supplier_id){
    let queryString ={}
    queryString.selector= {
        "_id": {
            "$regex": "PU_"
        },
        "supplier_id": supplierId,
        "produce_id": produceId
    }

    let iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString))
    let result = await this.getIteratorData(iterator)
    return result
    }  
    
    async getIteratorData(iterator){
        let outputArray = []

        while(true){
            let res=await iterator.next();
            let jsonValue = {}
            if(res.value && res.value.value.toString('utf-8')){
                let str=res.value.key
                str=str.slice(3,str.length)
                jsonValue.id = str;
                jsonValue.value = JSON.parse(res.value.value.toString('utf-8'));
                outputArray.push(jsonValue)
            }
            
            if(res.done){
                await iterator.close();
                return outputArray;
            }
        }
    }

}

module.exports = HYPER;