import React, {useEffect, useState} from "react";
import {FaPlusCircle, FaRegClock, FaRegEnvelope, FaRegPlayCircle} from 'react-icons/fa';
import LoadingSpinner from "./spinner/LoadingSpinner";
import cronstrue from 'cronstrue';
import {
    fetchScriptsUploadedList,
    fetchSelectedRun,
    fetchSelectedScriptRunList,
    postExecuteRun,
    postUploadScript,
    putUpdateConfig
} from "./api";
import {validateEmail} from "./webhelper";
import {cloneDeep} from "lodash";

export default function App() {
    const [scriptList, setScriptList] = useState([])
    const [selectedScript, setSelectedScript] = useState({name: ""})
    const [runList, setRunList] = useState([])
    const [selectedRun, setSelectedRun] = useState("")
    const [selectedRunContent, setSelectedRunContent] = useState(null)
    const [runButtonDisabled, setRunButtonDisabled] = useState(false)

    const [emailValue, setEmailValue] = useState("")
    const [emailError, setEmailError] = useState("")
    const [emailActive, setEmailActive] = useState(false)

    const [cronValue, setCronValue] = useState("")
    const [cronActive, setCronActive] = useState(false)
    const [cronExplained, setCronExplained] = useState("")
    const [cronError, setCronError] = useState("")

    useEffect(() => {
        fetchScriptsUploadedList()
            .then(scriptList => {
                if (scriptList[0]) {
                    setScriptList(scriptList)
                    setSelectedScript(scriptList[0])
                }
            })
    }, [])


    function setSelectedRunList(runList) {
        setRunList(runList)
        setSelectedRun(runList[0] ?? null)
        if (!runList[0]) setSelectedRunContent(null)
    }

    useEffect(() => {
        if (selectedScript.name) {
            fetchSelectedScriptRunList(selectedScript.name)
                .then(setSelectedRunList)
                .then(() => {
                    console.log(selectedScript)
                    changeCron(selectedScript.cronValue)
                    setCronActive(selectedScript.cronActive)
                    setEmailValue(selectedScript.emailValue)
                    setEmailActive(selectedScript.emailActive)
                })
        }
    }, [selectedScript])

    useEffect(() => {
        if (selectedRun) {
            fetchSelectedRun(selectedScript.name, selectedRun)
                .then(res => setSelectedRunContent(res.data));
        }
        // eslint-disable-next-line
    }, [selectedRun])


    function executeRun(script) {
        setRunButtonDisabled(true)
        setSelectedRunContent(null)
        return postExecuteRun(script.name)
            .then(() => fetchSelectedScriptRunList(script.name))
            .then(setSelectedRunList)
            .then(() => setRunButtonDisabled(false))
    }


    async function uploadNewScript() {
        const input = document.querySelector('input[type="file"]')
        if (!input.value) return
        const data = new FormData()
        data.append('file', input.files[0])

        setSelectedScript({name: ""})
        setSelectedRun("")
        setSelectedRunContent(null)
        setRunList([])

        await postUploadScript(data)
        const scriptsUploadedList = await fetchScriptsUploadedList()

        await executeRun(scriptsUploadedList[0])

        const scriptsUploadedAfterRunList = await fetchScriptsUploadedList()
        setScriptList(scriptsUploadedAfterRunList)
        setSelectedScript(scriptsUploadedAfterRunList[0])

        input.value = null
    }

    async function changeCronValueAndUpdateRemote(value) {
        const valid = changeCron(value)
        if (valid) {
            await putUpdateConfig(selectedScript.name, {cronValue: value})
        }
    }

    function changeCron(value) {
        setCronValue(value)
        setCronExplained("")
        setCronError("")
        try {
            setCronExplained(cronstrue.toString(value))
            return true
        } catch (e) {
            setCronError(e)
            return false
        }
    }

    async function changeEmailAndUpdateRemote(value) {
        setEmailValue(value)
        if (validateEmail(value)) {
            setEmailError("")
            await putUpdateConfig(selectedScript.name, {emailValue: value})

        } else {
            setEmailError(`Email ${value} is not valid`)
        }
    }

    async function setEmailActiveAndUpdateRemote() {
        let newValue = !emailActive;
        if (validateEmail(emailValue)) {
            setEmailActive(newValue)
            await putUpdateConfig(selectedScript.name, {emailActive: newValue})

            // Update in list
            const scriptListClone = cloneDeep(scriptList)
            scriptListClone.find(s => s.name === selectedScript.name).emailActive = newValue
            setScriptList(scriptListClone)
        } else {
            setEmailError(`Email ${emailValue} is not valid`)
        }
    }

    async function setCronActiveAndUpdateRemote(activeValue) {
        const cronValid = changeCron(cronValue)
        if (cronValid) {
            setCronActive(activeValue)
            await putUpdateConfig(selectedScript.name, {cronActive: activeValue})

            // Update in list
            const scriptListClone = cloneDeep(scriptList)
            scriptListClone.find(s => s.name === selectedScript.name).cronActive = activeValue
            setScriptList(scriptListClone)
        }
    }

    return (
        <div className='main-container'>

            {/* === Script List === */}
            <div className='script-list-container me-2'>
                <label style={{marginBottom: "0.5rem", width: "100%"}} className='button'>
                    <div style={{display: 'flex', alignItems: 'center'}}><FaPlusCircle
                        style={{color: "green", marginRight: '5px'}}/></div>
                    <span>Upload script</span>
                    <input style={{display: 'none'}} type='file' onChange={uploadNewScript}/>
                </label>
                {scriptList.map(script => <div key={script.name} onClick={() => setSelectedScript(script)}
                                               className={(script.name === selectedScript.name ? 'active' : '') + ' cursor-pointer'}
                                               style={{
                                                   padding: '0.25rem', border: '1px #aaa solid',
                                                   display: 'flex', alignItems: 'center'
                                               }}>
                    <div style={{marginRight: '.25rem'}}>{script.name}</div>
                    <div style={{marginLeft: 'auto'}}>
                        <div style={{color: script.emailActive ? 'green' : 'lightgrey'}}><FaRegEnvelope/></div>
                        <div style={{color: script.cronActive ? 'green' : 'lightgrey'}}><FaRegClock/></div>
                    </div>
                </div>)}
            </div>

            {/* === Main content === */}
            <div style={{background: '#ddd', padding: '.5rem', flex: '1'}}>
                <div style={{background: '#ccc', padding: '.5rem', display: "flex", marginBottom: '.5rem'}}>
                    <div style={{flex: '1'}}></div>
                    <div style={{background: '#bbb', padding: '.5rem'}}>
                        <div style={{display: 'flex', marginBottom: '.5rem'}}>
                            <span style={{marginRight: '6px', flex: '1'}}>Send to mail on error:</span>
                            <div style={{display: 'flex'}}>
                                <input style={{flex: '1', padding: "3px", width: '160px'}} type='email'
                                       value={emailValue}
                                       onChange={e => changeEmailAndUpdateRemote(e.target.value)}/>
                                <input type="checkbox" style={{width: '17px'}}
                                       onChange={() => setEmailActiveAndUpdateRemote()}
                                       checked={emailActive}/>
                            </div>
                        </div>
                        {emailError && <div style={{
                            color: '#af0000',
                            marginBottom: '.5rem',
                            textAlign: 'end',
                            fontSize: '12px'
                        }}>{emailError}</div>}

                        <div style={{display: 'flex', marginBottom: '.25rem'}}>
                            <span style={{marginRight: '6px', flex: '1'}}>Schedule (cron):</span>
                            <div style={{display: 'flex'}}>
                                <input style={{padding: "3px", width: '160px'}} placeholder='0 0 * ? * *'
                                       onChange={(e) => changeCronValueAndUpdateRemote(e.target.value)}
                                       value={cronValue} type='text'/>
                                <input type="checkbox" style={{width: '17px'}}
                                       onChange={() => setCronActiveAndUpdateRemote(!cronActive)}
                                       checked={cronActive}/>
                            </div>
                        </div>
                        {cronExplained &&
                            <div style={{color: '#009900', fontSize: '13px', textAlign: 'end'}}>{cronExplained}</div>}
                        {cronError &&
                            <div style={{color: '#af0000', fontSize: '12px', textAlign: 'end'}}>{cronError}</div>}
                    </div>
                </div>

                <div style={{background: '#ccc', padding: '.5rem', display: "flex"}}>
                    {!selectedRunContent &&
                        <div style={{background: '#bbb', padding: '.5rem', flex: '1', marginRight: '.25rem'}}>
                            <div style={{
                                display: 'flex', justifyContent: 'center',
                                marginTop: '100px', marginBottom: '400px'
                            }}>
                                <LoadingSpinner/>
                            </div>
                        </div>}
                    {selectedRunContent &&
                        <React.Fragment>
                            <div style={{background: '#bbb', padding: '.5rem', flex: '1', marginRight: '.5rem'}}>
                                <div className='mb-2'>
                                    Result: <span
                                    style={{color: selectedRunContent.results.success ? "green" : "darkred"}}>
                                        {selectedRunContent.results.success ? "Success" : "Failure"}</span>
                                </div>

                                <div className='mb-2'>
                                    <div style={{marginBottom: '.25rem'}}>Logs</div>
                                    <div className='ms-2'>
                                        {selectedRunContent.logs.text.split("\n").map((it, idx) =>
                                            <div key={idx}>{it}</div>)}
                                    </div>
                                </div>
                            </div>

                            <div style={{background: '#bbb', padding: '.5rem', flex: '2'}}>
                                {selectedRunContent.pageList.length === 0 && <div>No pages to show</div>}
                                {selectedRunContent.pageList.map(page =>
                                    <embed key={page.name}
                                           src={`data:application/pdf;base64,${page.data}#toolbar=0&navpanes=0&scrollbar=0`}
                                           type="application/pdf" width="100%" height="600px"/>)}
                            </div>

                        </React.Fragment>
                    }
                </div>
            </div>

            {/* === Run list === */}
            {/*TODO: show icon with fail or success of run in list*/}
            <div className='script-list-container ms-2'>
                <div style={{marginBottom: "0.5rem", width: "100%"}}
                     className={`button ${runButtonDisabled ? 'disabled' : ''}`}
                     onClick={() => executeRun(selectedScript)}>
                    <div style={{display: 'flex', alignItems: 'center'}}><FaRegPlayCircle
                        style={{color: "green", marginRight: '5px'}}/></div>
                    <span>Execute run</span>
                </div>
                {runList.map(item => <div key={item} onClick={() => setSelectedRun(item)}
                                          className={(item === selectedRun ? 'active' : '') + ' cursor-pointer'}
                                          style={{padding: '0.5rem', border: '1px #aaa solid'}}>
                    {item}
                </div>)}
            </div>
        </div>
    );
}