const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load the network configuration for Org4
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org4.example.com', 'connection-org4.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA of Org4.
        const caURL = ccp.certificateAuthorities['ca.org4.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system-based wallet for managing identities of Org4.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user for Org4.
        const userIdentity = await wallet.get('appUserOrg4');
        if (userIdentity) {
            console.log('An identity for the user "appUserOrg4" already exists in the wallet');
            return;
        }

        // Check to see if we've already enrolled the admin user for Org4.
        const adminIdentity = await wallet.get('adminOrg4');
        if (!adminIdentity) {
            console.log('An identity for the admin user "adminOrg4" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application for Org4 before retrying');
            return;
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'adminOrg4');

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({
            affiliation: 'org4.department1',
            enrollmentID: 'appUserOrg4',
            role: 'client'
        }, adminUser);
        const enrollment = await ca.enroll({
            enrollmentID: 'appUserOrg4',
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org4MSP',  // Specify Org4's MSP ID
            type: 'X.509',
        };
        await wallet.put('appUserOrg4', x509Identity);
        console.log('Successfully registered and enrolled user "appUserOrg4" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to register user "appUserOrg4": ${error}`);
        process.exit(1);
    }
}

main();
