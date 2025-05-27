const path = require('path');
const fs = require('fs');
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');

const router = express.Router();

router.post('/', async (req, res) => {
    const { value, userIdentity } = req.body;

    if (!value.requiredSignersMSP || !userIdentity) {
        return res.status(400).json({ error: 'required Signers, and userIdentity are required.' });
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

        const { v4: uuidv4 } = require('uuid');
        const Contract_id = uuidv4();
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19) + 'Z';

        value.created_at = formattedDate;
        if (!value) {
            return res.status(400).json({ error: 'Value is required in the request body' });
        }
        await contract.submitTransaction('createEmptyContract', Contract_id, JSON.stringify(value));
        console.log('Transaction has been submitted');

        // Disconnect from the gateway.
        await gateway.disconnect();

        res.json({ "Status": 'Transaction submitted successfully',
        "Contract_id": Contract_id
    });
        

    } catch (error) {
        console.error(`Failed to add modules: ${error}`);
        res.status(500).json({ error: 'Failed to add modules to the contract', details: error.message });
    }
});

module.exports = router;
