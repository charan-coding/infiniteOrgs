const express = require('express');
const router = express.Router();
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

router.post('/', async (req, res) => {
    const { adminIdentity, adminLabel, username, orgId } = req.body;

    if (!adminIdentity || !adminLabel || !username || !orgId) {
        return res.status(400).json({
            error: 'Missing required fields: adminIdentity, adminLabel, username, or orgId'
        });
    }

    try {
        // Load connection profile for the org
        const ccpPath = path.resolve(
            __dirname,
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            `${orgId}.example.com`,
            `connection-${orgId}.json`
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const caInfo = ccp.certificateAuthorities[`ca.${orgId}.example.com`];
        const ca = new FabricCAServices(caInfo.url);

        // Prepare file system wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Skip if user already exists
        const existingUser = await wallet.get(username);
        if (existingUser) {
            return res.status(200).json({
                message: `User "${username}" already exists in the wallet`,
                identity: existingUser
            });
        }

        // Create in-memory wallet and load admin identity only into memory
        const tempWallet = await Wallets.newInMemoryWallet();
        const cleanAdmin = {
            credentials: {
                certificate: adminIdentity.credentials.certificate.replace(/\r\n/g, '\n'),
                privateKey: adminIdentity.credentials.privateKey.replace(/\r\n/g, '\n'),
            },
            mspId: adminIdentity.mspId,
            type: 'X.509'
        };
        await tempWallet.put(adminLabel, cleanAdmin);

        const provider = tempWallet.getProviderRegistry().getProvider(cleanAdmin.type);
        const adminUser = await provider.getUserContext(cleanAdmin, adminLabel);

        // Register and enroll the new user
        const secret = await ca.register({
            affiliation: `${orgId}.department1`,
            enrollmentID: username,
            role: 'client'
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: username,
            enrollmentSecret: secret
        });

        const mspId = `${orgId.charAt(0).toUpperCase() + orgId.slice(1)}MSP`;

        const userIdentity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId,
            type: 'X.509'
        };

        // Save only the user identity to the file system wallet
        await wallet.put(username, userIdentity);

        return res.status(201).json({
            message: `Successfully registered and enrolled user "${username}"`,
            identity: userIdentity
        });

    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;