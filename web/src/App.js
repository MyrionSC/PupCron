import React, {useEffect, useState} from "react";
import {FaPlusCircle, FaRegPlayCircle} from 'react-icons/fa';

export default function App() {
    const [scriptList, setScriptList] = useState([])
    const [runList, setRunList] = useState([])
    const [selectedScript, setSelectedScript] = useState("")
    const [selectedRun, setSelectedRun] = useState("")
    const [selectedRunContent, setSelectedRunContent] = useState(null)

    useEffect(() => {
        fetch("http://localhost:3001/scripts_uploaded")
            .then(res => res.json())
            .then(res => {
                const scriptList = res.data.sort().reverse();
                setScriptList(scriptList)
                setSelectedScript(scriptList[0])
            });
    }, [])
    useEffect(() => {
        if (selectedScript)
            fetch(`http://localhost:3001/script_runs?script=${selectedScript}`)
                .then(res => res.json())
                .then(res => {
                    const runList = res.data.sort().reverse();
                    setRunList(runList)
                    setSelectedRun(runList[0])
                });
    }, [selectedScript])
    useEffect(() => {
        if (selectedRun)
            fetch(`http://localhost:3001/scripts/${selectedScript}/runs/${selectedRun}`)
                .then(res => res.json())
                .then(res => {
                    console.log(res)
                    setSelectedRunContent(res.data)
                });
    }, [selectedRun])

    return (
        <div className='main-container'>

            {/* === Script List === */}
            <div className='script-list-container me-2'>
                <div style={{marginBottom: "0.5rem"}} className='button'>
                    <div style={{display: 'flex', alignItems: 'center'}}><FaPlusCircle
                        style={{color: "green", marginRight: '5px'}}/></div>
                    <span>Upload script</span>
                </div>
                {scriptList.map(item => <div key={item} onClick={() => setSelectedScript(item)}
                                             className={(item === selectedScript ? 'active' : '') + ' cursor-pointer'}
                                             style={{padding: '0.5rem', border: '1px #aaa solid'}}>
                    {item}
                </div>)}
            </div>

            {/* === Main content === */}
            <div style={{background: '#ddd', padding: '.5rem', flex: '1'}}>

                {selectedRunContent &&
                    <React.Fragment>
                        <div style={{background: '#ccc', padding: '.5rem', display: "flex"}}>
                            <div style={{flex: '1'}}></div>
                            <div style={{background: '#bbb', padding: '.5rem'}}>
                                <div style={{display: 'flex', marginBottom: '.25rem'}}>
                                    <span style={{marginRight: '6px', flex: '1'}}>Send to mail on error:</span>
                                    <input style={{flex: '1'}} type='email'/>
                                </div>
                                <div style={{display: 'flex'}}>
                                    <span style={{marginRight: '6px', flex: '1'}}>Schedule (cron):</span>
                                    <input style={{flex: '1'}} placeholder='0 0 * ? * *' type='text'/>
                                </div>
                            </div>
                        </div>

                        <div style={{background: '#ccc', padding: '.5rem', display: "flex"}}>

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
                        </div>

                    </React.Fragment>
                }

            </div>

            {/* === Run list === */}
            <div className='script-list-container ms-2'>
                <div style={{marginBottom: "0.5rem"}} className='button'>
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