const path = require('path');
const fs = require('fs');
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');

const router = express.Router();

router.post('/', async (req, res) => {
    const { contractId, moduleName, newContent, userIdentity } = req.body;

    if (!contractId || !moduleName || !newContent || !userIdentity) {
        return res.status(400).json({
            error: 'contractId, moduleName, newContent, and userIdentity are required.'
        });
    }

    try {
        const mspId = userIdentity.mspId;
        const orgId = mspId.replace('MSP', '').toLowerCase();
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

        const wallet = await Wallets.newInMemoryWallet();
        const identityLabel = mspId + '_user';
        const cleanIdentity = {
            credentials: {
                certificate: userIdentity.credentials.certificate.replace(/\r\n/g, '\n'),
                privateKey: userIdentity.credentials.privateKey.replace(/\r\n/g, '\n'),
            },
            mspId: userIdentity.mspId,
            type: 'X.509'
        };
        await wallet.put(identityLabel, cleanIdentity);

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: identityLabel,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('hyper');

        const result = await contract.submitTransaction(
            'editModuleContent',
            contractId,
            moduleName,
            newContent
        );

        await gateway.disconnect();

        res.json({ result: JSON.parse(result.toString()) });

    } catch (error) {
        console.error(`Failed to edit module: ${error}`);
        res.status(500).json({
            error: 'Failed to edit module in the contract',
            details: error.message
        });
    }
});

module.exports = router;
