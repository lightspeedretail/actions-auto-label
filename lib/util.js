"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
exports.getLabelIds = (allLabels, labelNames) => JSON.stringify(Object.values(lodash_1.pick(allLabels, labelNames)));
