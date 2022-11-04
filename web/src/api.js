export function fetchScriptsUploadedList() {
    return fetch("http://localhost:3001/scripts_uploaded")
        .then(res => res.json())
        .then(res => res.data.sort().reverse())
}
