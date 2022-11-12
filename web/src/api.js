const baseUrl = "http://localhost:3001";

export function fetchScriptsUploadedList() {
    return fetch(`${baseUrl}/scripts_uploaded`)
        .then(res => res.json())
        .then(res => res.data.sort().reverse())
}

export function fetchSelectedScriptRunList(script) {
    return fetch(`${baseUrl}/script_runs?script=${script}`)
        .then(res => res.json())
        .then(res => res.data.sort().reverse());
}

export function fetchSelectedRun(script, run) {
    return fetch(`${baseUrl}/scripts/${script}/runs/${run}`)
        .then(res => res.json())
}

export function postExecuteRun(script) {
    return fetch(`${baseUrl}/scripts/${script}/newrun`, {method: "POST"})
}

export async function putUpdateConfig(script, data) {
    console.log("Updating config: ", data)
    return fetch(`${baseUrl}/scripts/${script}/config`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: [["Content-Type", "application/json"]]
    })
}

export async function postUploadScript(data) {
    return fetch(`${baseUrl}/uploadscript`, {method: "POST", body: data})
}
