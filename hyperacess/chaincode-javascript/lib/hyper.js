/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
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
        value.modules=[];
        value.signatures = [];

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(value)));

        return JSON.stringify(value);
    }

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

        // Parse modules JSON
        let newModules;
        try {
            newModules = JSON.parse(modules);
        } catch (error) {
            throw new Error(`Invalid modules JSON format: ${error.message}`);
        }

        if (!contract.modules) {
            contract.modules = {};
        }

        contract.modules=newModules;


        await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(contract)));

        return JSON.stringify(contract);
    }

    
   
    async addCommentsToModule(ctx, contractId, title, comment) {
        const contractAsBytes = await ctx.stub.getState(contractId);
        if (!contractAsBytes || contractAsBytes.length === 0) {
            throw new Error(`The contract with ID ${contractId} does not exist`);
        }

        const contract = JSON.parse(contractAsBytes.toString());


        const callerOrg = ctx.clientIdentity.getMSPID();
        const callerUserId = ctx.clientIdentity.getID();

        const existingModuleTitles = contract.modules.map(module => module.title);
        if (!existingModuleTitles.includes(title)) {
            throw new Error(`Module "${title}" does not exist in contract ${contractId}`);
        }
        


        contract.modules.push(newModule);

        // Update contract state
        await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(contract)));

        return JSON.stringify(contract);
    }


    async getExistingModules(ctx, contractId) {
        const contractAsBytes = await ctx.stub.getState(contractId);
        if (!contractAsBytes || contractAsBytes.length === 0) {
            throw new Error(`The contract with ID ${contractId} does not exist`);
        }

        const contract = JSON.parse(contractAsBytes.toString());
        return JSON.stringify(contract.modules);
    }

    async signContract(ctx, key) {
        const contractAsBytes = await ctx.stub.getState(key);
        if (!contractAsBytes || contractAsBytes.length === 0) {
            throw new Error(`The contract with key ${key} does not exist`);
        }

        const contract = JSON.parse(contractAsBytes.toString());
        const signerID = ctx.clientIdentity.getAttributeValue('hf.EnrollmentID');

        const signerMSP = ctx.clientIdentity.getMSPID();

        if (!(contract.requiredSignersMSP.includes(signerID) ||
        contract.requiredSignersMSP.includes(signerMSP))) 
        {
            throw new Error(`Signer ${signerID} from ${signerMSP} is not authorized to sign this contract`);
        }

        const hasAlreadySigned = contract.signatures.some(sig =>
            sig.id === signerID || sig.msp === signerMSP
        );
    
        if (hasAlreadySigned) {
            throw new Error(`A user from ${signerMSP} or ${signerID} has already signed this contract`);
        }
    
        // Add new signature
        contract.signatures.push({ id: signerID, msp: signerMSP });
    
        if (contract.signatures.length === contract.requiredSignersMSP.length) {
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