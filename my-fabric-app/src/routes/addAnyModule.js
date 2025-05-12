const path = require('path');
const fs = require('fs');
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');

const router = express.Router();

router.post('/', async (req, res) => {
    const { contractId, modules, userIdentity } = req.body;

    if (!contractId || !modules || !userIdentity) {
        return res.status(400).json({ error: 'contractId, modules, and userIdentity are required.' });
    }

    try {
        // Extract orgId from the mspId
        const mspId = userIdentity.mspId;
        const orgId = mspId.replace('MSP', '').toLowerCase(); 
        // Load connection profile
        const ccpPath = path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            `${orgId}.example.com`,
            `connection-${orgId}.json`
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create an in-memory wallet and import the identity
        const wallet = await Wallets.newInMemoryWallet();
        const identityLabel = mspId + '_user'; // or use req.body.username if passed
        const cleanIdentity = {
            credentials: {
                certificate: userIdentity.credentials.certificate.replace(/\r\n/g, '\n'),
                privateKey: userIdentity.credentials.privateKey.replace(/\r\n/g, '\n'),
            },
            mspId: userIdentity.mspId,
            type: 'X.509'
        };
        await wallet.put(identityLabel, cleanIdentity);

        // Connect to Fabric gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: identityLabel,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('hyper');

        const { contractId, modules } = req.body;

        // Validate input
        if (!contractId || !modules) {
            return res.status(400).json({ error: 'Contract ID and modules are required.' });
        }

        let str=JSON.stringify(contractId)
        str=str.slice(1,str.length-1)


        const result1 = await contract.evaluateTransaction('queryByID', str);
        out=JSON.parse(result1.toString())
        out=out[0]


        // out is a JSON that is the Json I want to check with 
        // modules is the input JSON that i get form the API
        //  newModules is the filtered version

        let newModules = out.value.modules;
        for (let key in modules) {
            if (!out.value.modules || !(key in out.value.modules)) {
                newModules[key] = modules[key];
            }
        }
        
        // Convert the filtered modules object to JSON.
        let modulesJSON = JSON.stringify(newModules);
        console.log(modulesJSON)
    

        const result = await contract.submitTransaction('addModulesToContract', contractId, modulesJSON);

        console.log(`Modules added successfully to contract ${contractId}`);

        // Disconnect from the gateway
        await gateway.disconnect();
        out1=JSON.parse(result.toString())


        if(!out1){
        res.json({ error: 'Contract doesnt exist' });
        }
        else{
        res.json({ result:out1});
    }
        

    } catch (error) {
        console.error(`Failed to add modules: ${error}`);
        res.status(500).json({ error: 'Failed to add modules to the contract', details: error.message });
    }
});

module.exports = router;
