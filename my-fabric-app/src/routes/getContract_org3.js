const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => { 
  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..','..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org3.example.com', 'connection-org3.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system-based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUserOrg3');
    if (!identity) {
      console.log('An identity for the user "appUserOrg3" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return res.status(400).json({ error: 'User identity not found' });
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUserOrg3', discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('asctp');

    // Evaluate the specified transaction with the provided farmbag_id.
    const contract_id = req.body.contract_id;
    if (!contract_id) {
      return res.status(400).json({ error: 'Missing contract ID parameter' });
    }

    
    let str=JSON.stringify(contract_id)
    str=str.slice(1,str.length-1)
    console.log(str)
    
    const result = await contract.evaluateTransaction('queryByID', str);
        console.log(result[0])
    // Disconnect from the gateway.
    await gateway.disconnect();
    out=JSON.parse(result.toString())

   
    out1=out[0]
    if(!out1){
      res.json({ error: 'Contract doesnt exist' });
    }
    else{
    res.json({ result:out1});
  }

  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    res.status(500).json({ error: 'Failed to evaluate transaction' });
  }
});

module.exports = router;