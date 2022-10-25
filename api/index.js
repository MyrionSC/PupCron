require("express-async-errors");
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');
const {runScript, toDirCompat, resWithStatusMessage} = require("./helper");
const fs = require('fs');

const app = express();

// enable files upload
app.use(fileUpload({
    createParentPath: true
}));

//add other middleware
app.use(cors({origin: ["http://localhost:3000", "https://cronpup.marand.dk"]}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));


// routes
app.get('/scripts_uploaded', async (req, res) => {
    const scriptList = await fs.promises.readdir(`static/uploaded_scripts/`)
    return resWithStatusMessage(res, 200, null, scriptList)
})

async function dirExists(dir) {
    if (!dir) throw Error("dirExists: Param dir must be set")
    try {
        await fs.promises.access(dir);
        return true
    } catch (e) {
        return false
    }
}

app.get('/script_runs', async (req, res) => {
    if (!req.query.script)
        return resWithStatusMessage(res, 400, "required query param 'script' should be name of script to get runs for")
    const scriptDir = req.query.script

    if (!(await dirExists(`static/uploaded_scripts/${scriptDir}`)))
        return resWithStatusMessage(res, 404, `Script with name '${scriptDir}' does not exist`)
    if (!(await dirExists(`static/uploaded_scripts/${scriptDir}/runs`)))
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

    // TODO: remove later
    let tempRes = null
    try {
        const resultBytes = await fs.promises.readFile(`static/uploaded_scripts/${scriptDir}/runs/${runName}/results.json`)
        tempRes = JSON.parse(resultBytes.toString())
    } catch (e) {
        console.error(e)
        tempRes = {success: true}
    }

    return {
        logs: {
            name: "logs.txt",
            text: logsBytes.toString("utf8")
        },
        script: {
            name: "pup_script_modified.js",
            text: scriptBytes.toString("utf8")
        },
        results: tempRes,
        pageList: pageListResolved
    };
}

app.get('/scripts/:script/runs/:run', async (req, res) => {
    const scriptDir = req.params.script
    const runName = req.params.run

    if (!(await dirExists(`static/uploaded_scripts/${scriptDir}`)))
        return resWithStatusMessage(res, 404, `Script with name '${scriptDir}' does not exist`)
    if (!(await dirExists(`static/uploaded_scripts/${scriptDir}/runs/${runName}`)))
        return resWithStatusMessage(res, 404, `Run with name '${runName}' does not exist`)

    let data = await getScriptRunContent(scriptDir, runName);

    return resWithStatusMessage(res, 200, null, data)
})

app.post('/scripts/:script/newrun', async (req, res, next) => {
    if (!req.params.script)
        return resWithStatusMessage(res, 400, "required param prop 'script' should be name of script to run")
    const scriptDir = req.params.script
    let scriptName = `pup_script_modified.js`;

    if (!(await dirExists(`static/uploaded_scripts/${scriptDir}`)))
        return resWithStatusMessage(res, 404, `Script with name '${scriptDir}' does not exist`)

    // === create new run dir and copy script to it
    const timeISO = new Date().toISOString()
        .replaceAll('T', '_')
        .replaceAll(':', '-')
        .substring(0, 19)
    await fs.promises.mkdir(`static/uploaded_scripts/${scriptDir}/runs/${timeISO}`, {recursive: true})

    await fs.promises.copyFile(`static/uploaded_scripts/${scriptDir}/${scriptName}`,
        `static/uploaded_scripts/${scriptDir}/runs/${timeISO}/${scriptName}`, fs.constants.COPYFILE_FICLONE)

    // === Run script
    runScript(`static/uploaded_scripts/${scriptDir}/runs/${timeISO}`, scriptName, async code => {
        console.log(`finished run with code ${code}`);
        let data = await getScriptRunContent(scriptDir, timeISO);
        resWithStatusMessage(res, 200, code === 0 ? 'Success' : 'Error', data)
    });
})

app.post('/uploadscript', async (req, res) => {
    if (!req.files) {
        resWithStatusMessage(res, 400, "Missing 'file' field in formdata")
    } else {
        const uploadedFile = req.files.file; // file field must be named 'file'

        const fileText = uploadedFile.data.toString("utf8")
        const fileTextModified = fileText
            .replaceAll("page.setDefaultTimeout(timeout);\n", "page.setDefaultTimeout(timeout);\n    const delay = time => new Promise(res=>setTimeout(res,time));\n    let pageNum = 0;\n")
            .replaceAll("await Promise.all(promises);\n", "await Promise.all(promises);\n        await delay(250);\n        await page.pdf({path: 'page' + (pageNum++) + '.pdf', format: 'A4'});\n       console.log('block ' + pageNum + ' done.')")

        const timeISO = new Date().toISOString()
            .replace('T', '_')
            .replace(':', '-')
            .substring(0, 16)

        const scriptPath = `./static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script_original.js`;
        await uploadedFile.mv(scriptPath);
        await fs.promises.writeFile(`./static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script_modified.js`, fileTextModified, "utf8")

        resWithStatusMessage(res, 200, "Script uploaded with success")
    }
})

// === Error handling (must be after routes)
app.use((err, req, res, next) => {
    console.error(err)
    return resWithStatusMessage(res, 500, err.message)
});

//start app
const port = process.env.PORT || 3001;

app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);
