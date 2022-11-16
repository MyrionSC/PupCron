require("express-async-errors");
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const morgan = require('morgan');
const _ = require('lodash');
const {runScript, toDirCompat, resWithStatusMessage, loadConfigFile, exists, readJsonFile} = require("./helper");
const fs = require('fs');
const cron = require('node-cron');
const {sendMail} = require("./emailService");

const app = express();

// enable files upload
app.use(fileUpload({
    createParentPath: true
}));

//add other middleware
app.use(cors({origin: ["http://localhost:3000", "https://cronpup.marand.dk"]}));
app.use(morgan('dev'));
app.use(express.json())

// routes
app.get('/scripts_uploaded', async (req, res) => {
    const scriptList = await fs.promises.readdir(`static/uploaded_scripts/`)
    const scriptWithConfigList = await Promise.all(scriptList.map(script => loadConfigFile(script)))
    return resWithStatusMessage(res, 200, null,
        scriptWithConfigList.sort((a, b) => a.name.localeCompare(b.name)))
})

app.get('/script_runs', async (req, res) => {
    if (!req.query.script)
        return resWithStatusMessage(res, 400, "required query param 'script' should be name of script to get runs for")
    const scriptDir = req.query.script

    if (!(await exists(`static/uploaded_scripts/${scriptDir}`)))
        return resWithStatusMessage(res, 404, `Script with name '${scriptDir}' does not exist`)
    if (!(await exists(`static/uploaded_scripts/${scriptDir}/runs`)))
        return resWithStatusMessage(res, 200, null, [])

    const runList = await fs.promises.readdir(`static/uploaded_scripts/${scriptDir}/runs`)
    return resWithStatusMessage(res, 200, null, runList)
})

async function getScriptRunContent(scriptDir, runName) {
    const runContent = await fs.promises.readdir(`static/uploaded_scripts/${scriptDir}/runs/${runName}`)

    let pageList = runContent.filter(c => c.match(RegExp(/page\d\.pdf/g)));
    let pageListResolved = []
    for (const page of pageList) {
        const dl = await fs.promises.readFile(`static/uploaded_scripts/${scriptDir}/runs/${runName}/${page}`)
        pageListResolved.push({
            name: page,
            data: dl.toString("base64")
        })
    }

    const logsBytes = await fs.promises.readFile(`static/uploaded_scripts/${scriptDir}/runs/${runName}/logs.txt`)
    const scriptBytes = await fs.promises.readFile(`static/uploaded_scripts/${scriptDir}/runs/${runName}/pup_script_modified.js`)
    const results = await readJsonFile(`static/uploaded_scripts/${scriptDir}/runs/${runName}/results.json`);

    return {
        logs: {
            name: "logs.txt",
            text: logsBytes.toString("utf8")
        },
        script: {
            name: "pup_script_modified.js",
            text: scriptBytes.toString("utf8")
        },
        results: results,
        pageList: pageListResolved
    };
}

app.get('/scripts/:script/runs/:run', async (req, res) => {
    const scriptDir = req.params.script
    const runName = req.params.run

    if (!(await exists(`static/uploaded_scripts/${scriptDir}`)))
        return resWithStatusMessage(res, 404, `Script with name '${scriptDir}' does not exist`)
    if (!(await exists(`static/uploaded_scripts/${scriptDir}/runs/${runName}`)))
        return resWithStatusMessage(res, 404, `Run with name '${runName}' does not exist`)

    let data = await getScriptRunContent(scriptDir, runName);

    return resWithStatusMessage(res, 200, null, data)
})

app.get('/scripts/:script/config', async (req, res, next) => {
    const scriptDir = req.params.script
    let config = await loadConfigFile(scriptDir);
    return resWithStatusMessage(res, 200, null, config)
})

async function executeNewRun(scriptDir, callback) {
    let scriptName = `pup_script_modified.js`;
    const timeISO = new Date().toISOString()
        .replaceAll('T', '_')
        .replaceAll(':', '-')
        .substring(0, 19)
    await fs.promises.mkdir(`static/uploaded_scripts/${scriptDir}/runs/${timeISO}`, {recursive: true})

    await fs.promises.copyFile(`static/uploaded_scripts/${scriptDir}/${scriptName}`,
        `static/uploaded_scripts/${scriptDir}/runs/${timeISO}/${scriptName}`, fs.constants.COPYFILE_FICLONE)

    // === Run script
    runScript(`static/uploaded_scripts/${scriptDir}/runs/${timeISO}`, scriptName, async code => {
        console.log(`finished run ${timeISO} for script ${scriptDir} with code ${code}`);
        callback({code, run: timeISO})
    });
}

app.post('/scripts/:script/newrun', async (req, res, next) => {
    if (!req.params.script)
        return resWithStatusMessage(res, 400, "required param prop 'script' should be name of script to run")
    const scriptDir = req.params.script

    if (!(await exists(`static/uploaded_scripts/${scriptDir}`)))
        return resWithStatusMessage(res, 404, `Script with name '${scriptDir}' does not exist`)

    // === create new run dir and copy script to it
    await executeNewRun(scriptDir, async runResult => {
        if (runResult.code !== 0) {
            const config = await loadConfigFile(scriptDir);
            if (config.emailActive && config.emailValue)
                await sendMail(config.emailValue, `run for ${scriptDir} failed`, `Run ${runResult.run} for script ${scriptDir} failed\n\nGo to https://cronpup.marand.dk/ to see details\n`)
        }
        resWithStatusMessage(res, 200, runResult.code === 0 ? 'Success' : 'Error')
    });
})

// Returns task object with metadata
function startCron(cronValue, scriptDir) {
    return cron.schedule(cronValue, async () => {
        await executeNewRun(scriptDir, runResult => {
            console.log(`=== Scheduled run ${runResult.run} for script ${scriptDir} ended with ${runResult.code === 0 ? 'Success' : 'Error'}`)
        });
    });
}

function tryStopOldTask(config) {
    try {
        const taskList = cron.getTasks()
        const oldTask = taskList.get(config.cronTaskId)
        oldTask.stop()
        console.log("Stopped old task successfully")
    } catch (e) {
        console.error(`Tried to stop old task with id ${config.cronTaskId} but it failed with error ${e}`)
    }
}

function StartOrStopCron(key, req, config, scriptDir) {
    if ((key === "cronActive" && req.body["cronActive"] === true) || (key === "cronValue" && config["cronActive"])) {
        const cronValue = key === "cronValue" ? req.body[key] : config["cronValue"]
        if (!cron.validate(cronValue)) throw Error(`cron value ${cronValue} is not valid`)
        if (config.cronTaskId) tryStopOldTask(config);

        const task = startCron(cronValue, scriptDir);
        config.cronTaskId = task.options.name
        console.log(`Started cron for script ${scriptDir} (cronValue: ${cronValue})`)
    } else {
        const taskList = cron.getTasks()
        if (config.cronTaskId && taskList.get(config.cronTaskId)) {
            taskList.get(config.cronTaskId).stop()
            console.log(`Stopped cron for script ${scriptDir}`)
            config.cronTaskId = ""
        }
    }
}

app.put('/scripts/:script/config', async (req, res, next) => {
    if (!req.body) return resWithStatusMessage(res, 400, "body required")
    const scriptDir = req.params.script
    let config = await loadConfigFile(scriptDir);

    Object.keys(req.body).forEach(key => {
        console.log(`Updating config ${key} from ${config[key]} to ${req.body[key]}`)

        if (key === "cronActive" || key === "cronValue") {
            StartOrStopCron(key, req, config, scriptDir);
        }

        config[key] = req.body[key]
    })
    await fs.promises.writeFile(`static/uploaded_scripts/${scriptDir}/config.json`, JSON.stringify(config), "utf8")

    return resWithStatusMessage(res, 200)
})

app.post('/uploadscript', async (req, res) => {
    if (!req.files) {
        resWithStatusMessage(res, 400, "Missing 'file' field in formdata")
    } else {
        const uploadedFile = req.files.file; // file field must be named 'file'

        const fileText = uploadedFile.data.toString("utf8")
        const fileTextModified = fileText
            .replaceAll("page.setDefaultTimeout(timeout);\n", "page.setDefaultTimeout(timeout);\n    const delay = time => new Promise(res=>setTimeout(res,time));\n    let pageNum = 0;\n")
            .replaceAll("await Promise.all(promises);\n", "await Promise.all(promises);\n        await delay(250);\n        await page.pdf({path: 'page' + (pageNum++) + '.pdf', format: 'A4'});\n        console.log('block ' + pageNum + ' done.')")

        const timeISO = new Date().toISOString()
            .replace('T', '_')
            .replace(':', '-')
            .substring(0, 16)

        const scriptPath = `./static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script_original.js`;
        await uploadedFile.mv(scriptPath);
        await fs.promises.writeFile(`static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script_modified.js`, fileTextModified, "utf8")

        resWithStatusMessage(res, 200, "Script uploaded with success")
    }
})

// === Setup
setTimeout(async () => {
    if (!await exists("static/uploaded_scripts")) {
        console.log("Creating static/uploaded_scripts")
        await fs.promises.mkdir("static/uploaded_scripts", {recursive: true})
    }
}, 1)

// === Cron startup
setTimeout(async () => {
    console.log("=== Cron startup: Looking for active cron jobs to start...")
    const scriptsList = await fs.promises.readdir(`static/uploaded_scripts/`)
    for (let script of scriptsList) {
        const config = await loadConfigFile(script)
        if (config.cronActive && config.cronValue) {
            console.log(`registered cron for script ${script}:`, config)
            const task = startCron(config.cronValue, script);
            config.cronTaskId = task.options.name
            await fs.promises.writeFile(`static/uploaded_scripts/${script}/config.json`, JSON.stringify(config), "utf8")
        }
    }
}, 500)

// === Error handling (must be after routes)
app.use((err, req, res, next) => {
    console.error(err)
    return resWithStatusMessage(res, 500, err.message)
});

//start app
const port = process.env.CRONPUP_PORT || 3001;

app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);