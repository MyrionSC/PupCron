import React, {useEffect, useState} from "react";
import {FaPlusCircle, FaRegPlayCircle} from 'react-icons/fa';
import LoadingSpinner from "./spinner/LoadingSpinner";
import cronstrue from 'cronstrue';

export default function App() {
    const [scriptList, setScriptList] = useState([])
    const [runList, setRunList] = useState([])
    const [selectedScript, setSelectedScript] = useState("")
    const [selectedRun, setSelectedRun] = useState("")
    const [selectedRunContent, setSelectedRunContent] = useState(null)

    const [cronValue, setCronValue] = useState("")
    const [cronActive, setCronActive] = useState(false)
    const [cronExplained, setCronExplained] = useState("")
    const [cronError, setCronError] = useState("")

    function fetchScriptsUploadedList() {
        return fetch("http://localhost:3001/scripts_uploaded")
            .then(res => res.json())
            .then(res => res.data.sort().reverse())
    }

    useEffect(() => {
        fetchScriptsUploadedList()
            .then(scriptList => {
                setScriptList(scriptList)
                setSelectedScript(scriptList[0])
            });
    }, [])

    function fetchSelectedScriptRunList(script) {
        return fetch(`http://localhost:3001/script_runs?script=${script}`)
            .then(res => res.json())
            .then(res => res.data.sort().reverse());
    }

    function setSelectedRunList(runList) {
        setRunList(runList)
        setSelectedRun(runList[0] ?? null)
        if (!runList[0]) setSelectedRunContent(null)
    }

    useEffect(() => {
        if (selectedScript) {
            fetchSelectedScriptRunList(selectedScript)
                .then(setSelectedRunList);
        }
    }, [selectedScript])

    useEffect(() => {
        if (selectedRun) {
            fetch(`http://localhost:3001/scripts/${selectedScript}/runs/${selectedRun}`)
                .then(res => res.json())
                .then(res => setSelectedRunContent(res.data));
        }
        // eslint-disable-next-line
    }, [selectedRun])

    function executeRun(script) {
        setSelectedRunContent(null)
        return fetch(`http://localhost:3001/scripts/${script}/newrun`, {method: "POST"})
            .then(() => fetchSelectedScriptRunList(script))
            .then(setSelectedRunList)
    }

    async function uploadNewScript() {
        const input = document.querySelector('input[type="file"]')
        if (!input.value) return
        const data = new FormData()
        data.append('file', input.files[0])
        await fetch(`http://localhost:3001/uploadscript`, {method: "POST", body: data})
        let newScript = "";
        await fetchScriptsUploadedList()
            .then(scriptList => {
                setScriptList(scriptList)
                setSelectedScript(scriptList[0])
                newScript = scriptList[0]
            });
        await executeRun(newScript)
        input.value = null
    }

    function changeCron(value) {
        setCronValue(value)
        setCronExplained("")
        setCronError("")
        try {
            setCronExplained(cronstrue.toString(value))
        } catch (e) {
            setCronError(e)
        }
    }

    return (
        <div className='main-container'>

            {/* === Script List === */}
            <div className='script-list-container me-2'>
                <label style={{marginBottom: "0.5rem"}} className='button'>
                    <div style={{display: 'flex', alignItems: 'center'}}><FaPlusCircle
                        style={{color: "green", marginRight: '5px'}}/></div>
                    <span>Upload script</span>
                    <input style={{display: 'none'}} type='file' onChange={uploadNewScript}/>
                </label>
                {scriptList.map(item => <div key={item} onClick={() => setSelectedScript(item)}
                                             className={(item === selectedScript ? 'active' : '') + ' cursor-pointer'}
                                             style={{padding: '0.5rem', border: '1px #aaa solid'}}>
                    {item}
                </div>)}
            </div>

            {/* === Main content === */}
            <div style={{background: '#ddd', padding: '.5rem', flex: '1'}}>
                <div style={{background: '#ccc', padding: '.5rem', display: "flex"}}>
                    <div style={{flex: '1'}}></div>
                    <div style={{background: '#bbb', padding: '.5rem'}}>
                        <div style={{display: 'flex', marginBottom: '.5rem'}}>
                            <span style={{marginRight: '6px', flex: '1'}}>Send to mail on error:</span>
                            <input style={{flex: '1', padding: "3px", width: '190px'}} type='email'/>
                        </div>
                        <div style={{display: 'flex', marginBottom: '.25rem'}}>
                            <span style={{marginRight: '6px', flex: '1'}}>Schedule (cron):</span>
                            <div style={{display: 'flex'}}>
                                <input style={{padding: "3px", width: '160px'}} placeholder='0 0 * ? * *'
                                       onChange={(e) => changeCron(e.target.value)}
                                       value={cronValue} type='text'/>
                                <input type="checkbox" onChange={() => setCronActive(!cronActive)}
                                       checked={cronActive}/>
                            </div>
                        </div>
                        <div style={{color: '#009900', fontSize: '13px', float: 'right'}}>{cronExplained}</div>
                        <div style={{color: '#af0000', fontSize: '12px', float: 'right'}}>{cronError}</div>
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
                            <div style={{background: '#bbb', padding: '.5rem', flex: '1', marginRight: '.25rem'}}>
                                <div className='mb-2'>
                                    Result: <span style={{color: "green"}}>Great success</span>
                                </div>

                                <div className='mb-2'>
                                    <div style={{marginBottom: '.25rem'}}>Logs</div>
                                    <div className='ms-2'>
                                        {selectedRunContent.logs.text.split("\n").map((it, idx) =>
                                            <div key={idx}>{it}</div>)}
                                    </div>
                                </div>

                                {/*<div className='mb-2'>*/}
                                {/*    Script*/}
                                {/*    <div className='ms-2'>*/}
                                {/*        {selectedRunContent.script.text.split("\n").map((it, idx) =>*/}
                                {/*            <div key={idx}>{it}</div>)}*/}
                                {/*    </div>*/}
                                {/*</div>*/}

                            </div>


                            <div style={{background: '#bbb', padding: '.5rem', flex: '2'}}>
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
            <div className='script-list-container ms-2'>
                <div style={{marginBottom: "0.5rem"}} className='button' onClick={() => executeRun(selectedScript)}>
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