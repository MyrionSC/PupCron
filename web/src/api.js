const baseUrl = "http://localhost:3001";
const authKey = "AUTH_KEY"

function sendRequest(url, method, body) {
    const options = {
        method: method,
        headers: new Headers({'Authorization': authKey, "Content-Type": "application/json"})
    }
    if (body) options.body = JSON.stringify(body);
    return fetch(url, options);
}

function getRequest(url) {
    return sendRequest(url, "GET")
}
function postRequest(url, body = null) {
    return sendRequest(url, "POST", body)
}
function putRequest(url, body = null) {
    return sendRequest(url, "PUT", body)
}

export function fetchScriptsUploadedList() {
    return getRequest(`${baseUrl}/scripts_uploaded`)
        .then(res => res.json())
        .then(res => res.data.sort().reverse())
}

export function fetchSelectedScriptRunList(script) {
    return getRequest(`${baseUrl}/script_runs?script=${script}`)
        .then(res => res.json())
        .then(res => res.data.sort().reverse());
}

export function fetchSelectedRun(script, run) {
    return getRequest(`${baseUrl}/scripts/${script}/runs/${run}`)
        .then(res => res.json())
}

export function postExecuteRun(script) {
    return postRequest(`${baseUrl}/scripts/${script}/newrun`)
}

export async function putUpdateConfig(script, data) {
    console.log("Updating config: ", data)
    return putRequest(`${baseUrl}/scripts/${script}/config`, data)
}

export async function postUploadScript(data) {
    return postRequest(`${baseUrl}/uploadscript`, data)
}
