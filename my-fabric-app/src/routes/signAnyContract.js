const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const { userIdentity } = req.body;
    
        if (!userIdentity) {
            return res.status(400).json({ error: 'userIdentity are required.' });
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
    
        
        const contractId = req.body.contractId;  // Get the contract ID from request

        if (!contractId) {
            return res.status(400).json({ error: 'contractId is required in the request body' });
        }

        await contract.submitTransaction('signContract', contractId);

        console.log('Contract has been signed by the organization');
        
    
        // Disconnect from the gateway.
        await gateway.disconnect();

        res.json({ "Status": 'Contract has been signed by the organization'});
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: 'Failed to submit transaction' });
    }
});

module.exports = router;
