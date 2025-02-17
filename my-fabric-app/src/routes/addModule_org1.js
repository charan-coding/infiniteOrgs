const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const express = require('express');
const router = express.Router();

// Predefined modules available for selection
const availableModules = [
    "Confidential Information",
    "Publications",
    "Negative Publication Right",
    "Debarment",
    "Financial Disclosure",
    "Notification of Competent Authorities"
];

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

        // Extract dynamic data from the request body
        const { contractId, modules } = req.body;

        // Validate input
        if (!contractId) {
            return res.status(400).json({ error: 'Contract ID is required.' });
        }

        if (!modules || !Array.isArray(modules)) {
            return res.status(400).json({ error: 'Modules should be an array of selected modules.' });
        }

        // Check if the selected modules are valid
        const invalidModules = modules.filter(module => !availableModules.includes(module));
        if (invalidModules.length > 0) {
            return res.status(400).json({ error: `Invalid modules selected: ${invalidModules.join(', ')}` });
        }

        // Prepare module data
        const currentDate = new Date().toISOString().slice(0, 19) + 'Z';
        const modulesToAdd = modules.map(module => ({
            module,
            created_at: currentDate
        }));

        // Submit the transaction to add modules to the contract
        await contract.submitTransaction('addModulesToContract', contractId, JSON.stringify(modulesToAdd));
        console.log(`Modules added successfully to contract ${contractId}: ${modules.join(', ')}`);

        // Disconnect from the gateway
        await gateway.disconnect();

        res.json({
            message: 'Modules added successfully to the contract.',
            addedModules: modules,
            contractId: contractId
        });
    } catch (error) {
        console.error(`Failed to add modules to the contract: ${error}`);
        res.status(500).json({ error: 'Failed to add modules to the contract', details: error.message });
    }
});

module.exports = router;
