"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const logger_1 = require("../src/utils/logger");
// Configure the test
const TEST_CONFIG = {
    musicDirectory: path_1.default.join(__dirname, 'music'), // Points to tests/music directory
    sampleSize: 5,
    logLevel: logger_1.LogLevel.DEBUG,
    batchProcessing: true,
    batchSize: 2,
    batchDelay: 1000,
};
// ...rest of integration test implementation...
//# sourceMappingURL=integration.js.map