export default class AzureDevOpsProfile {
    constructor(orgName, userName, token) {
        this.orgName = orgName;
        this.userName = userName;
        this.token = token;
    }
}