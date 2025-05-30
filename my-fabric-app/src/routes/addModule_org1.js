const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const express = require('express');
const router = express.Router();

// Predefined modules available for selection
 

router.post('/', async (req, res) => {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system-based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if the user identity exists in the wallet
        const identity = await wallet.get('appUser');
        if (!identity) {
            return res.status(400).json({ error: 'User identity not found. Run the registerUser.js application before retrying.' });
        }

        // Create a new gateway connection
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

        // Get the network and contract
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

        console.log(modules);
        if (!out.value.modules){
            out.value.modules={}
        }
        console.log(out)
        let newModules = out.value.modules;
        for (let key in modules) {
            console.log(!(key in out.value.modules))
            if (!(key in out.value.modules)) {
                newModules[key] = modules[key];
            }
        }
        console.log(newModules)
        // Convert the filtered modules object to JSON.
        let modulesJSON = JSON.stringify(newModules);
        
    

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
        console.error(`Failed to add modules to the contract: ${error}`);
        res.status(500).json({ error: 'Failed to add modules to the contract', details: error.message });
    }
});

module.exports = router;
