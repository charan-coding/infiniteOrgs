const path = require('path');
const express = require('express');
const { execFile } = require('child_process');

const router = express.Router();


router.post('/', async (req, res) => {
  const { orgNumber, peerPort, caPort, couchDbPort } = req.body;


  if (!orgNumber || !peerPort || !caPort || !couchDbPort) {
    return res.status(400).json({ error: 'Missing required parameters: orgNumber, peerPort, caPort, couchDbPort' });
  }

  const scriptPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'addOrg.sh');
  const workingDir = path.resolve(__dirname, '..', '..', '..', 'test-network'); // Ensures correct cwd for relative paths in script

  execFile(
    scriptPath,
    [orgNumber, peerPort, caPort, couchDbPort],
    { cwd: workingDir }, 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Script execution failed:\n${stderr}`);
        return res.status(500).json({
          error: 'Script execution failed',
          details: stderr,
        });
      }

      console.log(`Script executed successfully:\n${stdout}`);
      res.status(200).json({
        message: `Organization Org${orgNumber} added successfully.`,
        output: stdout,
      });
    }
  );
});

module.exports = router;
