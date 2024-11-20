const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load the network configuration for Org2
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA of Org2.
        const caURL = ccp.certificateAuthorities['ca.org2.example.com'].url;

        const ca = new FabricCAServices(caURL);

        // Create a new file system-based wallet for managing identities of Org2.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user for Org2.
        const userIdentity = await wallet.get('appUserOrg2');
        if (userIdentity) {
            console.log('An identity for the user "appUserOrg2" already exists in the wallet');
            return;
        }

        // Check to see if we've already enrolled the admin user for Org2.
        const adminIdentity = await wallet.get('adminOrg2');
        if (!adminIdentity) {
            console.log('An identity for the admin user "adminOrg2" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application for Org2 before retrying');
            return;
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'adminOrg2');

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({
            affiliation: 'org2.department1',
            enrollmentID: 'appUserOrg2',
            role: 'client'
        }, adminUser);
        const enrollment = await ca.enroll({
            enrollmentID: 'appUserOrg2',
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org2MSP',  // Specify Org2's MSP ID
            type: 'X.509',
        };
        await wallet.put('appUserOrg2', x509Identity);
        console.log('Successfully registered and enrolled user "appUserOrg2" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to register user "appUserOrg2": ${error}`);
        process.exit(1);
    }
}

main();
