const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const express = require('express');
const router = express.Router();

// Predefined modules available for selection
 

router.post('/', async (req, res) => {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system-based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if the user identity exists in the wallet
        const identity = await wallet.get('appUserOrg2');
        if (!identity) {
            return res.status(400).json({ error: 'User identity not found. Run the registerUser.js application before retrying.' });
        }

        // Create a new gateway connection
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'appUserOrg2', discovery: { enabled: true, asLocalhost: true } });

        // Get the network and contract
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('hyper');

 const { contractId, modules } = req.body;

        // Validate input
        if (!contractId || !modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({ error: 'Contract ID and an array of modules are required.' });
        }

        // Convert modules array to JSON string
        const modulesJSON = JSON.stringify(modules);

        // Submit the transaction to add the modules to the contract
        await contract.submitTransaction('addModulesToContract', contractId, modulesJSON);
        console.log(`Modules added successfully to contract ${contractId}`);

        // Disconnect from the gateway
        await gateway.disconnect();

        res.json({
            message: 'Modules added successfully to the contract.',
            contractId: contractId,
            addedModules: modules
        });
    } catch (error) {
        console.error(`Failed to add modules to the contract: ${error}`);
        res.status(500).json({ error: 'Failed to add modules to the contract', details: error.message });
    }
});

module.exports = router;
