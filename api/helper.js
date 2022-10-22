const childProcess = require('child_process')
const fs = require('fs');
const {StringDecoder} = require('string_decoder');

function runScript(cwd, script, callback) {
    // keep track of whether callback has been invoked to prevent multiple invocations
    let invoked = false;
    const process = childProcess.fork(script, {cwd: cwd, silent: true});
    const stream = fs.createWriteStream(cwd + "/logs.txt", {flags: 'a', encoding: 'utf8'});
    const decoder = new StringDecoder('utf8');

    process.stdout.on('data', (data) => {
        stream.write(data)
        console.log(decoder.write(data))
    });

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        stream.close()
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        stream.close()
        callback(code === 0 ? null : new Error('exit code ' + code));
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