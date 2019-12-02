import * as azureDevOpsClient from 'azure-devops-node-api';
import git from 'nodegit';
import fs from "fs";

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



async function sync(src, dest, destProjectName) {
    const sourceToken = src.token
    const destToken = dest.token
    const srcOrgUrl = `https://dev.azure.com/${src.orgName}`
    const destOrgUrl = `https://dev.azure.com/${dest.orgName}`
    const srcFetchOpts = generateGitOption("bywang", sourceToken);
    const destFetchOpts = generateGitOption("baiyuan.wang", destToken);
    const srcGitAPI = await getGitAPI(srcOrgUrl, sourceToken);
    const destGitAPI = await getGitAPI(destOrgUrl, destToken);
    const allReposInDestProject = await destGitAPI.getRepositories(destProjectName);

    const isRepoExistedInDestProject = (repoName) => (
        allReposInDestProject.findIndex(desRepo => desRepo.name === repoName) < 0
    );

    const createRepoInProject = (repoName, projectName) => {
        return destGitAPI.createRepository({
            name: repoName
        }, projectName).then((repo) => {
            console.log(`Repo<${repoName}>: created`)
            allReposInDestProject.push(repo)
            return Promise.resolve(repo)
        }).catch(err => {
            return Promise.reject(new Error(`Repo<${repoName}>: created failed${err.message}`))
        });
    };

    const ensureRepoCreatedInDestProject = (repoName) => {
        if (isRepoExistedInDestProject(repoName)) {
            console.log(`Repo<${repoName}>: not found in dest project, creating`);
            return createRepoInProject(repoName, destProjectName);
        } else {
            console.log(`Repo<${repoName}>: founded in dest project, skip creatig`);
            return Promise.resolve(
                allReposInDestProject.findIndex(desRepo => desRepo.name === repoName)
            );
        }
    };

    const ensureRepoClonedToLocal = (srcRepo, localPath) => {
        return new Promise((resolve) => {
            fs.exists(localPath, (isExisted) => {
                if (!isExisted) {
                    resolve(git.Clone(srcRepo.remoteUrl, localPath, { fetchOpts: srcFetchOpts }))
                } else {
                    resolve(git.Repository.open(localPath))
                }
            })
        })
    };

    const updateLocalRepostoryFromRemote = (srcRemote, localRepo, repoName) => {
        return localRepo.fetch(srcRemote, srcFetchOpts).then(() => {
            localRepo.getRemote(srcRemote).then(remote => {
                const refspec = remote.getRefspec(0)
                console.log(`Repo<${repoName}>: fetching latest update`)
            }
            )
            return Promise.resolve(localRepo);
        }).catch(err => console.error(`Repo<${repoName}>: fetching error!`, err))
    }

    const addNewRemote = (newRemote, localRepo, repoName) => {
        const destRepoRemoteUrl = allReposInDestProject.find(repo => repo.name === repoName).remoteUrl;
        return new Promise((resolve, reject) => {
            localRepo.getRemote(newRemote).then((remote) => {
                resolve(remote)
            }).catch(err => {
                git.Remote.create(localRepo, newRemote, destRepoRemoteUrl).then(function (remote) {
                    resolve(remote)
                }).catch(err => console.error("create error!", err));
            })
        });
    }
    const pushToNewRemote = (remote, repoName) => {
        remote.push(["refs/heads/master:refs/heads/master"], destFetchOpts, (d) => console.log({ d }))
            .then(() => {
                console.log(`Repo<${repoName}>: Pushed to new dest Git project Successfully!`)
                remote.get
            })
    }

    const allSourceOrgRepos = await srcGitAPI.getRepositories();
    allSourceOrgRepos.forEach(srcRepo => {
        const localRepoPath = `./repos/${srcRepo.name}`
        ensureRepoCreatedInDestProject(srcRepo.name)
            .then(() => (ensureRepoClonedToLocal(srcRepo, localRepoPath)))
            .then(repo => (updateLocalRepostoryFromRemote("origin", repo, srcRepo.name)))
            .then(localRepo => (addNewRemote("new", localRepo, srcRepo.name)))
            .then(newRemote => (pushToNewRemote(newRemote, srcRepo.name)))
            .catch(err => console.error({ err }))
    });
}

export default sync;