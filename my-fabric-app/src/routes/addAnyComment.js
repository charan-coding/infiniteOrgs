const path = require('path');
const fs = require('fs');
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');

const router = express.Router();

router.post('/', async (req, res) => {
    const { contractId, moduleName, comment, userIdentity } = req.body;

    if (!contractId || !moduleName || !comment || !userIdentity) {
        return res.status(400).json({ error: 'contractId, moduleName, comment, and userIdentity are required.' });
    }

    try {
        const mspId = userIdentity.mspId;
        const orgId = mspId.replace('MSP', '').toLowerCase();

        const ccpPath = path.resolve(
            __dirname,
            '..', '..', '..',
            'test-network', 'organizations',
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
        const contract = network.getContract('hyper'); // Replace 'hyper' with your actual chaincode name if different

        const cleanContractId = contractId.replace(/^"|"$/g, '');

        // Directly invoke new chaincode function
        const resultBuffer = await contract.submitTransaction('addCommentToModule',cleanContractId,moduleName,comment);

        const result = JSON.parse(resultBuffer.toString());
        console.log(`Comment successfully added to module "${moduleName}" in contract ${contractId}`);
        await gateway.disconnect();
        res.json({ result });

    } catch (error) {
        console.error(`Failed to add comment via chaincode: ${error}`);
        res.status(500).json({
            error: 'Failed to add comment to module via chaincode',
            details: error.message
        });
    }
});

module.exports = router;
