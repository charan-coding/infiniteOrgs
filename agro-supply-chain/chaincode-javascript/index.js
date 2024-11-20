/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const asctp = require('./lib/asctp');

module.exports.ASCTP = asctp;
module.exports.contracts = [asctp];
