const express = require('express');

const app = express();
const port = 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const createEmptyContract_org1Router = require('./src/routes/createEmptyContract_org1');
app.use('/api/createEmptyContract_org1', createEmptyContract_org1Router);

const createEmptyContract_org2Router = require('./src/routes/createEmptyContract_org2');
app.use('/api/createEmptyContract_org2', createEmptyContract_org2Router);

const createEmptyContract_org3Router = require('./src/routes/createEmptyContract_org3');
app.use('/api/createEmptyContract_org3', createEmptyContract_org3Router);

const signContractOrg1Router = require('./src/routes/signContract_org1');
app.use('/api/signContractOrg1', signContractOrg1Router);

const signContractOrg2Router = require('./src/routes/signContract_org2');
app.use('/api/signContractOrg2', signContractOrg2Router);

const signContractOrg3Router = require('./src/routes/signContract_org3');
app.use('/api/signContractOrg3', signContractOrg3Router);


const getContract_org1Router = require('./src/routes/getContract_org1');
app.use('/api/getContract_org1', getContract_org1Router);

const getContract_org2Router = require('./src/routes/getContract_org2');
app.use('/api/getContract_org2', getContract_org2Router);

const getContract_org3Router = require('./src/routes/getContract_org3');
app.use('/api/getContract_org3', getContract_org3Router);


const createEmptyContract_org4Router = require('./src/routes/createEmptyContract_org4');
app.use('/api/createEmptyContract_org4', createEmptyContract_org4Router);

const signContractOrg4Router = require('./src/routes/signContract_org4');
app.use('/api/signContractOrg4', signContractOrg4Router);

const getContract_org4Router = require('./src/routes/getContract_org4');
app.use('/api/getContract_org4', getContract_org4Router);

const createEmptyContract_org5Router = require('./src/routes/createEmptyContract_org5');
app.use('/api/createEmptyContract_org5', createEmptyContract_org5Router);

const signContractOrg5Router = require('./src/routes/signContract_org5');
app.use('/api/signContractOrg5', signContractOrg5Router);

const getContract_org5Router = require('./src/routes/getContract_org5');
app.use('/api/getContract_org5', getContract_org5Router);

const addModule_org1Router = require('./src/routes/addModule_org1');
app.use('/api/addModule_org1', addModule_org1Router);

const addModule_org2Router = require('./src/routes/addModule_org2');
app.use('/api/addModule_org2', addModule_org2Router);

const addModule_org3Router = require('./src/routes/addModule_org3');
app.use('/api/addModule_org3', addModule_org3Router);

const addModule_org4Router = require('./src/routes/addModule_org4');
app.use('/api/addModule_org4', addModule_org4Router);

const addModule_org5Router = require('./src/routes/addModule_org5');
app.use('/api/addModule_org5', addModule_org5Router);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
