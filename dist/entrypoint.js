"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ignore_1 = __importDefault(require("ignore"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.info(`✏️ Auto labelling PR`);
            const token = process.env.GITHUB_TOKEN;
            const octokit = new github.GitHub(token);
            // Load config
            const configPath = path_1.default.resolve(__dirname, '../../../auto-label.json');
            const configContents = fs_1.default.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContents);
            core.info(`Found config: ${JSON.stringify(config, null, 2)}`);
            // Get manual labels
            const labelsRes = yield octokit.issues.listLabelsOnIssue(Object.assign(Object.assign({}, github.context.repo), { issue_number: github.context.payload.pull_request.number }));
            const allLabels = labelsRes.data.map(({ name }) => name);
            const autoLabels = Object.keys(config.rules);
            const manualLabels = allLabels.filter(label => !autoLabels.includes(label));
            core.info(`Manually set labels: [${manualLabels.join(',')}]`);
            // Get files changed on PR
            const filesRes = yield octokit.pulls.listFiles(Object.assign(Object.assign({}, github.context.repo), { pull_number: github.context.payload.pull_request.number }));
            const filenames = filesRes.data.map(file => file.filename);
            core.info(`Files changed: [${filenames.join(',')}]`);
            // Determine labels for PR
            const rules = Object.entries(config.rules);
            const appliedRules = rules.filter(([, pattern]) => {
                const rule = ignore_1.default().add(pattern);
                return filenames.some(fn => rule.ignores(fn));
            });
            const newAutoLabels = appliedRules.map(([label]) => label);
            const newLabels = [...manualLabels, ...newAutoLabels];
            core.info(`New labels: [${newLabels.join(',')}]`);
            // Replace labels on PR
            yield octokit.issues.replaceLabels(Object.assign(Object.assign({}, github.context.repo), { issue_number: github.context.payload.pull_request.number, labels: newLabels }));
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
