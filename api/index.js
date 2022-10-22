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
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use('/static', express.static('static'))


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

app.post('/testpost', async (req, res) => {
    console.log(req.body);
    res.send(req.body)
})

app.post('/runscript', async (req, res, next) => {
    if (!req.body.script)
        return resWithStatusMessage(res, 400, "required body prop 'script' should be name of script to run")
    const scriptDir = req.body.script
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
    runScript(`static/uploaded_scripts/${scriptDir}/runs/${timeISO}`, scriptName, err => {
        if (err) throw err;
        console.log(`finished running ${scriptName}`);
        resWithStatusMessage(res, 200, "great success")
    });
})

app.post('/uploadscript', async (req, res) => {
    try {
        if (!req.files) {
            res.send({
                success: false,
                message: 'No file uploaded'
            });
        } else {
            const uploadedFile = req.files.file; // file field must be named 'file'

            const fileText = uploadedFile.data.toString("utf8")
            const fileTextModified = fileText
                .replaceAll("page.setDefaultTimeout(timeout);\n", "page.setDefaultTimeout(timeout);\n    let pageNum = 0;\n")
                .replaceAll("await Promise.all(promises);\n", "await Promise.all(promises);\n        await page.pdf({path: 'page' + (pageNum++) + '.pdf', format: 'A4'});\n       console.log('block ' + pageNum + ' done.')")

            const timeISO = new Date().toISOString()
                .replace('T', '_')
                .replace(':', '-')
                .substring(0, 16)

            const scriptPath = `./static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script_original.js`;
            await uploadedFile.mv(scriptPath);
            await fs.promises.writeFile(`./static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script_modified.js`, fileTextModified, "utf8")

            resWithStatusMessage(res, 200, "Script uploaded with success")
        }
    } catch (err) {
        res.status(500).send(err);
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
