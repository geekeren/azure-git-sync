import * as azureDevOpsClient from 'azure-devops-node-api';
import git from 'nodegit';

export const getGitAPI = (orgUrl, token) => {
    const authHandler = azureDevOpsClient.getPersonalAccessTokenHandler(token);
    const gitConnection = new azureDevOpsClient.WebApi(orgUrl, authHandler);
    return gitConnection.getGitApi();
}


export const generateGitOption = (user, sourceToken) => {
    return ({
        callbacks: {
            certificateCheck: () => 1,
            credentials: (url, username) => {
                if (url.startsWith('https://')) {
                    return git.Cred.userpassPlaintextNew(user, sourceToken)
                } else {
                    return git.Cred.sshKeyFromAgent(username)
                }
            }
        },
    })
};