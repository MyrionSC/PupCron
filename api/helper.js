const childProcess = require('child_process')
const fs = require('fs');
const {StringDecoder} = require('string_decoder');

function runScript(cwd, script, callback) {
    // keep track of whether callback has been invoked to prevent multiple invocations
    let invoked = false;
    const process = childProcess.fork(script, {cwd: cwd, silent: true});
    const stream = fs.createWriteStream(cwd + "/logs.txt", {flags: 'a', encoding: 'utf8'});
    const decoder = new StringDecoder('utf8');
    const runStart = new Date().toISOString();
    stream.write(`=== Run started at: ${runStart}\n\n`)

    process.stdout.on('data', (data) => {
        stream.write(data)
        console.log(decoder.write(data))
    });

    process.stderr.on('data', (data) => {
        const str = decoder.write(data)
        if (!(str.includes("Debugger listening on") || str.includes("For help, see") ||
            str.includes("Waiting for the debugger to disconnect") || str.includes("Debugger attached"))) {
            stream.write(data)
            console.log(str)
        }
    });

    function finishRun(code) {
        const runEnd = new Date().toISOString();
        stream.write(`\n=== Run finished at: ${runEnd}\n`)
        stream.write(`Result: ${code === 0 ? 'Success' : 'Failure'}\n`)
        const resultStream = fs.createWriteStream(cwd + "/results.json", {flags: 'a', encoding: 'utf8'});
        resultStream.write(JSON.stringify({success: code === 0, start: runStart, end: runEnd}))
        resultStream.close()
        stream.close()
        callback(code);
    }

// listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        console.error("helper.js:runScript error", err)
        finishRun(1);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        finishRun(code);
    });
}

function toDirCompat(name) {
    return name
        .replace(".js", "")
        .replace(".", "_")
}

function resWithStatusMessage(res, status, msg = null, data = null) {
    res.status(status)
    let resObj = {success: status.toString().startsWith("2"), message: msg};
    if (data) resObj.data = data
    if (!msg) resObj.message = resObj ? "Success" : "Failure"
    if (!resObj.success) console.error("error:", resObj);
    return res.json(resObj)
}

module.exports = {
    runScript: runScript,
    toDirCompat: toDirCompat,
    resWithStatusMessage: resWithStatusMessage
}