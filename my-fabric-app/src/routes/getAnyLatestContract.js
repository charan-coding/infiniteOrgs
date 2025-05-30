const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const { userIdentity, contractId } = req.body;

    if (!userIdentity || !contractId) {
        return res.status(400).json({ error: 'userIdentity and contractId are required.' });
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

        const str = JSON.stringify(contractId).slice(1, -1); // remove quotes
        const result = await contract.evaluateTransaction('queryByID', str);
        const parsedResult = JSON.parse(result.toString());

        if (!parsedResult || parsedResult.length === 0) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        const fullContract = parsedResult[0];

        // Transform modules to include only latest version
        if (fullContract.value && fullContract.value.modules) {
    for (const [moduleName, versions] of Object.entries(fullContract.value.modules)) {
        const versionKeys = Object.keys(versions).filter(v => /^V\d+$/.test(v));
        const latest = versionKeys
            .map(v => ({ key: v, num: parseInt(v.slice(1)) }))
            .sort((a, b) => b.num - a.num)[0];

        // Replace with only the latest version
        fullContract.value.modules[moduleName] = {
            ...versions[latest.key]  // flattening Vn
        };
    }
}

        await gateway.disconnect();
        return res.json({ result: fullContract });

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        res.status(500).json({
            error: 'Failed to evaluate transaction',
            details: error.message
        });
    }
});

module.exports = router;
