"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const actions_toolkit_1 = require("actions-toolkit");
const query_1 = require("./query");
const util_1 = require("./util");
const util = __importStar(require("util"));
const ignore_1 = __importDefault(require("ignore"));
const exec = util.promisify(require('child_process').exec);
const configFile = '.github/auto-label.json';
const tools = new actions_toolkit_1.Toolkit({
    event: ['pull_request.opened', 'pull_request.synchronize'],
});
(() => __awaiter(this, void 0, void 0, function* () {
    if (!fs.existsSync(path.join(tools.workspace, configFile))) {
        tools.exit.neutral('config file does not exist.');
    }
    const config = JSON.parse(tools.getFile(configFile));
    let result;
    try {
        result = yield query_1.getPullRequestAndLabels(tools, tools.context.issue());
    }
    catch (error) {
        console.error('Request failed: ', error.request, error.message);
        tools.exit.failure('getPullRequestAndLabels has been failed.');
    }
    console.log('Result: ', result);
    const allLabels = result.repository.labels.edges.reduce((acc, edge) => {
        acc[edge.node.name] = edge.node.id;
        return acc;
    }, {});
    const currentLabelNames = new Set(result.repository.pullRequest.labels.edges.map((edge) => edge.node.name));
    const { headRefOid, baseRefOid } = result.repository.pullRequest;
    // TODO: handle stderr
    const { stdout, stderr } = yield exec(`git merge-base --is-ancestor ${baseRefOid} ${headRefOid} && git diff --name-only ${baseRefOid} || git diff --name-only $(git merge-base ${baseRefOid} ${headRefOid})`);
    const diffFiles = stdout.trim().split('\n');
    const newLabelNames = new Set(diffFiles.reduce((acc, file) => {
        Object.entries(config.rules).forEach(([label, pattern]) => {
            if (ignore_1.default()
                .add(pattern)
                .ignores(file)) {
                acc.push(label);
            }
        });
        return acc;
    }, []));
    const ruledLabelNames = new Set(Object.keys(config.rules));
    const labelNamesToAdd = new Set([...newLabelNames].filter(labelName => !currentLabelNames.has(labelName)));
    const labelNamesToRemove = new Set([...currentLabelNames].filter((labelName) => !newLabelNames.has(labelName) && ruledLabelNames.has(labelName)));
    console.log(' ---> Current status');
    console.log('allLabels: ', allLabels);
    console.log('currentLabelNames: ', currentLabelNames);
    console.log('diffFiles: ', diffFiles);
    console.log('newLabelNames: ', newLabelNames);
    console.log('ruledLabelNames: ', ruledLabelNames);
    console.log('labelNamesToAdd: ', labelNamesToAdd);
    console.log('labelNamesToRemove: ', labelNamesToRemove);
    const labelableId = result.repository.pullRequest.id;
    if (labelNamesToAdd.size > 0) {
        try {
            yield query_1.addLabelsToLabelable(tools, {
                labelIds: util_1.getLabelIds(allLabels, [...labelNamesToAdd]),
                labelableId,
            });
            console.log('Added labels: ', labelNamesToAdd);
        }
        catch (error) {
            console.error('Request failed: ', error.request, error.message);
            tools.exit.failure('addLabelsToLabelable has been failed. ');
        }
    }
    if (labelNamesToRemove.size > 0) {
        try {
            yield query_1.removeLabelsFromLabelable(tools, {
                labelIds: util_1.getLabelIds(allLabels, [...labelNamesToRemove]),
                labelableId,
            });
            console.log('Removed labels: ', labelNamesToRemove);
        }
        catch (error) {
            console.error('Request failed: ', error.request, error.message);
            tools.exit.failure('removeLabelsFromLabelable has been failed. ');
        }
    }
}))();
