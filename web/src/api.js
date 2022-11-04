export function fetchScriptsUploadedList() {
    return fetch("http://localhost:3001/scripts_uploaded")
        .then(res => res.json())
        .then(res => res.data.sort().reverse())
}

export function fetchConfigForScript(script) {
    return fetch(`http://localhost:3001/scripts/${script}/config`)
        .then(res => res.json())
}

export function fetchSelectedScriptRunList(script) {
    return fetch(`http://localhost:3001/script_runs?script=${script}`)
        .then(res => res.json())
        .then(res => res.data.sort().reverse());
}

export function fetchSelectedRun(script, run) {
    return fetch(`http://localhost:3001/scripts/${script}/runs/${run}`)
        .then(res => res.json())
}

export function postExecuteRun(script) {
    return fetch(`http://localhost:3001/scripts/${script}/newrun`, {method: "POST"})
}

export async function putUpdateConfig(script, data) {
    return fetch(`http://localhost:3001/scripts/${script}/config`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: [["Content-Type", "application/json"]]
    })
}

export async function postUploadScript(data) {
    return fetch(`http://localhost:3001/uploadscript`, {method: "POST", body: data})
}
