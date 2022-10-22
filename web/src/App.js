import {useEffect, useState} from "react";


export default function App() {
    const [scriptList, setScriptList] = useState([])
    const [selectedScript, setSelectedScript] = useState("")

    useEffect(() => {
        async function fetchData() {
            const scriptsUploadedListRes = await fetch("http://localhost:3001/scripts_uploaded")
            let scriptList = (await scriptsUploadedListRes.json()).data.sort().reverse();
            setScriptList(scriptList)
            setSelectedScript(scriptList[0])
        }
        fetchData();
    }, [])

    function selectScript(selectedScript) {
        setSelectedScript(selectedScript);
        console.log(selectedScript)
    }

    return (
        <div style={{width: '1000px', margin: 'auto', marginTop: '30px', background: '#eeeeee', padding: '.5rem', display:'flex'}}>

            <div className='script-list-container'>
                {scriptList.map(item => <div key={item} onClick={() => selectScript(item)} className={item === selectedScript ? 'active' : ''}
                                             style={{padding:'0.5rem', border: '1px #aaa solid'}}>
                    {item}
                </div>)}
            </div>

            <div style={{background: '#dddddd', padding: '.5rem', flex: '1'}}>
            </div>

        </div>
    );
}