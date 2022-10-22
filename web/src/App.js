import {useEffect, useState} from "react";


export default function App() {
    const [scriptList, setScriptList] = useState([])
    const [runList, setRunList] = useState([])
    const [selectedScript, setSelectedScript] = useState("")
    const [selectedRun, setSelectedRun] = useState("")

    useEffect(() => {
        fetch("http://localhost:3001/scripts_uploaded")
            .then(res => res.json())
            .then(res => {
                console.log(res)
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

    function selectScript(selectedScript) {
        setSelectedScript(selectedScript);
        console.log(selectedScript)
    }

    return (
        <div className='main-container'>
            <div className='script-list-container me-2'>
                {scriptList.map(item => <div key={item} onClick={() => selectScript(item)}
                                             className={item === selectedScript ? 'active' : ''}
                                             style={{padding: '0.5rem', border: '1px #aaa solid'}}>
                    {item}
                </div>)}
            </div>

            <div style={{background: '#dddddd', padding: '.5rem', flex: '1'}}>
                <div className='button'>Run Script</div>
            </div>

            <div className='script-list-container ms-2'>
                {runList.map(item => <div key={item} onClick={() => setSelectedRun(item)}
                                          className={item === selectedRun ? 'active' : ''}
                                          style={{padding: '0.5rem', border: '1px #aaa solid'}}>
                    {item}
                </div>)}
            </div>
        </div>
    );
}