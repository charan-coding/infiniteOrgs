const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load the network configuration for Org4
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org5.example.com', 'connection-org5.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA of Org5.
        const caURL = ccp.certificateAuthorities['ca.org5.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system-based wallet for managing identities of Org5.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if we've already enrolled the admin user for Org5.
        const identity = await wallet.get('adminOrg5');
        if (identity) {
            console.log('An identity for the admin user "adminOrg5" already exists in the wallet');
            return;
        }

        // Enroll the admin user for Org5, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org5MSP',  // Specify Org5's MSP ID
            type: 'X.509',
        };
        await wallet.put('adminOrg5', x509Identity);
        console.log('Successfully enrolled admin user "adminOrg5" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to enroll admin user "adminOrg5": ${error}`);
        process.exit(1);
    }
}

main();
