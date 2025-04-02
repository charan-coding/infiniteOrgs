        // out is a JSON that is the Json I want to check with 
        // modules is the input JSON that i get form the API
        //  newModules is the filtered version
        let out={
            id: '5b1a7-dc8f-4c48-8243-6b0397b8e010',
            value: {
              created_at: '2025-04-01T13:34:47Z',
              creatorOrg: 'Org1MSP',
              creatorUserId: 'x509::/OU=org1/OU=client/OU=department1/CN=appUser::/C=US/ST=North Carolina/L=Durham/O=org1.example.com/CN=ca.org1.example.com',
              modules: {
                "Confidential Information": {
                    "date": "2025-02-17",
                    "variable": {
                        "ConfidentialityLevel": "High",
                        "AccessType": "Restricted"
                    }
                },
                "Financial": {}
            },
              requiredSignersMSP: [ 'Org1MSP', 'Org3MSP', 'Org5MSP' ],
              signatures: [],
              status: 'EMPTY',
              type: 'Medical'
            }
          }

        let modules={
            "Confidential Information": "F you",
            "Financial": {}
        }

        let newModules = {};
        for (let key in modules) {
            console.log(key)
            if (!out.value.modules || !(key in out.value.modules)) {
                newModules[key] = modules[key];
            }
        }
        console.log(newModules)