import sync from './azure-git-sync';
import dotenv from 'dotenv'
import readline from 'readline';
import AzureDevOpsProfile from "./azure-devops-profile";
dotenv.config()
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const VAR = {
    SRC_ORG_NAME: "",
    SRC_USER_NAME: "",
    SRC_TOKEN: "",
    DEST_ORG_NAME: "",
    DEST_USER_NAME: "",
    DEST_TOKEN: "",
    DEST_PROJECT_NAME: ""
}
const getVaule = (key) => {
    const value = process.env[key];
    if (!value) {
        return new Promise((resolve) => {
            return rl.question(`Please input ${key}: `, (answer) => {
                resolve(answer);
            })
        });
    }
    return Promise.resolve(value);
}


Object.keys(VAR).reduce((result, key) => (
    result.then(
        () => getVaule(key).then(
            (value) => {
                VAR[key] = value
                return Promise.resolve();
            }
        )
    )
), Promise.resolve())
    .then(() => {
        const src = new AzureDevOpsProfile(VAR.SRC_ORG_NAME, VAR.SRC_USER_NAME, VAR.SRC_TOKEN);
        const dest = new AzureDevOpsProfile(VAR.DEST_ORG_NAME, VAR.DEST_USER_NAME, VAR.DEST_TOKEN);
        sync(src, dest, VAR.DEST_PROJECT_NAME)
    })
    .catch((err) => console.error(err))
    .finally(() => rl.close())



