const path = require('path');
const express = require('express');
const { execFile } = require('child_process');

const router = express.Router();

router.post('/', async (req, res) => {
  const { orgNumber } = req.body;

  if (!orgNumber) {
    return res.status(400).json({ error: 'Missing required parameter: orgNumber' });
  }

  const scriptPath = path.resolve(
    '/home/charan/Desktop/Fourth_Replicate/infinite_org/my-fabric-app/orgSetup.sh'
  );
  const workingDir = path.dirname(scriptPath);

  execFile(
    scriptPath,
    [orgNumber.toString()],
    { cwd: workingDir },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`orgSetup.sh failed:\n${stderr}`);
        return res.status(500).json({
          error: 'orgSetup.sh execution failed',
          details: stderr,
        });
      }

      console.log(`orgSetup.sh executed successfully:\n${stdout}`);
      res.status(200).json({
        message: `orgSetup.sh executed successfully for Org${orgNumber}.`,
        output: stdout,
      });
    }
  );
});

module.exports = router;
